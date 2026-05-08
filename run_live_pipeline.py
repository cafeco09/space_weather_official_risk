import os
import csv
import json
import asyncio
import argparse
from datetime import datetime, timezone
from concurrent.futures import ProcessPoolExecutor
from typing import Any, Dict, List, Optional

from starlink_loader import load_satellite_catalog
from atmosphere import compute_atmospheric_density
from orbit_propagation import propagate_single_satellite
from satellite_stress import compute_satellite_stress


DATA_DIR = "data"
OUTPUT_DIR = "outputs"
MODELS_DIR = "models"

DEFAULT_INPUT_FILE = os.path.join(DATA_DIR, "starlink_catalog.csv")
DEFAULT_OUTPUT_FILE = os.path.join(OUTPUT_DIR, "live_leo_stress.csv")


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(message: str) -> None:
    print(f"[{timestamp()}] {message}", flush=True)


def ensure_dirs() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)


def flatten(row: Dict[str, Any]) -> Dict[str, Any]:
    output = {}

    for key, value in row.items():
        if isinstance(value, (dict, list, tuple)):
            output[key] = json.dumps(value, default=str)
        else:
            output[key] = value

    return output


def write_csv(path: str, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        log("No rows to write.")
        return

    rows = [flatten(row) for row in rows]
    fieldnames = sorted({k for row in rows for k in row.keys()})

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    log(f"Wrote {len(rows)} rows to {path}")


def propagate_safe(
    satellite: Dict[str, Any],
    atmosphere: Dict[str, Any],
    time_step_seconds: int,
    duration_minutes: int,
) -> Dict[str, Any]:
    sat_id = satellite.get("satellite_id", "unknown")

    try:
        propagation = propagate_single_satellite(
            satellite=satellite,
            atmosphere=atmosphere,
            time_step_seconds=time_step_seconds,
            duration_minutes=duration_minutes,
        )

        stress = compute_satellite_stress(propagation, atmosphere)

        return {
            "satellite_id": sat_id,
            "status": "ok",
            "timestamp": timestamp(),
            **propagation,
            **stress,
        }

    except Exception as exc:
        return {
            "satellite_id": sat_id,
            "status": "error",
            "timestamp": timestamp(),
            "error": str(exc),
        }


def propagate_chunk_worker(
    satellites: List[Dict[str, Any]],
    atmosphere: Dict[str, Any],
    time_step_seconds: int,
    duration_minutes: int,
) -> List[Dict[str, Any]]:
    return [
        propagate_safe(
            satellite=sat,
            atmosphere=atmosphere,
            time_step_seconds=time_step_seconds,
            duration_minutes=duration_minutes,
        )
        for sat in satellites
    ]


def make_chunks(items: List[Any], chunk_size: int) -> List[List[Any]]:
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


async def propagate_parallel(
    satellites: List[Dict[str, Any]],
    atmosphere: Dict[str, Any],
    workers: Optional[int],
    chunk_size: Optional[int],
    time_step_seconds: int,
    duration_minutes: int,
) -> List[Dict[str, Any]]:
    worker_count = workers or max(1, os.cpu_count() or 1)

    if chunk_size is None:
        chunk_size = max(1, len(satellites) // (worker_count * 2) or 1)

    chunks = make_chunks(satellites, chunk_size)

    log(
        f"Parallel propagation started | satellites={len(satellites)} | "
        f"workers={worker_count} | chunks={len(chunks)}"
    )

    loop = asyncio.get_running_loop()
    results: List[Dict[str, Any]] = []

    with ProcessPoolExecutor(max_workers=worker_count) as executor:
        futures = [
            loop.run_in_executor(
                executor,
                propagate_chunk_worker,
                chunk,
                atmosphere,
                time_step_seconds,
                duration_minutes,
            )
            for chunk in chunks
        ]

        completed = 0

        for future in asyncio.as_completed(futures):
            batch = await future
            results.extend(batch)
            completed += 1
            log(f"Completed chunk {completed}/{len(chunks)}")

    return results


async def run_pipeline_once(
    input_file: str,
    output_file: str,
    json_output: Optional[str],
    workers: Optional[int],
    chunk_size: Optional[int],
    time_step_seconds: int,
    duration_minutes: int,
) -> Dict[str, Any]:
    ensure_dirs()

    started_at = timestamp()
    log("Live LEO stress pipeline started.")

    satellites = load_satellite_catalog(input_file)

    if not satellites:
        raise ValueError("No satellites loaded.")

    log(f"Loaded {len(satellites)} satellites.")

    atmosphere = compute_atmospheric_density()
    log("Atmosphere state loaded.")

    results = await propagate_parallel(
        satellites=satellites,
        atmosphere=atmosphere,
        workers=workers,
        chunk_size=chunk_size,
        time_step_seconds=time_step_seconds,
        duration_minutes=duration_minutes,
    )

    ok_count = sum(1 for row in results if row.get("status") == "ok")
    error_count = sum(1 for row in results if row.get("status") == "error")

    payload = {
        "started_at": started_at,
        "finished_at": timestamp(),
        "satellite_count": len(satellites),
        "ok_count": ok_count,
        "error_count": error_count,
        "atmosphere": atmosphere,
        "results": results,
    }

    write_csv(output_file, results)

    if json_output:
        with open(json_output, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, default=str)

        log(f"Wrote JSON to {json_output}")

    log(f"Pipeline finished | ok={ok_count} | errors={error_count}")

    return payload


async def run_continuous(args: argparse.Namespace) -> None:
    while True:
        try:
            await run_pipeline_once(
                input_file=args.input,
                output_file=args.output,
                json_output=args.json_output,
                workers=args.workers,
                chunk_size=args.chunk_size,
                time_step_seconds=args.time_step,
                duration_minutes=args.duration,
            )
        except Exception as exc:
            log(f"Pipeline failed: {exc}")

        await asyncio.sleep(args.interval)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Async parallel LEO satellite stress pipeline.")

    parser.add_argument("--mode", choices=["once", "continuous"], default="once")
    parser.add_argument("--input", default=DEFAULT_INPUT_FILE)
    parser.add_argument("--output", default=DEFAULT_OUTPUT_FILE)
    parser.add_argument("--json-output", default=os.path.join(OUTPUT_DIR, "live_leo_stress.json"))
    parser.add_argument("--workers", type=int, default=None)
    parser.add_argument("--chunk-size", type=int, default=None)
    parser.add_argument("--time-step", type=int, default=60)
    parser.add_argument("--duration", type=int, default=90)
    parser.add_argument("--interval", type=int, default=300)

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.mode == "once":
        asyncio.run(
            run_pipeline_once(
                input_file=args.input,
                output_file=args.output,
                json_output=args.json_output,
                workers=args.workers,
                chunk_size=args.chunk_size,
                time_step_seconds=args.time_step,
                duration_minutes=args.duration,
            )
        )
    else:
        asyncio.run(run_continuous(args))


if __name__ == "__main__":
    main()

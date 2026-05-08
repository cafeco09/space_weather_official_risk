import csv
import math
import requests
from pathlib import Path

CELESTRAK_STARLINK_CSV = (
    "https://celestrak.org/NORAD/elements/gp.php"
    "?GROUP=starlink&FORMAT=csv"
)

OUTPUT_PATH = Path("data/starlink_catalog.csv")
MAX_SATELLITES = 42

MU_EARTH = 398600.4418  # km^3 / s^2
EARTH_RADIUS_KM = 6371.0


def estimate_altitude_km(mean_motion_rev_per_day: float) -> float:
    """
    Estimate semi-major axis altitude from mean motion.
    This is approximate and suitable for visualisation/demo use.
    """
    n_rad_s = mean_motion_rev_per_day * 2 * math.pi / 86400
    semi_major_axis_km = (MU_EARTH / (n_rad_s ** 2)) ** (1 / 3)
    return semi_major_axis_km - EARTH_RADIUS_KM


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    print("Downloading public Starlink GP data from CelesTrak...")
    response = requests.get(
        CELESTRAK_STARLINK_CSV,
        timeout=30,
        headers={"User-Agent": "space-weather-risk-demo/1.0"}
    )
    response.raise_for_status()

    rows = list(csv.DictReader(response.text.splitlines()))

    if not rows:
        raise RuntimeError("No Starlink rows returned from CelesTrak.")

    clean_rows = []

    for row in rows[:MAX_SATELLITES]:
        mean_motion = float(row.get("MEAN_MOTION", 0) or 0)
        altitude = estimate_altitude_km(mean_motion) if mean_motion > 0 else None

        clean_rows.append({
            "satellite_id": row.get("NORAD_CAT_ID", ""),
            "name": row.get("OBJECT_NAME", ""),
            "object_id": row.get("OBJECT_ID", ""),
            "epoch": row.get("EPOCH", ""),
            "inclination_deg": row.get("INCLINATION", ""),
            "raan_deg": row.get("RA_OF_ASC_NODE", ""),
            "eccentricity": row.get("ECCENTRICITY", ""),
            "arg_perigee_deg": row.get("ARG_OF_PERICENTER", ""),
            "mean_anomaly_deg": row.get("MEAN_ANOMALY", ""),
            "mean_motion_rev_per_day": row.get("MEAN_MOTION", ""),
            "bstar": row.get("BSTAR", ""),
            "altitude_km_est": round(altitude, 2) if altitude is not None else "",
            "source": "CelesTrak public Starlink GP data",
        })

    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=clean_rows[0].keys())
        writer.writeheader()
        writer.writerows(clean_rows)

    print(f"Wrote {len(clean_rows)} real Starlink rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

import csv
from typing import List, Dict, Any


def load_satellite_catalog(path: str = "data/starlink_catalog.csv") -> List[Dict[str, Any]]:
    satellites = []

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            satellites.append({
                "satellite_id": row.get("satellite_id"),
                "name": row.get("name"),
                "altitude_km": float(row.get("altitude_km", 550)),
                "inclination_deg": float(row.get("inclination_deg", 53)),
                "velocity_km_s": float(row.get("velocity_km_s", 7.6)),
            })

    return satellites


def load_starlink_satellites(path: str = "data/starlink_catalog.csv"):
    return load_satellite_catalog(path)

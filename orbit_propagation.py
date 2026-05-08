from typing import Dict, Any, List
import math


EARTH_RADIUS_KM = 6371.0
MU_EARTH = 398600.4418


def propagate_single_satellite(
    satellite: Dict[str, Any],
    atmosphere: Dict[str, Any],
    time_step_seconds: int = 60,
    duration_minutes: int = 90,
) -> Dict[str, Any]:
    altitude_km = float(satellite.get("altitude_km", 550))
    velocity_km_s = float(satellite.get("velocity_km_s", 7.6))
    density_scale = float(atmosphere.get("density_scale", 1.0))

    orbital_radius = EARTH_RADIUS_KM + altitude_km
    orbital_period_seconds = 2 * math.pi * math.sqrt((orbital_radius ** 3) / MU_EARTH)

    drag_proxy = density_scale * (velocity_km_s ** 2) / max(altitude_km, 1)
    altitude_decay_km = drag_proxy * duration_minutes * 0.001
    final_altitude = altitude_km - altitude_decay_km

    return {
        "satellite_id": satellite.get("satellite_id"),
        "name": satellite.get("name"),
        "initial_altitude_km": round(altitude_km, 4),
        "final_altitude_km": round(final_altitude, 4),
        "estimated_decay_km": round(altitude_decay_km, 6),
        "orbital_period_minutes": round(orbital_period_seconds / 60, 3),
        "duration_minutes": duration_minutes,
        "time_step_seconds": time_step_seconds,
        "drag_proxy": round(drag_proxy, 8),
    }


def propagate_orbits(
    satellites: List[Dict[str, Any]],
    atmosphere: Dict[str, Any],
    time_step_seconds: int = 60,
    duration_minutes: int = 90,
) -> List[Dict[str, Any]]:
    return [
        propagate_single_satellite(
            satellite=sat,
            atmosphere=atmosphere,
            time_step_seconds=time_step_seconds,
            duration_minutes=duration_minutes,
        )
        for sat in satellites
    ]

from datetime import datetime, timezone
from typing import Dict, Any
import math


def get_atmosphere_state(time_utc=None, model_dir: str = "models") -> Dict[str, Any]:
    if time_utc is None:
        time_utc = datetime.now(timezone.utc)

    hour = time_utc.hour
    solar_activity_factor = 1.0 + 0.15 * math.sin((2 * math.pi * hour) / 24)

    return {
        "timestamp": time_utc.isoformat(),
        "density_scale": solar_activity_factor,
        "summary": {
            "model": "simplified_exosphere_density_proxy",
            "solar_activity_factor": round(solar_activity_factor, 4),
            "note": "Demo model. Replace with real Kp/F10.7/NRLMSISE data for production physics."
        }
    }


def compute_atmospheric_density(time_utc=None, model_dir: str = "models"):
    return get_atmosphere_state(time_utc=time_utc, model_dir=model_dir)

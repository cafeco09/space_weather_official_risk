from typing import Dict, Any


def compute_satellite_stress(propagation: Dict[str, Any], atmosphere: Dict[str, Any]) -> Dict[str, Any]:
    decay = float(propagation.get("estimated_decay_km", 0))
    drag_proxy = float(propagation.get("drag_proxy", 0))
    density_scale = float(atmosphere.get("density_scale", 1.0))

    stress_score = (decay * 1000) + (drag_proxy * 10) + (density_scale * 2)

    if stress_score >= 8:
        risk = "high"
    elif stress_score >= 4:
        risk = "medium"
    else:
        risk = "low"

    return {
        "stress_score": round(stress_score, 4),
        "risk_level": risk,
    }

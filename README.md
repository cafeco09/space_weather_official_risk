# Space Weather Risk Globe

An interactive prototype for visualising how space weather can affect low Earth orbit satellites through atmospheric drag.

Live dashboard: https://cafeco09.github.io/space_weather_official_risk/

## What it shows

- Earth-centred orbital visualisation
- 42-satellite Starlink sample
- KP index and atmospheric density indicators
- Drag-risk categories
- Selected satellite telemetry
- Operational event panel

## Data

The 42-satellite sample is generated from public CelesTrak/NORAD GP data.

Run:

```bash
python fetch_starlink_data.py

# Space Weather Official Risk Pipeline

Async parallel Python pipeline for modelling simplified LEO satellite drag stress under changing atmospheric conditions.

## What it does

- Loads satellite catalogue data
- Creates a simplified atmospheric density state
- Propagates satellites in parallel
- Computes a stress/risk score
- Writes CSV and JSON outputs

## Repository structure

```text
space_weather_official_risk/
├── atmosphere.py
├── orbit_propagation.py
├── run_live_pipeline.py
├── satellite_stress.py
├── starlink_loader.py
├── requirements.txt
├── README.md
├── .gitignore
├── data/
│   └── starlink_catalog.csv
├── models/
└── outputs/
```

## Run locally

```bash
pip install -r requirements.txt
python run_live_pipeline.py
```

## Run with options

```bash
python run_live_pipeline.py --workers 4 --duration 90 --time-step 60
```

## Outputs

```text
outputs/live_leo_stress.csv
outputs/live_leo_stress.json
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Add complete space weather risk pipeline"
git branch -M main
git remote add origin https://github.com/cafeco09/space_weather_official_risk.git
git push -u origin main
```

Create the GitHub repository first if it does not already exist.

## Note

This is a simplified engineering demo. For production-grade orbital physics, replace the atmospheric model with real Kp/F10.7/NRLMSISE inputs and use validated propagators.

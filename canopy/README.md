# FGA Inspection Studio on Canopy

Thin server wrapper that lets the static FGA SPA run as a Canopy app.

## Why this exists

The app in `../app` is a pure React/Vite SPA — all state is in the browser
(IndexedDB), there is no backend or database. Canopy runs a single container that
must bind `0.0.0.0:8080` and answer `GET /health`, so `app.py` (Flask) serves the
pre-built bundle and the health check. Nothing about the app's logic changes.

## Files

| File | Purpose |
|------|---------|
| `app.py` | Flask server: `/health` + static file serving with SPA fallback. Binds `0.0.0.0:8080`. |
| `requirements.txt` | Just Flask. |
| `build.sh` | Builds the SPA with the correct Canopy base path and stages it into `dist/`. |
| `dist/` | Generated bundle (git-ignored). |

## Deploy

Prereqs (one-time): clone `DasFinCanopyAppBuilder`, create a developer token at
`canopy.fgbs.amazon.dev/settings`, save to `~/.canopy/credentials`.

```bash
# 1. Build the SPA for Canopy's mount path (/apps/<app-name>/)
./build.sh fga-inspection-studio

# 2. Deploy (run from this folder; app.py + requirements.txt are at the ZIP root)
python deploy_canopy.py --name "fga-inspection-studio" --access team --watch
```

Rules that bite:
- The `--name` must **never change** across redeploys, and it must match the name
  passed to `build.sh` (it determines the base path baked into the bundle).
- Always pass `--access team`; omitting it silently resets a shared app to private.

## Verify

- `GET /health` → `{"status": "healthy"}`
- The app renders under `/apps/fga-inspection-studio/` with DM Sans intact (font is
  self-hosted; no external CDN, so it survives Canopy's CSP).

## Local smoke test

```bash
./build.sh
pip install -r requirements.txt
python app.py
# open http://localhost:8080/health  and  http://localhost:8080/
```

## Notes

- **Data does not migrate.** Inspections are stored in IndexedDB keyed to the
  origin, so moving from GitHub Pages to `canopy.fgbs.amazon.dev` means users start
  fresh. Fine for a capture tool, but worth telling users once.
- **Data classification** must be General / Sensitive / Highly Confidential — not
  Critical or Restricted. No production SLA.
- To switch the runtime to Node/Express instead of Flask, the only requirements are
  the same: serve `dist/`, expose `/health`, bind `0.0.0.0:8080`.

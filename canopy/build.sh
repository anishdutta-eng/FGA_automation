#!/usr/bin/env bash
#
# Build the FGA SPA for Canopy and stage it next to app.py.
#
# Canopy serves the app under /apps/<app-name>/, so the bundle must be built
# with a matching base path. Pass the app name (must match the --name you deploy
# with, and must never change across redeploys).
#
#   ./build.sh                       # uses default name fga-inspection-studio
#   ./build.sh my-app-name           # custom name
#
set -euo pipefail

APP_NAME="${1:-fga-inspection-studio}"
HERE="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HERE/../app"

export APP_BASE_PATH="/apps/${APP_NAME}/"
echo "==> Building app with APP_BASE_PATH=$APP_BASE_PATH"
( cd "$APP_DIR" && npm ci && npm run build )

echo "==> Staging build into canopy/dist"
rm -rf "$HERE/dist"
cp -r "$APP_DIR/dist" "$HERE/dist"

echo
echo "Ready. Deploy from this folder with the Canopy tooling:"
echo "  cd \"$HERE\""
echo "  python deploy_canopy.py --name \"$APP_NAME\" --access team --watch"
echo
echo "Sanity-check locally first (optional):"
echo "  pip install -r requirements.txt && python app.py   # then open http://localhost:8080/health"

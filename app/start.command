#!/bin/bash
# Double-click this file (macOS) to launch the FGA Inspection Studio.
# It installs dependencies on first run, then starts the app and opens
# your browser.

# Make sure common Node install locations are on PATH (Finder-launched
# scripts don't inherit your shell profile).
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/*/bin:$PATH"

# Move into the folder this script lives in (the app/ directory).
cd "$(dirname "$0")" || exit 1

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js / npm was not found on your PATH."
  echo "Install Node.js from https://nodejs.org and try again."
  echo ""
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run — installing dependencies (this may take a minute)…"
  npm install || { echo "npm install failed."; read -n 1 -s -r -p "Press any key to close…"; exit 1; }
fi

echo "Starting FGA Inspection Studio…"
npm start

"""
Canopy server wrapper for the FGA Inspection Studio.

The app itself is a fully static React/Vite SPA (all state lives in the browser
via IndexedDB — no backend, no database). Canopy needs a container that binds
0.0.0.0:8080 and exposes GET /health, so this thin Flask server just serves the
pre-built bundle in ./dist and answers the health check.

Canopy mounts the app under /apps/<app-name>/ and passes that prefix as the WSGI
SCRIPT_NAME. Standard WSGI strips SCRIPT_NAME before routing, so the routes here
are declared at the root and the bundle is built with a matching APP_BASE_PATH
(see build.sh) — asset URLs line up automatically.
"""

import os

from flask import Flask, jsonify, send_from_directory

DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

app = Flask(__name__, static_folder=None)


@app.get("/health")
def health():
    return jsonify(status="healthy")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    """Serve a real file if it exists, else fall back to index.html (SPA)."""
    target = os.path.join(DIST, path)
    if path and os.path.isfile(target):
        return send_from_directory(DIST, path)
    return send_from_directory(DIST, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

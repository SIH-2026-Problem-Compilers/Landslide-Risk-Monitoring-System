"""Start the LHASA API server locally.

Usage (from the repository root, inside the `lhasa` conda env or the
backend venv):

    python backend/run.py

Then open http://127.0.0.1:8000/docs for the interactive API browser.
"""
import os
from pathlib import Path

# Load .env from the backend directory before anything else imports config.
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        # python-dotenv not installed — parse manually (no dependencies)
        for line in _env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            # Don't overwrite values already set in the real environment
            if key and value and key not in os.environ:
                os.environ[key] = value

import uvicorn

if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
    )

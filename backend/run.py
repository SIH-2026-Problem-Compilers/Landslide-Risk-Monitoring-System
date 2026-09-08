"""Start the LHASA API server locally.

Usage (from the repository root, inside the `lhasa` conda env):

    python backend/run.py

Then open http://127.0.0.1:8000/docs for the interactive API browser.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )

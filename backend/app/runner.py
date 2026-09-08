"""Run the NASA LHASA pipeline (lhasa.py) as background jobs.

Each API run gets its own output directory under ``backend/.lhasa_runs/`` so
concurrent runs never overwrite each other and results stay addressable by
run id. The heavy Python/geospatial work runs as a subprocess using the
interpreter of the ``lhasa`` conda environment.
"""
from __future__ import annotations

import json
import shlex
import subprocess
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import config, output_reader


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def static_missing(forecast: bool) -> list[str]:
    """Static data files that are required but absent from LHASA/static/."""
    required = list(config.REQUIRED_STATIC_FILES)
    if forecast:
        required += config.FORECAST_STATIC_FILES
    return [name for name in required if not (config.STATIC_DIR / name).exists()]


class RunStore:
    """In-memory registry of LHASA runs, persisted to disk between restarts."""

    def __init__(self, state_file: Path = config.RUNS_STATE_FILE) -> None:
        self.state_file = Path(state_file)
        self._runs: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._load()

    # ---- persistence -----------------------------------------------------
    def _load(self) -> None:
        if not self.state_file.exists():
            return
        try:
            self._runs = json.loads(self.state_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self._runs = {}

    def _save(self) -> None:
        with self._lock:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            self.state_file.write_text(
                json.dumps(self._runs, indent=2), encoding="utf-8"
            )

    # ---- accessors -------------------------------------------------------
    def get(self, run_id: str) -> dict | None:
        return self._runs.get(run_id)

    def list(self) -> list[dict]:
        runs = sorted(
            self._runs.values(), key=lambda r: r["created_at"], reverse=True
        )
        return [self._summary(r) for r in runs]

    def latest_completed(self) -> dict | None:
        completed = [r for r in self._runs.values() if r["status"] == "completed"]
        if not completed:
            return None
        return max(completed, key=lambda r: r.get("finished_at", ""))

    @staticmethod
    def _summary(run: dict) -> dict:
        return {
            key: run.get(key)
            for key in (
                "id",
                "status",
                "created_at",
                "started_at",
                "finished_at",
                "date",
                "lead",
                "bbox",
                "error",
            )
        }

    # ---- run lifecycle ---------------------------------------------------
    def create(
        self,
        date: str | None = None,
        lead: int = config.DEFAULT_LEAD_DAYS,
        bbox: dict | None = None,
    ) -> dict:
        run = {
            "id": uuid.uuid4().hex[:12],
            "status": "queued",
            "created_at": _now(),
            "started_at": None,
            "finished_at": None,
            "date": date,
            "lead": lead,
            "bbox": bbox or dict(config.DEFAULT_BBOX),
            "command": None,
            "log": "",
            "error": None,
            "output_dir": None,
            "files": {"nrt": [], "fcast": []},
        }
        with self._lock:
            self._runs[run["id"]] = run
            self._save()
        threading.Thread(
            target=self._execute, args=(run["id"],), daemon=True
        ).start()
        return run

    def _update(self, run_id: str, **changes) -> None:
        with self._lock:
            if run_id in self._runs:
                self._runs[run_id].update(changes)
                self._save()

    def _execute(self, run_id: str) -> None:
        run = self._runs.get(run_id)
        if run is None:
            return
        bbox = run["bbox"]
        lead = run["lead"]

        # Fail fast with an actionable message when setup is incomplete.
        missing = static_missing(forecast=lead > 0)
        if not config.MODEL_FILE.exists() or missing:
            details = []
            if not config.MODEL_FILE.exists():
                details.append(f"trained model not found at {config.MODEL_FILE}")
            if missing:
                details.append(
                    "static data missing in "
                    f"{config.STATIC_DIR}: {', '.join(missing)} "
                    "(download static.zip per LHASA/README.md and unzip into "
                    "the LHASA directory)"
                )
            self._update(
                run_id,
                status="failed",
                started_at=_now(),
                finished_at=_now(),
                error="; ".join(details),
            )
            return

        output_dir = config.BACKEND_DIR / ".lhasa_runs" / run_id
        output_dir.mkdir(parents=True, exist_ok=True)

        command = [
            config.PYTHON_BIN,
            str(config.LHASA_DIR / "lhasa.py"),
            "-p",
            str(config.LHASA_DIR),
            "-op",
            str(output_dir),
            "-f",
            "nc4",  # netCDF output is what the API reader consumes
            "-o",  # overwrite files from a previous run of the same date
            "-t",
            "2",
            "-l",
            str(lead),
            "-N",
            str(bbox["north"]),
            "-S",
            str(bbox["south"]),
            "-E",
            str(bbox["east"]),
            "-W",
            str(bbox["west"]),
        ]
        if run.get("date"):
            command += ["-d", run["date"]]

        self._update(
            run_id,
            status="running",
            started_at=_now(),
            command=" ".join(shlex.quote(c) for c in command),
            output_dir=str(output_dir),
        )

        log_lines: list[str] = []

        def tail(extra: str = "") -> str:
            lines = (log_lines + ([extra] if extra else []))[
                -80:
            ]
            return "\n".join(lines)[-config.MAX_LOG_CHARS:]

        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=str(config.LHASA_DIR),
            )
        except OSError as exc:
            self._update(
                run_id,
                status="failed",
                finished_at=_now(),
                error=f"could not start lhasa.py: {exc}",
            )
            return

        assert process.stdout is not None
        for raw in process.stdout:
            line = raw.rstrip("\n")
            log_lines.append(line)
            self._update(run_id, log=tail())  # keep live status while running

        return_code = process.wait()
        if return_code != 0:
            self._update(
                run_id,
                status="failed",
                finished_at=_now(),
                log=tail(),
                error=f"lhasa.py exited with code {return_code}. "
                "See the run log for details (commonly: NASA data servers "
                "unreachable or Earthdata/PPS credentials not configured).",
            )
            return

        self._update(
            run_id,
            status="completed",
            finished_at=_now(),
            log=tail(),
            files={
                "nrt": [
                    str(f) for f in output_reader.hazard_files("nrt", output_dir)
                ],
                "fcast": [
                    str(f) for f in output_reader.hazard_files("fcast", output_dir)
                ],
            },
        )

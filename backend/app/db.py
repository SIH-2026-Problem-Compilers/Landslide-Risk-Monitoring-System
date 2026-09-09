"""SQLAlchemy engine + session for the platform's persisted data.

Defaults to a single SQLite file (zero-setup, hackathon-friendly). Set the
`LHASA_DB` env var to any SQLAlchemy DSN (e.g. a Postgres URL) for
production — the models are portable.
"""
from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from . import config

_raw_db = os.environ.get("LHASA_DB")
if _raw_db and "://" in _raw_db:
    DATABASE_URL = _raw_db
    CONNECT_ARGS: dict = {}
else:
    _db_file = Path(_raw_db) if _raw_db else config.BACKEND_DIR / "lhasa.db"
    DATABASE_URL = "sqlite:///" + _db_file.resolve().as_posix()
    CONNECT_ARGS = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=CONNECT_ARGS)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create tables (imports models so they register on Base.metadata)."""
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    return SessionLocal()

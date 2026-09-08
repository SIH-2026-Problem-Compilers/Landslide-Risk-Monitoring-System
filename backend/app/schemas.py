"""Request models for the LHASA API."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from . import config


class BBox(BaseModel):
    """Cropping window in WGS84 degrees."""

    north: float = Field(default=config.DEFAULT_BBOX["north"], ge=-90, le=90)
    south: float = Field(default=config.DEFAULT_BBOX["south"], ge=-90, le=90)
    east: float = Field(default=config.DEFAULT_BBOX["east"], ge=-180, le=180)
    west: float = Field(default=config.DEFAULT_BBOX["west"], ge=-180, le=180)


class RunCreate(BaseModel):
    """Payload for POST /api/v1/ml/runs."""

    date: Optional[str] = Field(
        default=None,
        description='UTC product time "YYYY-MM-DD HH:MM". Omit to use the '
        "latest satellite data NASA has published.",
    )
    lead: int = Field(
        default=config.DEFAULT_LEAD_DAYS,
        ge=0,
        le=5,
        description="Days of forecast to generate (0 = nowcast only).",
    )
    bbox: BBox = Field(default_factory=BBox)


class PredictRequest(BaseModel):
    """Payload for POST /api/v1/ml/predict."""

    zoneId: Optional[str] = Field(
        default=None, description="Monitoring zone id (e.g. rz-001)."
    )
    date: Optional[str] = None
    lead: int = Field(default=config.DEFAULT_LEAD_DAYS, ge=0, le=5)

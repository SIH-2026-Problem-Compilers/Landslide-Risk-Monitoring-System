"""Monitoring zones mirrored from the React frontend mock data.

LHASA outputs a global probability raster. To feed the frontend's zone-based
views we sample that raster at each zone's coordinates. These zones are the
same 10 districts/zones the prototype UI already knows about, so ids and names
match what is rendered on the map and the predictions page.
"""
from __future__ import annotations

MONITORING_ZONES: list[dict] = [
    {
        "id": "rz-001",
        "name": "Sindhupalchok North",
        "district": "Sindhupalchok",
        "state": "Bagmati",
        "latitude": 27.85,
        "longitude": 85.72,
        "population": 12400,
    },
    {
        "id": "rz-002",
        "name": "Dolakha Ridge",
        "district": "Dolakha",
        "state": "Bagmati",
        "latitude": 27.68,
        "longitude": 86.10,
        "population": 8200,
    },
    {
        "id": "rz-003",
        "name": "Makwanpur Valley",
        "district": "Makwanpur",
        "state": "Bagmati",
        "latitude": 27.42,
        "longitude": 84.99,
        "population": 15600,
    },
    {
        "id": "rz-004",
        "name": "Gorkha Hills",
        "district": "Gorkha",
        "state": "Gandaki",
        "latitude": 28.21,
        "longitude": 84.63,
        "population": 9800,
    },
    {
        "id": "rz-005",
        "name": "Nuwakot Lowlands",
        "district": "Nuwakot",
        "state": "Bagmati",
        "latitude": 27.91,
        "longitude": 85.25,
        "population": 6500,
    },
    {
        "id": "rz-006",
        "name": "Rasuwa Corridor",
        "district": "Rasuwa",
        "state": "Bagmati",
        "latitude": 28.11,
        "longitude": 85.33,
        "population": 4200,
    },
    {
        "id": "rz-007",
        "name": "Dhading Terraces",
        "district": "Dhading",
        "state": "Bagmati",
        "latitude": 27.87,
        "longitude": 84.93,
        "population": 11000,
    },
    {
        "id": "rz-008",
        "name": "Sindhuli Slopes",
        "district": "Sindhuli",
        "state": "Bagmati",
        "latitude": 27.22,
        "longitude": 85.97,
        "population": 7300,
    },
    {
        "id": "rz-009",
        "name": "Kavre Highlands",
        "district": "Kavrepalanchok",
        "state": "Bagmati",
        "latitude": 27.58,
        "longitude": 85.55,
        "population": 18000,
    },
    {
        "id": "rz-010",
        "name": "Ramechhap Basin",
        "district": "Ramechhap",
        "state": "Bagmati",
        "latitude": 27.33,
        "longitude": 86.08,
        "population": 5600,
    },
]


def zone_by_id(zone_id: str) -> dict | None:
    return next((z for z in MONITORING_ZONES if z["id"] == zone_id), None)


def zones_by_ids(zone_ids: list[str]) -> list[dict]:
    return [z for z in MONITORING_ZONES if z["id"] in zone_ids]

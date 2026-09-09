"""Monitoring zones for the North Eastern Region (India).

These zones are mirrored from the React frontend mock data so ids and names
match what is rendered on the map and the predictions page. They cover all
eight NER states (one pilot district per state, a few states get two), which
is the pilot geography for the early-warning platform.

LHASA outputs a global probability raster; the API samples it (or scores the
model) at each zone's coordinates.
"""
from __future__ import annotations

MONITORING_ZONES: list[dict] = [
    # ---- Arunachal Pradesh ----
    {
        "id": "rz-001",
        "name": "Bomdila Slopes",
        "district": "West Kameng",
        "state": "Arunachal Pradesh",
        "latitude": 27.08,
        "longitude": 92.42,
        "population": 95400,
    },
    {
        "id": "rz-002",
        "name": "Itanagar Hills",
        "district": "Papum Pare",
        "state": "Arunachal Pradesh",
        "latitude": 27.10,
        "longitude": 93.62,
        "population": 176500,
    },
    # ---- Assam ----
    {
        "id": "rz-003",
        "name": "Haflong Highlands",
        "district": "Dima Hasao",
        "state": "Assam",
        "latitude": 25.16,
        "longitude": 93.02,
        "population": 213000,
    },
    # ---- Manipur ----
    {
        "id": "rz-004",
        "name": "Senapati Ridge",
        "district": "Senapati",
        "state": "Manipur",
        "latitude": 25.26,
        "longitude": 94.03,
        "population": 380000,
    },
    # ---- Meghalaya ----
    {
        "id": "rz-005",
        "name": "Shillong Plateau Edge",
        "district": "East Khasi Hills",
        "state": "Meghalaya",
        "latitude": 25.57,
        "longitude": 91.88,
        "population": 383000,
    },
    {
        "id": "rz-006",
        "name": "Tura Ridge",
        "district": "West Garo Hills",
        "state": "Meghalaya",
        "latitude": 25.51,
        "longitude": 90.22,
        "population": 642000,
    },
    # ---- Mizoram ----
    {
        "id": "rz-007",
        "name": "Aizawl Escarpment",
        "district": "Aizawl",
        "state": "Mizoram",
        "latitude": 23.73,
        "longitude": 92.72,
        "population": 400000,
    },
    {
        "id": "rz-008",
        "name": "Lunglei Ghats",
        "district": "Lunglei",
        "state": "Mizoram",
        "latitude": 22.88,
        "longitude": 92.73,
        "population": 161000,
    },
    # ---- Nagaland ----
    {
        "id": "rz-009",
        "name": "Kohima Ridge",
        "district": "Kohima",
        "state": "Nagaland",
        "latitude": 25.67,
        "longitude": 94.11,
        "population": 270000,
    },
    {
        "id": "rz-010",
        "name": "Phek Escarpment",
        "district": "Phek",
        "state": "Nagaland",
        "latitude": 25.67,
        "longitude": 94.45,
        "population": 163000,
    },
    # ---- Sikkim ----
    {
        "id": "rz-011",
        "name": "Mangan NH-10 Corridor",
        "district": "Mangan",
        "state": "Sikkim",
        "latitude": 27.51,
        "longitude": 88.53,
        "population": 43700,
    },
    {
        "id": "rz-012",
        "name": "Gangtok Escarpment",
        "district": "Gangtok",
        "state": "Sikkim",
        "latitude": 27.33,
        "longitude": 88.62,
        "population": 283000,
    },
    # ---- Tripura ----
    {
        "id": "rz-013",
        "name": "Dhalai Slopes",
        "district": "Dhalai",
        "state": "Tripura",
        "latitude": 23.93,
        "longitude": 91.85,
        "population": 378000,
    },
]

# Full state names used for filters and labels.
NER_STATES = sorted({zone["state"] for zone in MONITORING_ZONES})


def zone_by_id(zone_id: str) -> dict | None:
    return next((z for z in MONITORING_ZONES if z["id"] == zone_id), None)


def zones_by_ids(zone_ids: list[str]) -> list[dict]:
    return [z for z in MONITORING_ZONES if z["id"] in zone_ids]

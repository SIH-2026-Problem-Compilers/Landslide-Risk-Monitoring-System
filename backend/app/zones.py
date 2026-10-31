"""Monitoring zones across India's landslide-prone belt.

Two groups, ids are stable and mirrored by the React frontend mock data so
the map/predictions views always match the API:

  rz-001..rz-013  North Eastern Region (8 states: Arunachal, Assam, Manipur,
                  Meghalaya, Mizoram, Nagaland, Sikkim, Tripura)
  rz-014..rz-027  Rest of the Indian hazard belt: Himachal Pradesh,
                  Uttarakhand, Jammu & Kashmir, West Bengal (Darjeeling),
                  Maharashtra (Western Ghats), Kerala, Karnataka, Tamil Nadu

LHASA outputs a global probability raster; the API samples it (or scores the
model) at each zone's coordinates.
"""
from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

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
    # ---- Himachal Pradesh ----
    {
        "id": "rz-014",
        "name": "Kinnaur Valleys",
        "district": "Kinnaur",
        "state": "Himachal Pradesh",
        "latitude": 31.53,
        "longitude": 78.26,
        "population": 84000,
    },
    {
        "id": "rz-015",
        "name": "Shimla Ridge",
        "district": "Shimla",
        "state": "Himachal Pradesh",
        "latitude": 31.10,
        "longitude": 77.17,
        "population": 187000,
    },
    # ---- Uttarakhand ----
    {
        "id": "rz-016",
        "name": "Joshimath Slopes",
        "district": "Chamoli",
        "state": "Uttarakhand",
        "latitude": 30.55,
        "longitude": 79.56,
        "population": 138000,
    },
    {
        "id": "rz-017",
        "name": "Kedarnath Valley",
        "district": "Rudraprayag",
        "state": "Uttarakhand",
        "latitude": 30.26,
        "longitude": 79.06,
        "population": 106000,
    },
    # ---- Jammu & Kashmir ----
    {
        "id": "rz-018",
        "name": "Kishtwar Hills",
        "district": "Kishtwar",
        "state": "Jammu and Kashmir",
        "latitude": 33.31,
        "longitude": 75.77,
        "population": 119000,
    },
    {
        "id": "rz-019",
        "name": "Anantnag Valleys",
        "district": "Anantnag",
        "state": "Jammu and Kashmir",
        "latitude": 33.73,
        "longitude": 75.15,
        "population": 900000,
    },
    # ---- West Bengal (Darjeeling Himalaya) ----
    {
        "id": "rz-020",
        "name": "Darjeeling Himalaya",
        "district": "Darjeeling",
        "state": "West Bengal",
        "latitude": 27.04,
        "longitude": 88.26,
        "population": 1500000,
    },
    {
        "id": "rz-021",
        "name": "Kalimpong Ridges",
        "district": "Kalimpong",
        "state": "West Bengal",
        "latitude": 27.22,
        "longitude": 88.47,
        "population": 150000,
    },
    # ---- Maharashtra (Western Ghats / Konkan escarpment) ----
    {
        "id": "rz-022",
        "name": "Mahabaleshwar Escarpment",
        "district": "Satara",
        "state": "Maharashtra",
        "latitude": 17.93,
        "longitude": 73.66,
        "population": 100000,
    },
    {
        "id": "rz-023",
        "name": "Raigad Sahyadri",
        "district": "Raigad",
        "state": "Maharashtra",
        "latitude": 18.09,
        "longitude": 73.40,
        "population": 1000000,
    },
    # ---- Kerala (Western Ghats) ----
    {
        "id": "rz-024",
        "name": "Wayanad Ghats",
        "district": "Wayanad",
        "state": "Kerala",
        "latitude": 11.68,
        "longitude": 76.13,
        "population": 817000,
    },
    {
        "id": "rz-025",
        "name": "Idukki High Ranges",
        "district": "Idukki",
        "state": "Kerala",
        "latitude": 9.85,
        "longitude": 76.97,
        "population": 1100000,
    },
    # ---- Karnataka ----
    {
        "id": "rz-026",
        "name": "Kodagu Hills",
        "district": "Kodagu",
        "state": "Karnataka",
        "latitude": 12.42,
        "longitude": 75.74,
        "population": 545000,
    },
    # ---- Tamil Nadu ----
    {
        "id": "rz-027",
        "name": "Nilgiri Slopes",
        "district": "The Nilgiris",
        "state": "Tamil Nadu",
        "latitude": 11.41,
        "longitude": 76.69,
        "population": 735000,
    },
]

# Full state names used for filters and labels.
NER_STATES = sorted({zone["state"] for zone in MONITORING_ZONES})


def zone_by_id(zone_id: str) -> dict | None:
    return next((z for z in MONITORING_ZONES if z["id"] == zone_id), None)


def zones_by_ids(zone_ids: list[str]) -> list[dict]:
    return [z for z in MONITORING_ZONES if z["id"] in zone_ids]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two WGS84 points, in kilometres."""
    radius = 6371.0088
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    return 2 * radius * asin(sqrt(a))


def nearest_zone(lat: float, lon: float) -> tuple[dict, float]:
    """Closest monitoring zone to a coordinate: ``(zone, distance_km)``."""
    closest = MONITORING_ZONES[0]
    closest_km = haversine_km(lat, lon, closest["latitude"], closest["longitude"])
    for zone in MONITORING_ZONES[1:]:
        distance = haversine_km(lat, lon, zone["latitude"], zone["longitude"])
        if distance < closest_km:
            closest, closest_km = zone, distance
    return closest, closest_km

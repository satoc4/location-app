from __future__ import annotations

from math import atan2, cos, radians, sin, sqrt

EARTH_RADIUS_METERS = 6_371_000


def distance_meters(a: dict, b: dict) -> float:
    lat1 = radians(float(a["lat"]))
    lat2 = radians(float(b["lat"]))
    delta_lat = radians(float(b["lat"]) - float(a["lat"]))
    delta_lng = radians(float(b["lng"]) - float(a["lng"]))

    hav = (
        sin(delta_lat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(delta_lng / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * atan2(sqrt(hav), sqrt(1 - hav))


def point_in_place(point: dict, place: dict, accuracy_meters: float = 0) -> bool:
    geometry = place.get("geometry", {})
    geometry_type = geometry.get("type")

    if geometry_type == "circle":
        radius = float(geometry.get("radiusMeters", 50))
        return (
            distance_meters(point, geometry["center"])
            <= radius + max(0, float(accuracy_meters or 0))
        )

    if geometry_type == "point":
        radius = float(geometry.get("radiusMeters", 50))
        return (
            distance_meters(point, geometry)
            <= radius + max(0, float(accuracy_meters or 0))
        )

    if geometry_type == "polygon":
        return _point_in_polygon(point, geometry.get("coordinates", []))

    return False


def _point_in_polygon(point: dict, polygon: list[dict]) -> bool:
    if len(polygon) < 3:
        return False

    x = float(point["lng"])
    y = float(point["lat"])
    inside = False
    previous = polygon[-1]

    for current in polygon:
        xi = float(current["lng"])
        yi = float(current["lat"])
        xj = float(previous["lng"])
        yj = float(previous["lat"])

        crosses = (yi > y) != (yj > y)
        if crosses:
            x_intersection = (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
            if x < x_intersection:
                inside = not inside
        previous = current

    return inside


def place_center(place: dict) -> dict | None:
    geometry = place.get("geometry", {})
    geometry_type = geometry.get("type")
    if geometry_type == "circle":
        return geometry.get("center")
    if geometry_type == "point":
        return {"lat": geometry.get("lat"), "lng": geometry.get("lng")}
    if geometry_type == "polygon":
        coordinates = geometry.get("coordinates", [])
        if not coordinates:
            return None
        return {
            "lat": sum(float(item["lat"]) for item in coordinates) / len(coordinates),
            "lng": sum(float(item["lng"]) for item in coordinates) / len(coordinates),
        }
    return None


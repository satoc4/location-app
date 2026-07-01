from __future__ import annotations


def default_state() -> dict:
    return {
        "places": [
            {
                "id": "place_station_area",
                "name": "Station Area",
                "category": "station",
                "description": "Starting area for the demo route.",
                "geometry": {
                    "type": "circle",
                    "center": {"lat": 35.681236, "lng": 139.767125},
                    "radiusMeters": 180,
                },
                "qrCode": "STATION_GATE",
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            },
            {
                "id": "place_shopping_street",
                "name": "Shopping Street",
                "category": "shopping_street",
                "description": "Commercial street where visitors should stay.",
                "geometry": {
                    "type": "circle",
                    "center": {"lat": 35.680300, "lng": 139.769000},
                    "radiusMeters": 220,
                },
                "qrCode": "SHOPPING_STREET_GATE",
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            },
            {
                "id": "place_station_cafe",
                "name": "Station Cafe",
                "category": "cafe",
                "description": "A nearby cafe for short waiting-time actions.",
                "geometry": {
                    "type": "circle",
                    "center": {"lat": 35.681600, "lng": 139.768000},
                    "radiusMeters": 90,
                },
                "qrCode": "STATION_CAFE",
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            },
            {
                "id": "place_castle_ruins",
                "name": "Castle Ruins",
                "category": "tourist_spot",
                "description": "Destination spot for the demo route.",
                "geometry": {
                    "type": "circle",
                    "center": {"lat": 35.682200, "lng": 139.771500},
                    "radiusMeters": 180,
                },
                "qrCode": "CASTLE_GATE",
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            },
            {
                "id": "place_riverside_park",
                "name": "Riverside Park",
                "category": "park",
                "description": "A slower weekend destination near the river.",
                "geometry": {
                    "type": "circle",
                    "center": {"lat": 35.683100, "lng": 139.769900},
                    "radiusMeters": 200,
                },
                "qrCode": "RIVERSIDE_PARK_GATE",
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            },
        ],
        "plans": [
            {
                "id": "plan_shopping_street_demo",
                "title": "Shopping street route to the castle ruins",
                "objective": "increase_shopping_street_visits",
                "description": (
                    "A two hour route from the station through the shopping "
                    "street before arriving at the castle ruins."
                ),
                "sponsorName": "Demo Shopping Street Association",
                "status": "published",
                "target": {
                    "transportMode": ["walk"],
                    "visitorType": ["tourist", "day_trip"],
                    "timeWindow": "10:00-16:00",
                },
                "durationMinutes": 120,
                "walkingDistanceMeters": 1600,
                "crowdingLevel": "low",
                "recommendationReason": (
                    "Avoid the direct crowded route and spend time in the local shops."
                ),
                "priority": 10,
                "steps": [
                    {
                        "id": "step_station_start",
                        "type": "enter_area",
                        "title": "Start at the station area",
                        "placeId": "place_station_area",
                    },
                    {
                        "id": "step_shopping_enter",
                        "type": "enter_area",
                        "title": "Arrive at the shopping street",
                        "placeId": "place_shopping_street",
                    },
                    {
                        "id": "step_shopping_stay",
                        "type": "stay",
                        "title": "Stay in the shopping street for 10 minutes",
                        "placeId": "place_shopping_street",
                        "minMinutes": 10,
                    },
                    {
                        "id": "step_castle_arrive",
                        "type": "enter_area",
                        "title": "Arrive at the castle ruins",
                        "placeId": "place_castle_ruins",
                    },
                ],
                "reward": {
                    "type": "coupon",
                    "amount": 200,
                    "currency": "JPY",
                    "description": "200 JPY coupon usable in the shopping street.",
                    "expiresInDays": 14,
                },
                "billing": {
                    "costPerCompletion": 300,
                    "budgetCap": 100000,
                    "budgetSpent": 0,
                    "maxCompletions": 333,
                    "completions": 0,
                },
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            },
            {
                "id": "plan_waiting_time_cafe_demo",
                "title": "Station cafe break while you wait",
                "objective": "activate_waiting_time",
                "description": (
                    "A compact action for visitors who have a little time "
                    "before the next train or meetup."
                ),
                "sponsorName": "Demo Station Cafe",
                "status": "published",
                "target": {
                    "transportMode": ["walk"],
                    "visitorType": ["commuter", "tourist"],
                    "timeWindow": "08:00-20:00",
                },
                "durationMinutes": 25,
                "walkingDistanceMeters": 450,
                "crowdingLevel": "low",
                "recommendationReason": (
                    "Turn spare waiting time into a nearby cafe stop with a short stay check."
                ),
                "priority": 9,
                "steps": [
                    {
                        "id": "step_wait_station_start",
                        "type": "enter_area",
                        "title": "Start at the station area",
                        "placeId": "place_station_area",
                    },
                    {
                        "id": "step_station_cafe_arrive",
                        "type": "enter_area",
                        "title": "Arrive at the station cafe",
                        "placeId": "place_station_cafe",
                    },
                    {
                        "id": "step_station_cafe_stay",
                        "type": "stay",
                        "title": "Stay at the cafe for 12 minutes",
                        "placeId": "place_station_cafe",
                        "minMinutes": 12,
                    },
                ],
                "reward": {
                    "type": "coupon",
                    "amount": 120,
                    "currency": "JPY",
                    "description": "120 JPY coupon usable at the station cafe.",
                    "expiresInDays": 7,
                },
                "billing": {
                    "costPerCompletion": 180,
                    "budgetCap": 60000,
                    "budgetSpent": 0,
                    "maxCompletions": 333,
                    "completions": 0,
                },
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            },
            {
                "id": "plan_weekend_riverside_demo",
                "title": "Weekend riverside walk through local shops",
                "objective": "weekend_tourism",
                "description": (
                    "A relaxed weekend route that connects the station, "
                    "shopping street, and riverside park."
                ),
                "sponsorName": "Demo Riverside Tourism Board",
                "status": "published",
                "target": {
                    "transportMode": ["walk"],
                    "visitorType": ["tourist", "family", "day_trip"],
                    "timeWindow": "09:00-17:00",
                },
                "durationMinutes": 75,
                "walkingDistanceMeters": 1300,
                "crowdingLevel": "low",
                "recommendationReason": (
                    "Make a slower weekend loop with a local shopping stop before the river."
                ),
                "priority": 8,
                "steps": [
                    {
                        "id": "step_weekend_station_start",
                        "type": "enter_area",
                        "title": "Start at the station area",
                        "placeId": "place_station_area",
                    },
                    {
                        "id": "step_weekend_shopping_enter",
                        "type": "enter_area",
                        "title": "Stop by the shopping street",
                        "placeId": "place_shopping_street",
                    },
                    {
                        "id": "step_weekend_riverside_arrive",
                        "type": "enter_area",
                        "title": "Arrive at the riverside park",
                        "placeId": "place_riverside_park",
                    },
                    {
                        "id": "step_weekend_riverside_stay",
                        "type": "stay",
                        "title": "Stay near the river for 8 minutes",
                        "placeId": "place_riverside_park",
                        "minMinutes": 8,
                    },
                ],
                "reward": {
                    "type": "coupon",
                    "amount": 300,
                    "currency": "JPY",
                    "description": "300 JPY coupon usable at participating weekend shops.",
                    "expiresInDays": 14,
                },
                "billing": {
                    "costPerCompletion": 420,
                    "budgetCap": 120000,
                    "budgetSpent": 0,
                    "maxCompletions": 285,
                    "completions": 0,
                },
                "createdAt": "2026-06-27T00:00:00+00:00",
                "updatedAt": "2026-06-27T00:00:00+00:00",
            }
        ],
        "itineraryItems": [],
        "actionRuns": [],
        "verificationEvents": [],
        "achievements": [],
        "rewards": [],
        "webhookEvents": [],
        "auditLogs": [],
    }


def merge_seed_defaults(state: dict) -> bool:
    defaults = default_state()
    changed = False

    for key, value in defaults.items():
        if key not in state:
            state[key] = value
            changed = True

    for collection in ("places", "plans"):
        existing_ids = {item.get("id") for item in state.get(collection, [])}
        for item in defaults[collection]:
            if item["id"] in existing_ids:
                continue
            state.setdefault(collection, []).append(item)
            existing_ids.add(item["id"])
            changed = True

    return changed

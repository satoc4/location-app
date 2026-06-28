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


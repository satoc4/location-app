from __future__ import annotations

import unittest

from geoaction_backend.seed import default_state
from geoaction_backend import services


class ActionEngineTest(unittest.TestCase):
    def test_demo_route_completes_and_issues_reward(self) -> None:
        state = default_state()
        action = services.start_action(
            state,
            {"userId": "user_001", "planId": "plan_shopping_street_demo"},
        )

        services.add_action_event(
            state,
            action["id"],
            {
                "type": "location",
                "lat": 35.681236,
                "lng": 139.767125,
                "recordedAt": "2026-06-27T10:00:00+09:00",
            },
        )
        services.add_action_event(
            state,
            action["id"],
            {
                "type": "location",
                "lat": 35.680300,
                "lng": 139.769000,
                "recordedAt": "2026-06-27T10:10:00+09:00",
            },
        )
        services.add_action_event(
            state,
            action["id"],
            {
                "type": "location",
                "lat": 35.680300,
                "lng": 139.769000,
                "recordedAt": "2026-06-27T10:20:00+09:00",
            },
        )
        result = services.add_action_event(
            state,
            action["id"],
            {
                "type": "location",
                "lat": 35.682200,
                "lng": 139.771500,
                "recordedAt": "2026-06-27T10:35:00+09:00",
            },
        )

        self.assertEqual(result["actionRun"]["status"], "completed")
        self.assertEqual(len(state["achievements"]), 1)
        self.assertEqual(state["achievements"][0]["billingAmount"], 300)
        self.assertEqual(len(state["rewards"]), 1)
        self.assertEqual(state["rewards"][0]["amount"], 200)
        self.assertEqual(state["plans"][0]["billing"]["budgetSpent"], 300)

    def test_stay_resets_when_user_leaves_area(self) -> None:
        state = default_state()
        action = services.start_action(
            state,
            {"userId": "user_001", "planId": "plan_shopping_street_demo"},
        )

        services.add_action_event(
            state,
            action["id"],
            {
                "type": "location",
                "lat": 35.681236,
                "lng": 139.767125,
                "recordedAt": "2026-06-27T10:00:00+09:00",
            },
        )
        services.add_action_event(
            state,
            action["id"],
            {
                "type": "location",
                "lat": 35.680300,
                "lng": 139.769000,
                "recordedAt": "2026-06-27T10:05:00+09:00",
            },
        )
        services.add_action_event(
            state,
            action["id"],
            {
                "type": "location",
                "lat": 35.700000,
                "lng": 139.790000,
                "recordedAt": "2026-06-27T10:08:00+09:00",
            },
        )

        current = services.get_action_run(state, action["id"])
        stay_step = current["steps"][2]
        self.assertEqual(stay_step["status"], "pending")
        self.assertEqual(stay_step["elapsedSeconds"], 0)


class CandidateTest(unittest.TestCase):
    def test_candidates_include_published_budget_available_plan(self) -> None:
        state = default_state()
        candidates = services.list_plan_candidates(
            state,
            lat=35.681236,
            lng=139.767125,
        )

        self.assertEqual(candidates[0]["id"], "plan_shopping_street_demo")
        self.assertEqual(candidates[0]["distanceMeters"], 0)
        stay_step = candidates[0]["stepsSummary"][2]
        self.assertEqual(stay_step["type"], "stay")
        self.assertEqual(stay_step["minMinutes"], 10)


if __name__ == "__main__":
    unittest.main()

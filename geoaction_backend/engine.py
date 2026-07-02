from __future__ import annotations

from datetime import timedelta

from .events import append_webhook_event
from .geometry import point_in_place
from .utils import as_iso, new_id, now_iso, parse_iso


class DomainError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def initialize_progress(plan: dict) -> list[dict]:
    return [
        {
            "stepId": step["id"],
            "title": step.get("title", step["type"]),
            "type": step["type"],
            "placeId": step.get("placeId"),
            "minMinutes": step.get("minMinutes"),
            "status": "pending",
            "enteredAt": None,
            "elapsedSeconds": 0,
            "completedAt": None,
            "verificationMethod": None,
        }
        for step in plan.get("steps", [])
    ]


def record_verification_event(state: dict, action_run_id: str, payload: dict) -> dict:
    action_run = _find_one(state["actionRuns"], action_run_id, "action run")
    if action_run["status"] == "completed":
        return {"actionRun": action_run, "event": None, "completedSteps": []}
    if action_run["status"] not in {"started", "in_progress"}:
        raise DomainError(f"Action run cannot accept events in status {action_run['status']}")

    plan = _find_one(state["plans"], action_run["planId"], "plan")
    event = _build_event(state, action_run, payload)
    state["verificationEvents"].append(event)
    action_run["eventIds"].append(event["id"])
    action_run["status"] = "in_progress"

    completed_steps = _advance_progress(state, plan, action_run, event)
    if _all_steps_completed(action_run):
        _complete_action_run(state, plan, action_run, event)

    action_run["updatedAt"] = now_iso()
    return {
        "actionRun": action_run,
        "event": event,
        "completedSteps": completed_steps,
    }


def _build_event(state: dict, action_run: dict, payload: dict) -> dict:
    event_type = payload.get("type")
    if event_type not in {"location", "qr_scan"}:
        raise DomainError("event type must be location or qr_scan")

    recorded_at = as_iso(parse_iso(payload.get("recordedAt")))
    event = {
        "id": new_id("ver"),
        "actionRunId": action_run["id"],
        "userId": action_run["userId"],
        "planId": action_run["planId"],
        "type": event_type,
        "recordedAt": recorded_at,
        "matchedPlaceIds": [],
    }

    if event_type == "location":
        if "lat" not in payload or "lng" not in payload:
            raise DomainError("location event requires lat and lng")
        event["lat"] = float(payload["lat"])
        event["lng"] = float(payload["lng"])
        event["accuracyMeters"] = float(payload.get("accuracyMeters", 0))
        point = {"lat": event["lat"], "lng": event["lng"]}
        event["matchedPlaceIds"] = [
            place["id"]
            for place in state["places"]
            if point_in_place(point, place, event["accuracyMeters"])
        ]

    if event_type == "qr_scan":
        if "qrCode" not in payload:
            raise DomainError("qr_scan event requires qrCode")
        event["qrCode"] = str(payload["qrCode"])
        event["matchedPlaceIds"] = [
            place["id"]
            for place in state["places"]
            if place.get("qrCode") == event["qrCode"]
        ]

    return event


def _advance_progress(state: dict, plan: dict, action_run: dict, event: dict) -> list[dict]:
    completed_steps = []

    while action_run["currentStepIndex"] < len(plan.get("steps", [])):
        index = action_run["currentStepIndex"]
        step = plan["steps"][index]
        progress = action_run["steps"][index]

        completed = _try_complete_step(step, progress, event)
        if not completed:
            break

        completed_steps.append(progress)
        action_run["currentStepIndex"] += 1
        append_webhook_event(
            state,
            "action.step_completed",
            {
                "actionRunId": action_run["id"],
                "planId": action_run["planId"],
                "userId": action_run["userId"],
                "stepId": step["id"],
                "stepType": step["type"],
                "completedAt": progress["completedAt"],
            },
            plan_id=action_run["planId"],
            user_id=action_run["userId"],
            action_run_id=action_run["id"],
        )

    return completed_steps


def _try_complete_step(step: dict, progress: dict, event: dict) -> bool:
    if progress["status"] == "completed":
        return True

    step_type = step["type"]
    place_id = step.get("placeId")
    event_time = parse_iso(event["recordedAt"])

    if step_type in {"enter_area", "via"}:
        if place_id in event["matchedPlaceIds"]:
            _mark_step_completed(progress, event, "gps_or_qr")
            return True
        return False

    if step_type == "qr_checkin":
        if place_id in event["matchedPlaceIds"] or event.get("qrCode") == step.get("qrCode"):
            _mark_step_completed(progress, event, "qr")
            return True
        return False

    if step_type == "stay":
        if place_id not in event["matchedPlaceIds"]:
            progress["enteredAt"] = None
            progress["elapsedSeconds"] = 0
            if progress["status"] != "completed":
                progress["status"] = "pending"
            return False

        if not progress.get("enteredAt"):
            progress["enteredAt"] = event["recordedAt"]
            progress["status"] = "in_progress"

        entered_at = parse_iso(progress["enteredAt"])
        elapsed = max(0, int((event_time - entered_at).total_seconds()))
        progress["elapsedSeconds"] = elapsed
        min_seconds = int(float(step.get("minMinutes", 0)) * 60)
        if elapsed >= min_seconds:
            _mark_step_completed(progress, event, "gps_stay")
            return True
        return False

    if step_type == "time_window":
        if not _event_in_time_window(step, event_time):
            return False
        if place_id and place_id not in event["matchedPlaceIds"]:
            return False
        _mark_step_completed(progress, event, "time_window")
        return True

    raise DomainError(f"Unsupported step type: {step_type}")


def _event_in_time_window(step: dict, event_time) -> bool:
    start_after = step.get("startAfter")
    end_before = step.get("endBefore")
    if start_after and event_time < parse_iso(start_after):
        return False
    if end_before and event_time > parse_iso(end_before):
        return False
    return True


def _mark_step_completed(progress: dict, event: dict, method: str) -> None:
    progress["status"] = "completed"
    progress["completedAt"] = event["recordedAt"]
    progress["verificationMethod"] = method


def _complete_action_run(state: dict, plan: dict, action_run: dict, event: dict) -> None:
    achievement = _create_achievement(state, plan, action_run, event)
    reward = None

    if achievement["billingStatus"] == "billable":
        reward = _issue_reward(state, plan, action_run, achievement)
        achievement["rewardStatus"] = "issued"
        achievement["rewardId"] = reward["id"]

    action_run["status"] = "completed"
    action_run["completedAt"] = achievement["verifiedAt"]
    action_run["achievementId"] = achievement["id"]

    place_index = {p["id"]: p for p in state.get("places", [])}
    completed_place_names = list(dict.fromkeys(
        place_index[step["placeId"]]["name"]
        for step in plan.get("steps", [])
        if step.get("placeId") and step["placeId"] in place_index
    ))
    user_achievements = [a for a in state["achievements"] if a["userId"] == action_run["userId"]]
    action_run["experienceSummary"] = {
        "planTitle": plan["title"],
        "sponsorName": plan.get("sponsorName", ""),
        "rewardAmount": int(plan.get("reward", {}).get("amount", 0)),
        "rewardCurrency": plan.get("reward", {}).get("currency", "JPY"),
        "durationMinutes": plan.get("durationMinutes", 0),
        "completedPlaceNames": completed_place_names,
        "streakCount": _compute_streak(user_achievements),
    }

    append_webhook_event(
        state,
        "action.completed",
        {
            "achievementId": achievement["id"],
            "actionRunId": action_run["id"],
            "planId": plan["id"],
            "userId": action_run["userId"],
            "verifiedAt": achievement["verifiedAt"],
            "billingAmount": achievement["billingAmount"],
            "rewardAmount": achievement["rewardAmount"],
        },
        plan_id=plan["id"],
        user_id=action_run["userId"],
        action_run_id=action_run["id"],
        achievement_id=achievement["id"],
    )

    if reward:
        append_webhook_event(
            state,
            "reward.issued",
            {
                "rewardId": reward["id"],
                "achievementId": achievement["id"],
                "planId": plan["id"],
                "userId": action_run["userId"],
                "amount": reward["amount"],
                "type": reward["type"],
            },
            plan_id=plan["id"],
            user_id=action_run["userId"],
            action_run_id=action_run["id"],
            achievement_id=achievement["id"],
        )


def _create_achievement(state: dict, plan: dict, action_run: dict, event: dict) -> dict:
    billing = plan.setdefault("billing", {})
    cost = int(billing.get("costPerCompletion", 0))
    cap = int(billing.get("budgetCap", 0))
    spent = int(billing.get("budgetSpent", 0))
    max_completions = int(billing.get("maxCompletions", 0))
    completions = int(billing.get("completions", 0))
    budget_ok = (cap <= 0 or spent + cost <= cap) and (
        max_completions <= 0 or completions + 1 <= max_completions
    )

    if budget_ok:
        billing["budgetSpent"] = spent + cost
        billing["completions"] = completions + 1
        billing_status = "billable"
        billing_amount = cost
    else:
        billing_status = "budget_exhausted"
        billing_amount = 0
        append_webhook_event(
            state,
            "budget.exhausted",
            {
                "planId": plan["id"],
                "budgetCap": cap,
                "budgetSpent": spent,
                "maxCompletions": max_completions,
                "completions": completions,
            },
            plan_id=plan["id"],
            user_id=action_run["userId"],
            action_run_id=action_run["id"],
        )

    reward = plan.get("reward", {})
    achievement = {
        "id": new_id("ach"),
        "userId": action_run["userId"],
        "planId": plan["id"],
        "actionRunId": action_run["id"],
        "status": "verified",
        "verifiedAt": event["recordedAt"],
        "verificationMethod": "gps_qr_mvp",
        "rewardStatus": "not_issued",
        "billingStatus": billing_status,
        "billingAmount": billing_amount,
        "rewardAmount": int(reward.get("amount", 0)) if budget_ok else 0,
    }
    state["achievements"].append(achievement)
    return achievement


def _issue_reward(state: dict, plan: dict, action_run: dict, achievement: dict) -> dict:
    reward_config = plan.get("reward", {})
    issued_at = parse_iso(achievement["verifiedAt"])
    expires_in_days = int(reward_config.get("expiresInDays", 14))
    reward = {
        "id": new_id("rew"),
        "userId": action_run["userId"],
        "planId": plan["id"],
        "actionRunId": action_run["id"],
        "achievementId": achievement["id"],
        "type": reward_config.get("type", "coupon"),
        "amount": int(reward_config.get("amount", 0)),
        "currency": reward_config.get("currency", "JPY"),
        "description": reward_config.get("description", ""),
        "status": "issued",
        "issuedAt": achievement["verifiedAt"],
        "expiresAt": as_iso(issued_at + timedelta(days=expires_in_days)),
    }
    state["rewards"].append(reward)
    return reward


def _compute_streak(achievements: list[dict]) -> int:
    if not achievements:
        return 0
    dates = sorted({a["verifiedAt"][:10] for a in achievements}, reverse=True)
    streak = 1
    for i in range(1, len(dates)):
        y1, m1, d1 = (int(x) for x in dates[i - 1].split("-"))
        y2, m2, d2 = (int(x) for x in dates[i].split("-"))
        prev = y1 * 365 + m1 * 30 + d1
        curr = y2 * 365 + m2 * 30 + d2
        if prev - curr == 1:
            streak += 1
        else:
            break
    return streak


def _all_steps_completed(action_run: dict) -> bool:
    return all(step["status"] == "completed" for step in action_run.get("steps", []))


def _find_one(items: list[dict], item_id: str, label: str) -> dict:
    for item in items:
        if item["id"] == item_id:
            return item
    raise DomainError(f"{label} not found: {item_id}", status=404)

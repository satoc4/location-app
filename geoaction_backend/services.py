from __future__ import annotations

from .engine import DomainError, initialize_progress, record_verification_event
from .events import append_audit_log, append_webhook_event
from .geometry import distance_meters, place_center
from .utils import new_id, now_iso


def list_places(state: dict, category: str | None = None) -> list[dict]:
    places = state["places"]
    if category:
        places = [place for place in places if place.get("category") == category]
    return sorted(places, key=lambda item: item["name"])


def create_place(state: dict, body: dict, actor: str = "api") -> dict:
    _require(body, "name")
    _validate_geometry(body.get("geometry"))
    timestamp = now_iso()
    place = {
        "id": body.get("id") or new_id("place"),
        "name": body["name"],
        "category": body.get("category", "custom"),
        "description": body.get("description", ""),
        "geometry": body["geometry"],
        "qrCode": body.get("qrCode"),
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    _ensure_unique_id(state["places"], place["id"], "place")
    state["places"].append(place)
    append_audit_log(state, actor, "create", "place", place["id"])
    return place


def get_place(state: dict, place_id: str) -> dict:
    return _find_one(state["places"], place_id, "place")


def list_plans(state: dict, status: str | None = None, objective: str | None = None) -> list[dict]:
    plans = state["plans"]
    if status:
        plans = [plan for plan in plans if plan.get("status") == status]
    if objective:
        plans = [plan for plan in plans if plan.get("objective") == objective]
    return sorted(plans, key=lambda item: (-int(item.get("priority", 0)), item["title"]))


def create_plan(state: dict, body: dict, actor: str = "api") -> dict:
    for key in ("title", "objective", "sponsorName", "steps", "reward", "billing"):
        _require(body, key)

    _validate_steps(state, body["steps"])
    timestamp = now_iso()
    plan = {
        "id": body.get("id") or new_id("plan"),
        "title": body["title"],
        "objective": body["objective"],
        "description": body.get("description", ""),
        "sponsorName": body["sponsorName"],
        "status": body.get("status", "draft"),
        "target": body.get("target", {}),
        "durationMinutes": int(body.get("durationMinutes", 0)),
        "walkingDistanceMeters": int(body.get("walkingDistanceMeters", 0)),
        "crowdingLevel": body.get("crowdingLevel", "unknown"),
        "recommendationReason": body.get("recommendationReason", ""),
        "priority": int(body.get("priority", 0)),
        "steps": [_normalize_step(step) for step in body["steps"]],
        "reward": _normalize_reward(body["reward"]),
        "billing": _normalize_billing(body["billing"]),
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    _ensure_unique_id(state["plans"], plan["id"], "plan")
    state["plans"].append(plan)
    append_audit_log(state, actor, "create", "plan", plan["id"])
    return plan


def get_plan(state: dict, plan_id: str) -> dict:
    return _find_one(state["plans"], plan_id, "plan")


def update_plan(state: dict, plan_id: str, body: dict, actor: str = "api") -> dict:
    plan = get_plan(state, plan_id)
    allowed = {
        "title",
        "objective",
        "description",
        "sponsorName",
        "status",
        "target",
        "durationMinutes",
        "walkingDistanceMeters",
        "crowdingLevel",
        "recommendationReason",
        "priority",
        "reward",
        "billing",
        "steps",
    }
    for key, value in body.items():
        if key not in allowed:
            raise DomainError(f"Unsupported plan field: {key}")
        if key == "steps":
            _validate_steps(state, value)
            plan[key] = [_normalize_step(step) for step in value]
        elif key == "reward":
            plan[key] = _normalize_reward(value)
        elif key == "billing":
            plan[key] = {**plan.get("billing", {}), **_normalize_billing(value, partial=True)}
        else:
            plan[key] = value
    plan["updatedAt"] = now_iso()
    append_audit_log(state, actor, "update", "plan", plan_id, {"fields": sorted(body.keys())})
    return plan


def list_plan_candidates(
    state: dict,
    lat: float | None = None,
    lng: float | None = None,
    limit: int = 20,
    user_id: str | None = None,
    current_hour: int | None = None,
) -> list[dict]:
    origin = {"lat": lat, "lng": lng} if lat is not None and lng is not None else None

    # 直近7日の達成済みplanIdを除外対象に
    excluded_plan_ids: set[str] = set()
    if user_id:
        today = now_iso()[:10]
        for a in state.get("achievements", []):
            if a.get("userId") != user_id:
                continue
            date = a.get("verifiedAt", "")[:10]
            if date and today >= date and _days_diff(today, date) < 7:
                excluded_plan_ids.add(a.get("planId", ""))

    candidates = []

    for plan in state["plans"]:
        if plan.get("status") != "published" or not _budget_available(plan):
            continue

        # 除外済みプランをスキップ
        if plan["id"] in excluded_plan_ids:
            continue

        # タイムウィンドウフィルタ（例: "08:00-20:00"）
        if current_hour is not None:
            time_window = plan.get("target", {}).get("timeWindow")
            if time_window and not _in_time_window(time_window, current_hour):
                continue

        distance = None
        if origin:
            distance = _distance_to_first_place(state, plan, origin)

        reward_amount = int(plan.get("reward", {}).get("amount", 0))
        score = int(plan.get("priority", 0)) * 10 + reward_amount / 100
        if distance is not None:
            score -= distance / 250

        candidates.append(
            {
                "id": plan["id"],
                "title": plan["title"],
                "objective": plan.get("objective"),
                "sponsorName": plan.get("sponsorName"),
                "durationMinutes": plan.get("durationMinutes"),
                "walkingDistanceMeters": plan.get("walkingDistanceMeters"),
                "crowdingLevel": plan.get("crowdingLevel"),
                "recommendationReason": plan.get("recommendationReason"),
                "reward": plan.get("reward"),
                "stepsSummary": [
                    {
                        "id": step["id"],
                        "type": step["type"],
                        "title": step.get("title"),
                        "placeId": step.get("placeId"),
                        "minMinutes": step.get("minMinutes"),
                    }
                    for step in plan.get("steps", [])
                ],
                "distanceMeters": round(distance) if distance is not None else None,
                "score": round(score, 2),
            }
        )

    sorted_candidates = sorted(candidates, key=lambda item: item["score"], reverse=True)

    # プランが不足している場合はタイムウィンドウ除外を解除してフォールバック
    if len(sorted_candidates) < 3 and current_hour is not None:
        return list_plan_candidates(
            state, lat=lat, lng=lng, limit=limit,
            user_id=user_id, current_hour=None
        )

    return sorted_candidates[:limit]


def add_plan_to_itinerary(state: dict, plan_id: str, body: dict) -> dict:
    _require(body, "userId")
    plan = get_plan(state, plan_id)
    item = {
        "id": new_id("itin"),
        "userId": body["userId"],
        "planId": plan_id,
        "status": "added",
        "createdAt": now_iso(),
    }
    state["itineraryItems"].append(item)
    append_webhook_event(
        state,
        "plan.added",
        {"itineraryItemId": item["id"], "planId": plan_id, "userId": body["userId"]},
        plan_id=plan_id,
        user_id=body["userId"],
    )
    return {"itineraryItem": item, "plan": plan}


def start_action(state: dict, body: dict) -> dict:
    _require(body, "userId")
    _require(body, "planId")
    plan = get_plan(state, body["planId"])
    if plan.get("status") != "published":
        raise DomainError("plan must be published before starting an action")
    if not _budget_available(plan):
        raise DomainError("plan budget is exhausted", status=409)

    timestamp = now_iso()
    action_run = {
        "id": new_id("act"),
        "userId": body["userId"],
        "planId": plan["id"],
        "status": "started",
        "currentStepIndex": 0,
        "steps": initialize_progress(plan),
        "eventIds": [],
        "startedAt": timestamp,
        "updatedAt": timestamp,
        "completedAt": None,
        "achievementId": None,
    }
    state["actionRuns"].append(action_run)
    append_webhook_event(
        state,
        "action.started",
        {"actionRunId": action_run["id"], "planId": plan["id"], "userId": body["userId"]},
        plan_id=plan["id"],
        user_id=body["userId"],
        action_run_id=action_run["id"],
    )
    return action_run


def get_action_run(state: dict, action_run_id: str) -> dict:
    return _find_one(state["actionRuns"], action_run_id, "action run")


def add_action_event(state: dict, action_run_id: str, body: dict) -> dict:
    return record_verification_event(state, action_run_id, body)


def list_achievements(
    state: dict,
    user_id: str | None = None,
    plan_id: str | None = None,
) -> list[dict]:
    items = state["achievements"]
    if user_id:
        items = [item for item in items if item["userId"] == user_id]
    if plan_id:
        items = [item for item in items if item["planId"] == plan_id]
    return sorted(items, key=lambda item: item["verifiedAt"], reverse=True)


def list_rewards(state: dict, user_id: str | None = None) -> list[dict]:
    rewards = state["rewards"]
    if user_id:
        rewards = [item for item in rewards if item["userId"] == user_id]
    return sorted(rewards, key=lambda item: item["issuedAt"], reverse=True)


def redeem_reward(state: dict, reward_id: str) -> dict:
    reward = _find_one(state["rewards"], reward_id, "reward")
    if reward["status"] != "issued":
        raise DomainError("reward is not redeemable", status=409)
    reward["status"] = "redeemed"
    reward["redeemedAt"] = now_iso()
    append_webhook_event(
        state,
        "reward.redeemed",
        {"rewardId": reward_id, "planId": reward["planId"], "userId": reward["userId"]},
        plan_id=reward["planId"],
        user_id=reward["userId"],
        action_run_id=reward["actionRunId"],
        achievement_id=reward["achievementId"],
    )
    return reward


def analytics_summary(state: dict) -> dict:
    plans = state["plans"]
    actions = state["actionRuns"]
    achievements = state["achievements"]
    rewards = state["rewards"]
    total_budget_spent = sum(
        int(plan.get("billing", {}).get("budgetSpent", 0)) for plan in plans
    )
    total_budget_cap = sum(int(plan.get("billing", {}).get("budgetCap", 0)) for plan in plans)
    started = len(actions)
    completed = len([item for item in actions if item["status"] == "completed"])
    return {
        "plans": {
            "total": len(plans),
            "published": len([item for item in plans if item.get("status") == "published"]),
        },
        "places": {"total": len(state["places"])},
        "actions": {
            "started": started,
            "completed": completed,
            "completionRate": round(completed / started, 4) if started else 0,
        },
        "achievements": {"verified": len(achievements)},
        "rewards": {
            "issued": len([item for item in rewards if item["status"] == "issued"]),
            "redeemed": len([item for item in rewards if item["status"] == "redeemed"]),
        },
        "budget": {
            "spent": total_budget_spent,
            "cap": total_budget_cap,
            "remaining": max(0, total_budget_cap - total_budget_spent),
        },
        "webhookEvents": {
            "pending": len([item for item in state["webhookEvents"] if item["status"] == "pending"]),
            "total": len(state["webhookEvents"]),
        },
    }


def get_user_stats(state: dict, user_id: str) -> dict:
    achievements = [a for a in state["achievements"] if a["userId"] == user_id]
    achievements_sorted = sorted(achievements, key=lambda a: a["verifiedAt"])

    # ストリーク計算（連続達成日数）
    streak = 0
    if achievements_sorted:
        verified_dates = sorted({a["verifiedAt"][:10] for a in achievements_sorted}, reverse=True)
        streak = 1
        for i in range(1, len(verified_dates)):
            prev = verified_dates[i - 1]
            curr = verified_dates[i]
            prev_parts = [int(x) for x in prev.split("-")]
            curr_parts = [int(x) for x in curr.split("-")]
            # 1日差なら連続とみなす（簡易実装）
            prev_days = prev_parts[0] * 365 + prev_parts[1] * 30 + prev_parts[2]
            curr_days = curr_parts[0] * 365 + curr_parts[1] * 30 + curr_parts[2]
            if prev_days - curr_days == 1:
                streak += 1
            else:
                break

    plan_counts: dict[str, int] = {}
    for a in achievements:
        plan_id = a.get("planId", "")
        plan_counts[plan_id] = plan_counts.get(plan_id, 0) + 1

    badges = []
    for plan_id, count in plan_counts.items():
        if count >= 10:
            badges.append({"type": "ambassador", "planId": plan_id, "count": count})
        elif count >= 3:
            badges.append({"type": "regular", "planId": plan_id, "count": count})

    return {
        "userId": user_id,
        "totalCompletions": len(achievements),
        "streak": streak,
        "planCounts": plan_counts,
        "badges": badges,
    }


def list_webhook_events(state: dict, event: str | None = None) -> list[dict]:
    events = state["webhookEvents"]
    if event:
        events = [item for item in events if item["event"] == event]
    return sorted(events, key=lambda item: item["createdAt"], reverse=True)


def _days_diff(date_a: str, date_b: str) -> int:
    ya, ma, da = (int(x) for x in date_a.split("-"))
    yb, mb, db = (int(x) for x in date_b.split("-"))
    return abs((ya * 365 + ma * 30 + da) - (yb * 365 + mb * 30 + db))


def _in_time_window(time_window: str, current_hour: int) -> bool:
    try:
        start, end = time_window.split("-")
        start_h = int(start.split(":")[0])
        end_h = int(end.split(":")[0])
        return start_h <= current_hour < end_h
    except Exception:
        return True


def _distance_to_first_place(state: dict, plan: dict, origin: dict) -> float | None:
    for step in plan.get("steps", []):
        place_id = step.get("placeId")
        if not place_id:
            continue
        place = _find_one(state["places"], place_id, "place")
        center = place_center(place)
        if center:
            return distance_meters(origin, center)
    return None


def _budget_available(plan: dict) -> bool:
    billing = plan.get("billing", {})
    cost = int(billing.get("costPerCompletion", 0))
    cap = int(billing.get("budgetCap", 0))
    spent = int(billing.get("budgetSpent", 0))
    max_completions = int(billing.get("maxCompletions", 0))
    completions = int(billing.get("completions", 0))
    if cap > 0 and spent + cost > cap:
        return False
    if max_completions > 0 and completions + 1 > max_completions:
        return False
    return True


def _normalize_step(step: dict) -> dict:
    _require(step, "type")
    normalized = dict(step)
    normalized["id"] = normalized.get("id") or new_id("step")
    if normalized["type"] in {"enter_area", "via", "stay", "qr_checkin", "time_window"}:
        return normalized
    raise DomainError(f"Unsupported step type: {normalized['type']}")


def _normalize_reward(reward: dict) -> dict:
    return {
        "type": reward.get("type", "coupon"),
        "amount": int(reward.get("amount", 0)),
        "currency": reward.get("currency", "JPY"),
        "description": reward.get("description", ""),
        "expiresInDays": int(reward.get("expiresInDays", 14)),
    }


def _normalize_billing(billing: dict, partial: bool = False) -> dict:
    keys = {
        "costPerCompletion",
        "budgetCap",
        "budgetSpent",
        "maxCompletions",
        "completions",
    }
    normalized = {}
    for key in keys:
        if key in billing:
            normalized[key] = int(billing[key])
    if partial:
        return normalized
    normalized.setdefault("costPerCompletion", 0)
    normalized.setdefault("budgetCap", 0)
    normalized.setdefault("budgetSpent", 0)
    normalized.setdefault("maxCompletions", 0)
    normalized.setdefault("completions", 0)
    return normalized


def _validate_geometry(geometry: dict | None) -> None:
    if not geometry:
        raise DomainError("geometry is required")
    geometry_type = geometry.get("type")
    if geometry_type == "circle":
        center = geometry.get("center", {})
        if "lat" not in center or "lng" not in center:
            raise DomainError("circle geometry requires center.lat and center.lng")
        if float(geometry.get("radiusMeters", 0)) <= 0:
            raise DomainError("circle geometry requires positive radiusMeters")
        return
    if geometry_type == "point":
        if "lat" not in geometry or "lng" not in geometry:
            raise DomainError("point geometry requires lat and lng")
        return
    if geometry_type == "polygon":
        if len(geometry.get("coordinates", [])) < 3:
            raise DomainError("polygon geometry requires at least 3 coordinates")
        return
    raise DomainError("geometry.type must be circle, point, or polygon")


def _validate_steps(state: dict, steps: list[dict]) -> None:
    if not steps:
        raise DomainError("plan requires at least one step")
    place_ids = {place["id"] for place in state["places"]}
    for step in steps:
        normalized = _normalize_step(step)
        place_id = normalized.get("placeId")
        if place_id and place_id not in place_ids:
            raise DomainError(f"unknown step placeId: {place_id}")
        if normalized["type"] == "stay" and float(normalized.get("minMinutes", 0)) <= 0:
            raise DomainError("stay step requires positive minMinutes")


def _require(body: dict, key: str) -> None:
    if key not in body or body[key] in (None, ""):
        raise DomainError(f"{key} is required")


def _ensure_unique_id(items: list[dict], item_id: str, label: str) -> None:
    if any(item["id"] == item_id for item in items):
        raise DomainError(f"{label} id already exists: {item_id}", status=409)


def _find_one(items: list[dict], item_id: str, label: str) -> dict:
    for item in items:
        if item["id"] == item_id:
            return item
    raise DomainError(f"{label} not found: {item_id}", status=404)

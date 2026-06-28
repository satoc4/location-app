from __future__ import annotations

from .utils import new_id, now_iso


def append_webhook_event(
    state: dict,
    event_name: str,
    payload: dict,
    plan_id: str | None = None,
    user_id: str | None = None,
    action_run_id: str | None = None,
    achievement_id: str | None = None,
) -> dict:
    event = {
        "id": new_id("wh"),
        "event": event_name,
        "planId": plan_id or payload.get("planId"),
        "userId": user_id or payload.get("userId"),
        "actionRunId": action_run_id or payload.get("actionRunId"),
        "achievementId": achievement_id or payload.get("achievementId"),
        "payload": payload,
        "status": "pending",
        "createdAt": now_iso(),
    }
    state["webhookEvents"].append(event)
    return event


def append_audit_log(
    state: dict,
    actor: str,
    action: str,
    target_type: str,
    target_id: str,
    details: dict | None = None,
) -> dict:
    item = {
        "id": new_id("audit"),
        "actor": actor,
        "action": action,
        "targetType": target_type,
        "targetId": target_id,
        "details": details or {},
        "createdAt": now_iso(),
    }
    state["auditLogs"].append(item)
    return item


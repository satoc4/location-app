from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .engine import DomainError
from .store import JsonStore
from . import services


class GeoActionHandler(BaseHTTPRequestHandler):
    store: JsonStore
    api_key: str | None = None

    def do_OPTIONS(self) -> None:
        self._send_json({"ok": True})

    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._dispatch("POST")

    def do_PATCH(self) -> None:
        self._dispatch("PATCH")

    def log_message(self, format: str, *args) -> None:
        if os.environ.get("GEOACTION_HTTP_LOGS") == "1":
            super().log_message(format, *args)

    def _dispatch(self, method: str) -> None:
        try:
            if method in {"POST", "PATCH"}:
                self._check_api_key()

            parsed = urlparse(self.path)
            segments = [segment for segment in parsed.path.split("/") if segment]
            query = {key: values[-1] for key, values in parse_qs(parsed.query).items()}
            body = self._read_json() if method in {"POST", "PATCH"} else {}
            response, status = self._route(method, segments, query, body)
            self._send_json(response, status=status)
        except DomainError as exc:
            self._send_json({"error": str(exc)}, status=exc.status)
        except json.JSONDecodeError:
            self._send_json({"error": "invalid JSON request body"}, status=400)
        except Exception as exc:
            self._send_json({"error": "internal server error", "detail": str(exc)}, status=500)

    def _route(
        self,
        method: str,
        segments: list[str],
        query: dict,
        body: dict,
    ) -> tuple[dict | list, int]:
        if segments == ["health"] and method == "GET":
            return {"status": "ok", "service": "geoaction-backend"}, 200

        if not segments or segments[0] != "api":
            raise DomainError("not found", status=404)

        route = segments[1:]

        if route == ["places"] and method == "GET":
            return self.store.view(lambda state: services.list_places(state, query.get("category"))), 200
        if route == ["places"] and method == "POST":
            return self.store.transaction(lambda state: services.create_place(state, body)), 201
        if len(route) == 2 and route[0] == "places" and method == "GET":
            return self.store.view(lambda state: services.get_place(state, route[1])), 200

        if route == ["plans"] and method == "GET":
            return self.store.view(
                lambda state: services.list_plans(
                    state,
                    status=query.get("status"),
                    objective=query.get("objective"),
                )
            ), 200
        if route == ["plans"] and method == "POST":
            return self.store.transaction(lambda state: services.create_plan(state, body)), 201
        if len(route) == 2 and route[0] == "plans" and method == "GET":
            return self.store.view(lambda state: services.get_plan(state, route[1])), 200
        if len(route) == 2 and route[0] == "plans" and method == "PATCH":
            return self.store.transaction(lambda state: services.update_plan(state, route[1], body)), 200
        if len(route) == 3 and route[0] == "plans" and route[2] == "add" and method == "POST":
            return self.store.transaction(lambda state: services.add_plan_to_itinerary(state, route[1], body)), 201

        if route == ["plan-candidates"] and method == "GET":
            lat = float(query["lat"]) if "lat" in query else None
            lng = float(query["lng"]) if "lng" in query else None
            limit = int(query.get("limit", 20))
            user_id = query.get("userId") or query.get("user_id")
            import datetime
            current_hour = datetime.datetime.now().hour
            return self.store.view(
                lambda state: services.list_plan_candidates(
                    state, lat=lat, lng=lng, limit=limit,
                    user_id=user_id, current_hour=current_hour
                )
            ), 200

        if route == ["actions", "start"] and method == "POST":
            return self.store.transaction(lambda state: services.start_action(state, body)), 201
        if len(route) == 2 and route[0] == "actions" and method == "GET":
            return self.store.view(lambda state: services.get_action_run(state, route[1])), 200
        if len(route) == 3 and route[0] == "actions" and route[2] == "events" and method == "POST":
            return self.store.transaction(lambda state: services.add_action_event(state, route[1], body)), 201

        if route == ["achievements"] and method == "GET":
            return self.store.view(
                lambda state: services.list_achievements(
                    state,
                    user_id=query.get("user_id") or query.get("userId"),
                    plan_id=query.get("plan_id") or query.get("planId"),
                )
            ), 200

        if route == ["rewards"] and method == "GET":
            return self.store.view(
                lambda state: services.list_rewards(state, user_id=query.get("user_id") or query.get("userId"))
            ), 200
        if len(route) == 3 and route[0] == "rewards" and route[2] == "redeem" and method == "POST":
            return self.store.transaction(lambda state: services.redeem_reward(state, route[1])), 200

        if route == ["analytics", "summary"] and method == "GET":
            return self.store.view(services.analytics_summary), 200

        if len(route) == 2 and route[0] == "users" and route[1] == "stats" and method == "GET":
            user_id = query.get("userId") or query.get("user_id")
            if not user_id:
                return {"error": "userId is required"}, 400
            return self.store.view(lambda state: services.get_user_stats(state, user_id)), 200

        if route == ["webhook-events"] and method == "GET":
            return self.store.view(lambda state: services.list_webhook_events(state, query.get("event"))), 200

        raise DomainError("not found", status=404)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _send_json(self, value, status: int = 200) -> None:
        payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def _check_api_key(self) -> None:
        if not self.api_key:
            return
        if self.headers.get("X-API-Key") != self.api_key:
            raise DomainError("invalid or missing X-API-Key", status=401)


def build_server(host: str, port: int, db_path: str | None = None) -> ThreadingHTTPServer:
    store = JsonStore(db_path)
    api_key = os.environ.get("GEOACTION_API_KEY")

    class Handler(GeoActionHandler):
        pass

    Handler.store = store
    Handler.api_key = api_key
    return ThreadingHTTPServer((host, port), Handler)


def main() -> None:
    parser = argparse.ArgumentParser(description="GeoAction Travel MVP backend")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    parser.add_argument("--db", default=os.environ.get("GEOACTION_DB_PATH"))
    args = parser.parse_args()

    server = build_server(args.host, args.port, args.db)
    print(f"GeoAction backend listening on http://{args.host}:{args.port}")
    print(f"Database: {server.RequestHandlerClass.store.path}")
    server.serve_forever()


if __name__ == "__main__":
    main()


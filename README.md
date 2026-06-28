# location-app

GeoAction Travel MVP backend.

This first backend slice follows `geoaction_travel_direction_requirements.md` and
focuses on the demo route:

```text
station area -> shopping street stay -> tourist spot arrival -> coupon reward
```

The implementation intentionally uses only the Python standard library, so it can
run in a fresh environment without package installation.

## Run

```bash
python3 -m geoaction_backend.server --host 127.0.0.1 --port 8000
```

The server creates `data/geoaction.local.json` on first start. That file is local
runtime data and is ignored by git.

Optional write API key:

```bash
GEOACTION_API_KEY=dev-secret python3 -m geoaction_backend.server
```

When `GEOACTION_API_KEY` is set, `POST` and `PATCH` requests require:

```text
X-API-Key: dev-secret
```

## Test

```bash
python3 -m unittest
```

## Core API

Health:

```bash
curl http://127.0.0.1:8000/health
```

Plan candidates near the demo station:

```bash
curl "http://127.0.0.1:8000/api/plan-candidates?lat=35.681236&lng=139.767125"
```

Start an action:

```bash
curl -X POST http://127.0.0.1:8000/api/actions/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_001","planId":"plan_shopping_street_demo"}'
```

Send location verification events:

```bash
curl -X POST http://127.0.0.1:8000/api/actions/{actionRunId}/events \
  -H "Content-Type: application/json" \
  -d '{"type":"location","lat":35.681236,"lng":139.767125,"recordedAt":"2026-06-27T10:00:00+09:00"}'

curl -X POST http://127.0.0.1:8000/api/actions/{actionRunId}/events \
  -H "Content-Type: application/json" \
  -d '{"type":"location","lat":35.680300,"lng":139.769000,"recordedAt":"2026-06-27T10:10:00+09:00"}'

curl -X POST http://127.0.0.1:8000/api/actions/{actionRunId}/events \
  -H "Content-Type: application/json" \
  -d '{"type":"location","lat":35.680300,"lng":139.769000,"recordedAt":"2026-06-27T10:20:00+09:00"}'

curl -X POST http://127.0.0.1:8000/api/actions/{actionRunId}/events \
  -H "Content-Type: application/json" \
  -d '{"type":"location","lat":35.682200,"lng":139.771500,"recordedAt":"2026-06-27T10:35:00+09:00"}'
```

After the final event, the action is completed, an achievement is recorded, the
plan budget is consumed, and a coupon reward is issued.

Useful reads:

```bash
curl http://127.0.0.1:8000/api/achievements
curl http://127.0.0.1:8000/api/rewards?userId=user_001
curl http://127.0.0.1:8000/api/analytics/summary
curl http://127.0.0.1:8000/api/webhook-events
```

## MVP entities

- `Place`: point/circle/polygon area with optional QR code.
- `Plan`: published tourism candidate with ordered verification steps.
- `ActionRun`: a user-started plan execution with step progress.
- `VerificationEvent`: GPS or QR event used for inspection.
- `Achievement`: verified completed action used as billing evidence.
- `Reward`: issued coupon/benefit.
- `WebhookEvent`: pending event log for future outbound delivery.

## Implemented MVP step types

- `enter_area`: GPS/QR match against a place.
- `via`: alias for passing through a place.
- `stay`: continuous stay in a place for `minMinutes`.
- `qr_checkin`: QR based check-in.
- `time_window`: time-dispersal condition, optionally tied to a place.

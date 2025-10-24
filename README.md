# Caller Cloud Dialer MVP Monorepo

This repository provides an MVP skeleton for a cloud-based auto dialer with on-device takeover alerts. It is organised as a JavaScript/TypeScript monorepo with Android client and infrastructure automation.

## Repository layout

```
.
├── README.md
├── Makefile
├── .env.example
├── package.json (npm workspaces root)
├── packages
│   └── backend              # Express + BullMQ + Prisma service
├── apps
│   └── android              # Kotlin app with FCM full-screen alerts
├── infra
│   ├── docker-compose.yml   # Postgres, Redis, Adminer
│   └── .env.example
└── .github
    └── workflows
        └── ci.yml           # Lint, typecheck, test, build
```

## Prerequisites

- Node.js 20+
- npm 9+
- Docker + Docker Compose v2
- Android Studio (to work on the Android client)

## Getting started

1. **Copy environment variables**

   ```bash
   cp .env.example .env
   cp packages/backend/.env.example packages/backend/.env
   ```

   Adjust secrets before running services. The backend loads configuration via `dotenv`.

2. **Bootstrap infrastructure**

   ```bash
   make infra-up
   ```

   This provisions PostgreSQL, Redis, and Adminer locally.

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Run database migrations**

   ```bash
   cd packages/backend
   npx prisma migrate deploy
   ```

   Seed at least one `RuleSet` so that task creation succeeds. A minimal example inserts a "human answer" matcher:

   ```bash
   npx prisma db execute --stdin <<'SQL'
   INSERT INTO "RuleSet" (id, name, config)
   VALUES ('humans-only', 'Human answer detection', '{"answeredBy":["human"]}')
   ON CONFLICT (id) DO NOTHING;
   SQL
   ```

5. **Start the backend**

   ```bash
   npm run dev
   ```

   The API exposes:

   - `GET /health` – liveness probe
   - `GET /ready` – readiness probe
   - `GET /docs` – Swagger UI backed by generated OpenAPI schema
   - `GET /docs.json` – raw OpenAPI document generated from Zod schemas
   - `POST /api/tasks` – create a cloud dial task (numbers, rule set, retry window)
   - `GET /api/tasks/:id` – inspect task progress and attempt history
   - `POST /api/tasks/:id/stop` – emergency stop that cancels pending calls
   - `POST /webhooks/twilio/voice` – Twilio status callbacks
   - `GET|POST /webhooks/twilio/answer` – TwiML generator that starts media streaming

6. **Expose webhooks via ngrok**

   Twilio must reach your local backend. In a separate terminal run:

   ```bash
   ngrok http --domain=<your-ngrok-subdomain> 3000
   ```

   Update `PUBLIC_BASE_URL` and `MEDIA_STREAM_BASE_URL` in `packages/backend/.env` to point at the HTTPS / WSS endpoints that ngrok prints. In the [Twilio Console](https://console.twilio.com/), configure the Voice status callback URL to `https://<domain>/webhooks/twilio/voice` and the call control webhook to `https://<domain>/webhooks/twilio/answer`.

7. **Manual end-to-end dial test**

   The following commands create a task, observe a retry, and complete the bridge when Twilio reports a match. Replace the phone numbers before running.

   ```bash
   export BASE_URL="https://<your-ngrok-domain>"
   export RULE_SET_ID="humans-only"

   TASK_ID=$(curl -sS -X POST "$BASE_URL/api/tasks" \
     -H 'Content-Type: application/json' \
     -d '{
       "numbers": ["+15558675310", "+15558675311"],
       "userPhone": "+15551230000",
       "ruleSetId": "'""$RULE_SET_ID""'",
       "perNumberMaxAttempts": 2,
       "globalMaxAttempts": 4,
       "backoffPolicy": {"initialSeconds": 15, "multiplier": 2, "maxSeconds": 120, "jitterRatio": 0.2}
     }' | jq -r .taskId)

   echo "Task ID: $TASK_ID"

   watch -n 5 "curl -sS $BASE_URL/api/tasks/$TASK_ID | jq '{status, attempts}'"
   ```

   During the first failed attempt (e.g. busy or no answer), Twilio reports the status to `/webhooks/twilio/voice`, BullMQ schedules a retry with exponential backoff, and the Android client receives `{taskId, number, match:true}` via FCM only when a rule-set match occurs. Once matched, the backend dials `userPhone` and bridges the legs through a Twilio conference.

8. **Generate OpenAPI artefacts**

   ```bash
   npm run generate
   ```

   This writes `packages/backend/src/generated/openapi.json` and `types.d.ts` for client consumption.

9. **Android app**

   - Open `apps/android` in Android Studio.
   - Add your `google-services.json` for Firebase Cloud Messaging.
   - Configure FCM channel/notifications as needed (see TODO markers).
   - Run the `AlertActivity` to test full-screen takeover UI. The emergency stop button currently posts to a placeholder backend URL.

10. **Shut down infrastructure**

   ```bash
   make infra-down
   ```

## npm scripts

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Starts the backend with hot reload via `tsx`     |
| `npm run lint`     | ESLint (TypeScript + import order rules)         |
| `npm run typecheck`| TypeScript compiler in noEmit mode               |
| `npm run test`     | Vitest suite (currently covers health endpoints) |
| `npm run build`    | Emits ESM build to `packages/backend/dist`       |
| `npm run generate` | Outputs OpenAPI spec + TypeScript definitions    |

## Continuous integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, then runs linting, type-checking, tests, and builds to ensure the scaffold stays green.

## Next steps

- Add real-time media stream ingestion endpoints and transcription fan-out.
- Implement readiness checks that verify Redis, PostgreSQL, and Twilio connectivity.
- Extend the Android client to consume task progress and cancellation events from the new REST APIs.
- Harden FCM delivery with per-device tokens instead of the shared topic used in the MVP.

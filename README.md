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

4. **Run database migrations (placeholder)**

   ```bash
   cd packages/backend
   npx prisma migrate dev --name init
   ```

   > TODO: Define real Prisma migrations for call sessions, media events, and audit logs.

5. **Start the backend**

   ```bash
   npm run dev
   ```

   The API exposes:

   - `GET /health` – liveness probe
   - `GET /ready` – readiness probe (TODO: hook up real checks)
   - `GET /docs` – Swagger UI backed by generated OpenAPI schema
   - `GET /docs.json` – raw OpenAPI document generated from Zod schemas
   - `POST /calls/outbound` – queues an outbound dial job via BullMQ (Twilio integration TODO)

6. **Generate OpenAPI artefacts**

   ```bash
   npm run generate
   ```

   This writes `packages/backend/src/generated/openapi.json` and `types.d.ts` for client consumption.

7. **Android app**

   - Open `apps/android` in Android Studio.
   - Add your `google-services.json` for Firebase Cloud Messaging.
   - Configure FCM channel/notifications as needed (see TODO markers).
   - Run the `AlertActivity` to test full-screen takeover UI. The emergency stop button currently posts to a placeholder backend URL.

8. **Shut down infrastructure**

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

- Implement Twilio Programmable Voice workers that dial and bridge calls.
- Wire up Twilio Media Streams to forward audio into Deepgram or Google Cloud Speech-to-Text.
- Replace placeholder readiness checks with real Redis/PostgreSQL diagnostics.
- Complete Android network wiring to target the backend REST endpoints and handle cancellation state.

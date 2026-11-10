# Local development

The frontend uses `http://127.0.0.1:5173` by default. Requisitions are at `/procurement/requisitions` after logging in as an **approved client** (role 3). The backend also checks approval and company ownership.

## Full local mode

Use a separate, fully populated development PostgreSQL database. The earlier `procurement_day2_test` database only contains a minimal test schema and is not suitable for the whole application. Never use the hosted production database for local testing.

In `NexaPort_Backend/.env.development.local` set `PORT=5000`, `DB_HOST=127.0.0.1`, `DB_PORT=<local PostgreSQL port>`, `DB_NAME=<isolated development database>`, `DB_USER`, `DB_PASSWORD`, and `JWT_SECRET`. This file is ignored by Git. The backend refuses to start in development when `DB_HOST` is not local. Apply the application schema and procurement migration to this database, and provision an approved client account with a client company and vessel.

In `NexaPort_Frontend/.env.development.local` set:

```dotenv
VITE_API_MODE=local
VITE_LOCAL_API_BASE_URL=http://127.0.0.1:5000/api
```

From the backend directory run `npm run dev`. From the frontend directory run `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Open `http://127.0.0.1:5173/procurement/requisitions`. Use **New requisition**, select an owned vessel and destination port, add an IMPA catalogue product or manual line, save, then reopen it from **Procurement**. Refresh to verify it persists.

## Hosted API mode

Only for read-only development against the hosted service, set `VITE_API_MODE=hosted` in the frontend development file and restart Vite. This intentionally selects the deployed backend. Do not create or edit test data in this mode.

## Production

The production build uses `VITE_API_BASE_URL` or the existing deployed backend URL. The development mode setting does not affect production builds. There is no automatic failover from the local API to the hosted API.

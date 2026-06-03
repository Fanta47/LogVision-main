# LogVision Next.js Frontend

This is a Next.js recreation of the uploaded Lovable/TanStack LogVision interface.
It keeps the visual direction of the Lovable platform but removes the dependency on the Lovable/Supabase backend for logs, anomalies and ML data.

## Data architecture

Frontend -> FastAPI LogVision backend -> uploads/raw/{application_key}/{component_name}/{upload_uid}.log -> Logstash -> Elasticsearch -> ETL -> PostgreSQL -> ML service / LogBERT-like model -> PostgreSQL + Kibana.

## Required backend endpoints

The frontend expects these FastAPI endpoints:

- `POST /api/logs/upload`
- `GET /api/logs/uploads`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/recent-events`
- `GET /api/ml/anomalies`
- `GET /api/ml/model-comparison`
- `POST /api/ml/score`

## Environment

Copy `.env.local.example` to `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_KIBANA_DASHBOARD_URL=http://localhost:5601/app/dashboards#/view/YOUR_DASHBOARD_ID?embed=true
```

## Run

```cmd
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Demo login emails:

```text
user@vermeg.com
manager@vermeg.com
admin@vermeg.com
```

Any password works in this frontend-only demo. Replace `lib/auth.ts` with Keycloak integration when ready.

## Important integration notes

- Upload page uses real LogVision application/component names.
- Accepted upload types are `.log` and `.txt`.
- Kibana is embedded via `NEXT_PUBLIC_KIBANA_DASHBOARD_URL`.
- API calls are centralized in `lib/api.ts`.
- The frontend intentionally does not use Supabase tables for logs or anomalies.
<<<<<<< HEAD
=======

## Authentication modes
- Demo: NEXT_PUBLIC_AUTH_MODE=demo
- Keycloak: NEXT_PUBLIC_AUTH_MODE=keycloak with NEXT_PUBLIC_KEYCLOAK_URL, NEXT_PUBLIC_KEYCLOAK_REALM, NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
- Demo accounts: admin@vermeg.com, manager@vermeg.com, user@vermeg.com (any password)

## Forgot password flow
- User sends request from /forgot-password
- Admin reviews on /dashboard/admin/password-requests
- Future TODO: backend Keycloak Admin API execute-actions-email UPDATE_PASSWORD

## Routes
- Admin: /dashboard/admin/system, /dashboard/admin/users, /dashboard/admin/roles, /dashboard/admin/alert-rules, /dashboard/admin/password-requests, /dashboard/admin/configuration
- Manager: /dashboard/manager
- User: /dashboard, /dashboard/logs, /dashboard/alerts, /dashboard/anomalies, /dashboard/incidents, /dashboard/ingest, /dashboard/reports, /dashboard/profile
>>>>>>> 494bacd (Save workspace snapshot)

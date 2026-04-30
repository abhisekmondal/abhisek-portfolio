# Resume Builder

A full-page React resume builder with editable sections, live preview, local autosave, template controls, JSON import/export, and browser-based PDF export.

## Features

- Profile, summary, experience, skills, projects, education, and certifications editors
- Live A4-style resume preview
- Modern, Classic, and Compact template modes
- Accent color and density controls
- Local browser autosave
- PostgreSQL-backed cloud save/load API
- Resume library for loading, copying, and deleting saved database resumes
- Anonymous browser workspace IDs so database resumes are scoped per browser
- Email/password accounts with JWT-authenticated resume libraries
- Import/export resume data as JSON
- Print dialog export for saving as PDF
- Neutral fictional sample resume for first-run onboarding
- API-side payload validation, scoped resume ownership, CORS allow-listing, rate limiting, and request IDs
- Separate frontend/API deployment support with Dockerized API and external PostgreSQL

## Tech Stack

- React 19
- CRA + Craco
- Tailwind CSS
- Lucide Icons

## Run Locally

```bash
npm install
npm run start:api
npm run start
```

Open `http://localhost:3000`. The API runs on `http://localhost:4000`.

Create a local `.env` from `.env.example` if you need different database settings.

```bash
API_PORT=4000
CORS_ORIGIN=http://localhost:3000
PGHOST=10.0.2.90
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=postgres
REACT_APP_API_URL=http://localhost:4000
JWT_SECRET=replace-with-a-long-random-secret
JSON_LIMIT=512kb
RATE_LIMIT_MAX=300
TRUST_PROXY=false
PGSSLMODE=disable
```

The API initializes the `users` and `resumes` tables automatically. The resume table includes anonymous workspace ownership and optional account ownership:

```sql
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'default',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner_email TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The frontend sends an `x-client-id` header generated and stored in localStorage. This is an anonymous workspace boundary for development; replace it with authenticated user IDs before public launch.

Users can also create an account from the sidebar. When signed in, database resume list/save/load/delete operations are scoped to that user account instead of the anonymous browser workspace.

When a user signs in or registers, resumes saved under that browser workspace are automatically claimed into the account.

## Production Notes

- Set `NODE_ENV=production` and a strong `JWT_SECRET`; the API refuses to boot with the development secret in production.
- Set `CORS_ORIGIN` to your deployed frontend origin. Multiple origins can be comma-separated.
- Use `DATABASE_URL` for hosted PostgreSQL. Set `PGSSLMODE=require` when your provider requires TLS.
- If the API is behind a reverse proxy, set `TRUST_PROXY=true` so rate limiting uses the forwarded client IP.
- The app remains usable with local autosave when the API is unavailable; cloud save/load actions surface the outage in the UI.

## Production Build

```bash
npm run build
```

The static build is written to `./build`.

## Deployment

This project is set up for combined frontend/API Docker deployment with an external database:

- Frontend: React production build served by a small Node static server container.
- API: Dockerized Node/Express service.
- Database: external PostgreSQL, usually from a managed provider.

### Docker Compose

Create a production env file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
JWT_SECRET=replace-with-a-long-random-production-secret
DATABASE_URL=postgresql://user:password@db-host:5432/database
PGSSLMODE=require
CORS_ORIGIN=https://your-frontend-domain.com
REACT_APP_API_URL=https://your-api-domain.com
WEB_PORT=8080
API_PORT=4000
```

Start frontend and API:

```bash
docker compose up --build -d
```

Check service health:

```bash
docker compose ps
curl http://localhost:4000/api/health
docker compose logs -f api
```

Open the frontend:

```text
http://localhost:8080
```

The API initializes its required tables in the external PostgreSQL database on startup.

For production, put TLS in front of both services with your platform load balancer, reverse proxy, or managed container service. `REACT_APP_API_URL` must be the browser-visible HTTPS API URL, and `CORS_ORIGIN` must match the deployed frontend URL.

### Static Frontend Only

If you deploy the frontend to a static host instead of Docker Compose, build it with the public API URL baked in:

```bash
npm install
REACT_APP_API_URL=https://api.your-domain.com npm run build
```

Deploy the generated `build/` folder.

For Windows PowerShell:

```bash
$env:REACT_APP_API_URL="https://api.your-domain.com"
npm run build
```

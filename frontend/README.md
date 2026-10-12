# Frontend

The React frontend for SkillPulse lives in the repository root, not in this
folder — it is a **React 19 + TypeScript + Tailwind CSS v4 + Recharts** app built
with the Next.js App Router so the UI and its REST layer ship as one deployable:

```
src/app/            pages (Dashboard, Market Search, Skills, Roles, Skill Gap, Roadmap, History)
src/app/api/        REST route handlers
src/components/     app shell, charts, panels, skill picker, UI kit
src/hooks/          global market store (useSyncExternalStore)
src/lib/            analytics engine, SerpAPI service, demo generator, persistence
```

Run it:

```bash
npm install
npx drizzle-kit push
npm run dev          # http://localhost:3000
```

## Using the Python FastAPI backend instead

`backend/` implements the **same REST contract** (see `docs/ARCHITECTURE.md` §1).
Start it and point any React client — including a plain Vite SPA — at it:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000     # docs at /docs
```

```ts
// services/api.ts in a Vite SPA
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const api = {
  search: (query: string, location = "India") =>
    fetch(`${BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, location, limit: 40 }),
    }).then((r) => r.json()),
};
```

CORS for `http://localhost:5173` is already allowed via `CORS_ORIGINS` in
`backend/.env.example`.

### Routes implemented by both stacks

`GET /health` · `GET /api/status` · `POST|GET /api/search` · `POST /api/demo` ·
`GET /api/market/overview` · `GET /api/skills` · `GET /api/skills/{slug}` ·
`GET /api/roles` · `GET /api/companies` · `GET|POST /api/skill-gap` ·
`POST /api/roadmap` · `POST /api/market-report` · `GET /api/history` ·
`GET|DELETE /api/history/{id}` · `GET /api/export/{id}`

# Project Structure & Tooling

Inventrix is a **pnpm workspace monorepo**. Use pnpm, never npm or yarn.

```
packages/
  frontend/   React 18 + Vite 5 + TypeScript SPA
  api/        Express 4 + TypeScript + better-sqlite3
```

## Commands
- Install: `pnpm install` (from repo root)
- Dev: `pnpm dev` (runs api + frontend together)
- Build: `pnpm build`
- Target a package: `pnpm --filter api <script>` / `pnpm --filter frontend <script>`

## Conventions
- TypeScript everywhere; no plain `.js` source files.
- API uses ES modules (`"type": "module"`) — local imports must include the `.js` extension.
- Keep code in the correct package: shared server logic in `api/src`, UI in `frontend/src`.
- API layers: `routes/` (HTTP), `middleware/` (cross-cutting), `services/` (business/integration), `db.ts` (data access).
- Frontend talks to the API via relative `/api/...` paths (proxied in dev and by nginx in prod). Do not hardcode hosts/ports.

# Task board — Mario

T-004. A proper site, Vite + React, not a single static HTML file. The kanban
reads tickets from Supabase, table `public.tickets`, project
`https://mezmipuyoedxgeszublx.supabase.co`, five statuses only: Todo, Working,
Blocked, Ready for Review, Done. Drag and drop, add / edit / delete, Realtime.

Live: https://task-board-nine-steel.vercel.app/
Repo: https://github.com/marioprasetyo/task-board

## Run it

```sh
npm install
npm run dev
```

## Env vars

Set these in Vercel, never in code or in the repo. Only the publishable /
anon key is used, never a service_role key.

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, or
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (the names the Supabase-Vercel integration sets)

If the vars are missing, the app shows an error state, not a key box. The
key is never typed in the browser anymore.

## Build

```sh
npm run build   # writes dist/
npm run preview # serves dist/ locally
```

Vercel detects Vite automatically: build command `npm run build`, output
directory `dist`.

## Pages

- `/` — the board
- `/sql-editor.html` — the SQL editor page, from `public/sql-editor.html`,
  runs the tickets SQL via the Supabase Management API with a PAT pasted
  once in the browser, never in code or the repo.

## Sources

- Board data: `~/workspace/team/board.md`, via Rapi
- Tickets SQL: `~/workspace/team/support/supabase-tickets.sql`, seed T-001 to T-005
- Live design: `~/workspace/team/explorations/jelajah-2026-11-17-kanban-live.md`

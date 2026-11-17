# Task board — Mario

T-004. A proper site, Vite + React + TypeScript, Tailwind v4, shadcn/ui where
it fits, not a single static HTML file. The kanban reads tickets from
Supabase, table `public.tickets`, project
`https://mezmipuyoedxgeszublx.supabase.co`, five statuses only: Todo, Working,
Blocked, Ready for Review, Done. Drag and drop, add / edit / delete, Realtime.

Live: https://task-board-nine-steel.vercel.app/
Repo: https://github.com/marioprasetyo/task-board

Design: Taste Skill app-screen route — quiet panels, aligned figures, colour
spent on data. One palette, dark Nomi theme. Tailwind v4 tokens for type,
colour, spacing, and iconography. Task Row is `src/components/TaskRow.tsx`,
TypeScript types, built on shadcn/ui Button and Badge.
Inspo reference: Linear, from inspomcp.dev — stark dark aesthetic, clean
functional typography, content hierarchy, focused and efficient, a dark
minimalist dashboard and issue tracker. The board copies its layout, palette,
and type decisions, not its copy or brand. Loading uses a skeleton reveal,
moving a ticket to Done shows a success check, and status chips filter the
board, from Transitions.dev and Beautiful UI. The board itself uses the
Kanban Board primitives in src/components/ui/kanban-board.tsx, adapted from
Kanban Board by victor-teles, 21st.dev, published 2026-10-18: FLIP
drag-and-drop, keyboard movement with Ctrl + Left / Right, empty states, and
a drop slot that grows to the card's height, no dnd-kit, value and
onValueChange. The original source comes with a free 21st.dev account, so
the primitives were built to its published API. Dragging or moving a card
between columns writes the new status to Supabase through onValueChange.
Every ticket card shows its
category as a neutral chip next to the Ticket ID, from the 17 categories
Mario approved, Product, Design, Dev, Team, Skill, Social, Explore, Finance,
Misc, Marketing, Sales, Research, Content, Operations, Personal, Learning,
Admin, stored in Supabase as public.tickets.category, default Misc, and
changeable in the add and edit forms. The connection panel shows a
Realtime dot: green when the channel is subscribed, red when it failed, grey
while checking, plus a Test live updates button. The test adds a test ticket
T-999 and waits for the live event to bring it onto the board, then removes
it. If no event arrives in 10 seconds, the test says Realtime is off for
public.tickets and points to the SQL editor page.

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

## Auto-deploy

Pushes to `main` do NOT auto-deploy to Vercel yet, because the GitHub repo
is not linked to the Vercel project. Link it once in Vercel: open project
`task-board-nine-steel`, Settings, Git, Connect GitHub repo
`marioprasetyo/task-board`, branch `main`, build command `npm run build`,
output directory `dist`. Vercel installs its GitHub App and creates the
webhook, so every push to `main` deploys. Confirm the env vars above are set
in Settings, Environment Variables, then redeploy. There is no token-free
way to link it from the GitHub side alone: the webhook URL and secret are
issued by Vercel when the repo is linked, and a GitHub Action deploy needs
a Vercel token, which is never shared in chat.

## Pages

- `/` — the board
- `/sql-editor.html` — the SQL editor page, from `public/sql-editor.html`,
  runs the tickets SQL via the Supabase Management API with a PAT pasted
  once in the browser, never in code or the repo.

## Sources

- Board data: `~/workspace/team/board.md`, via Rapi
- Tickets SQL: `~/workspace/team/support/supabase-tickets.sql`, seed T-001 to T-005
- Live design: `~/workspace/team/explorations/jelajah-2026-11-17-kanban-live.md`

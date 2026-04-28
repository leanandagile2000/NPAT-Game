# NPAT — Name, Place, Animal, Thing

Multiplayer browser party game built with **Next.js**. Each round uses a random letter **A–Z**; players submit four English answers starting with that letter: **name**, **place**, **animal**, and **thing**. For the full “How to Play” copy in the UI, open **`/rules`** after starting the app locally or on your deployment.

---

## What the game is

- **Rounds:** One random letter per round. Letters **do not repeat** until all 26 have been used in the current cycle; then a new cycle begins.
- **Categories:** Name (first name), place (geographic), animal, thing (common English noun — not a proper noun or brand alone).
- **Scoring:** **0 or 1 point** per field per round, from **server-side validation** (letter prefix + category rules). The UI shows **this round + running total**. The **host** can **end the game** anytime; only **completed** rounds (timer ended and scoring ran) count. **Ties** = co-winners.
- **Language:** English-only for answers and validation.

---

## How people play

1. **Host:** Home → **Set Up New Game** → display name + round length (1–5 min, default 2) → get a **shareable link** and join code (flower-themed slug).
2. **Players:** Open the link or **Join a Game** → **display name only** (no accounts). Names are **unique per game**.
3. **Lobby:** **2–8** players. Host sees the roster and confirms duration before the first start.
4. **Play:** Host **starts the game** and **starts each round**. Everyone sees the letter, four fields, and a **countdown**.
5. **Scoring:** When time is up, the server locks answers, validates, and scores; results and totals appear.
6. **End:** Host can end anytime. If the host goes stale, **another player** may be **promoted to host** (by join order).

---

## Architecture

| Concern | Approach |
|--------|----------|
| **App** | Next.js **App Router** — [`src/app/`](src/app/) (`/`, `/create`, `/join`, `/g/[code]`, `/rules`). |
| **Game logic** | **Server Actions** + modules in [`src/server/npat/`](src/server/npat/) (`games.ts`, `state.ts`, `types.ts`); thin [`actions.ts`](src/server/npat/actions.ts) re-exports `"use server"`. |
| **State for clients** | **`GET /api/games/[code]`** — JSON game state; clients **poll**. Overdue rounds **auto-finalize** on poll so scoring does not depend on one browser tab. |
| **Database** | **Supabase (Postgres)** via **service-role** client in [`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts). Access control is enforced in **app code** (session + host checks), not Supabase Auth for these flows. |
| **Sessions** | **httpOnly cookie** with signed **JWT** ([`jose`](https://github.com/panva/jose)) — [`src/lib/session.ts`](src/lib/session.ts). |
| **Scoring** | [`src/lib/game/score-answers.ts`](src/lib/game/score-answers.ts) — name list, GeoNames (place), animal list, dictionary (thing). |
| **Game room UI** | [`src/components/game-room-client.tsx`](src/components/game-room-client.tsx) (`'use client'`) + [`src/components/npat/`](src/components/npat/). |

**Data (conceptual):** games (status, join code, round duration, used letters, host), participants (display name, heartbeat), rounds (letter, timer, status), submissions (four texts + four point columns).

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Validation | Zod 4 |
| Database | Supabase PostgreSQL (`@supabase/supabase-js`, server-only service role) |
| Sessions | jose (JWT in cookies) |

Tooling: ESLint (`eslint-config-next`), PostCSS. See **[`.env.local.example`](.env.local.example)** — copy to `.env.local` and set `NEXT_PUBLIC_*` Supabase values, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, and any validator keys (never expose secrets to the client).

---

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Related documents

- [Product requirements (PRD)](tasks/prd-multiplayer-npat-game.md)
- [UI spec & clickable prototype](docs/design/HANDOFF.md), [`NPAT.html`](docs/design/NPAT.html)

---

## Deploy

[Friendly introductory guide → Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app) · [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)

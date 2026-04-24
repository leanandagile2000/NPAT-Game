# Product Requirements Document: Multiplayer Name–Place–Animal–Thing Game

## 1. Introduction / Overview

This document specifies a **multiplayer online game** (web first, native later) where each round uses a **random letter** (A–Z). Players must submit **four English answers** starting with that letter: a **name**, a **place**, an **animal**, and a **thing**. A **Game Host** creates games, shares a join link, configures timing, and controls round flow. **Names**, **places**, **animals**, and **things** are scored using **automated validation** (curated name list, GeoNames, animal dataset, dictionary API; see §4 and §7). The experience should feel **fair**, **real-time**, and **host-led** without requiring email or password accounts.

**Goal:** Ship a playable, host-driven party game with transparent scoring, live lobby/round updates, and clear end-of-game results.

---

## 2. Goals

1. Allow a host to create a named game, enter their display name, and receive a **shareable registration link** in one flow; the host is **automatically registered**.
2. Support **2–8 players** per game, with players joining via link and entering **display name only** (no email/password).
3. Provide **real-time visibility** for the host of who has joined before the game starts.
4. Enforce **per-round time limits** (default **2 minutes**; host-adjustable between **1 and 5 minutes** before first start).
5. Each round, assign a **random letter** that **does not repeat** until all **26 letters** have been used; then **start a new 26-letter cycle** automatically.
6. Score **name** (curated first-name list), **place**, **animal**, and **thing** when **server-side validation** marks them correct; use **case-insensitive** matching where specified.
7. Display scores as **`points this round + cumulative from previous rounds = total`** (e.g. `3+12=15`).
8. Allow the host to **end the game** at any time and announce **winner(s)** (**co-winners** on ties).
9. If the **host disconnects**, **automatically assign** host to another player (defined rules below).
10. **English-only** answers for validation and UX copy; architect the product so **a future native app** can reuse the same backend contracts.

---

## 3. User Stories

1. **As a host**, I want to create a game with a **game name** and **my name**, so that I can share one link and have others join.
2. **As a host**, I want to see **who has joined in real time** so I know when to configure time and start.
3. **As a host**, I want to set **how long each round lasts** (default 2 minutes, adjustable **1–5** minutes) before we begin, so rounds feel fair.
4. **As a host**, I want to **start the game** and **start round 1**, and in later rounds only **start the next round**, so the flow matches how I run the table.
5. **As a player**, I want to open the link, **enter my name**, and join without signing up, so I can play quickly.
6. **As a player**, I want to **see scores between rounds** so I know how I am doing.
7. **As any participant**, I want the app to show the **current letter** and **four input fields** with a **countdown**, so I know what to submit and how much time is left.
8. **As any participant**, after time expires, I want to see **my round breakdown** and **totals in the `round + cumulative = total` format**.
9. **As a host**, I want to **end the game** whenever needed and see **who won** (including ties as co-winners).
10. **As a host**, if I lose connection, I want the game to **reassign host** to someone else so the session can continue.

---

## 4. Functional Requirements

1. The system must allow a user to act as **Game Host** by creating a game with: **game name** (string), **host display name** (string), and must **register the host** as a participant immediately.
2. The system must generate a **unique, shareable URL** (or token-resolvable path) for player registration; opening it must not require login beyond entering a **display name** that is **unique within that game** (no two participants may share the same display name; **forbid** duplicates, do not auto-suffix).
3. The system must enforce **minimum 2** and **maximum 8** **registered participants** (including the host) before the host can start the game (or define an explicit policy: e.g. host cannot start until count ≥ 2; cannot join beyond 8).
4. The system must show the **list of registered players to the host in real time** as players complete registration.
5. Before the first **game start**, the host must set **round duration in minutes**; default **2** minutes; the host may adjust only within **1 minute (minimum) through 5 minutes (maximum)**.
6. The **host** must be able to: **Start game** (first time) and then **Start round** for each subsequent round. Round 1 requires both **game start** and **round start** as specified by the product (implementation should match UX: e.g. “Start game” moves to in-game state; “Start round 1” begins first letter round).
7. When a round is active, the system must display the **round’s letter** and **four fields**: name, place, animal, thing.
8. The system must **draw letters randomly** for each new round from the set of letters **not yet used** in the current **26-letter cycle**. When all 26 have been used, the system must **start a new cycle** and again avoid repeating within that cycle.
9. When the round timer ends, the system must **lock submissions** and **compute points** for that round per **§4.1** and **functional requirements 14–19** (name, place, animal, thing).
10. The system must display, per participant, **round points** and **cumulative total** as: **`[round] + [cumulative prior] = [total]`** (with labels legible to users).
11. The system must allow the **host** to **end the game** at any time (lobby, between rounds, or during an active round). **If the host ends the game while a round is in progress, that round’s answers do not count for scoring**—only **completed** rounds (timer reached zero and scoring ran) affect totals and the final winner. The UI may still discard partial inputs or show them as un-scored; implementation must be consistent.
12. On game end, the system must determine **winner(s)** as player(s) with the **highest total score**; **ties** result in **co-winners** (all tied top players).
13. If the **host’s client disconnects** (or host identity is lost), the system must **promote another player to host** automatically. **Promotion order** must be deterministic (e.g. **oldest join time** among remaining players, or **next by player id**). The PRD defers exact algorithm to technical design but requires **one** unambiguous rule.
14. The system must perform **place** validation using **GeoNames** via **server-side** calls; **configuration must include a GeoNames username** in environment variables.
15. The system must perform **animal** validation using a **curated list or open dataset** (bundled or maintained server-side), not live scraping of third-party sites.
16. The system must perform **name** validation using the **merged, versioned curated first-name set** (see §4.1). Award **1 point** for the name field if the **trimmed** answer **case-insensitively** matches a list entry; otherwise **0** for that field.
17. The system must perform **thing** validation using a **dictionary API** (server-side), English only, with **case-insensitive** matching. A **“thing”** is a **common noun** only: the answer must be accepted as a **noun** (not proper nouns, brand names, or adjectives used alone) per dictionary **part of speech** or an equivalent server-side rule. If the dictionary lists a word only as a **proper noun** (e.g. a trademark), it **does not** count.
18. The system must support **English-only** user answers and validation; UI and errors should not promise other languages in v1.
19. The product is **web (Next.js) first**; the architecture should expose **APIs and realtime channels** consumable by a **future native app** without duplicating game logic in the client.

### 4.1 Name field — product decision (locked)

**Locked — option (B):** Award **1 point** for the **name** field only if the **trimmed** answer **case-insensitively** matches an entry in the **merged, versioned curated first-name** set. Otherwise **0** for that field. *Uncommon or culturally specific names not in the set will not score* until a future “override” feature is considered (out of v1 scope).

**Curated list sources (open data, typical for English-first-name sets):**

| Source | Notes |
|--------|--------|
| **U.S. SSA — National baby names (CSV)** | [SSA “Beyond the Top 1000 Names” / limits](https://www.ssa.gov/oact/babynames/limits.html) — yearly **national** files of names with counts; very large coverage of U.S. given names; use **year range** the team is comfortable with and **deduplicate** across years. |
| **U.S. SSA — State-level files** | Same portal; optional if you need broader spelling variants. |
| **UK ONS — Baby names (England and Wales)** | [ONS baby names](https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/datasets/babynamesinenglandandwalesbabynamesstatisticsboysorgirls) — official statistics; good complement to SSA for **spelling/UK-typical** names. |
| **Wiktionary / Wikidata dumps** | Can extract “given name” or lexeme entries; more engineering effort; use only if the team needs **global** coverage and accepts maintenance cost. |

**Implementation notes:** Normalize to **lowercase**, **trim** whitespace; build a **single merged set** (e.g. SSA national + ONS) with **licensing** review (U.S. government and ONS data are typically suitable for app use, but **verify** current terms). Store the set **in the app repo or DB** and **version** it; do not depend on a live “name API” for every round if avoidable (cache the set in memory on the server). **Confirmed by stakeholder: option (B), 2026.**

**Player refresh (v1):** If a player **refreshes or closes the tab**, **rejoining the same seat is not required** for v1 (they are treated as disconnected; exact behavior—whether they can rejoin the same game with a new token—is left to technical design, but there is no obligation to implement persistent “same seat” via local storage in v1).

---

## 5. Non-Goals (Out of Scope)

- Email/password, OAuth, or mandatory user accounts.
- Host **manual override** of scores for disputed answers in v1 (validation is **API/dataset only** as specified).
- **Multi-language** answers or validation in v1.
- **Scraping** a-z-animals.com or similar sites for live validation.
- **Guaranteed** fuzzy typo acceptance for place/animal/thing beyond **case-insensitivity** (unless added in technical spec with explicit algorithms).
- Full **native iOS/Android apps** in v1 (only **architect** for later consumption).

---

## 6. Design Considerations (Optional)

- **Mobile-friendly** layouts: high **mobile** usage for party games; large tap targets, readable timers.
- **Host vs player** views: host sees **Start round**, **End game**, and **roster**; all see **letter**, **inputs**, and **scoreboard** between rounds.
- **Accessibility (WCAG 2.2 AA):** labeled fields, error announcements, focus management for modals/toasts, sufficient contrast; **skip link** and logical headings on marketing/game shells when applicable.
- **Real-time affordances:** show **connection state** to host/players; when host is reassigned, show a **clear banner** (“You are now the host”).

---

## 7. Technical Considerations (Optional)

- **Stack alignment:** Next.js (App Router), Supabase (Auth optional for v1; **anonymous or token-based** session per browser may be required for abuse control—separate spec), **Realtime** for lobby and round state, **server-side** validation for all scoring.
- **GeoNames:** use official **web services** with **rate limits**; cache repeated lookups; normalize strings (trim, case) before compare.
- **Animals:** ship a **versioned** dataset file or table; periodic updates via maintenance, not user-triggered fetches to arbitrary sites.
- **Names (option B):** load the **versioned** merged first-name set at deploy or boot; in-memory set lookup; document list **version** in build or env for support (“which name pack is live?”).
- **Dictionary (things):** choose a stable **English dictionary API** (e.g. [Free Dictionary API](https://dictionaryapi.dev/)) and score **1 point** only when the headword is a **noun** (and meets “common noun” / not-proper rules in functional req. **17**). Use API **part-of-speech** fields; handle network failures (retry, or mark as invalid with safe messaging).
- **Native later:** same **room id + participant id + host id** model; **WebSocket/Realtime** contract documented for mobile clients.
- **Security:** do not expose **GeoNames** or dictionary **secret keys** to the client; all validation on **server** or **edge with secrets**.

---

## 8. Success Metrics

- **Session completion rate:** % of created games that reach **at least one completed round** with ≥2 players.
- **Time to first round:** median time from **game create** to **round 1 start**.
- **Host tools usage:** % of games where host successfully uses **set duration** and **start** without support.
- **Dispute proxy:** low rate of **abandonment** immediately after a scored round (optional telemetry).
- **Stability:** **host failover** success rate when simulated or observed disconnects occur.

---

## 9. Resolved product decisions (reference)

- **Name scoring — (B) curated list** (case-insensitive match; see §4.1, functional req. 16). Confirmed 2026.
- **End game mid-round** → no score for that in-progress round; only **completed** rounds count.
- **Timer** → **1–5 minutes** inclusive. **Refresh = leave** OK for v1. **Duplicate display names** in one game → **forbidden**. **Thing** → **common nouns** only.

### 9.1 Glossary: “API version for native app”

**What that meant:** When you add an **iOS/Android** app later, it will call the **same backend** (HTTP + realtime). Teams often **name and freeze a version** of that contract (e.g. “`game API v1` as of 2026-Q2”) so mobile releases do not break if the web app changes. **No action or date** is required until native development starts; the backend should still be designed with **stable resource IDs and documented events** for future clients.

---

## Document control

- **Source:** Stakeholder prompt + follow-up answers (including timer bounds, mid-round end, refresh, duplicate names, thing = common noun, name-list sources).  
- **Status:** Ready for dev handoff; product decisions in §4.1, §9, and throughout are **complete** (name scoring **(B)** confirmed 2026).

# NPAT — Developer Handoff
**Name · Place · Animal · Thing** — Multiplayer party game  
Stack: Next.js (App Router) · Supabase Realtime · TypeScript

---

## 1. Design Tokens

### Colors
```ts
// tokens/colors.ts
export const colors = {
  bg:         '#1A1714',   // page background
  card:       '#252219',   // card / panel background
  cardHover:  '#2d2922',   // card hover state
  border:     'rgba(255,255,255,0.07)',

  // Category colors — used consistently across ALL screens
  yellow:     '#FFD600',   // NAME category + primary CTA
  coral:      '#FF5C39',   // PLACE category + destructive
  teal:       '#00C4A7',   // ANIMAL category + success
  white:      '#F5F2EA',   // THING category + body text

  muted:      '#8C8678',   // secondary text
  dark:       '#3D3930',   // disabled / inactive
  darkMid:    '#2e2b23',   // input focus background
}

// Category → color mapping (use everywhere answers are displayed)
export const categoryColor = {
  name:   colors.yellow,
  place:  colors.coral,
  animal: colors.teal,
  thing:  colors.white,
}
```

### Typography
```ts
// tokens/typography.ts
// Google Fonts — load in layout.tsx
// import { Bebas_Neue, Nunito } from 'next/font/google'

export const fonts = {
  display: '"Bebas Neue", sans-serif',  // all headlines, scores, the letter, timer
  body:    '"Nunito", sans-serif',      // all UI copy, labels, inputs
}

// Scale
// Display hero (game letter):  clamp(80px, 14vw, 140px)
// Display title (home):        clamp(34px, 7.5vw, 92px)
// Screen heading:              52–56px  (Bebas Neue)
// Section heading:             36–38px  (Bebas Neue)
// Score number:                40–44px  (Bebas Neue)
// Card label:                  28–30px  (Bebas Neue)
// Body large:                  17–18px  (Nunito 700–800)
// Body:                        15–16px  (Nunito 600–700)
// Label / caption:             11–13px  (Nunito 700–800, uppercase, letter-spacing 0.08–0.12em)
```

### Spacing & Radii
```ts
export const radius = {
  sm:   10,
  md:   13,
  lg:   16,
  xl:   20,
  pill: 100,
}

// Base gap unit: 8px. Common values: 8, 12, 14, 16, 20, 24, 28, 32, 36, 48
```

---

## 2. Screen Inventory

| Screen | Route (suggestion) | Who sees it |
|--------|-------------------|-------------|
| Home | `/` | Everyone |
| How to Play / Rules | `/rules` | Everyone |
| Create Game | `/create` | Host |
| Game Created (share code) | `/create` (step 2) | Host |
| Join Game | `/join` | Players |
| Lobby — Host view | `/game/[id]/lobby` | Host |
| Lobby — Player view | `/game/[id]/lobby` | Players |
| In Round | `/game/[id]/round/[n]` | Everyone |
| Round Results | `/game/[id]/round/[n]/results` | Everyone |
| Final Results | `/game/[id]/final` | Everyone |

---

## 3. Component Breakdown

### Shared / UI
```
components/ui/
  Btn.tsx           — variant: primary|coral|teal|ghost|danger|dark; size: sm|md|lg|xl
  FormInput.tsx     — standard text input with label, focus border color prop
  FieldInput.tsx    — answer input: category label (colored), value, disabled state
  BackBtn.tsx       — absolute-positioned, goes to prop `to` route
  Card.tsx          — background card with border
```

### Screens
```
components/screens/
  HomeScreen.tsx        — photo collage + title + 3 action cards
  RulesScreen.tsx       — numbered steps + category grid
  CreateGameScreen.tsx  — 2-step: form → share code
  JoinGameScreen.tsx    — code input + name input
  LobbyScreen.tsx       — isHost prop toggles host vs player view
  InRoundScreen.tsx     — phase state machine (see §4)
  RoundResultsScreen.tsx
  FinalResultsScreen.tsx
```

### Feature Components
```
components/game/
  PhotoCollage.tsx      — home page background grid
  TimerRing.tsx         — SVG circular countdown (R=50, CIRC=314.16)
  LetterReveal.tsx      — fullscreen overlay: reveal → countdown → done callback
  ScoreFormula.tsx      — renders "round + prior = total" with Bebas Neue
  AnswerCard.tsx        — single player answer row (name + 4 answers + score)
  PlayerList.tsx        — lobby player list with join animation
  ConfettiBurst.tsx     — CSS-only confetti (65 pieces, 6 colors)
```

---

## 4. In-Round Phase State Machine

```ts
type RoundPhase = 'reveal' | 'countdown' | 'playing' | 'submitted' | 'done'

// Transitions:
// mount            → 'reveal'     (show fullscreen letter, 1.6s)
// 1.6s elapsed     → 'countdown'  (3 → 2 → 1, 950ms each)
// countdown ends   → 'playing'    (timer starts, inputs enabled)
// user submits     → 'submitted'  (inputs locked, waiting message)
// timer hits 0     → 'done'       (auto-submit, navigate to results)
// host ends game   → navigate to final results immediately
```

**Timer Ring SVG:**
```tsx
const R = 50
const CIRC = 2 * Math.PI * R  // 314.16

<circle
  r={R} cx={58} cy={58}
  strokeDasharray={CIRC}
  strokeDashoffset={CIRC * (1 - progress)}   // progress = timeLeft / totalSecs
  stroke={timeLeft <= 30 ? colors.coral : colors.teal}
  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
  transform="rotate(-90 58 58)"
/>
// Warning state (≤30s): animate opacity 1→0.4→1 at 0.7s interval
```

---

## 5. Key Animations

```css
/* Letter blast — on mount of LetterReveal */
@keyframes letterBlast {
  0%   { transform: scale(0.1); opacity: 0; filter: blur(40px); }
  55%  { transform: scale(1.12); opacity: 1; filter: blur(0); }
  75%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}
/* duration: 0.75s, easing: cubic-bezier(0.34, 1.56, 0.64, 1) */
/* text-shadow: 0 0 100px #FFD60070, 0 0 200px #FFD60030 */

/* Countdown number pop — key={countValue} forces remount each tick */
@keyframes countPop {
  0%   { transform: scale(2.8); opacity: 0; }
  20%  { transform: scale(1);   opacity: 1; }
  75%  { transform: scale(1);   opacity: 1; }
  100% { transform: scale(0.4); opacity: 0; }
}
/* duration: 0.95s */

/* Photo collage float — each photo staggered */
@keyframes photoFloat {
  0%, 100% { transform: translateY(0px)  rotate(var(--rot)); }
  50%       { transform: translateY(-7px) rotate(var(--rot)); }
}
/* Each photo: set --rot CSS var to its rotation (-4deg to +4deg) */
/* duration: 3.2–5.5s, delay: i * 0.18s */

/* Player join */
@keyframes playerJoin {
  from { transform: translateX(-28px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

/* Winner pop */
@keyframes winnerPop {
  0%   { transform: scale(0) rotate(-6deg);   opacity: 0; }
  60%  { transform: scale(1.07) rotate(1.5deg); opacity: 1; }
  80%  { transform: scale(0.97) rotate(-0.5deg); }
  100% { transform: scale(1) rotate(0deg); }
}

/* Confetti fall — 65 pieces, 6 colors, random left/delay/duration */
@keyframes confettiFall {
  0%   { transform: translateY(-5vh) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(105vh) rotate(800deg) scale(0.5); opacity: 0; }
}
/* Colors: #FFD600, #FF5C39, #00C4A7, #FFFFFF, #FF9100, #C468FF */
/* Sizes: 7–17px, mix of circles and thin rectangles */
```

---

## 6. Supabase Realtime — Events to Implement

### Game state shape (suggested)
```ts
interface GameState {
  id: string
  name: string
  hostId: string
  hostName: string
  status: 'lobby' | 'playing' | 'finished'
  roundDurationSecs: number   // 60–300
  currentRound: number
  currentLetter: string | null
  letterCycle: string[]       // remaining letters in current 26-cycle
  roundStartsAt: string | null  // ISO timestamp
  players: Player[]
}

interface Player {
  id: string
  name: string
  joinedAt: string
  isHost: boolean
  connected: boolean
  scores: RoundScore[]
}

interface RoundScore {
  round: number
  letter: string
  answers: { name: string; place: string; animal: string; thing: string }
  valid:   { name: boolean; place: boolean; animal: boolean; thing: boolean }
  points: number   // 0–4
}
```

### Realtime channels
```ts
// Subscribe in LobbyScreen, InRoundScreen, ResultsScreens
const channel = supabase
  .channel(`game:${gameId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
    (payload) => handleGameUpdate(payload.new as GameState))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
    (payload) => handlePlayerUpdate(payload))
  .subscribe()
```

### Key events to handle in UI
| Event | UI reaction |
|-------|-------------|
| `player.INSERT` | Animate new player into lobby list |
| `game.status → playing` | All clients: trigger LetterReveal overlay |
| `game.roundStartsAt` set | All clients: sync timer start to this timestamp |
| `game.status → finished` | All clients: navigate to Final Results |
| `player.isHost` changes | Show "You are now the host" banner (coral, animated in from top) |
| `player.connected = false` | Show greyed-out disconnected state in player list |

### Host failover banner
```tsx
// Show when current user's player.isHost flips from false → true
<div style={{
  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
  background: colors.coral, color: colors.white,
  padding: '12px 24px', textAlign: 'center',
  fontWeight: 800, fontSize: 16,
  animation: 'slideDown 0.4s ease'
}}>
  The previous host disconnected — you are now the host
</div>
```

---

## 7. Scoring Display Pattern

Always render scores as: **`round + prior = total`**

```tsx
// ScoreFormula.tsx
function ScoreFormula({ roundPts, prior, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: fonts.display }}>
      <span style={{ fontSize: 26, color: colors.yellow }}>{roundPts}</span>
      <span style={{ fontSize: 14, color: colors.muted, fontWeight: 700 }}>+</span>
      <span style={{ fontSize: 22, color: colors.muted }}>{prior}</span>
      <span style={{ fontSize: 14, color: colors.muted, fontWeight: 700 }}>=</span>
      <span style={{ fontSize: 32, color: colors.white }}>{total}</span>
    </div>
  )
}
```

---

## 8. Home Page Collage

Use 18 Unsplash photos in a 6×3 CSS grid. Each photo:
- Random rotation: –4° to +4° (set as `--rot` CSS custom property)
- Floating animation (see §5), staggered delay
- `object-fit: cover`, `border-radius: 9px`
- Gradient overlay on top of entire grid:
  ```css
  background: linear-gradient(to bottom,
    rgba(26,23,20,0.25) 0%,
    rgba(26,23,20,0.55) 30%,
    rgba(26,23,20,0.92) 58%,
    #1A1714 80%
  );
  ```

Photo IDs (Unsplash, append `?w=300&h=220&fit=crop&auto=format`):
```
1546182990-dffeafbe841d  1587300003388-59208cc962cb  1564760055775-d63b17a55c44
1547721064-da6cfb341d50  1502602898657-3e91760cbb34  1524492412937-b28074a5d7da
1552832230-c0197dd311b5  1485738422979-f5c462d49f74  1534567153574-2b12153a87f0
1551986782-d0169b3f8fa7  1474511320723-9a56873867b5  1501594907352-04cda38ebc29
1472214103451-9374bd1c798e  1507003211169-0a1dd7228f2d  1447752875215-b2761acb3c5d
1416879595882-3373a0480b5b  1524661135-423995f22d0b  1441974231531-c6227db76b6e
```

---

## 9. Validation APIs (server-side only — never expose keys to client)

| Category | Method | Notes |
|----------|--------|-------|
| Name | In-memory Set lookup | Merged SSA + ONS first-name list; lowercase + trim before match |
| Place | GeoNames API | `api.geonames.org/searchJSON` with `username` env var; cache results |
| Animal | Bundled dataset | JSON file in repo; Set lookup; case-insensitive |
| Thing | Free Dictionary API | `api.dictionaryapi.dev/api/v2/entries/en/{word}`; accept only if `partOfSpeech === 'noun'` and not a proper noun |

All validation runs in **Next.js API routes or Server Actions**. Return shape:
```ts
{ valid: boolean; reason?: string }
```

---

## 10. Suggested Next.js File Structure

```
app/
  layout.tsx                    ← load Bebas Neue + Nunito fonts
  page.tsx                      ← HomeScreen
  rules/page.tsx
  create/page.tsx
  join/page.tsx
  game/[id]/
    lobby/page.tsx
    round/[n]/page.tsx
    round/[n]/results/page.tsx
    final/page.tsx

components/
  ui/                           ← Btn, FormInput, FieldInput, BackBtn, Card
  game/                         ← TimerRing, LetterReveal, ScoreFormula, AnswerCard, PlayerList, ConfettiBurst, PhotoCollage
  screens/                      ← one file per screen

lib/
  supabase.ts                   ← client + server clients
  game-logic.ts                 ← letter cycling, scoring, host promotion
  validation/
    names.ts                    ← Set<string> loaded at boot
    places.ts                   ← GeoNames wrapper + cache
    animals.ts                  ← bundled dataset
    things.ts                   ← dictionary API wrapper

tokens/
  colors.ts
  typography.ts

data/
  names.json                    ← merged SSA + ONS first-name set (lowercase)
  animals.json                  ← bundled animal list (lowercase)
```

---

## 11. How to Use This Handoff in Cursor

1. Open Cursor and attach both `docs/design/NPAT.html` (the working prototype) and `docs/design/HANDOFF.md` (this file).
2. Say something like:
   > *"Build the Next.js screens for this game using the design tokens and component structure in docs/design/HANDOFF.md. Use docs/design/NPAT.html as the visual reference. Start with the shared UI components and token files, then build each screen."*
3. For Supabase realtime wiring, share your schema and say:
   > *"Wire up the Supabase Realtime subscriptions described in section 6 of docs/design/HANDOFF.md"*

The prototype HTML is already broken into clearly named React components that map 1:1 to the structure above.

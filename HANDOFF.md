# DraftSage — Project Handoff (v4)

Living document for continuing development of **DraftSage**, the Challenger-level League of Legends draft analysis tool. This supersedes the v3 handoff — see §2 for the full change log.

---

## 1. What Is DraftSage?

A web app that helps League players draft better. Users enter their current draft state (ally/enemy picks, role to fill) and the **DraftSage Engine** returns 3 confidence-scored champion recommendations with reasoning, win conditions, gap analysis, threat detection, and an explicit "do not pick" list.

**Freemium model:**
- **Free** — 3 Engine runs/day, basic damage-balance analysis, top-3 pick recommendations
- **Pro $9.99/mo** or **$79/yr (34% off)** — unlimited (capped at 200/day to deter sharing), all engine features, ban mode, champion pool filter, cloud draft history, priority routing, early access

User-facing branding is **"DraftSage Engine"** — never "AI" — across all surfaces.

---

## 2. What Changed Since v3 Handoff

Major changes since the v3 handoff — engine quality, Riot API integration, and UX improvements.

### Context-aware gap detection ([commit `89ccd17`](https://github.com/Stain04/DraftSage/commit/89ccd17))
Gap detection expanded from 5 to 11 axes. New universal gaps: **dive** (target 2) and **pick** (target 2). New context-aware gaps that only fire when the enemy comp makes them relevant:
- **Disengage** (target 2) — fires when enemy engage >= 3 or dive >= 3
- **Poke** (target 2) — fires when enemy has strong engage but low poke, or disengage >= 2
- **Sustain** (target 2) — fires when enemy poke >= 3

Each context gap includes a `context_reason` surfaced to the LLM via the intelligence block.

### Hardcoded sets eliminated from avoidance engine ([commit `0d0f48e`](https://github.com/Stain04/DraftSage/commit/0d0f48e))
Rules 7 & 8 (`armor_stackers`, `mr_stackers`) replaced with trait-driven `_champs_matching()` queries:
- Armor tanks: `frontline >= 2 and hard_cc >= 2`
- MR tanks: `frontline >= 2 and ap == 1`

### Blacklist cross-lane logic ([commit `35894f5`](https://github.com/Stain04/DraftSage/commit/35894f5))
Blacklist now collects easy_matchups from ALL enemies but only blacklists champions that lose to 2+ different enemies. Filters out lane-specific noise while keeping picks that are genuinely bad against the enemy team.

### Archetype detection scales with team size ([commit `0d0f48e`](https://github.com/Stain04/DraftSage/commit/0d0f48e))
All thresholds in `detect_archetype()` multiplied by `n/5` so archetypes are detected during draft (2-3 picks) as well as full 5-man comps. Teamfight check also tightened: requires both `frontline >= 2*s` AND `hard_cc >= 3*s` (was sum >= 5).

### Champion name normalization ([commit `546209d`](https://github.com/Stain04/DraftSage/commit/546209d))
Added `_norm_champ()` helper that strips apostrophes, spaces, and periods before comparison. Applied to all 9 name-matching points across `gemini_service.py` and `avoidance_engine.py`. Fixes: `Kha'Zix` vs `Khazix`, `Cho'Gath` vs `Chogath`, etc.

### Deterministic champion difficulty ([commit `99a11d2`](https://github.com/Stain04/DraftSage/commit/99a11d2))
Added `get_champion_difficulty()` to `riot_service.py` that reads Riot's official `info.difficulty` (1-10) from Data Dragon. Post-processing overrides LLM difficulty with the real value. Thresholds: Easy (1-5), Medium (6-7), Hard (8-10).

### Trait database updates ([commits `9348079`, `dc44aae`, `36c9cfe`](https://github.com/Stain04/DraftSage))
Added `ap: 0` to 8 AD champions (Kayn, Gangplank, Gnar, Senna, Smolder, Udyr, Warwick, Poppy). Added `ap: 1` to 8 magic-damage tanks/supports (Rammus, Ornn, Tahm Kench, Sejuani, Alistar, Leona, Nautilus, Rell). Poppy: added Top to roles. Jax, Udyr, Volibear: kept as Mixed (deal both damage types).

### Enemy threat detection expanded ([commit `c529021`](https://github.com/Stain04/DraftSage/commit/c529021))
Added two new threat patterns to `detect_enemy_threats()`:
- **Heavy sustain** (sustain >= 3) — warns about anti-heal
- **Protect-the-carry** (hypercarry + peel >= 3, high severity) — must dive or burst through

### Summoner spell fix ([commit `c529021`](https://github.com/Stain04/DraftSage/commit/c529021))
Replaced non-existent `mobile` trait with `dive` as mobility proxy. Scaling mages with `dive == 0` (no escape) correctly get Flash + TP. Champions with `dive >= 1` (Sylas, Ekko, Fizz) keep Flash + Ignite.

### Riot API integration ([commit `3ea2d68`](https://github.com/Stain04/DraftSage/commit/3ea2d68))
Full Riot Games API integration for match history, ranked stats, and champion mastery:
- New `riot_api_service.py` — account-v1, match-v5, league-v4, champion-mastery-v4 client with regional routing
- New `routes/summoner.py` — `/link`, `/unlink`, `/profile`, `/me` endpoints
- Stores `puuid` + `region` in Supabase `user_metadata`
- `RIOT_API_KEY` added to env vars

### Personal WR overlay on recommendations ([commit `0620134`](https://github.com/Stain04/DraftSage/commit/0620134))
When a user has a linked Riot account, each recommendation card shows their personal win rate and games played for that champion. Color-coded: green (55%+), yellow (48-55%), red (<48%). DraftBoard fetches the user's profile on mount and builds a champion-to-performance lookup map.

### Pick variety improvements ([commit `8abfe66`](https://github.com/Stain04/DraftSage/commit/8abfe66))
- Temperature 0.3 → 0.5 (more exploration, still deterministic enough)
- Prompt: all three sources (counter pool, gap-filling, role pool) are EQUAL
- Prompt: VARIETY IS MANDATORY — explicitly tells LLM to explore the full role pool
- Prompt: role-viable gap-fillers are often BETTER than counter-pool champs that don't fill gaps

### Lolalytics error logging ([commit `0d0f48e`](https://github.com/Stain04/DraftSage/commit/0d0f48e))
`except Exception: pass` replaced with `print(f"[DraftSage] WARNING: Lolalytics/OP.GG fetch failed: {e}")`. Scraper breakage is now visible in Railway logs.

### Peel gap for melee hypercarries ([commit `c529021`](https://github.com/Stain04/DraftSage/commit/c529021))
Peel gap condition no longer requires `ranged >= 2`. Melee hypercarries (Master Yi, Yasuo, Yone) with `scaling >= 2` now trigger the peel gap check.

### Prompt trimming for token limits ([commit `c0c9f5e`](https://github.com/Stain04/DraftSage/commit/c0c9f5e))
Role pool capped at 30 champions, gap-filling pool capped at 15 per gap. Both show "+N more" so the LLM knows more exist. Prevents 413 errors from Groq's Qwen3-32b 6000 TPM limit.

---

## 3. Deployment URLs

| Service | URL |
|---|---|
| **Frontend (primary)** | https://www.draftsage.pro (custom domain) |
| **Frontend (Vercel default)** | https://draft-sage-five.vercel.app |
| **Backend (Railway)** | https://draftsage-production.up.railway.app |
| **GitHub** | https://github.com/Stain04/DraftSage |
| **Vercel project** | `draft-sage` (team: `stain04s-projects`) |
| **Railway project** | `draftsage-production` |

---

## 4. Local Development

### Repo structure
```
wincon/
├── backend/
│   ├── main.py                          ← FastAPI + CORS
│   ├── auth_utils.py                    ← JWT verification + Supabase clients
│   ├── routes/
│   │   ├── draft.py                     ← /api/draft/suggest (auth + daily cap + session check)
│   │   ├── auth.py                      ← /api/auth/claim-session
│   │   ├── payments.py                  ← billing_period routing
│   │   └── summoner.py                  ← /api/summoner/* (Riot account linking, profile, stats)
│   ├── services/
│   │   ├── gemini_service.py            ← Engine brain — 6-step prompt + post-processing pipeline
│   │   ├── composition_analyzer.py      ← T trait DB (roles+ap per champion) + gap/archetype detection
│   │   ├── avoidance_engine.py          ← trait-driven do-not-pick rules via _champs_matching()
│   │   ├── champion_types.py            ← classify_champion() — derives from T.ap field
│   │   ├── summoner_spells.py           ← deterministic spell selection
│   │   ├── usage_service.py             ← Pro daily cap counter
│   │   ├── lolalytics_service.py        ← live counter data (__NEXT_DATA__ extraction + regex fallback)
│   │   ├── opgg_service.py              ← tier list
│   │   ├── riot_service.py              ← champion list + difficulty from Data Dragon
│   │   └── riot_api_service.py          ← Riot API client (match history, ranked, mastery)
│   └── requirements.txt
├── frontend/
│   ├── .env                             ← local dev: REACT_APP_API_URL=http://localhost:8000
│   ├── .env.production                  ← prod build: REACT_APP_API_URL=Railway URL  ⚠ critical
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/Home.jsx
│   │   ├── pages/Pricing.jsx
│   │   ├── pages/Login.jsx              ← session_invalidated banner
│   │   ├── pages/Draft.jsx
│   │   ├── pages/Dashboard.jsx          ← Riot account linking + ranked stats
│   │   ├── components/
│   │   │   ├── DraftBoard.jsx           ← action bar + horizontal teams + 3-col results
│   │   │   ├── TeamSlot.jsx             ← vertical champion-card style
│   │   │   ├── RecommendationCard.jsx   ← confidence meter + score breakdown + personal WR
│   │   │   ├── EmailWatermark.jsx       ← anti-sharing watermark
│   │   │   ├── ChampionSearch.jsx
│   │   │   └── Navbar.jsx
│   │   ├── context/AuthContext.jsx      ← claim-session on SIGNED_IN, stores session_id
│   │   ├── api/
│   │   │   ├── geminiApi.js             ← timeout + retry + interceptors + describeApiError
│   │   │   ├── riotApi.js               ← Data Dragon helpers
│   │   │   └── summonerApi.js           ← Riot account linking + profile API
│   │   └── index.css                    ← full esports utility set
│   ├── tailwind.config.js               ← Orbitron + cyan + magenta + JetBrains Mono
│   └── package.json
├── vercel.json
└── .vercel/project.json                 ← keep this file
```

### Start backend locally
```bash
cd wincon/backend
python -m venv venv
venv\Scripts\activate              # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Start frontend locally
```bash
cd wincon/frontend
npm install --legacy-peer-deps
npm start
# Opens at http://localhost:3000
# Points at http://localhost:8000 (from .env)
```

### Deploy to production
```bash
# Railway auto-deploys backend on push to master
git add -A && git commit -m "your message" && git push origin master

# Vercel frontend — manual deploy
cd wincon/
npx vercel --prod --yes

# CRITICAL: always run vercel from wincon/, NOT from the parent directory.
# Running it from parent will auto-create a bogus root vercel.json with
# experimentalServices — delete it immediately if it appears.
```

### ⚠ Env file gotcha (burned us once)
`npm run build` bakes env vars into the JS bundle at build time. `.env.production` is loaded only on `npm run build` (production), `.env` is loaded only by `npm start` (dev). **Both files exist intentionally — don't merge them.**

---

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (CRA) + Tailwind CSS |
| Display font | Orbitron (esports) |
| Body font | Inter |
| Mono font | JetBrains Mono (HUD labels) |
| Backend | FastAPI (Python 3.12) |
| LLM | Groq — `qwen/qwen3-32b` primary. 10-key rotation. |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (PostgreSQL) — `draft_history`, `profiles` |
| Payments | Lemon Squeezy (monthly + yearly variants + webhooks) |
| Riot API | Riot Games API (match-v5, league-v4, champion-mastery-v4, account-v1) |
| Frontend deploy | Vercel (project `draft-sage`) |
| Backend deploy | Railway (auto-deploys from GitHub `master`) |
| Counter data | Lolalytics (scraped on every request) |
| Tier list | OP.GG MCP API |
| Champion data | Riot Data Dragon |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| HTTP client | axios (frontend), httpx (backend) |

---

## 6. All Keys & Secrets

### Backend `.env` (also set in Railway Variables)
```env
# LLM
GROQ_API_KEY=your-groq-api-key
# (GROQ_API_KEY_2 … GROQ_API_KEY_10 in Railway for rotation)

# Riot Games API — https://developer.riotgames.com
RIOT_API_KEY=your-riot-api-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=your-ls-api-key
LEMONSQUEEZY_STORE_ID=your-store-id
LEMONSQUEEZY_VARIANT_ID=your-pro-variant-id        # Pro Monthly $9.99
LEMONSQUEEZY_VARIANT_ID_YEARLY=                     # ⚠ NOT YET SET — see §12
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-signing-secret

# Routing + CORS
FRONTEND_URL=https://www.draftsage.pro
ALLOWED_ORIGINS=https://draftsage.pro,https://www.draftsage.pro,https://draft-sage-five.vercel.app,http://localhost:3000

# Tunables
PRO_DAILY_CAP=200                              # successful Engine runs per UTC day per Pro account
```

### Frontend `.env.production`
```env
REACT_APP_API_URL=https://draftsage-production.up.railway.app
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-key
```

### Frontend `.env` (local dev — DO NOT use in prod builds)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_KEY=...
```

### Frontend `.env.production`
```env
REACT_APP_API_URL=https://draftsage-production.up.railway.app
REACT_APP_SUPABASE_URL=https://oeghultxrvdouvtlzmih.supabase.co
REACT_APP_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZ2h1bHR4cnZkb3V2dGx6bWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTQ2NDcsImV4cCI6MjA5NDM3MDY0N30.wP8_tDhNWw422KZzYnT2-TWBgXJPpjKuiRNDQEs31og
```

### Frontend `.env` (local dev — DO NOT use in prod builds)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_KEY=...
```

### Vercel `.vercel/project.json`
```json
{"projectId":"prj_MLlnhanVerQyMUuRi50op2OioI4U","orgId":"team_1jlcfZEoxRo3V3j2VqcDBfcR","projectName":"draft-sage"}
```

---

## 7. How the Engine Works

### Pipeline (all per-request, no caching)

```
┌── Frontend POST /api/draft/suggest ─────────────────────┐
│  { ally_picks, enemy_picks, role, champion_pool, ban_mode }
│  Headers: Authorization + X-Session-Id
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌── routes/draft.py ──────────────────────────────────────┐
│  1. Verify JWT (auth_utils.verify_jwt)
│  2. If authed Pro: check session_id match, check daily cap
│  3. Call get_draft_suggestions(...)
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌── services/gemini_service.py ──────────────────────────┐
│  Layer 1 — analyze_team_damage()           ← AP/AD rule
│  Layer 2 — analyze_comp() (composition_analyzer)
│              → ally gaps, enemy archetype, threats
│  Layer 3 — fetch_all_context() (lolalytics + opgg)
│              → lane counter pool + blacklist + tier list
│  Layer 4 — derive_avoidance() (avoidance_engine)
│              → trait-driven do-not-pick rules
│  → Build structured intelligence block
│  → Send to Groq (temperature=0.5, max_tokens=3000)
│  → Parse JSON
│  → Post-process (in order):
│       _enforce_role_viability         (drop wrong-role picks from T)
│       _enforce_filters               (blacklist, avoid_set, drafted, forbidden_type)
│       _enforce_pool_filter            (champion_pool — HARD, no fallback)
│       _enforce_diversity              (dedup names, flag same-archetype/gap/threat)
│       _enrich_team_analysis           (deterministic ally/enemy archetype + damage)
│       _attach_deterministic_avoidance ← LLM entries DISCARDED, engine-only
│       result["why_not"] = _build_why_not_deterministic() ← LLM value OVERWRITTEN
│       _validate_avoid_damage_types    (defensive: strip any residual wrong claims)
│       _compute_confidence             (score_breakdown → confidence%)
│       classify_champion() override    (damage_type always overwritten for AD/AP champs)
│       get_champion_difficulty()       (difficulty from Data Dragon — overwrites LLM)
│       get_summoner_spells()           (always overwritten — LLM cannot influence spells)
│       patch_tier badges               (from OP.GG)
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌── Response shape ───────────────────────────────────────┐
│  recommendations: [{ champion, confidence, score_breakdown,
│                       fills_gap, answers_threat, damage_type,
│                       difficulty, summoner_spells, patch_tier, ... }]
│  team_analysis:    { ally_damage_type, enemy_damage_type,
│                       ally_archetype, enemy_archetype,
│                       missing_from_ally, enemy_win_condition }
│  avoid_champions:  [{ champion, reason }]   ← 100% from avoidance engine
│  why_not:          string                   ← 100% deterministic, no champ names
│  key_threats, team_win_condition, composition_type,
│  power_curve, draft_grade, draft_grade_reason
│  pool_warning / pool_empty  (only when pool filter trimmed picks)
└─────────────────────────────────────────────────────────┘
```

### Determinism boundary

The LLM owns: pick selection within constraints, reasoning copy, win condition descriptions, synergies/counters references.

Everything else is deterministic Python — the LLM cannot influence these:

| Field | Owner | Why |
|---|---|---|
| `damage_type` on recs | `classify_champion()` from T | LLM labeled Hecarim as AP, Ezreal as AP |
| `difficulty` on recs | `get_champion_difficulty()` from Data Dragon | LLM labeled Garen as Hard, Azir as Easy |
| `avoid_champions` | `avoidance_engine.py` | LLM called Evelynn "an AD champion" |
| `why_not` | `_build_why_not_deterministic()` | LLM hallucinated wrong champion names |
| `summoner_spells` | `summoner_spells.py` | LLM recommended Smite on ADCs |
| `ally/enemy_archetype` | `composition_analyzer.py` | Deterministic from trait scores |
| `ally_damage_type` | `analyze_team_damage()` | Derived from T's `ap` field |
| `missing_from_ally` | `identify_gaps()` | Computed from AXES thresholds (context-aware) |
| `confidence` score | `_compute_confidence()` | Synthesized if LLM omits it |
| `patch_tier` badge | OP.GG API | Not guessed |
| Pool enforcement | `_enforce_pool_filter()` | Hard drop — no fallback |
| Blacklist | cross-lane aggregation | Only blacklists champs that lose to 2+ enemies |

### Champion trait database (T in composition_analyzer.py)

T is the single source of truth. Every champion entry has:
- **12 axis scores** (engage, hard_cc, frontline, peel, poke, waveclear, sustain, disengage, pick, splitpush, dive, scaling) — 0/1/2
- **`roles: list[str]`** — all viable roles (e.g. `["Top", "Mid"]` for Irelia)
- **`ap: 0|1`** — 1 = AP damage, 0 = AD damage; omitted for true Mixed/hybrid

`team_profile()` sums only the 12 axes — `roles` and `ap` are automatically skipped since they're not in `AXES`.

`_champs_matching(predicate, role)` in `avoidance_engine.py` queries T dynamically, filtering by role and applying any predicate lambda. Add a champion to T → all avoidance rules auto-update.

### Name normalization

`_norm_champ(name)` strips apostrophes, spaces, and periods before comparison. Applied to all name matching: blacklist, avoid_set, drafted_names, pool filter, role viability, diversity check, avoidance engine.

---

## 8. Riot API Integration

### Endpoints used
| API | Endpoint | Purpose |
|---|---|---|
| account-v1 | `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | Riot ID → PUUID |
| match-v5 | `/lol/match/v5/matches/by-puuid/{puuid}/ids` | Recent match IDs |
| match-v5 | `/lol/match/v5/matches/{matchId}` | Match details |
| league-v4 | `/lol/league/v4/entries/by-puuid/{puuid}` | Ranked stats |
| champion-mastery-v4 | `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top` | Top champions |

### Regional routing
Account/Match APIs use regional shards (americas, europe, asia, sea). League/Mastery APIs use platform routing (na1, euw1, kr, etc.). Mapping is in `riot_api_service.py`.

### Data flow
```
User enters "Fahdl#NA1" on Dashboard
  → POST /api/summoner/link
  → account-v1: Riot ID → puuid
  → Store puuid + region in Supabase user_metadata
  → Dashboard shows ranked stats + mastery + recent performance
  → DraftBoard fetches profile → builds champion→WR lookup
  → RecommendationCard shows "You: 62% WR (15 games)" badge
```

---

## 9. Authentication & Pro Detection

- `current_session_id` stored in `user_metadata` (set by `/api/auth/claim-session`)
- New device sign-in invalidates old session via this id
- Frontend `geminiApi.js` interceptor sends `X-Session-Id` header
- Response interceptor catches 401 `session_invalidated` → force-bounce to `/login?reason=session_invalidated`
- Riot account data stored in `user_metadata`: `riot_puuid`, `riot_game_name`, `riot_tag_line`, `riot_region`

`isPro = user.user_metadata.is_pro || user.user_metadata.is_admin`

---

## 10. Payment Flow

- Frontend sends `billing_period: "monthly" | "yearly"` in checkout-session request
- Backend routes to `LEMONSQUEEZY_VARIANT_ID` (monthly) or `LEMONSQUEEZY_VARIANT_ID_YEARLY` (yearly)
- Yearly variant **needs to be created in LS dashboard and env var set** — see §12

---

## 11. Key API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/draft/suggest` | Engine — runs full analysis pipeline. Headers: `Authorization`, `X-Session-Id`. |
| GET | `/api/champions` | Full champion list with icons |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns access + refresh tokens) |
| POST | `/api/auth/claim-session` | Mint new session_id, invalidate older sessions |
| POST | `/api/payments/create-checkout-session` | Create LS checkout — accepts `billing_period` |
| POST | `/api/payments/webhook` | LS webhook receiver |
| GET | `/api/payments/plans` | Plan info (returns `pro_monthly` + `pro_yearly`) |
| GET | `/api/summoner/regions` | Available region codes |
| POST | `/api/summoner/link` | Link Riot account (auth required) |
| POST | `/api/summoner/unlink` | Unlink Riot account (auth required) |
| POST | `/api/summoner/profile` | Fetch summoner profile (public) |
| GET | `/api/summoner/me` | Fetch linked account profile (auth required) |
| GET | `/health` | Health check |

Frontend routes: `/`, `/draft`, `/pricing`, `/dashboard`, `/login`, `/admin`, `/reset-password`.

---

## 12. ⚠ Outstanding Action Items

### Must do
1. **Create Lemon Squeezy yearly variant**
   - LS dashboard → DraftSage product → New variant → $79/year recurring
   - Copy variant ID
   - Railway → backend → Variables → set `LEMONSQUEEZY_VARIANT_ID_YEARLY=<id>`
   - **Until this is done, clicking "Yearly" on pricing page returns a 503.**

2. **Verify Railway env vars are aligned with custom domain**
   ```env
   FRONTEND_URL=https://www.draftsage.pro
   ALLOWED_ORIGINS=https://draftsage.pro,https://www.draftsage.pro,https://draft-sage-five.vercel.app,http://localhost:3000
   ```

3. **Lemon Squeezy live mode**
   - Currently in test mode. Toggle off when ready for real payments.

4. **Riot API key rotation**
   - Development keys expire. Production keys need Riot approval.
   - When key expires, update `RIOT_API_KEY` in Railway Variables.

### Nice to have
5. **Test the concurrent-session limit end-to-end in production.**
   Sign in same account in two browsers; second sign-in should kick the first one out next time it hits the Engine.

6. **Decide whether to raise/lower `PRO_DAILY_CAP`.**
   Default is 200/UTC-day.

7. **Free-tier rate limiting is still client-side localStorage.**
   Server-side enforcement would be more robust.

8. **Consider hybrid LLM routing for Pro users.**
   Current: Groq for everyone. Future option: Claude Haiku 4.5 for Pro (better reasoning). Estimated cost ~$1.70/100 Pro calls — still 83% margin at $9.99/mo.

9. **T database coverage — keep expanding.**
   New champions and reworks should get T entries with correct `roles`, `ap`, and trait scores. The payoff compounds: one T entry updates composition analysis, avoidance rules, summoner spell logic, and damage classification simultaneously.

10. **Auto champion pool from mastery.**
    Import top mastery champions into the draft board's champion pool automatically. Currently the pool is manual.

11. **Payment system mismatch.**
    HANDOFF/README reference Lemon Squeezy but `payments.py` may use Paddle. Verify and align.

---

## 13. Known Edge Cases / Things to Watch

- **CRA env var precedence** — `.env.production` is loaded only by `npm run build`. Deleting it and rebuilding deploys localhost URLs into prod. Already burned us once.
- **Vercel CLI in wrong directory** — running `npx vercel` from the `DraftIQ/` parent (instead of `wincon/`) auto-creates a junk `vercel.json` with `experimentalServices`. Delete on sight.
- **Pool filter can return empty** — when the user's pool has zero champs that fit the draft state, `recommendations = []` and `pool_empty = true`. UI shows a magenta banner. Don't try to "fill" with off-pool picks.
- **T dict: omitting `ap` = Mixed** — champions without an `ap` field are treated as Mixed by `classify_champion()`. This is intentional — they deal both damage types or have context-dependent builds. Do not add `ap: 0` or `ap: 1` to these unless the champion overwhelmingly commits to one type at high elo.
- **Avoidance engine only runs when threats are real** — rules have score thresholds (e.g. dive >= 3, hard_cc >= 6). Avoid list will be empty in balanced drafts. This is correct, not a bug.
- **Summoner spells are Python-owned** — add champion-specific overrides in `summoner_spells.CHAMPION_SPELL_OVERRIDES`. New releases or reworks often need this.
- **Groq TPM limits** — Qwen3-32b has a 6000 TPM limit on the free tier. If the prompt is too long, you get 413 errors. Prompt is currently trimmed (role pool at 30, gap pool at 15). If still hitting limits, upgrade Groq tier or trim further.
- **Riot API regional routing** — account lookups must go to the correct regional shard (americas/europe/asia/sea). Mapping is in `riot_api_service.py ACCOUNT_REGION`.
- **Blacklist cross-lane threshold** — only blacklists champions that lose to 2+ enemies. If this is too lenient, lower the threshold.

---

## 14. Recent Commit Trail (most recent first)

```
5fd1620  revert: remove fallback models, keep only prompt trimming
c0c9f5e  fix: 413 token limit — re-enable fallbacks + trim prompt
8abfe66  fix: increase pick variety without sacrificing quality
36c9cfe  fix: add ap: 1 to magic-damage tanks and supports
0620134  feat: personal WR overlay on Engine recommendations
0620134  feat: personal WR overlay on each Engine recommendation
5fd1620  fix: Riot account linking — no reload, update state directly
86fcaff  fix: Riot account linking — no reload, update state directly
73a0da2  fix: Riot API regional routing — account lookups used wrong shard
3ea2d68  feat: Riot API integration — match history, ranked stats, mastery
89ccd17  feat: context-aware gap detection — 11 axes instead of 5
0d0f48e  fix: hardcoded sets, silent errors, and broken archetype detection
35894f5  fix: blacklist cross-lane logic + misleading variable name
c529021  fix: threat patterns, peel gap for melee carries, summoner spell mobility
9348079  fix: add ap: 0 to 11 AD champions missing damage type classification
dc44aae  fix: Poppy top role + Jax/Udyr/Volibear back to Mixed
546209d  fix: normalize champion names across all filters and comparisons
99a11d2  fix: deterministic champion difficulty from Data Dragon
4532339  fix: adjust difficulty thresholds — Garen (5) now Easy
5bf5119  fix: avoid_champions and why_not now 100% deterministic — eliminate LLM hallucinations
08182a0  feat: trait-driven architecture — eliminate all hardcoded champion sets
f2dd27d  fix: engine accuracy — damage types, role-scoped avoid lists, diversity
ab93766  fix: engine quality overhaul — 11 bugs fixed across suggestion pipeline
```

---

## 15. Quickstart for "Continuing After a Break"

If you (or future Claude) is picking this up cold:

1. Read this whole file. §2 "What Changed" catches you up on the big shifts.
2. Read [gemini_service.py](backend/services/gemini_service.py) end-to-end — it's the heart of the Engine. Pay attention to the post-processing pipeline order and which fields the LLM is NOT allowed to influence.
3. Read [composition_analyzer.py](backend/services/composition_analyzer.py) — the T dict structure (roles + ap fields) is the foundation everything else queries. GAP_RULES now has context-aware conditions.
4. Read [avoidance_engine.py](backend/services/avoidance_engine.py) — understand `_champs_matching(predicate, role)` and how each rule uses a predicate lambda instead of a hardcoded set.
5. Read [riot_api_service.py](backend/services/riot_api_service.py) — Riot API client for match history, ranked stats, mastery.
6. Read [DraftBoard.jsx](frontend/src/components/DraftBoard.jsx) for the UI structure. Now fetches summoner profile and passes WR data to RecommendationCard.
7. Pull, `npm install --legacy-peer-deps` in `frontend/`, `pip install -r requirements.txt` in `backend/`, then run per §4.
8. Check §12 — Yearly LS variant and Riot API key rotation are the most likely things needing attention.

**Latest deploy:** commit `5fd1620` — Railway (backend) auto-deployed on push. Frontend needs manual `npx vercel --prod --yes` from `wincon/`.

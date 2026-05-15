# DraftSage 🏆 — AI-Powered League of Legends Draft Assistant

DraftSage uses **Llama 3.3 70B via Groq** to analyze your League of Legends draft like a Challenger-level coach — recommending picks, explaining win conditions, and identifying counter-pick opportunities in real time.

---

## Tech Stack

| Layer         | Technology                               |
|---------------|------------------------------------------|
| Frontend      | React 18 + Tailwind CSS v3               |
| Backend       | Python 3.11 + FastAPI                    |
| AI            | Groq API — `llama-3.3-70b-versatile`    |
| Game Data     | Riot Data Dragon CDN (no key needed)     |
| Auth          | Supabase (JWT + user_metadata)           |
| Payments      | Lemon Squeezy (freemium subscriptions)   |
| Frontend Host | Vercel                                   |
| Backend Host  | Railway                                  |

---

## Project Structure

```
DraftIQ/
└── wincon/
    ├── README.md
    ├── test_auth.py            # Auth smoke test
    ├── test_webhook.py         # Webhook smoke test
    │
    ├── frontend/               # React app
    │   ├── src/
    │   │   ├── api/
    │   │   │   ├── geminiApi.js    # Axios instance → backend
    │   │   │   └── riotApi.js      # Data Dragon helpers
    │   │   ├── components/
    │   │   │   ├── DraftBoard.jsx
    │   │   │   ├── ChampionSearch.jsx
    │   │   │   ├── RecommendationCard.jsx
    │   │   │   ├── TeamSlot.jsx
    │   │   │   └── Navbar.jsx
    │   │   ├── context/
    │   │   │   └── AuthContext.jsx     # Supabase session + isPro/isAdmin flags
    │   │   ├── hooks/                  # Custom React hooks
    │   │   ├── pages/
    │   │   │   ├── Home.jsx
    │   │   │   ├── Draft.jsx
    │   │   │   ├── Pricing.jsx         # Lemon Squeezy checkout
    │   │   │   ├── Dashboard.jsx       # Plan status + manage subscription
    │   │   │   ├── Login.jsx
    │   │   │   ├── Admin.jsx           # Admin-only page
    │   │   │   └── ResetPassword.jsx
    │   │   ├── App.jsx
    │   │   └── index.js
    │   ├── tailwind.config.js
    │   └── .env.example
    │
    └── backend/                # FastAPI app
        ├── main.py
        ├── requirements.txt
        ├── routes/
        │   ├── auth.py         # POST /api/auth/register, /login, /logout
        │   ├── draft.py        # POST /api/draft/suggest
        │   └── payments.py     # Lemon Squeezy checkout + webhook + /plans
        └── services/
            ├── gemini_service.py   # Groq AI integration + system prompt
            └── riot_service.py     # Data Dragon champion fetching + cache
```

---

## Setup Instructions

### 1. Navigate to project

```bash
cd DraftIQ/wincon
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
# Edit .env and fill in your keys (see below)

# Run the backend
python main.py
# → API running at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
copy .env.example .env
# Edit .env and fill in your keys

# Start dev server
npm start
# → App running at http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
GROQ_API_KEY=your-groq-api-key           # https://console.groq.com
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # For webhook user updates

# Lemon Squeezy — https://app.lemonsqueezy.com
LEMONSQUEEZY_API_KEY=your-ls-api-key
LEMONSQUEEZY_STORE_ID=your-store-id
LEMONSQUEEZY_VARIANT_ID=your-pro-variant-id        # Pro plan variant ID
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-signing-secret

FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-key
```

---

## API Endpoints

| Method | Path                                        | Description                          |
|--------|---------------------------------------------|--------------------------------------|
| GET    | `/`                                         | Health check                         |
| GET    | `/health`                                   | Health check                         |
| GET    | `/api/champions`                            | Full champion list from Data Dragon  |
| POST   | `/api/draft/suggest`                        | Get AI champion recommendations      |
| POST   | `/api/auth/register`                        | Create account (Supabase)            |
| POST   | `/api/auth/login`                           | Sign in                              |
| POST   | `/api/auth/logout`                          | Sign out                             |
| POST   | `/api/payments/create-checkout-session`     | Start Lemon Squeezy Pro checkout     |
| POST   | `/api/payments/webhook`                     | Lemon Squeezy webhook receiver       |
| GET    | `/api/payments/plans`                       | Return Free/Pro plan info            |

### Example: POST `/api/draft/suggest`

**Request:**
```json
{
  "ally_picks": ["Malphite", "Vi", "Orianna"],
  "enemy_picks": ["Sett", "Jarvan IV", "Azir", "Jinx"],
  "role": "Mid",
  "champion_pool": ["Yasuo", "Yone", "Zed"],
  "ban_mode": false
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "champion": "Yasuo",
      "reason": "Yasuo's knock-up synergy with Malphite and Vi creates a devastating teamfight combo...",
      "win_condition": "Land Malphite ultimate into Yasuo Last Breath for an unstoppable teamfight.",
      "difficulty": "Hard",
      "synergies": ["Malphite", "Vi"],
      "counters": ["Azir", "Jinx"]
    }
  ],
  "why_not": "Mage picks are suboptimal here as the team already has AP from Orianna...",
  "team_win_condition": "The team should look to engage on mispositioned carries with a Malphite + Yasuo combo.",
  "composition_type": "engage"
}
```

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run this SQL in the Supabase SQL editor:

```sql
-- Optional profiles table (not required — app reads from user_metadata)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  summoner_name text,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
```

3. **Pro/Admin flags are stored in `user_metadata`** (not a separate table):
   - `is_pro: true` — set by the Lemon Squeezy webhook on subscription activation
   - `is_admin: true` — set manually in Supabase dashboard for admin accounts
   - The `AuthContext` reads these directly from the JWT (`user.user_metadata`)

4. Copy your `Project URL` and `anon public key` into `.env` files.

---

## Lemon Squeezy Setup

1. Create a store at [app.lemonsqueezy.com](https://app.lemonsqueezy.com)
2. Create a subscription product:
   - Price: $9.99/month recurring
   - Copy the **Variant ID** to `LEMONSQUEEZY_VARIANT_ID`
   - Copy the **Store ID** to `LEMONSQUEEZY_STORE_ID`
3. Create a webhook pointing to `https://your-api.railway.app/api/payments/webhook`
   - Events: `subscription_created`, `order_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`
   - Add a signing secret → copy to `LEMONSQUEEZY_WEBHOOK_SECRET`
4. The webhook automatically sets `is_pro: true` in Supabase `user_metadata` via the **service role key**

---

## Auth & Role System

```
Supabase JWT (user_metadata)
├── is_admin: true   →  Full access, unlimited suggestions, Admin page
└── is_pro: true     →  Unlimited AI suggestions, ban mode, champion pool
```

- **Free users**: 3 AI suggestions/day (tracked in `localStorage`)
- **Pro users**: Unlimited suggestions + ban recommendations + champion pool filter
- **Admins**: All Pro features + access to `/admin` dashboard

Admin accounts are granted manually:
```sql
-- In Supabase SQL editor:
update auth.users
set raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
where email = 'your-admin@email.com';
```

---

## Deployment

### Backend → Railway

1. Push `backend/` to a GitHub repo
2. Create a new Railway project, connect the repo
3. Add environment variables in Railway dashboard
4. Railway auto-detects Python and runs `python main.py`

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Import project in [vercel.com](https://vercel.com)
3. Set `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_KEY` in Vercel dashboard
4. Vercel auto-builds with `npm run build`

---

## Freemium Model

| Feature                | Free      | Pro ($9.99/mo)  |
|------------------------|-----------|-----------------|
| AI pick suggestions    | 3/day     | Unlimited        |
| Ban recommendations    | ❌        | ✅               |
| Champion pool filter   | ❌        | ✅               |
| Draft history          | ❌        | ✅ (UI ready)    |
| Admin dashboard        | ❌        | ❌ (admin only)  |

---

## Notes

- Champion icons are fetched from `ddragon.leagueoflegends.com` — no API key required.
- The AI engine is **Groq (`llama-3.3-70b-versatile`)**, not Gemini — `gemini_service.py` is a legacy filename.
- DraftSage is not affiliated with or endorsed by Riot Games.
- League of Legends and all related names are trademarks of Riot Games, Inc.

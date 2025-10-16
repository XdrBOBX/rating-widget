# Rating Widget (RedM/GTA + Discord)

A lightweight, **embeddable hearts-rating widget** for RedM/GTA communities.
Users can rate **Server/Game** and **Support** with 1–5 ❤️ instead of stars,
optionally sign in with **Discord OAuth2**, and see **Top Supporters**
highlighted by activity (via your bot/back-end).

- 💜 1–5 **hearts** for two categories (Server/Game & Support)
- 📝 **Comments**, live **average** + simple **bar**, latest **reviews**
- 🏆 **Top Supporters** list (requires back-end/bot to count activity)
- 🔐 Optional **Discord OAuth2** login (`identify`) – fully server-side
- 🧪 **Demo fallback** via `localStorage` when no API is configured
- ♿ Keyboard & screen-reader friendly, modern Dark UI
- 🌐 Drop-in **HTML embed**

---

## Quick Start

> Requires **Node 18+** (for native `fetch`) and **npm**.

### 1) Clone & install server deps
```bash
cd server
cp .env.example .env   # fill your Discord credentials
npm install
npm run dev           # starts http://localhost:3000
```

### 2) Open the widget
- Open `web/index.html` in your browser (or serve it statically).
- In the `<div class="tr-heart-widget">` you can set:
  - `data-title="THC Legacy RP – Bewertung"` (custom title)
  - `data-guild="YOUR_GUILD_ID"`
  - `data-api="http://localhost:3000"` (or your deployed API)
  - `data-discord-client="YOUR_DISCORD_CLIENT_ID"`
  - `data-redirect="https://your.site/rating"` (defaults to current URL)

> If `data-api` is empty, the widget runs **DEMO mode** storing ratings
> in `localStorage` only.

### 3) Endpoints (expected by the widget)

```
GET  /api/ratings/summary?guildId=G        -> { game:{avg,count,dist:[c1..c5]}, support:{...} }
GET  /api/ratings/recent?guildId=G&limit=N -> [{category,score,comment,author,createdAt}]
POST /api/ratings                          -> body { guildId, userId?, category, score, comment? }
GET  /api/supporters/top?guildId=G&limit=N -> [{id,name,avatar,points,rank}]
POST /api/discord/oauth/callback           -> body { code, redirectUri } -> { user:{id,name,avatar} }
```

The included **demo server** implements these endpoints **in-memory**.
Replace with your DB (Postgres/MySQL/SQLite) as needed.

---

## Discord OAuth2 Setup

1. Create a **Discord Application** → OAuth2:
   - Add redirect URI: e.g. `http://localhost:3000/oauth/redirect` or your site URL.
2. Copy `CLIENT_ID` and `CLIENT_SECRET` into `server/.env`.
3. In `web/index.html`, set `data-discord-client="YOUR_CLIENT_ID"` and ensure
   `data-redirect` matches your registered redirect URL (or leave blank to default
   to the current URL).

> The browser redirects to Discord for auth, then your server exchanges the `code`
> with Discord and returns a **minimal user object** back to the widget.

---

## Server Persistence (DB)

For production, wire the endpoints to your DB. A minimal SQL idea:

```sql
CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT,
  category TEXT CHECK (category IN ('game','support')) NOT NULL,
  score INT CHECK (score BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Add a `supporter_activity` table for supporter points from your Discord bot and
expose `/api/supporters/top`.

---

## Embed Snippet

```html
<div class="tr-heart-widget"
     data-title="THC Legacy RP – Bewertung"
     data-guild="YOUR_GUILD_ID"
     data-api="https://api.example.com"
     data-discord-client="YOUR_DISCORD_CLIENT_ID"
     data-redirect="https://your.site/rating">
</div>

<link rel="stylesheet" href="./assets/widget.css" />
<script src="./assets/widget.js" defer></script>
```

---

## License

[MIT](LICENSE) © 2025 XdrBOBX

-- Minimal schema idea for production DB (Postgres syntax)
CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT,
  category TEXT CHECK (category IN ('game','support')) NOT NULL,
  score INT CHECK (score BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Example table for supporter points (to be filled by your Discord bot)
CREATE TABLE supporter_activity (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT now()
);

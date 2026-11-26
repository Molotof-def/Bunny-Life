CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  carrots INTEGER NOT NULL DEFAULT 250,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Плюша',
  hunger INTEGER NOT NULL DEFAULT 82,
  mood INTEGER NOT NULL DEFAULT 91,
  energy INTEGER NOT NULL DEFAULT 76,
  cleanliness INTEGER NOT NULL DEFAULT 88,
  friendship INTEGER NOT NULL DEFAULT 12,
  equipped JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS inventory (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  PRIMARY KEY(user_id, item_id)
);
CREATE TABLE IF NOT EXISTS rooms (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  decor JSONB NOT NULL DEFAULT '[]'::jsonb,
  wall_color TEXT NOT NULL DEFAULT '#f4e7dc',
  floor_color TEXT NOT NULL DEFAULT '#e8d6c5',
  theme TEXT NOT NULL DEFAULT 'cozy'
);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS wall_color TEXT NOT NULL DEFAULT '#f4e7dc';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_color TEXT NOT NULL DEFAULT '#e8d6c5';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'cozy';
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_gift_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievements JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS user_quests (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, quest_id, quest_date)
);

CREATE TABLE IF NOT EXISTS minigame_rewards (id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,score INTEGER NOT NULL,reward INTEGER NOT NULL,reward_date DATE NOT NULL DEFAULT CURRENT_DATE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS minigame_rewards_user_day_idx ON minigame_rewards(user_id,reward_date);

ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date DATE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS friend_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_friend_code_unique ON users(friend_code) WHERE friend_code IS NOT NULL;
CREATE TABLE IF NOT EXISTS friend_requests (
  id BIGSERIAL PRIMARY KEY,
  from_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_user <> to_user)
);
CREATE INDEX IF NOT EXISTS friend_requests_inbox_idx ON friend_requests(to_user,status,created_at DESC);
CREATE TABLE IF NOT EXISTS friendships (
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_a,user_b),
  CHECK (user_a < user_b)
);

-- Release bookkeeping: this marker records the pre-release schema baseline.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO schema_migrations(version) VALUES ('0.0.9-pre-release') ON CONFLICT (version) DO NOTHING;

-- Helpful ordering for friend-code lookups and inbox rendering.
CREATE INDEX IF NOT EXISTS friend_requests_outbox_idx ON friend_requests(from_user,status,created_at DESC);


-- v0.1.0 social layer: auditable carrot gifts and player room visits.
CREATE TABLE IF NOT EXISTS carrot_gifts (
  id BIGSERIAL PRIMARY KEY,
  from_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_user <> to_user)
);
CREATE INDEX IF NOT EXISTS carrot_gifts_sender_day_idx ON carrot_gifts(from_user, created_at);
CREATE INDEX IF NOT EXISTS carrot_gifts_receiver_idx ON carrot_gifts(to_user, created_at DESC);
INSERT INTO schema_migrations(version) VALUES ('0.1.0') ON CONFLICT (version) DO NOTHING;

-- v0.2.0: weekly world event, daily collectible finds and player notifications.
CREATE TABLE IF NOT EXISTS world_collectibles (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  find_id TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points BETWEEN 1 AND 100),
  reward INTEGER NOT NULL CHECK (reward BETWEEN 1 AND 100),
  collect_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, find_id, collect_date)
);
CREATE INDEX IF NOT EXISTS world_collectibles_season_idx ON world_collectibles(user_id,collected_at DESC);
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_inbox_idx ON notifications(user_id,created_at DESC);
INSERT INTO schema_migrations(version) VALUES ('0.2.0') ON CONFLICT (version) DO NOTHING;

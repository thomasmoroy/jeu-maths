-- Schema SQL pour la base de données Neon PostgreSQL sur Netlify
-- Exécutez cette commande dans la console SQL de Neon (ou elle s'exécute automatiquement via la fonction Netlify)

CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) UNIQUE NOT NULL,
    avatar VARCHAR(50) DEFAULT '🧙‍♀️',
    stars INTEGER DEFAULT 0,
    streak_record INTEGER DEFAULT 0,
    chrono_record INTEGER DEFAULT 0,
    pet_type VARCHAR(50) DEFAULT 'flammy',
    save_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_logs (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    stars_earned INTEGER DEFAULT 0,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_name ON players(player_name);

CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username VARCHAR(50) UNIQUE NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE games (
	id SERIAL PRIMARY KEY,
	start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	end_time TIMESTAMP,
	dice_distribution JSONB,
	turns INT
);

CREATE TABLE game_players (
    id SERIAL PRIMARY KEY,
    game_id INT REFERENCES games(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    victory_points INT,
    roads_built INT DEFAULT 0,
    settlements_built INT DEFAULT 0,
    cities_built INT DEFAULT 0,
    longest_road BOOLEAN DEFAULT FALSE,
    largest_army BOOLEAN DEFAULT FALSE,
    UNIQUE(game_id, user_id)
);


CREATE TABLE player_resources (
    id SERIAL PRIMARY KEY,
    game_player_id INT REFERENCES game_players(id) ON DELETE CASCADE,
    resource_type VARCHAR(20) CHECK (resource_type IN ('wood', 'brick', 'sheep', 'wheat', 'ore')),
    amount INT
);
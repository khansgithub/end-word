drop table if exists gameState cascade;

drop table if exists players cascade;

drop type if exists gameStateEnum cascade;

CREATE TYPE gameStateEnum AS ENUM('waiting', 'playing', 'finished');

CREATE TABLE gameState (
    id SERIAL PRIMARY KEY,
    gameId serial not null,
    match_letter TEXT[] NOT NULL,
    status gameStateEnum NOT NULL default 'waiting',
    players TEXT[] NOT NULL,
    connected_players INTEGER NOT NULL,
    turn INTEGER NOT NULL,
    socket_player_map JSONB
);

create table players (
    playerId uuid primary key,
    health integer not null check (
        health <= 5
        AND health >= 0
    ),
    gameId integer not null,
    foreign key (gameId) references gameState (id)
);

ALTER TABLE gamestate ENABLE ROW LEVEL SECURITY;

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- realtime

create policy "Users can read their own game state" on public.gamestate for
select
    to authenticated using (
        exists (
            select
                1
            from
                players
            where
                players.playerId = auth.uid ()
                and players.gameId = gamestate.id
        )
    );

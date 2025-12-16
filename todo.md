- multi player with up to 5 players
    + refactor how state is used in the game logic
    + see https://chatgpt.com/c/693f267c-778c-8329-93f3-3023316a0dc2

    1. player joins
    2. client checks if there is a user name
    3. client asks server to join room
        if there [is space]
            4. server sends bootstrap informaiton
                4.1 position of the player in the room
                4.2 state of the room + other players
            5. client sets up game accordingly
        if there [is no space]
            4. client redirects to homescreen
- a start screen
    + add the current player to the gameState.players array
    + add zustand to capture player name from Homescreen -> Game

- point system
- health system (i.e. 3 lives)
- timer feature
- good UX

- refactor out direct dom manipulation and use states - memoised components shouldn't renreder on state change but still update state data
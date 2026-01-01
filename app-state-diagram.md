# App State Diagram - High Level Over Time

## State Flow Diagram

```mermaid
stateDiagram-v2
    [*] --> Homescreen: App Start
    
    state Homescreen {
        [*] --> Connecting: User enters name
        Connecting --> Connected: Socket connected
        Connected --> Joining: User clicks Join
        Joining --> Registered: Server assigns seat
        Joining --> Failed: Room full / Error
        Failed --> [*]
    }
    
    Homescreen --> Room: Redirect to /room
    
    state Room {
        [*] --> Connecting: Component mount
        Connecting --> Waiting: Player registered<br/>connectedPlayers < 2
        Connecting --> Playing: Player registered<br/>connectedPlayers >= 2
        Waiting --> Playing: 2nd player joins
        Playing --> Waiting: Player leaves<br/>connectedPlayers < 2
        Playing --> Playing: Turn progresses<br/>Word submitted
    }
    
    Room --> Homescreen: Disconnect / Leave
    
    state "Game State Status" as GameStatus {
        [*] --> null: Initial
        null --> waiting: First player joins
        waiting --> playing: Second player joins
        playing --> waiting: Player leaves
        playing --> finished: Game ends (future)
        finished --> [*]
    }
    
    state "Player Lifecycle" as PlayerLifecycle {
        [*] --> Unregistered: New connection
        Unregistered --> Registered: registerPlayer event
        Registered --> InGame: Game status = playing
        InGame --> Waiting: Game status = waiting
        InGame --> Disconnected: Socket disconnect
        Waiting --> InGame: Game status = playing
        Disconnected --> [*]
    }
```

## Timeline View

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant GS as GameState
    
    Note over U,GS: Phase 1: Initialization
    U->>C: Enter name
    C->>S: Socket connect
    S-->>C: Connection established
    C->>S: isReturningPlayer(clientId)
    S-->>C: returningPlayer (if exists)
    C->>S: getPlayerCount()
    S-->>C: playerCount
    
    Note over U,GS: Phase 2: Joining Room
    U->>C: Click Join / Navigate to /room
    C->>S: registerPlayer(playerProfile)
    S->>GS: addPlayer(player)
    GS->>GS: Update status<br/>(waiting if < 2 players,<br/>playing if >= 2)
    S-->>C: playerRegistered(gameState)
    S->>S: Broadcast playerJoinNotification
    C->>C: Update local state
    
    Note over U,GS: Phase 3: Gameplay
    loop Each Turn
        U->>C: Enter word matching last letter
        U->>C: Submit word
        C->>S: Submit word (via socket)
        S->>GS: progressNextTurn(block, word)
        GS->>GS: buildMatchLetter(block)
        GS->>GS: setPlayerLastWord(word)
        GS->>GS: nextTurn()
        S->>S: Broadcast state update
        C->>C: Update local state
    end
    
    Note over U,GS: Phase 4: Player Leaves
    U->>C: Disconnect / Leave
    C->>S: disconnect event
    S->>GS: removePlayer(player)
    GS->>GS: Update status<br/>(playing -> waiting if < 2)
    S->>S: Broadcast playerLeaveNotification
    C->>C: Update local state
```

## State Structure Over Time

```mermaid
graph TB
    subgraph "Initial State (null)"
        I1[status: null<br/>players: [null, null, ...]<br/>turn: 0<br/>connectedPlayers: 0]
    end
    
    subgraph "Waiting State (1 player)"
        W1[status: waiting<br/>players: [Player1, null, ...]<br/>turn: 0<br/>connectedPlayers: 1]
    end
    
    subgraph "Playing State (2+ players)"
        P1[status: playing<br/>players: [Player1, Player2, ...]<br/>turn: 0<br/>connectedPlayers: 2<br/>matchLetter: 가]
        P2[status: playing<br/>players: [Player1, Player2, ...]<br/>turn: 1<br/>connectedPlayers: 2<br/>matchLetter: 다<br/>Player1.lastWord: 가나다]
        P3[status: playing<br/>players: [Player1, Player2, ...]<br/>turn: 0<br/>connectedPlayers: 2<br/>matchLetter: 라<br/>Player2.lastWord: 다라마]
    end
    
    I1 -->|First player joins| W1
    W1 -->|Second player joins| P1
    P1 -->|Player1 submits word| P2
    P2 -->|Player2 submits word| P3
    P3 -->|Player1 submits word| P1
    
    style I1 fill:#ffcccc
    style W1 fill:#ffffcc
    style P1 fill:#ccffcc
    style P2 fill:#ccffcc
    style P3 fill:#ccffcc
```

## Key State Transitions

| From State | To State | Trigger | Action |
|------------|----------|---------|--------|
| `null` | `waiting` | First player joins | `addPlayer()` → `_postPlayerCountUpdateState()` |
| `waiting` | `playing` | Second player joins | `addPlayer()` → `_postPlayerCountUpdateState()` |
| `playing` | `waiting` | Player leaves (count < 2) | `removePlayer()` → `_postPlayerCountUpdateState()` |
| `playing` | `playing` | Word submitted | `progressNextTurn()` → `nextTurn()` |
| Any | Any | Player joins/leaves | `updateConnectedPlayersCount()` |

## Component State Mapping

| Component | Local State | GameState Dependency |
|-----------|-------------|---------------------|
| `Homescreen` | `playerCount`, `retryCount`, `returningPlayer` | None (pre-game) |
| `GameContainer` | `userIsConnected` (CONNECTING/CONNECTED/FAILED) | Receives initial `gameState` from server |
| `Game` | Uses `useReducer` with `gameStateReducer` | Manages local `gameState` via reducer |

## Notes

- **GameState.status** transitions: `null` → `waiting` → `playing` → `waiting` (if players drop) → `playing` (if players rejoin)
- **Server** maintains authoritative `GameState<ServerPlayers>`
- **Clients** maintain local `GameState<ClientPlayers>` synced via socket events
- **Turn progression** happens via `progressNextTurn()` which chains: `buildMatchLetter()` → `setPlayerLastWord()` → `nextTurn()`
- **Player count** automatically updates game status: `connectedPlayers >= 2` → `playing`, else → `waiting`


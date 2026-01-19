export type clientSocketActions = "getPlayerCount";

export class GameState{
    playerCount: number = 0;
    players: Player[] = [];

    addPlayer(player: Player){
        this.players.push(player);
    }
};

export class Server{
    state: GameState | null = null;

    initGameState(){
        const s = this.state !== null ? this.state : new GameState();
        this.state = s;
        return s;
    }

    addPlayer(player: Player){
        this.state?.addPlayer(player);
    }
};

export class Player{
    name: string;
    server: Server | null = null;;

    constructor(name: string){
        this.name = name;
    }

    connect(server: Server){
        this.server = server;
    }

    getPlayerCount(){
        return this.server?.state?.playerCount || 0;
    }

    register(name: string){
        this.server?.addPlayer(this);
    }

    getGameState(){
        return this.server?.state;
    }

};
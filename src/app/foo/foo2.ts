import { Server, Player } from './foo2-1';

const server = new Server();
const p1 = new Player("p1");
const p2 = new Player("p2");
server.initGameState();

p1.connect(server);
p1.getPlayerCount();
p1.register(p1.name);
p1.getGameState();

p2.connect(server);
p2.getPlayerCount();
p2.register(p2.name)
p2.getGameState();

p1.submitWord("word1");
p2.submitWord("word2");
p1.submitWord("word3");
p2.submitWord("word4");
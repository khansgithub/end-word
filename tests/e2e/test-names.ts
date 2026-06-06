import { arrayToMapped } from "@/shared/utils";

const namesOfTests = [
    "resetAfterReload",
    "dualBrowserJoin",
    "turnChangeUpdatesHighlight",
    "playerHealthDecreases",
    "gameStartsAfterBothPlayersJoin",
    "playerDiesIn3PlayerGame",
    "endGameWith2Players",
    "endGameWith3Players",
	"customTest",
] as const;

export const roomFlowTestNames = arrayToMapped(namesOfTests);
export type RoomFlowTestName = (typeof namesOfTests)[number];

export const roomFlowTestDescriptions: Record<RoomFlowTestName, string> = {
    resetAfterReload: "Test that clearing site data after joining a room returns the player to the home screen",
    dualBrowserJoin: "Test that separate browsers can join the room and render five player slots",
    turnChangeUpdatesHighlight: "Test that the inputDomHighlight updates when turn changes after word submission",
    playerHealthDecreases: "Test that the player health decreases when an invalid word is submitted",
    gameStartsAfterBothPlayersJoin: "Test that the room flow starts the game after both players join",
    playerDiesIn3PlayerGame: "Test that in a 3 player game, when the 2nd player dies the server skips them when progressing following turns.",
    endGameWith2Players: "Test that the end game screen appears when one player dies in a 2 player (alive) game",
    endGameWith3Players: "Test that the end game screen appears properly with 3 players", 
	customTest: "",
} as const;
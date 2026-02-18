const namesOfTests = [
    "resetAfterReload",
    "dualBrowserJoin",
    "turnChangeUpdatesHighlight",
    "playerHealthDecreases",
    "gameStartsAfterBothPlayersJoin",
    "playerDiesIn3PlayerGame"
] as const;

export const roomFlowTestNames = Object.fromEntries(
    namesOfTests.map((name) => [name, name as RoomFlowTestName])
) as { [K in typeof namesOfTests[number]]: K };

export const roomFlowTestDescriptions: Record<RoomFlowTestName, string> = {
    resetAfterReload: "Test that the room flow resets sockets after a reload",
    dualBrowserJoin: "Test that separate browsers can join the room and render five player slots",
    turnChangeUpdatesHighlight: "Test that the inputDomHighlight updates when turn changes after word submission",
    playerHealthDecreases: "Test that the player health decreases when an invalid word is submitted",
    gameStartsAfterBothPlayersJoin: "Test that the room flow starts the game after both players join",
    playerDiesIn3PlayerGame: "Test that in a 3 player game, when the 2nd player dies the server skips them when progressing following turns."
} as const;

export type RoomFlowTestName = (typeof namesOfTests)[number];
const namesOfTests = [
    "resetAfterReload",
    "dualBrowserJoin",
    "turnChangeUpdatesHighlight",
    "playerHealthDecreases",
    "gameStartsAfterBothPlayersJoin",
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
} as const;

export type RoomFlowTestName = (typeof namesOfTests)[number];
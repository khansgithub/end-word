export const roomFlowTestNames = {
    resetAfterReload: "resetAfterReload",
    dualBrowserJoin: "dualBrowserJoin",
    turnChangeUpdatesHighlight: "turnChangeUpdatesHighlight",
    foo: "foo",
} as const;

export const roomFlowTestDescriptions = {
    resetAfterReload: "Test that the room flow resets sockets after a reload",
    dualBrowserJoin: "Test that separate browsers can join the room and render five player slots",
    turnChangeUpdatesHighlight: "Test that the inputDomHighlight updates when turn changes after word submission",
    foo: "Test that the foo",
} as const;

export type RoomFlowTestName = typeof roomFlowTestNames[keyof typeof roomFlowTestNames];

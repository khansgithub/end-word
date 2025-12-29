export const roomFlowTestNames = {
    resetAfterReload: "room flow resets sockets after reload",
    dualBrowserJoin: "separate browsers join room and render five player slots",
} as const;

export type RoomFlowTestName = typeof roomFlowTestNames[keyof typeof roomFlowTestNames];

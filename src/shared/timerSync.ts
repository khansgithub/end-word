export const TIMER_SYNC_EVENT = "timerSync";
export const TIMER_SYNC_REQUEST_EVENT = "timerSyncRequest";

export type TimerSyncPayload = {
  remaining: number;
  paused: boolean;
};

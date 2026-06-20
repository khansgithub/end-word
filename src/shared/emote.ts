export const EMOTE_EVENT = "emote" as const;

export type EmotePayload = {
  userId: string;
  seat: number;
  kind: "image";
  value: string;
};

export type ActiveEmote = EmotePayload & { id: string };

export const EMOTE_THROTTLE_MS = 1500;

export const EMOTE_OPTIONS = [
  { value: "hurry", label: "Hurry" },
  { value: "panic", label: "Panic" },
  { value: "praise", label: "Praise" },
  { value: "praise2", label: "Praise" },
  { value: "sad", label: "Sad" },
  { value: "taunt", label: "Taunt" },
  { value: "taunt2", label: "Taunt" },
  { value: "thinking", label: "Thinking" },
] as const;

export function emoteSrc(value: string): string {
  return `/emotes/${value}.png`;
}

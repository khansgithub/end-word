import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import englishWords from "an-array-of-english-words";
import { lastEnglishMatchLetter } from "../../../src/lib/dictionary/english";

export const STORY_TIMEOUT = 45_000;

/** Short English word from the bundled list (matches in-game dictionary constraints). */
export function pickShortEnglishWordStartingWith(letter: string): string {
  const L = letter.toLowerCase();
  for (const w of englishWords) {
    const s = String(w).toLowerCase();
    if (s.length >= 2 && s.length <= 7 && /^[a-z]+$/.test(s) && s.startsWith(L)) {
      return s;
    }
  }
  throw new Error(`No 2–7 letter a–z word found starting with "${L}"`);
}

export async function assertLobbyApiHealthy(request: APIRequestContext) {
  const res = await request.get("/api/rooms");
  if (!res.ok()) {
    test.skip(true, `GET /api/rooms returned ${res.status()} — set NEXT_PUBLIC_SUPABASE_* and SUPABASE_SERVICE_ROLE_KEY for the dev server (e.g. .env.local).`);
  }
}

export async function goHomeEnterNameGoLobbyWithName(page: Page, name: string) {
  await page.goto("/");
  await page.getByLabel(/your name/i).fill(name);
  await page.getByRole("button", { name: /go to lobby/i }).click();
  await page.waitForURL("**/lobby**", { timeout: STORY_TIMEOUT });
  await expect(page.getByRole("heading", { name: /^Lobby$/i })).toBeVisible();
}

export async function createEnglishPublicRoom(page: Page, roomName: string) {
  await page.getByPlaceholder("Room name").fill(roomName);
  await page.getByRole("button", { name: /^English$/i }).click();
  await page.getByRole("button", { name: /create & join/i }).click();
  await page.waitForURL(/\/room\/[^/]+/, { timeout: STORY_TIMEOUT });
}

export async function createEnglishPrivateRoomAndGetInviteCode(page: Page, roomName: string): Promise<string> {
  await page.getByPlaceholder("Room name").fill(roomName);
  await page.getByRole("button", { name: /^English$/i }).click();
  await page.getByRole("checkbox", { name: /private room/i }).check();

  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/rooms") &&
      !r.url().includes("/join") &&
      r.request().method() === "POST"
  );
  await page.getByRole("button", { name: /create & join/i }).click();
  const res = await responsePromise;
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { room?: { invite_code?: string } };
  const code = body.room?.invite_code;
  expect(code, "invite_code from POST /api/rooms").toBeTruthy();
  expect(code!.length).toBe(6);

  await page.waitForURL(/\/room\/[^/]+/, { timeout: STORY_TIMEOUT });
  return code!.toUpperCase();
}

export async function joinPublicRoomFromList(page: Page, roomNameSubstring: string) {
  const row = page.getByRole("listitem").filter({ hasText: roomNameSubstring });
  await expect(row).toBeVisible({ timeout: STORY_TIMEOUT });
  await row.getByRole("button", { name: "Join" }).click();
  await page.waitForURL(/\/room\/[^/]+/, { timeout: STORY_TIMEOUT });
}

export async function joinRoomByInviteCodeUi(page: Page, code: string) {
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: /join with code/i }) });
  await section.getByPlaceholder("Invite code").fill(code);
  await section.getByRole("button", { name: /^join$/i }).click();
  await page.waitForURL(/\/room\/[^/]+/, { timeout: STORY_TIMEOUT });
}

export async function startGameIfHost(page: Page) {
  const start = page.getByRole("button", { name: /start game/i });
  if (await start.isVisible().catch(() => false)) {
    await start.click();
  }
}

export async function waitForGamePlaying(page: Page) {
  await expect(page.getByText(/waiting for game to start/i)).toBeHidden({ timeout: STORY_TIMEOUT });
  await expect(page.getByTestId("match-letter-block")).toBeVisible({ timeout: STORY_TIMEOUT });
}

export async function readDisplayedMatchLetter(page: Page): Promise<string> {
  const el = page.getByTestId("match-letter-block");
  await el.waitFor({ state: "visible", timeout: STORY_TIMEOUT });
  return (await el.innerText()).trim();
}

export async function wordInput(page: Page) {
  return page.locator("input.background-transparent.z-10");
}

export async function submitWordFromInput(page: Page, word: string) {
  const input = await wordInput(page);
  await input.waitFor({ state: "visible", timeout: STORY_TIMEOUT });
  await expect(input).toBeEnabled({ timeout: STORY_TIMEOUT });
  await input.click();
  await input.fill("");
  await input.fill(word);
  await page.getByRole("button", { name: /submit word/i }).click();
}

export async function countThisPlayerHearts(page: Page): Promise<number> {
  const wrap = page.getByTestId("this-player-health");
  await wrap.waitFor({ state: "visible", timeout: STORY_TIMEOUT });
  return wrap.locator("svg").count();
}

export async function waitUntilWordInputEnabled(page: Page) {
  const input = await wordInput(page);
  await expect(input).toBeEnabled({ timeout: STORY_TIMEOUT });
}

export { lastEnglishMatchLetter };

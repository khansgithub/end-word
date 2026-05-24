import { test, expect } from "@playwright/test";
import {
  assertLobbyApiHealthy,
  countThisPlayerHearts,
  createEnglishPrivateRoomAndGetInviteCode,
  createEnglishPublicRoom,
  goHomeEnterNameGoLobbyWithName,
  joinPublicRoomFromList,
  joinRoomByInviteCodeUi,
  lastEnglishMatchLetter,
  pickShortEnglishWordStartingWith,
  readDisplayedMatchLetter,
  startGameIfHost,
  STORY_TIMEOUT,
  submitWordAndWaitForResponse,
  submitWordFromInput,
  waitUntilInRoomLobby,
  waitUntilPlayingUi,
  waitUntilWordInputEnabled,
} from "./helpers/user-story-helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  await assertLobbyApiHealthy(request);
});

/**
 * User story: host creates a public English room; a second player joins from the lobby list;
 * host starts the game; players alternate valid English submissions following the match letter.
 */
test("user story: host and guest English chain (happy path)", async ({ browser, baseURL }) => {
  test.setTimeout(200_000);
  const roomName = `E2E Pub ${Date.now()}`;

  const hostCtx = await browser.newContext({ baseURL });
  const guestCtx = await browser.newContext({ baseURL });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  try {
    await goHomeEnterNameGoLobbyWithName(host, `Host-${Date.now()}`);
    await createEnglishPublicRoom(host, roomName);

    await goHomeEnterNameGoLobbyWithName(guest, `Guest-${Date.now()}`);
    await joinPublicRoomFromList(guest, roomName);

    await waitUntilInRoomLobby(host);
    await waitUntilInRoomLobby(guest);
    await startGameIfHost(host);
    await waitUntilPlayingUi(host);
    await waitUntilPlayingUi(guest);

    await waitUntilWordInputEnabled(host);
    const firstLetter = await readDisplayedMatchLetter(host);
    const w1 = pickShortEnglishWordStartingWith(firstLetter);
    const hostSubmitJson = (await submitWordAndWaitForResponse(host, w1)) as {
      success?: boolean;
      reason?: string;
    };
    expect(hostSubmitJson.success, hostSubmitJson.reason).toBe(true);

    await expect(host.locator("tbody").getByText(w1, { exact: true })).toBeVisible({ timeout: STORY_TIMEOUT });

    const nextLetter = lastEnglishMatchLetter(w1);
    await waitUntilWordInputEnabled(guest);
    expect(await readDisplayedMatchLetter(guest)).toBe(nextLetter);

    const w2 = pickShortEnglishWordStartingWith(nextLetter);
    const guestSubmitJson = (await submitWordAndWaitForResponse(guest, w2)) as {
      success?: boolean;
      reason?: string;
      gameState?: { matchLetter?: { block?: string } };
    };
    expect(guestSubmitJson.success, guestSubmitJson.reason).toBe(true);
    const expectedLetter = guestSubmitJson.gameState?.matchLetter?.block;
    expect(expectedLetter, "server should return next match letter after guest word").toBeTruthy();

    await waitUntilWordInputEnabled(host);
    await expect
      .poll(async () => readDisplayedMatchLetter(host), { timeout: STORY_TIMEOUT })
      .toBe(expectedLetter);
  } finally {
    await hostCtx.close();
    await guestCtx.close();
  }
});

/**
 * User story: a player opens the lobby, finds a public room in the list, joins, and waits for the host to start.
 */
test("user story: joiner uses public rooms list", async ({ browser, baseURL }) => {
  test.setTimeout(150_000);
  const roomName = `E2E List ${Date.now()}`;

  const hostCtx = await browser.newContext({ baseURL });
  const joinerCtx = await browser.newContext({ baseURL });
  const host = await hostCtx.newPage();
  const joiner = await joinerCtx.newPage();

  try {
    await goHomeEnterNameGoLobbyWithName(host, `ListHost-${Date.now()}`);
    await createEnglishPublicRoom(host, roomName);

    await goHomeEnterNameGoLobbyWithName(joiner, `Joiner-${Date.now()}`);
    await joinPublicRoomFromList(joiner, roomName);

    await waitUntilInRoomLobby(joiner);

    await startGameIfHost(host);
    await waitUntilPlayingUi(joiner);
    await expect(joiner.getByRole("button", { name: /submit word/i })).toBeVisible();
  } finally {
    await hostCtx.close();
    await joinerCtx.close();
  }
});

/**
 * User story: private room + invite code; on the host’s turn a wrong-leading-letter word costs health.
 */
test("user story: invite code room and invalid submit reduces health", async ({ browser, baseURL }) => {
  test.setTimeout(150_000);
  const roomName = `E2E Pvt ${Date.now()}`;

  const hostCtx = await browser.newContext({ baseURL });
  const friendCtx = await browser.newContext({ baseURL });
  const host = await hostCtx.newPage();
  const friend = await friendCtx.newPage();

  try {
    await goHomeEnterNameGoLobbyWithName(host, `PvtHost-${Date.now()}`);
    const code = await createEnglishPrivateRoomAndGetInviteCode(host, roomName);

    await goHomeEnterNameGoLobbyWithName(friend, `PvtFriend-${Date.now()}`);
    await joinRoomByInviteCodeUi(friend, code);

    await waitUntilInRoomLobby(host);
    await waitUntilInRoomLobby(friend);
    await startGameIfHost(host);
    await waitUntilPlayingUi(host);
    await waitUntilPlayingUi(friend);

    await waitUntilWordInputEnabled(host);
    const match = await readDisplayedMatchLetter(host);
    const wrongLead = match >= "z" ? "a" : String.fromCharCode(match.charCodeAt(0) + 1);
    const wrongWord = pickShortEnglishWordStartingWith(wrongLead);

    const heartsBefore = await countThisPlayerHearts(host);
    expect(heartsBefore).toBeGreaterThan(1);

    await submitWordFromInput(host, wrongWord);

    await expect
      .poll(async () => countThisPlayerHearts(host), { timeout: STORY_TIMEOUT })
      .toBe(heartsBefore - 1);
  } finally {
    await hostCtx.close();
    await friendCtx.close();
  }
});

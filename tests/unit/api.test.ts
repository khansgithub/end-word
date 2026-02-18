import { beforeAll, describe, expect, it } from "vitest";
import { inputIsValid } from "../../src/shared/utils";
import { lookUpWord } from "../../src/server/api";

/**
 * Uses the mocks in `@/src/mocks/handlers.ts`. Don't even remember how msw works right now.
 */
describe("dictionary APIs (msw)", () => {
    beforeAll(() => {
        process.env.DICTIONARY_URL = "http://localhost:8000";
    });

    it("mocks external lookup API via http://localhost:8000/lookup/:word", async () => {
        const res = await lookUpWord("melon");
        expect(res).toMatchObject({
            key: "melon",
            data: expect.arrayContaining(["melon", "meloned", "meloning"]),
        });
    });

    it("mocks app route /dictionary/word/:word", async () => {
        const result = await inputIsValid("berry");
        expect(result).toBe(true);
    });
});

import { describe, expect, it } from "vitest";
import { inputIsValid } from "../../src/app/components/util";
import { lookUpWord } from "../../src/shared/api";

describe("dictionary APIs (msw)", () => {
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

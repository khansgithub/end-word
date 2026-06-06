import { lookUpWordApi } from "@/app/server/dictionary/korean-api";
import { inputIsValid } from "@/legacy/socket/utils";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Uses the mocks in `@/src/mocks/handlers.ts`. Don't even remember how msw works right now.
 * Uses dynamic import so env vars are set before the api module loads (mock vs real is resolved at load time).
 */
describe("dictionary APIs (msw)", () => {
    beforeAll(async () => { });

    it("mocks external lookup API via http://localhost:8000/lookup/:word", async () => {
        const res = await lookUpWordApi("melon");
        expect(res).toMatchObject({
            key: "melon",
            data: expect.arrayContaining(["melon", "meloned", "meloning"]),
        });
    });

    it("mocks app route /dictionary/word/:word", async () => {
        const result = await inputIsValid("berry");
        const expected = [
            true,
            {
                "data": [
                    {
                        "definition": "bar",
                        "word": "foo",
                    },
                ],
                "key": "foo",
            },
        ]
        expect(result).toStrictEqual(expected);
    });
});

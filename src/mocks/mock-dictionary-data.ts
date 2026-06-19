/**
 * This file contains mocked dictionary data to be used in tests (playwright and vitests).
 */

import path from "path";
import { MockDataNotLoadedError, MockDataParseError } from "@/shared/errors";
import { DictionaryResponse } from "@/shared/types";
import fs from "fs";
import { logger } from "@/app/server/logging";

export const o: DictionaryResponse = { key: "", data: [{ word: "", definition: "" }] };
export const x: DictionaryResponse = {};

/** Turbopack rewrites `__dirname` to a virtual path (e.g. C:\ROOT\src\mocks); use cwd instead. */
const MOCK_DATA_FILE = path.join(process.cwd(), "src", "mocks", "mock-dictionary-data.json");

let data: DictionaryResponse[] | null = null;

function* dataGenerator(): Generator<DictionaryResponse, void, unknown> {
    if (!data) {
        throw new MockDataNotLoadedError();
    }
    logger.debug("mock-dictionary-data", "dataGenerator", JSON.stringify(data, null, 2));
    yield data.shift() ?? {};
}

export function writeMockData(_data: DictionaryResponse[]): void {
    logger.info("mock-dictionary-data", "writeMockData", { len: _data.length });
    data = null;
    fs.writeFileSync(MOCK_DATA_FILE, JSON.stringify(_data, null, 2));
    logger.info("mock-dictionary-data", "writeMockData done");
}

export function getMockedData(): Generator<DictionaryResponse, void, unknown> {
    if (data === null) {
        data = JSON.parse(fs.readFileSync(MOCK_DATA_FILE, "utf-8"));
        if (!data) throw new MockDataParseError();
    }
    return dataGenerator();
}
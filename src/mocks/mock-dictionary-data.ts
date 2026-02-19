/**
 * This file contains mocked dictionary data to be used in tests (playwright and vitests).
 */

import path from "path";
import { DictionaryResponse } from "../shared/types";
import fs from "fs";
import {log} from "../server/logging";

export const o: DictionaryResponse = { key: "", data: [{ word: "", definition: "" }] };
export const x: DictionaryResponse = {};

const MOCK_DATA_FILE = path.join(__dirname, "mock-dictionary-data.json");

let data: DictionaryResponse[] | null = null;

function* dataGenerator(): Generator<DictionaryResponse, void, unknown> {
    if (!data) {
        throw new Error("Data is not loaded");
    }
    log("[dataGenerator] data:", JSON.stringify(data, null, 2))();
    yield data.shift() ?? {};
}

export function writeMockData(_data: DictionaryResponse[]): void {
    console.log("[writeMockData] writing data to file:", JSON.stringify(_data));
    fs.writeFileSync(MOCK_DATA_FILE, JSON.stringify(_data, null, 2));
    console.log("[writeMockData] data written to file");
}

export function getMockedData(): Generator<DictionaryResponse, void, unknown> {
    if (data === null) {
        data = JSON.parse(fs.readFileSync(MOCK_DATA_FILE, "utf-8"));
        if (!data) throw new Error("Data not parsed correctly");
    }
    return dataGenerator();
}
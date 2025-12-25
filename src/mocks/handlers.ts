import { http, HttpResponse } from "msw";

const buildDictionaryResponse = (word?: string) => {
    const key = word ?? "unknown";
    return { key, data: [key, `${key}ed`, `${key}ing`] };
};

export const handlers = [
    http.get("http://localhost:8000/lookup/:word", ({ params }) =>
        HttpResponse.json(buildDictionaryResponse(params.word))
    ),
    http.get("/dictionary/word/:word", ({ params }) =>
        HttpResponse.json(buildDictionaryResponse(params.word))
    ),
];

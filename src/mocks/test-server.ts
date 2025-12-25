import type { HttpHandler } from "msw";
import { handlers } from "./handlers";
import { server } from "./server";

export function startMswTestServer() {
    server.listen({ onUnhandledRequest: "error" });
}

export function stopMswTestServer() {
    server.close();
}

export function resetMswHandlers(...extraHandlers: HttpHandler[]) {
    server.resetHandlers(...handlers, ...extraHandlers);
}

import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";

export const server = setupServer(...handlers);

export function useDefaultHandlers() {
    server.resetHandlers(...handlers);
}

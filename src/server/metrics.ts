import { Counter, Gauge, Registry, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const socketEventCounter = new Counter({
    name: "socket_event_total",
    help: "Socket events handled",
    labelNames: ["event"],
    registers: [registry],
});

export function countSocketEvent(event: string) {
    socketEventCounter.inc({ event });
}

export const registeredClientsGauge = new Gauge({
    name: "socket_registered_clients",
    help: "Currently registered socket clients",
    registers: [registry],
});

export function setRegisteredClients(count: number) {
    registeredClientsGauge.set(count);
}

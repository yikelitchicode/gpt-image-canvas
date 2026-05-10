import { upgradeWebSocket } from "@hono/node-server";
import type { Hono } from "hono";
import { createAgentWebSocketEvents } from "../../domain/agent/websocket-session.js";

export function registerAgentWebSocketRoutes(app: Hono): void {
  app.get(
    "/api/agent/ws",
    upgradeWebSocket((c) => createAgentWebSocketEvents(c.req.query("connectionId"), c.req.query("runId"), c.req.query("conversationId")), {
      onError(error) {
        console.error("Agent WebSocket error.", error);
      }
    })
  );
}

import type { Hono } from "hono";
import type { AgentConversationMessage, SaveAgentConversationRequest } from "../../domain/contracts.js";
import {
  getAgentConversation,
  getAgentConversationSummaries,
  saveAgentConversation
} from "../../domain/agent/conversation-store.js";
import { errorResponse, type ErrorResponseBody } from "../http/errors.js";
import { readJson } from "../http/json.js";

const AGENT_CONVERSATION_ROLES = new Set(["user", "assistant", "thinking", "system", "error", "question", "plan"]);

export function registerAgentConversationRoutes(app: Hono): void {
  app.get("/api/agent-conversations", (c) => c.json({ conversations: getAgentConversationSummaries() }));

  app.get("/api/agent-conversations/:id", (c) => {
    const conversation = getAgentConversation(c.req.param("id"));
    if (!conversation) {
      return c.json(errorResponse("not_found", "Agent conversation not found."), 404);
    }

    return c.json(conversation);
  });

  app.put("/api/agent-conversations/:id", async (c) => {
    const payload = await readJson(c.req.raw);
    if (!payload.ok) {
      return c.json(payload.error, 400);
    }

    const parsed = parseSaveAgentConversationPayload(payload.value);
    if (!parsed.ok) {
      return c.json(parsed.error, 400);
    }

    try {
      return c.json({ conversation: saveAgentConversation({ id: c.req.param("id"), ...parsed.value }) });
    } catch {
      return c.json(errorResponse("invalid_agent_conversation", "Agent conversation could not be saved."), 400);
    }
  });
}

function parseSaveAgentConversationPayload(input: unknown):
  | {
      ok: true;
      value: SaveAgentConversationRequest;
    }
  | {
      ok: false;
      error: ErrorResponseBody;
    } {
  if (!isRecord(input)) {
    return {
      ok: false,
      error: errorResponse("invalid_agent_conversation", "Agent conversation payload must be a JSON object.")
    };
  }

  if (input.title !== undefined && typeof input.title !== "string") {
    return {
      ok: false,
      error: errorResponse("invalid_agent_conversation", "Agent conversation title must be a string.")
    };
  }

  if (!Array.isArray(input.messages)) {
    return {
      ok: false,
      error: errorResponse("invalid_agent_conversation", "Agent conversation messages must be an array.")
    };
  }

  if (!input.messages.every(isAgentConversationMessageInput)) {
    return {
      ok: false,
      error: errorResponse("invalid_agent_conversation", "Agent conversation messages are invalid.")
    };
  }

  return {
    ok: true,
    value: {
      title: input.title,
      messages: input.messages as AgentConversationMessage[]
    }
  };
}

function isAgentConversationMessageInput(input: unknown): boolean {
  if (!isRecord(input)) {
    return false;
  }

  return (
    typeof input.id === "string" &&
    typeof input.role === "string" &&
    AGENT_CONVERSATION_ROLES.has(input.role) &&
    typeof input.content === "string" &&
    typeof input.timestamp === "string" &&
    (input.details === undefined || typeof input.details === "string") &&
    (input.runId === undefined || typeof input.runId === "string") &&
    (input.previews === undefined || Array.isArray(input.previews))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

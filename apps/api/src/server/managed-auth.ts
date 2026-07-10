import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Context, Hono, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { errorResponse } from "./http/errors.js";
import { runWithManagedUser, type ManagedUserContext } from "./auth-context.js";

const SESSION_COOKIE = "image_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const TICKET_TTL_MS = 60 * 1000;
const IMAGE_KEY_NAME = "Image Canvas";

interface SessionPayload extends ManagedUserContext {
  expiresAt: number;
}

interface TicketRecord {
  user: ManagedUserContext;
  expiresAt: number;
}

interface Sub2APIKey {
  id: number;
  key: string;
  name: string;
  group_id: number | null;
  status: string;
}

const tickets = new Map<string, TicketRecord>();
const keyProvisioning = new Map<string, Promise<Sub2APIKey>>();

export function registerManagedAuthRoutes(app: Hono): void {
  app.options("/api/sso/start", (c) => withCors(c, new Response(null, { status: 204 })));

  app.post("/api/sso/start", async (c) => {
    if (!isAllowedMainOrigin(c.req.header("Origin"))) {
      return withCors(c, c.json(errorResponse("origin_not_allowed", "This login request must come from the main site."), 403));
    }

    const bearerToken = readBearerToken(c.req.header("Authorization"));
    if (!bearerToken) {
      return withCors(c, c.json(errorResponse("auth_required", "Log in to the main site first."), 401));
    }

    try {
      const user = await provisionManagedUser(bearerToken);
      pruneExpiredTickets();
      const code = randomBytes(32).toString("base64url");
      tickets.set(code, { user, expiresAt: Date.now() + TICKET_TTL_MS });

      const redirectUrl = new URL("/auth/callback", publicImageOrigin());
      redirectUrl.searchParams.set("code", code);
      return withCors(c, c.json({ redirectUrl: redirectUrl.toString() }));
    } catch (error) {
      const status = error instanceof ManagedAuthError ? error.status : 502;
      const code = error instanceof ManagedAuthError ? error.code : "sso_failed";
      const message = error instanceof Error ? error.message : "Image service login failed.";
      return withCors(c, c.json(errorResponse(code, message), status));
    }
  });

  app.get("/auth/callback", (c) => {
    const code = c.req.query("code")?.trim() ?? "";
    const ticket = code ? tickets.get(code) : undefined;
    if (code) {
      tickets.delete(code);
    }
    if (!ticket || ticket.expiresAt <= Date.now()) {
      return c.redirect(`${mainAppOrigin()}/dashboard?image_error=expired_ticket`, 302);
    }

    setCookie(c, SESSION_COOKIE, encryptSession({
      ...ticket.user,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
    }), {
      httpOnly: true,
      secure: publicImageOrigin().startsWith("https://"),
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS
    });
    return c.redirect("/canvas", 302);
  });

  app.get("/api/session", (c) => {
    const session = readSession(c);
    if (!session) {
      return c.json(errorResponse("auth_required", "Log in from the main site first."), 401);
    }
    return c.json({
      user: {
        id: session.userId,
        email: session.email,
        displayName: session.displayName
      }
    });
  });

  app.post("/api/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true, redirectUrl: `${mainAppOrigin()}/dashboard` });
  });
}

export async function managedAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  if (c.req.path === "/api/health") {
    return next();
  }

  const session = readSession(c);
  if (!session) {
    return c.json(errorResponse("auth_required", "Log in from the main site first."), 401);
  }

  if (!isSafeMethod(c.req.method) && !isAllowedImageOrigin(c.req.header("Origin"))) {
    return c.json(errorResponse("origin_not_allowed", "Cross-site requests are not allowed."), 403);
  }

  const { expiresAt: _expiresAt, ...user } = session;
  return runWithManagedUser(user, next);
}

export async function managedPageAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  if (!readSession(c)) {
    return c.redirect(`${mainAppOrigin()}/dashboard?image_login=required`, 302);
  }
  return next();
}

function readSession(c: Context): SessionPayload | undefined {
  const encrypted = getCookie(c, SESSION_COOKIE);
  if (!encrypted) {
    return undefined;
  }

  try {
    const payload = decryptSession(encrypted);
    if (payload.expiresAt <= Date.now() || !payload.userId || !payload.apiKey) {
      return undefined;
    }
    return payload;
  } catch {
    return undefined;
  }
}

async function provisionManagedUser(token: string): Promise<ManagedUserContext> {
  const profile = await sub2apiRequest(token, "/api/v1/user/profile");
  const userId = stringField(profile, "id");
  if (!userId) {
    throw new ManagedAuthError("invalid_profile", "The main site returned an invalid user profile.", 502);
  }

  const key = await provisionImageKeyOnce(token, userId);

  return {
    userId,
    email: stringField(profile, "email"),
    displayName: stringField(profile, "username") || stringField(profile, "name") || stringField(profile, "email"),
    apiKey: key.key
  };
}

async function provisionImageKeyOnce(token: string, userId: string): Promise<Sub2APIKey> {
  const existing = keyProvisioning.get(userId);
  if (existing) {
    return existing;
  }

  const provisioning = provisionImageKey(token).finally(() => {
    if (keyProvisioning.get(userId) === provisioning) {
      keyProvisioning.delete(userId);
    }
  });
  keyProvisioning.set(userId, provisioning);
  return provisioning;
}

async function provisionImageKey(token: string): Promise<Sub2APIKey> {
  const groupId = imageGroupId();
  const availableGroups = await sub2apiRequest(token, "/api/v1/groups/available");
  if (!Array.isArray(availableGroups) || !availableGroups.some((group) => numericField(group, "id") === groupId)) {
    throw new ManagedAuthError("image_group_unavailable", "Your account cannot use the image group.", 403);
  }

  const keyList = await sub2apiRequest(token, `/api/v1/keys?page=1&page_size=100&group_id=${groupId}`);
  const items = isRecord(keyList) && Array.isArray(keyList.items) ? keyList.items : [];
  let key = items
    .filter(isRecord)
    .map(toSub2APIKey)
    .filter((item): item is Sub2APIKey => item !== undefined)
    .find((item) => item.status === "active" && item.group_id === groupId && item.name === IMAGE_KEY_NAME);

  if (!key) {
    const created = await sub2apiRequest(token, "/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: IMAGE_KEY_NAME,
        group_id: groupId,
        quota: 0,
        rate_limit_5h: 0,
        rate_limit_1d: 0,
        rate_limit_7d: 0
      })
    });
    key = isRecord(created) ? toSub2APIKey(created) : undefined;
  }

  if (!key?.key) {
    throw new ManagedAuthError("image_key_unavailable", "Could not provision the image API key.", 502);
  }

  return key;
}

async function sub2apiRequest(token: string, path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(new URL(path, sub2apiBaseUrl()), {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok || !isRecord(body) || body.code !== 0) {
    const message = isRecord(body) && typeof body.message === "string" ? body.message : `Main site request failed (${response.status}).`;
    const status = response.status === 401 ? 401 : response.status === 403 ? 403 : 502;
    throw new ManagedAuthError("main_site_rejected", message, status);
  }
  return body.data;
}

function encryptSession(payload: SessionPayload): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

function decryptSession(value: string): SessionPayload {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length < 29) {
    throw new Error("Invalid session.");
  }
  const nonce = bytes.subarray(0, 12);
  const tag = bytes.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", sessionKey(), nonce);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as SessionPayload;
}

function sessionKey(): Buffer {
  const secret = process.env.IMAGE_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("IMAGE_SESSION_SECRET must contain at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

function withCors(c: Context, response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", mainAppOrigin());
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Vary", "Origin");
  return response;
}

function isAllowedMainOrigin(origin: string | undefined): boolean {
  return Boolean(origin && equalOrigin(origin, mainAppOrigin()));
}

function isAllowedImageOrigin(origin: string | undefined): boolean {
  return !origin || equalOrigin(origin, publicImageOrigin());
}

function equalOrigin(left: string, right: string): boolean {
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    const leftValue = `${leftUrl.protocol}//${leftUrl.host}`;
    const rightValue = `${rightUrl.protocol}//${rightUrl.host}`;
    const leftBytes = Buffer.from(leftValue);
    const rightBytes = Buffer.from(rightValue);
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
  } catch {
    return false;
  }
}

function readBearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+(.+)$/iu.exec(header?.trim() ?? "");
  return match?.[1]?.trim() || undefined;
}

function isSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

function pruneExpiredTickets(): void {
  const now = Date.now();
  for (const [code, ticket] of tickets) {
    if (ticket.expiresAt <= now) {
      tickets.delete(code);
    }
  }
}

function toSub2APIKey(value: Record<string, unknown>): Sub2APIKey | undefined {
  const id = numericField(value, "id");
  const key = stringField(value, "key");
  if (!id || !key) {
    return undefined;
  }
  return {
    id,
    key,
    name: stringField(value, "name"),
    group_id: numericField(value, "group_id") || null,
    status: stringField(value, "status")
  };
}

function stringField(value: unknown, field: string): string {
  if (!isRecord(value)) {
    return "";
  }
  const fieldValue = value[field];
  return typeof fieldValue === "string" || typeof fieldValue === "number" ? String(fieldValue).trim() : "";
}

function numericField(value: unknown, field: string): number {
  const parsed = Number(stringField(value, field));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredUrl(name: string, fallback: string): string {
  const value = process.env[name]?.trim() || fallback;
  return new URL(value).toString();
}

function mainAppOrigin(): string {
  return new URL(requiredUrl("MAIN_APP_ORIGIN", "https://chickendog.cc")).origin;
}

function publicImageOrigin(): string {
  return new URL(requiredUrl("IMAGE_PUBLIC_ORIGIN", "https://image.chickendog.cc")).origin;
}

function sub2apiBaseUrl(): string {
  return requiredUrl("SUB2API_BASE_URL", "http://127.0.0.1:8080");
}

function imageGroupId(): number {
  const value = Number.parseInt(process.env.SUB2API_IMAGE_GROUP_ID?.trim() ?? "", 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ManagedAuthError("image_group_not_configured", "Image service group is not configured.", 503);
  }
  return value;
}

class ManagedAuthError extends Error {
  constructor(readonly code: string, message: string, readonly status: 400 | 401 | 403 | 502 | 503) {
    super(message);
  }
}

import type { Hono } from "hono";
import { cleanupExpiredAssets, getRetentionStatus } from "../../domain/storage/retention.js";
import { requireManagedUser } from "../auth-context.js";
import { errorResponse } from "../http/errors.js";

export function registerRetentionRoutes(app: Hono): void {
  app.get("/api/admin/retention", async (c) => {
    if (requireManagedUser().role !== "admin") return c.json(errorResponse("forbidden", "Administrator access is required."), 403);
    return c.json(await getRetentionStatus());
  });
  app.post("/api/admin/retention/cleanup", async (c) => {
    if (requireManagedUser().role !== "admin") return c.json(errorResponse("forbidden", "Administrator access is required."), 403);
    return c.json(await cleanupExpiredAssets());
  });
}

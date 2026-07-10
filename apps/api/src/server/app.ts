import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { WebSocketServer } from "ws";
import { runtimePaths } from "../infrastructure/runtime.js";
import { errorResponse } from "./http/errors.js";
import { registerAssetRoutes } from "./routes/assets.js";
import { registerCoreRoutes } from "./routes/core.js";
import { registerGalleryRoutes } from "./routes/gallery.js";
import { registerImageRoutes } from "./routes/images.js";
import { registerProjectRoutes } from "./routes/project.js";
import { registerPromptPoolRoutes } from "./routes/prompt-pool.js";
import { registerRetentionRoutes } from "./routes/retention.js";
import { managedAuthMiddleware, managedPageAuthMiddleware, registerManagedAuthRoutes } from "./managed-auth.js";

export const agentWebSocketServer = new WebSocketServer({ noServer: true });
export const app = createApp();

export function createApp(): Hono {
  const app = new Hono();

  app.onError((error, c) => {
    console.error(error);
    return c.json(errorResponse("internal_error", "Internal server error."), 500);
  });

  registerManagedAuthRoutes(app);
  app.use("/api/*", managedAuthMiddleware);
  registerCoreRoutes(app);
  // Managed deployment deliberately excludes user-supplied providers, Codex,
  // Agent configuration, skills, and cloud credentials.
  registerProjectRoutes(app);
  registerGalleryRoutes(app);
  registerPromptPoolRoutes(app);
  registerAssetRoutes(app);
  registerImageRoutes(app);
  registerRetentionRoutes(app);

  const webDistRoot = relative(process.cwd(), runtimePaths.webDistDir) || ".";

  app.get("/api/*", (c) => c.json(errorResponse("not_found", "Not found."), 404));

  app.use("/", managedPageAuthMiddleware);
  app.use("/canvas", managedPageAuthMiddleware);
  app.use("/gallery", managedPageAuthMiddleware);
  app.use("/pool", managedPageAuthMiddleware);

  app.get("*", serveStatic({ root: webDistRoot }));
  app.get(
    "*",
    serveStatic({
      root: webDistRoot,
      path: "index.html",
      onNotFound: () => {
        console.error(`Built web bundle not found at ${runtimePaths.webDistDir}. Run pnpm build before pnpm start.`);
      }
    })
  );

  return app;
}

import type { Hono } from "hono";
import { GENERATION_COUNTS, IMAGE_QUALITIES, OUTPUT_FORMATS, SIZE_PRESETS, STYLE_PRESETS, type AppConfig } from "../../domain/contracts.js";
import { getConfiguredImageModel } from "../../infrastructure/providers/image-provider.js";
import { requireManagedUser } from "../auth-context.js";

export function registerCoreRoutes(app: Hono): void {
  app.get("/api/health", (c) =>
    c.json({
      status: "ok"
    })
  );

  app.get("/api/config", (c) => {
    const configuredModel = getConfiguredImageModel();
    const config: AppConfig = {
      model: configuredModel,
      models: [configuredModel],
      sizePresets: SIZE_PRESETS,
      stylePresets: STYLE_PRESETS,
      qualities: IMAGE_QUALITIES,
      outputFormats: OUTPUT_FORMATS,
      counts: GENERATION_COUNTS
    };

    return c.json(config);
  });

  app.get("/api/auth/status", (c) => c.json({
    role: requireManagedUser().role,
    provider: "openai",
    openaiConfigured: true,
    codex: { available: false },
    activeSource: {
      id: "env-openai",
      kind: "environment",
      label: "ChickenDog Image API",
      provider: "openai",
      available: true,
      status: "available"
    }
  }));

  app.get("/api/agent-config", (c) => c.json({
    configured: false,
    apiKey: { hasSecret: false },
    baseUrl: "",
    model: "",
    timeoutMs: 60000,
    supportsVision: false,
    createdAt: "",
    updatedAt: ""
  }));

  app.get("/api/prompt-favorites", (c) => c.json({ groups: [], favorites: [] }));

  app.get("/api/storage/config", (c) => c.json({
    enabled: false,
    provider: "cos",
    cos: {
      secretId: "",
      secretKey: { hasSecret: false },
      bucket: "",
      region: "",
      keyPrefix: ""
    },
    s3: {
      accessKeyId: "",
      secretAccessKey: { hasSecret: false },
      bucket: "",
      region: "auto",
      keyPrefix: "",
      endpointMode: "r2-account",
      accountId: "",
      endpoint: "",
      forcePathStyle: false
    }
  }));
}

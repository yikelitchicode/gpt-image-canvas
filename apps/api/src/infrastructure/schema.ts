import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  fileName: text("file_name").notNull(),
  relativePath: text("relative_path").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  cloudProvider: text("cloud_provider"),
  cloudBucket: text("cloud_bucket"),
  cloudRegion: text("cloud_region"),
  cloudObjectKey: text("cloud_object_key"),
  cloudStatus: text("cloud_status"),
  cloudError: text("cloud_error"),
  cloudUploadedAt: text("cloud_uploaded_at"),
  cloudEtag: text("cloud_etag"),
  cloudRequestId: text("cloud_request_id"),
  cloudEndpoint: text("cloud_endpoint"),
  cloudForcePathStyle: integer("cloud_force_path_style"),
  createdAt: text("created_at").notNull()
});

export const storageConfigs = sqliteTable("storage_configs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  enabled: integer("enabled").notNull(),
  secretId: text("secret_id"),
  secretKey: text("secret_key"),
  bucket: text("bucket"),
  region: text("region"),
  keyPrefix: text("key_prefix"),
  endpointMode: text("endpoint_mode"),
  accountId: text("account_id"),
  endpoint: text("endpoint"),
  forcePathStyle: integer("force_path_style"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const providerConfigs = sqliteTable("provider_configs", {
  id: text("id").primaryKey(),
  sourceOrderJson: text("source_order_json").notNull(),
  localApiKey: text("local_api_key"),
  localBaseUrl: text("local_base_url"),
  localModel: text("local_model"),
  localTimeoutMs: integer("local_timeout_ms"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const agentLlmConfigs = sqliteTable("agent_llm_configs", {
  id: text("id").primaryKey(),
  apiKey: text("api_key"),
  baseUrl: text("base_url").notNull(),
  model: text("model").notNull(),
  timeoutMs: integer("timeout_ms").notNull(),
  supportsVision: integer("supports_vision").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const agentConversations = sqliteTable("agent_conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  messagesJson: text("messages_json").notNull(),
  contextJson: text("context_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const agentSkills = sqliteTable("agent_skills", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  version: text("version"),
  source: text("source"),
  enabled: integer("enabled").notNull(),
  builtIn: integer("built_in").notNull(),
  required: integer("is_required").notNull(),
  triggerMode: text("trigger_mode").notNull(),
  triggerKeywordsJson: text("trigger_keywords_json").notNull(),
  filesJson: text("files_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const promptFavoriteGroups = sqliteTable("prompt_favorite_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const promptFavorites = sqliteTable("prompt_favorites", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  groupId: text("group_id")
    .notNull()
    .references(() => promptFavoriteGroups.id),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  mediaType: text("media_type").notNull(),
  assetUrl: text("asset_url").notNull(),
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  sourceUrl: text("source_url"),
  useCount: integer("use_count").notNull(),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const codexOAuthTokens = sqliteTable("codex_oauth_tokens", {
  id: text("id").primaryKey(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  email: text("email"),
  accountId: text("account_id"),
  expiresAt: text("expires_at"),
  refreshedAt: text("refreshed_at"),
  unavailableAt: text("unavailable_at"),
  unavailableReason: text("unavailable_reason"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const generationRecords = sqliteTable("generation_records", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  mode: text("mode").notNull(),
  prompt: text("prompt").notNull(),
  effectivePrompt: text("effective_prompt").notNull(),
  presetId: text("preset_id").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  quality: text("quality").notNull(),
  outputFormat: text("output_format").notNull(),
  count: integer("count").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  referenceAssetId: text("reference_asset_id").references(() => assets.id),
  createdAt: text("created_at").notNull()
});

export const generationOutputs = sqliteTable("generation_outputs", {
  id: text("id").primaryKey(),
  generationId: text("generation_id")
    .notNull()
    .references(() => generationRecords.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  assetId: text("asset_id").references(() => assets.id),
  error: text("error"),
  createdAt: text("created_at").notNull()
});

export const generationReferenceAssets = sqliteTable("generation_reference_assets", {
  generationId: text("generation_id")
    .notNull()
    .references(() => generationRecords.id, { onDelete: "cascade" }),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id),
  position: integer("position").notNull(),
  createdAt: text("created_at").notNull()
});

export const generationRelations = relations(generationRecords, ({ many, one }) => ({
  outputs: many(generationOutputs),
  referenceAssets: many(generationReferenceAssets),
  referenceAsset: one(assets, {
    fields: [generationRecords.referenceAssetId],
    references: [assets.id]
  })
}));

export const outputRelations = relations(generationOutputs, ({ one }) => ({
  generation: one(generationRecords, {
    fields: [generationOutputs.generationId],
    references: [generationRecords.id]
  }),
  asset: one(assets, {
    fields: [generationOutputs.assetId],
    references: [assets.id]
  })
}));

export const referenceAssetRelations = relations(generationReferenceAssets, ({ one }) => ({
  generation: one(generationRecords, {
    fields: [generationReferenceAssets.generationId],
    references: [generationRecords.id]
  }),
  asset: one(assets, {
    fields: [generationReferenceAssets.assetId],
    references: [assets.id]
  })
}));

import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { inArray, lt } from "drizzle-orm";
import { db } from "../../infrastructure/database.js";
import { runtimePaths } from "../../infrastructure/runtime.js";
import { assets, generationOutputs, generationReferenceAssets } from "../../infrastructure/schema.js";
import { getActiveCloudStorageConfig } from "./storage-config.js";

const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
let retentionTimer: ReturnType<typeof setInterval> | undefined;

export interface RetentionStatus {
  retentionDays: number;
  objectCount: number;
  bytesUsed: number;
  expiredObjectCount: number;
}

export async function getRetentionStatus(): Promise<RetentionStatus> {
  const { client, config } = r2Client();
  let continuationToken: string | undefined;
  let objectCount = 0;
  let bytesUsed = 0;
  let expiredObjectCount = 0;
  const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;

  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: config.keyPrefix,
      ContinuationToken: continuationToken
    }));
    for (const object of page.Contents ?? []) {
      objectCount += 1;
      bytesUsed += object.Size ?? 0;
      if (object.LastModified && object.LastModified.getTime() < cutoff) expiredObjectCount += 1;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return { retentionDays: RETENTION_DAYS, objectCount, bytesUsed, expiredObjectCount };
}

export async function cleanupExpiredAssets(): Promise<{ deleted: number; failed: number }> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
  const expired = db.select().from(assets).where(lt(assets.createdAt, cutoff)).all();
  const { client } = r2Client();
  const deletedIds: string[] = [];
  let failed = 0;

  for (const asset of expired) {
    try {
      if (asset.cloudBucket && asset.cloudObjectKey) {
        await client.send(new DeleteObjectCommand({ Bucket: asset.cloudBucket, Key: asset.cloudObjectKey }));
      }
      const userId = asset.ownerId.replace(/[^a-zA-Z0-9_-]/gu, "_");
      await rm(resolve(runtimePaths.dataDir, "users", userId, "assets", asset.relativePath), { force: true });
      deletedIds.push(asset.id);
    } catch (error) {
      failed += 1;
      console.error(`Failed to delete expired asset ${asset.id}.`, error);
    }
  }

  if (deletedIds.length > 0) {
    db.delete(generationReferenceAssets).where(inArray(generationReferenceAssets.assetId, deletedIds)).run();
    db.delete(generationOutputs).where(inArray(generationOutputs.assetId, deletedIds)).run();
    db.delete(assets).where(inArray(assets.id, deletedIds)).run();
  }
  return { deleted: deletedIds.length, failed };
}

export function startRetentionScheduler(): void {
  void cleanupExpiredAssets().catch((error) => console.error("Image retention cleanup failed.", error));
  retentionTimer = setInterval(() => {
    void cleanupExpiredAssets().catch((error) => console.error("Image retention cleanup failed.", error));
  }, DAY_MS);
  retentionTimer.unref();
}

export function stopRetentionScheduler(): void {
  if (retentionTimer) clearInterval(retentionTimer);
}

function r2Client() {
  const active = getActiveCloudStorageConfig();
  if (!active || active.provider !== "s3") throw new Error("Managed R2 storage is not configured.");
  return {
    config: active.config,
    client: new S3Client({
      credentials: { accessKeyId: active.config.accessKeyId, secretAccessKey: active.config.secretAccessKey },
      endpoint: active.config.endpoint,
      forcePathStyle: active.config.forcePathStyle,
      region: active.config.region
    })
  };
}

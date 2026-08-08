import { and, count, desc, eq, sql } from "drizzle-orm";
import { TEST_USER_KEY } from "@/lib/file-storage/constants";
import {
  fileStorageApiKeys,
  fileStorageFiles,
  fileStorageWorkspaces,
  type FileStorageFileRow,
  type FileStorageWorkspaceRow,
} from "@/lib/file-storage/schema";
import { hashApiKey } from "@/lib/auth/api-key-auth";
import { db } from "@/lib/db/client";

export function normalizeOwnerKey(userId?: string | null): string {
  const trimmed = userId?.trim();
  if (!trimmed) return TEST_USER_KEY;
  return trimmed.slice(0, 255);
}

export async function getWorkspaceById(workspaceId: string) {
  const rows = await db
    .select()
    .from(fileStorageWorkspaces)
    .where(eq(fileStorageWorkspaces.id, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getWorkspaceByUserId(userId: string) {
  const rows = await db
    .select()
    .from(fileStorageWorkspaces)
    .where(eq(fileStorageWorkspaces.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** One workspace per dashboard user. Creates if missing. */
export async function ensureWorkspaceForUser(options: {
  userId: string;
}): Promise<FileStorageWorkspaceRow> {
  const existing = await getWorkspaceByUserId(options.userId);
  if (existing) return existing;

  const inserted = await db
    .insert(fileStorageWorkspaces)
    .values({
      userId: options.userId,
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function createApiKey(options: {
  workspaceId: string;
  apiKeyPlaintext: string;
  label?: string | null;
}) {
  const inserted = await db
    .insert(fileStorageApiKeys)
    .values({
      workspaceId: options.workspaceId,
      apiKeyHash: hashApiKey(options.apiKeyPlaintext),
      label: options.label?.trim() || null,
    })
    .returning();
  return inserted[0];
}

export async function listApiKeys(workspaceId: string) {
  return db
    .select({
      id: fileStorageApiKeys.id,
      label: fileStorageApiKeys.label,
      createdAt: fileStorageApiKeys.createdAt,
    })
    .from(fileStorageApiKeys)
    .where(eq(fileStorageApiKeys.workspaceId, workspaceId))
    .orderBy(desc(fileStorageApiKeys.createdAt));
}

export async function deleteApiKey(options: {
  apiKeyId: string;
  workspaceId: string;
}) {
  const deleted = await db
    .delete(fileStorageApiKeys)
    .where(
      and(
        eq(fileStorageApiKeys.id, options.apiKeyId),
        eq(fileStorageApiKeys.workspaceId, options.workspaceId),
      ),
    )
    .returning({ id: fileStorageApiKeys.id });
  return deleted[0] ?? null;
}

export async function createFileRecord(options: {
  id: string;
  workspaceId: string;
  ownerKey: string;
  filename: string;
  contentType?: string | null;
  sizeBytes: number;
  sourceUrl: string;
  s3Key: string;
  s3Bucket: string;
}): Promise<FileStorageFileRow> {
  const inserted = await db
    .insert(fileStorageFiles)
    .values({
      id: options.id,
      workspaceId: options.workspaceId,
      ownerKey: options.ownerKey,
      filename: options.filename,
      contentType: options.contentType ?? null,
      sizeBytes: options.sizeBytes,
      sourceUrl: options.sourceUrl,
      s3Key: options.s3Key,
      s3Bucket: options.s3Bucket,
    })
    .returning();
  return inserted[0];
}

export async function getFileForWorkspace(options: {
  workspaceId: string;
  fileId: string;
}) {
  const rows = await db
    .select()
    .from(fileStorageFiles)
    .where(
      and(
        eq(fileStorageFiles.id, options.fileId),
        eq(fileStorageFiles.workspaceId, options.workspaceId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteFileRecord(options: {
  workspaceId: string;
  fileId: string;
}): Promise<FileStorageFileRow | null> {
  const deleted = await db
    .delete(fileStorageFiles)
    .where(
      and(
        eq(fileStorageFiles.id, options.fileId),
        eq(fileStorageFiles.workspaceId, options.workspaceId),
      ),
    )
    .returning();
  return deleted[0] ?? null;
}

export async function listFilesForOwner(options: {
  workspaceId: string;
  ownerKey: string;
  limit?: number;
}) {
  const limit = options.limit ?? 100;
  return db
    .select()
    .from(fileStorageFiles)
    .where(
      and(
        eq(fileStorageFiles.workspaceId, options.workspaceId),
        eq(fileStorageFiles.ownerKey, options.ownerKey),
      ),
    )
    .orderBy(desc(fileStorageFiles.createdAt))
    .limit(limit);
}

export type OwnerSummary = {
  ownerKey: string;
  fileCount: number;
  latestAt: Date | null;
};

/** Dashboard: owners with files, most recently active first. */
export async function listOwnersWithFileCounts(
  workspaceId: string,
): Promise<OwnerSummary[]> {
  const rows = await db
    .select({
      ownerKey: fileStorageFiles.ownerKey,
      fileCount: count(fileStorageFiles.id),
      latestAt: sql<Date>`max(${fileStorageFiles.createdAt})`.as("latest_at"),
    })
    .from(fileStorageFiles)
    .where(eq(fileStorageFiles.workspaceId, workspaceId))
    .groupBy(fileStorageFiles.ownerKey)
    .orderBy(sql`max(${fileStorageFiles.createdAt}) desc`);

  return rows.map((row) => ({
    ownerKey: row.ownerKey,
    fileCount: Number(row.fileCount),
    latestAt: row.latestAt ? new Date(row.latestAt) : null,
  }));
}

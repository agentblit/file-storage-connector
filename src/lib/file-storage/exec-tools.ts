import { randomUUID } from "crypto";
import {
  MAX_DOWNLOAD_BYTES,
  PRESIGNED_URL_EXPIRES_SECONDS,
} from "@/lib/file-storage/constants";
import {
  createFileRecord,
  getFileForWorkspace,
  getWorkspaceById,
  listFilesForOwner,
  normalizeOwnerKey,
} from "@/lib/file-storage/repo";
import { buildObjectKey, createPresignedGetUrl, uploadObject } from "@/lib/file-storage/s3";
import {
  LIST_FILES_DEFAULT_LIMIT,
  listFilesArgsSchema,
  retrieveFileArgsSchema,
  saveFileArgsSchema,
} from "@/lib/file-storage/tools";

export type FileStorageToolCallResult = {
  content: Array<{ type: "text"; text: string }>;
};

function mcpStyleResult(data: Record<string, unknown>): FileStorageToolCallResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").filter(Boolean).pop();
    if (last) {
      return decodeURIComponent(last).slice(0, 512);
    }
  } catch {
    // fall through
  }
  return `file-${Date.now()}`;
}

async function downloadUrl(url: string): Promise<{
  body: Buffer;
  contentType: string | null;
  filenameHint: string;
}> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "file-storage-connector/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to download URL (HTTP ${response.status})`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_DOWNLOAD_BYTES
    ) {
      throw new Error(
        `File exceeds maximum size of ${MAX_DOWNLOAD_BYTES} bytes`,
      );
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(
      `File exceeds maximum size of ${MAX_DOWNLOAD_BYTES} bytes`,
    );
  }

  return {
    body: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type"),
    filenameHint: filenameFromUrl(url),
  };
}

export async function executeFileStorageTool(options: {
  workspaceId: string;
  toolName: string;
  args: unknown;
}): Promise<FileStorageToolCallResult> {
  const { workspaceId, toolName, args } = options;

  switch (toolName) {
    case "save_file":
      return saveFileTool({ workspaceId, args });
    case "list_files":
      return listFilesTool({ workspaceId, args });
    case "retrieve_file":
      return retrieveFileTool({ workspaceId, args });
    default:
      throw new Error(`Unknown File Storage Connector tool: ${toolName}`);
  }
}

async function saveFileTool(options: {
  workspaceId: string;
  args: unknown;
}): Promise<FileStorageToolCallResult> {
  const parsed = saveFileArgsSchema.safeParse(options.args ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message ?? "Invalid save_file arguments");
  }

  const workspace = await getWorkspaceById(options.workspaceId);
  if (!workspace) {
    throw new Error("File storage workspace is not configured");
  }

  const ownerKey = normalizeOwnerKey(parsed.data.user_id);
  const downloaded = await downloadUrl(parsed.data.url);
  const filename = parsed.data.filename?.trim() || downloaded.filenameHint;
  const fileId = randomUUID();
  const s3Key = buildObjectKey({
    workspaceId: workspace.id,
    ownerKey,
    fileId,
    filename,
  });

  const uploaded = await uploadObject({
    key: s3Key,
    body: downloaded.body,
    contentType: downloaded.contentType,
  });

  const row = await createFileRecord({
    id: fileId,
    workspaceId: workspace.id,
    ownerKey,
    filename,
    contentType: downloaded.contentType,
    sizeBytes: downloaded.body.byteLength,
    sourceUrl: parsed.data.url,
    s3Key: uploaded.key,
    s3Bucket: uploaded.bucket,
  });

  return mcpStyleResult({
    ok: true,
    file_id: row.id,
    user_id: row.ownerKey,
    filename: row.filename,
    content_type: row.contentType,
    size_bytes: row.sizeBytes,
    source_url: row.sourceUrl,
    created_at: row.createdAt.toISOString(),
  });
}

async function listFilesTool(options: {
  workspaceId: string;
  args: unknown;
}): Promise<FileStorageToolCallResult> {
  const parsed = listFilesArgsSchema.safeParse(options.args ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message ?? "Invalid list_files arguments");
  }

  const workspace = await getWorkspaceById(options.workspaceId);
  if (!workspace) {
    throw new Error("File storage workspace is not configured");
  }

  const ownerKey = normalizeOwnerKey(parsed.data.user_id);
  const rows = await listFilesForOwner({
    workspaceId: workspace.id,
    ownerKey,
    limit: parsed.data.limit ?? LIST_FILES_DEFAULT_LIMIT,
  });

  return mcpStyleResult({
    ok: true,
    user_id: ownerKey,
    count: rows.length,
    files: rows.map((row) => ({
      file_id: row.id,
      filename: row.filename,
      content_type: row.contentType,
      size_bytes: row.sizeBytes,
      source_url: row.sourceUrl,
      created_at: row.createdAt.toISOString(),
    })),
  });
}

async function retrieveFileTool(options: {
  workspaceId: string;
  args: unknown;
}): Promise<FileStorageToolCallResult> {
  const parsed = retrieveFileArgsSchema.safeParse(options.args ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message ?? "Invalid retrieve_file arguments");
  }

  const row = await getFileForWorkspace({
    workspaceId: options.workspaceId,
    fileId: parsed.data.file_id,
  });
  if (!row) {
    throw new Error("File not found for this workspace");
  }

  const downloadUrl = await createPresignedGetUrl({
    bucket: row.s3Bucket,
    key: row.s3Key,
    filename: row.filename,
    disposition: "attachment",
  });

  return mcpStyleResult({
    ok: true,
    file_id: row.id,
    user_id: row.ownerKey,
    filename: row.filename,
    content_type: row.contentType,
    size_bytes: row.sizeBytes,
    source_url: row.sourceUrl,
    created_at: row.createdAt.toISOString(),
    download_url: downloadUrl,
    download_url_expires_in_seconds: PRESIGNED_URL_EXPIRES_SECONDS,
  });
}

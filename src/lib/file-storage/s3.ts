import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRESIGNED_URL_EXPIRES_SECONDS } from "@/lib/file-storage/constants";

/** Prefix for all stored objects in the bucket. */
export const S3_KEY_PREFIX = "user_files";

let client: S3Client | null = null;

export function getS3Config() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = process.env.AWS_REGION?.trim() || "us-east-1";
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const endpoint = process.env.AWS_S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle =
    process.env.AWS_S3_FORCE_PATH_STYLE?.trim().toLowerCase() === "true";

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET.",
    );
  }

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint,
    forcePathStyle,
  };
}

export function getS3Client(): S3Client {
  if (client) return client;
  const config = getS3Config();
  client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    ...(config.endpoint
      ? {
          endpoint: config.endpoint,
          forcePathStyle: config.forcePathStyle,
        }
      : {}),
  });
  return client;
}

export async function uploadObject(options: {
  key: string;
  body: Buffer;
  contentType?: string | null;
}) {
  const { bucket } = getS3Config();
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType || "application/octet-stream",
    }),
  );
  return { bucket, key: options.key };
}

export async function deleteObject(options: {
  bucket: string;
  key: string;
}) {
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
    }),
  );
}

/**
 * ASCII-only Content-Disposition filename. Spaces/unicode break S3
 * ResponseContentDisposition (ISO-8859-1 header constraint).
 */
function asciiDispositionFilename(filename: string): string {
  const ascii = filename
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+|[._]+$/g, "");
  return ascii.slice(0, 180) || "file";
}

export type PresignedGetDisposition = "attachment" | "inline" | "none";

export async function createPresignedGetUrl(options: {
  bucket: string;
  key: string;
  expiresIn?: number;
  filename?: string;
  /** Default `attachment` when filename is set; `none` skips Content-Disposition. */
  disposition?: PresignedGetDisposition;
}) {
  const s3 = getS3Client();
  const disposition = options.disposition ?? (options.filename ? "attachment" : "none");

  let responseContentDisposition: string | undefined;
  if (disposition === "attachment" && options.filename) {
    const safe = asciiDispositionFilename(options.filename);
    responseContentDisposition = `attachment; filename="${safe}"`;
  } else if (disposition === "inline" && options.filename) {
    const safe = asciiDispositionFilename(options.filename);
    responseContentDisposition = `inline; filename="${safe}"`;
  }

  const command = new GetObjectCommand({
    Bucket: options.bucket,
    Key: options.key,
    ...(responseContentDisposition
      ? { ResponseContentDisposition: responseContentDisposition }
      : {}),
  });
  return getSignedUrl(s3, command, {
    expiresIn: options.expiresIn ?? PRESIGNED_URL_EXPIRES_SECONDS,
  });
}

export function buildObjectKey(options: {
  workspaceId: string;
  ownerKey: string;
  fileId: string;
  filename: string;
}): string {
  const safeOwner = options.ownerKey.replace(/[^a-zA-Z0-9._@+-]/g, "_");
  const safeName = options.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  return `${S3_KEY_PREFIX}/${options.workspaceId}/${safeOwner}/${options.fileId}/${safeName}`;
}

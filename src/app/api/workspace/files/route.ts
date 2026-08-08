import { NextResponse, type NextRequest } from "next/server";
import {
  ensureWorkspaceForUser,
  listFilesForOwner,
  normalizeOwnerKey,
} from "@/lib/file-storage/repo";
import { createPresignedGetUrl } from "@/lib/file-storage/s3";
import { requireDashboardAuth } from "@/lib/auth/require-dashboard-auth";

/** List files for one owner key (recent first), with short-lived open/download URLs. */
export async function GET(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const ownerParam = request.nextUrl.searchParams.get("owner")?.trim();
  if (!ownerParam) {
    return NextResponse.json(
      { ok: false, error: "Missing `owner` query parameter" },
      { status: 400 },
    );
  }

  const workspace = await ensureWorkspaceForUser({ userId: auth.userId });
  const ownerKey = normalizeOwnerKey(ownerParam);
  const rows = await listFilesForOwner({
    workspaceId: workspace.id,
    ownerKey,
    limit: 200,
  });

  const files = await Promise.all(
    rows.map(async (row) => {
      let openUrl: string | null = null;
      let downloadUrl: string | null = null;
      try {
        openUrl = await createPresignedGetUrl({
          bucket: row.s3Bucket,
          key: row.s3Key,
          disposition: "none",
        });
        downloadUrl = await createPresignedGetUrl({
          bucket: row.s3Bucket,
          key: row.s3Key,
          filename: row.filename,
          disposition: "attachment",
        });
      } catch {
        openUrl = null;
        downloadUrl = null;
      }
      return {
        id: row.id,
        filename: row.filename,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt.toISOString(),
        openUrl,
        downloadUrl,
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    ownerKey,
    files,
  });
}

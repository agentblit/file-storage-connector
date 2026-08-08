import { NextResponse } from "next/server";
import {
  deleteFileRecord,
  ensureWorkspaceForUser,
  getFileForWorkspace,
} from "@/lib/file-storage/repo";
import { deleteObject } from "@/lib/file-storage/s3";
import { requireDashboardAuth } from "@/lib/auth/require-dashboard-auth";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

/** Delete a stored file (S3 object + DB row) for the signed-in workspace. */
export async function DELETE(request: Request, context: RouteContext) {
  const { fileId } = await context.params;
  const auth = await requireDashboardAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const workspace = await ensureWorkspaceForUser({ userId: auth.userId });
  const row = await getFileForWorkspace({
    workspaceId: workspace.id,
    fileId,
  });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    await deleteObject({ bucket: row.s3Bucket, key: row.s3Key });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to delete S3 object",
      },
      { status: 500 },
    );
  }

  const deleted = await deleteFileRecord({
    workspaceId: workspace.id,
    fileId: row.id,
  });
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

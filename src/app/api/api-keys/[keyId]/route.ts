import { NextResponse } from "next/server";
import {
  deleteApiKey,
  ensureWorkspaceForUser,
} from "@/lib/file-storage/repo";
import { requireDashboardAuth } from "@/lib/auth/require-dashboard-auth";

type RouteContext = {
  params: Promise<{ keyId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const { keyId } = await context.params;
  const auth = await requireDashboardAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const workspace = await ensureWorkspaceForUser({ userId: auth.userId });
  const deleted = await deleteApiKey({
    apiKeyId: keyId,
    workspaceId: workspace.id,
  });
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

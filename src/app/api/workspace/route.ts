import { NextResponse } from "next/server";
import {
  ensureWorkspaceForUser,
  listApiKeys,
  listOwnersWithFileCounts,
} from "@/lib/file-storage/repo";
import { requireDashboardAuth } from "@/lib/auth/require-dashboard-auth";

/** Load (or create) the user's workspace with API keys and file owner summaries. */
export async function GET(request: Request) {
  const auth = await requireDashboardAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const workspace = await ensureWorkspaceForUser({ userId: auth.userId });
  const [apiKeys, owners] = await Promise.all([
    listApiKeys(workspace.id),
    listOwnersWithFileCounts(workspace.id),
  ]);

  return NextResponse.json({
    ok: true,
    workspace: {
      id: workspace.id,
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        label: key.label,
        createdAt: key.createdAt.toISOString(),
      })),
      owners: owners.map((owner) => ({
        ownerKey: owner.ownerKey,
        fileCount: owner.fileCount,
        latestAt: owner.latestAt?.toISOString() ?? null,
      })),
    },
  });
}

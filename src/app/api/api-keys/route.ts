import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createApiKey,
  ensureWorkspaceForUser,
  listApiKeys,
} from "@/lib/file-storage/repo";
import { generateApiKey } from "@/lib/auth/api-key-auth";
import { requireDashboardAuth } from "@/lib/auth/require-dashboard-auth";

const createBodySchema = z.object({
  label: z.string().trim().max(100).optional(),
});

export async function GET(request: Request) {
  const auth = await requireDashboardAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const workspace = await ensureWorkspaceForUser({ userId: auth.userId });
  const apiKeys = await listApiKeys(workspace.id);
  return NextResponse.json({
    ok: true,
    apiKeys: apiKeys.map((key) => ({
      id: key.id,
      label: key.label,
      createdAt: key.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireDashboardAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let label: string | undefined;
  try {
    const json = (await request.json()) as unknown;
    const parsed = createBodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { ok: false, error: issue?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }
    label = parsed.data.label;
  } catch {
    // empty body is fine
  }

  const workspace = await ensureWorkspaceForUser({ userId: auth.userId });
  const apiKey = generateApiKey();
  const row = await createApiKey({
    workspaceId: workspace.id,
    apiKeyPlaintext: apiKey,
    label,
  });

  return NextResponse.json({
    ok: true,
    apiKey,
    apiKeyMeta: {
      id: row.id,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
    },
  });
}

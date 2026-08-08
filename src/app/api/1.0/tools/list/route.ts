import { NextResponse } from "next/server";
import { toOpenAiToolsList } from "@/lib/file-storage/tools";
import { requireWorkspaceApiKey } from "@/lib/auth/api-key-auth";

/**
 * Requires X-API-Key.
 * AgentBlit calls this on connect/reconnect to validate the key and discover tools.
 */
export async function GET(request: Request) {
  try {
    await requireWorkspaceApiKey(request);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(toOpenAiToolsList());
}

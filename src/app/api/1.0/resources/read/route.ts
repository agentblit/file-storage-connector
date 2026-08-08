import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspaceApiKey } from "@/lib/auth/api-key-auth";

/**
 * MCP Apps `resources/read` mirror for HTTP agents.
 * No UI resources yet — returns 404 for unknown URIs after auth.
 */
export async function GET(req: NextRequest) {
  try {
    await requireWorkspaceApiKey(req);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }

  const uri = req.nextUrl.searchParams.get("uri")?.trim() ?? "";
  if (!uri) {
    return NextResponse.json(
      { error: "Missing `uri` query parameter" },
      { status: 400 },
    );
  }
  if (!uri.startsWith("ui://")) {
    return NextResponse.json(
      { error: "Only ui:// resources are supported" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: `Unknown resource: ${uri}` },
    { status: 404 },
  );
}

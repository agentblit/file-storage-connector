import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/http";
import { requireAuth } from "@/lib/auth/requireAuth";

/** Session auth for dashboard APIs. */
export async function requireDashboardAuth(
  request: Request,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  try {
    const userId = await requireAuth(request);
    return { ok: true, userId };
  } catch (error) {
    return {
      ok: false,
      response:
        authErrorResponse(error) ??
        NextResponse.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 },
        ),
    };
  }
}

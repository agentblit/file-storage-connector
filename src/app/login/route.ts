import { NextResponse, type NextRequest } from "next/server";
import { AGENTBLIT_PROVIDER_ID } from "@/lib/agentblit-oauth";
import { auth } from "@/lib/better-auth";

/**
 * Starts "Login with Agentblit".
 *
 * Must be a Route Handler (not a Server Component page): Better Auth stores
 * OAuth state + PKCE in Set-Cookie headers, and Next.js `redirect()` from a
 * page drops those cookies → `state_mismatch` on callback.
 */
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next");
  const callbackURL =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  const { headers, response } = await auth.api.signInSocial({
    body: {
      provider: AGENTBLIT_PROVIDER_ID,
      callbackURL,
      errorCallbackURL: "/auth-error",
    },
    returnHeaders: true,
  });

  if (!response?.url) {
    return NextResponse.redirect(new URL("/auth-error", req.nextUrl.origin));
  }

  const res = NextResponse.redirect(response.url);
  for (const cookie of headers.getSetCookie()) {
    res.headers.append("set-cookie", cookie);
  }
  return res;
}

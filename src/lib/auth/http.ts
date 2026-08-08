import { NextResponse } from "next/server";
import { isAuthError } from "@/lib/auth/errors";

export function authErrorResponse(error: unknown): NextResponse | null {
  if (!isAuthError(error)) {
    return null;
  }

  return NextResponse.json(
    { ok: false, error: error.message },
    { status: error.status },
  );
}

export function handleApiError(error: unknown): NextResponse {
  const authError = authErrorResponse(error);
  if (authError) {
    return authError;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

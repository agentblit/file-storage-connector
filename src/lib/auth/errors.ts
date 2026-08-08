export class AuthError extends Error {
  readonly status: number;
  readonly code: "unauthenticated" | "session_expired";

  constructor(
    code: "unauthenticated" | "session_expired",
    message: string,
    status = 401,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

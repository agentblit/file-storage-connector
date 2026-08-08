import { auth } from "@/lib/better-auth";
import { AuthError } from "./errors";

export async function requireAuth(req: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  if (!session?.user?.id) {
    throw new AuthError("unauthenticated", "Not signed in");
  }
  return session.user.id;
}

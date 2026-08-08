"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HardDrive } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

export type AuthFormMode = "login" | "signup";

type AuthFormsProps = {
  mode?: AuthFormMode;
  nextPath?: string | null;
  queryError?: string | null;
};

function resolveAfterAuth(nextPath: string | null | undefined): string {
  if (nextPath?.startsWith("/")) {
    return nextPath;
  }
  return "/";
}

const inputClassName =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/30";

export function AuthForms({
  mode = "login",
  nextPath = null,
  queryError = null,
}: AuthFormsProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const error = submitError || queryError || "";

  useEffect(() => {
    if (sessionPending || !session?.user) return;
    router.replace(resolveAfterAuth(nextPath));
  }, [sessionPending, session, nextPath, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: name.trim() || email,
          email,
          password,
        });
        if (result.error) {
          setSubmitError(result.error.message ?? "Couldn't create account");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          setSubmitError(result.error.message ?? "Couldn't sign in");
          return;
        }
      }

      router.push(resolveAfterAuth(nextPath));
    } catch {
      setSubmitError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sessionPending || session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <HardDrive className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to manage the File Storage Connector."
                : "Sign up to start storing files for agents."}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="h-1 bg-primary" />
          <div className="p-6">
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="flex flex-col gap-4"
            >
              {error ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              {mode === "signup" ? (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    className={inputClassName}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  className={inputClassName}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Password{" "}
                  {mode === "signup" ? (
                    <span className="font-normal text-muted-foreground">
                      (8+ chars)
                    </span>
                  ) : null}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className={inputClassName}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 h-10 w-full cursor-pointer rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? mode === "login"
                    ? "Signing in…"
                    : "Creating account…"
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  No account?{" "}
                  <Link
                    href={
                      nextPath
                        ? `/signup?next=${encodeURIComponent(nextPath)}`
                        : "/signup"
                    }
                    className="cursor-pointer font-medium text-primary hover:opacity-80"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Have an account?{" "}
                  <Link
                    href={
                      nextPath
                        ? `/login?next=${encodeURIComponent(nextPath)}`
                        : "/login"
                    }
                    className="cursor-pointer font-medium text-primary hover:opacity-80"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

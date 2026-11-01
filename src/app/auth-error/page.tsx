import Link from "next/link";

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string }>;
};

/** Shown when "Login with Agentblit" cannot start or the console rejected it. */
export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-8 text-center">
        <h1 className="mb-2 text-lg font-bold">Couldn&apos;t sign in</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          {error ?? "Agentblit sign-in failed. Please try again."}
        </p>
        <Link className="text-sm font-medium text-primary" href="/login">
          Try again
        </Link>
      </div>
    </div>
  );
}

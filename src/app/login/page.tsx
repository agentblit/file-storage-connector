import { AuthForms } from "@/components/auth-forms";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthForms
      mode="login"
      queryError={params.error ?? null}
      nextPath={params.next ?? null}
    />
  );
}

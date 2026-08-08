import { AuthForms } from "@/components/auth-forms";

type SignupPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <AuthForms
      mode="signup"
      queryError={params.error ?? null}
      nextPath={params.next ?? null}
    />
  );
}

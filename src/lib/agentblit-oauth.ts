/**
 * "Login with Agentblit": this app is an OIDC relying party against the
 * Agentblit console. Endpoints come from the provider's discovery document, so
 * only the issuer URL is configured here.
 */
export const AGENTBLIT_PROVIDER_ID = "agentblit";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value) return value.replace(/\/$/, "");
  // `next build` imports auth while collecting page data; allow placeholders then.
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  ) {
    return `https://build-placeholder.invalid/${name}`;
  }
  throw new Error(`${name} is not set`);
}

export function agentblitOAuthConfig() {
  const issuer = `${requireEnv("AGENTBLIT_APP_URL")}/api/auth`;
  return {
    providerId: AGENTBLIT_PROVIDER_ID,
    discoveryUrl: `${issuer}/.well-known/openid-configuration`,
    clientId: requireEnv("AGENTBLIT_CLIENT_ID"),
    clientSecret: requireEnv("AGENTBLIT_CLIENT_SECRET"),
    scopes: ["openid", "profile", "email"],
    postLogoutRedirectURI: `${requireEnv("PUBLIC_BASE_URL")}/`,
  };
}

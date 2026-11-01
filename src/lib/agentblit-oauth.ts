/**
 * "Login with Agentblit": this app is an OIDC relying party against the
 * Agentblit console. Endpoints come from the provider's discovery document, so
 * only the issuer URL is configured here.
 */
export const AGENTBLIT_PROVIDER_ID = "agentblit";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value.replace(/\/$/, "");
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

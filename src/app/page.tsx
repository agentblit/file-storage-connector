"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  HardDrive,
  KeyRound,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

type ApiKeyMeta = {
  id: string;
  label: string | null;
  createdAt: string;
};

type OwnerRow = {
  ownerKey: string;
  fileCount: number;
  latestAt: string | null;
};

type FileRow = {
  id: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number;
  createdAt: string;
  openUrl: string | null;
  downloadUrl: string | null;
};

const buttonPrimaryClassName =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

function formatKeyDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DashboardShell({
  email,
  onSignOut,
  children,
}: {
  email: string;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardDrive className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              File Storage Connector
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground sm:block">
              {email}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerParam = searchParams.get("user")?.trim() ?? "";

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiKeys, setApiKeys] = useState<ApiKeyMeta[]>([]);
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [filesError, setFilesError] = useState("");
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/workspace", { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        workspace?: {
          apiKeys: ApiKeyMeta[];
          owners: OwnerRow[];
        };
      };
      if (!res.ok || !json.ok || !json.workspace) {
        throw new Error(json.error ?? "Failed to load workspace");
      }
      setApiKeys(json.workspace.apiKeys);
      setOwners(json.workspace.owners);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFiles = useCallback(async (ownerKey: string) => {
    setFilesError("");
    setFilesLoading(true);
    try {
      const res = await fetch(
        `/api/workspace/files?owner=${encodeURIComponent(ownerKey)}`,
        { credentials: "include" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        files?: FileRow[];
      };
      if (!res.ok || !json.ok || !json.files) {
        throw new Error(json.error ?? "Failed to load files");
      }
      setFiles(json.files);
    } catch (err) {
      setFiles([]);
      setFilesError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionPending) return;
    if (!isAuthenticated) {
      router.replace("/login?next=/");
      return;
    }
    void loadWorkspace();
  }, [sessionPending, isAuthenticated, router, loadWorkspace]);

  useEffect(() => {
    if (!isAuthenticated || !ownerParam) {
      setFiles([]);
      return;
    }
    void loadFiles(ownerParam);
  }, [isAuthenticated, ownerParam, loadFiles]);

  async function onCreateKey() {
    setCreatingKey(true);
    setError("");
    setCreatedKey(null);
    try {
      const label = newKeyLabel.trim();
      const res = await fetch("/api/api-keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(label ? { label } : {}),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        apiKey?: string;
        apiKeyMeta?: ApiKeyMeta;
      };
      if (!res.ok || !json.ok || !json.apiKey || !json.apiKeyMeta) {
        throw new Error(json.error ?? "Failed to create API key");
      }
      setCreatedKey(json.apiKey);
      setApiKeys((prev) => [json.apiKeyMeta!, ...prev]);
      setNewKeyLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreatingKey(false);
    }
  }

  async function onDeleteKey(keyId: string) {
    setError("");
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to delete key");
      }
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete key");
    }
  }

  async function copyCreatedKey() {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function onDeleteFile(fileId: string) {
    setFilesError("");
    setDeletingFileId(fileId);
    try {
      const res = await fetch(`/api/workspace/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to delete file");
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      void loadWorkspace();
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  }

  async function onSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (sessionPending || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const email = session?.user?.email ?? "";

  if (ownerParam) {
    return (
      <DashboardShell email={email} onSignOut={() => void onSignOut()}>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All users
        </button>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">{ownerParam}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Files for this user, most recent first.
          </p>
        </div>

        {filesError ? (
          <div
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {filesError}
          </div>
        ) : null}

        {filesLoading ? (
          <p className="text-sm text-muted-foreground">Loading files…</p>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No files yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {file.filename}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBytes(file.sizeBytes)}
                      {file.contentType ? ` · ${file.contentType}` : ""}
                      {" · "}
                      {formatKeyDate(file.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {file.openUrl ? (
                      <a
                        href={file.openUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open"
                        aria-label={`Open ${file.filename}`}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:bg-card"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                    {file.downloadUrl ? (
                      <a
                        href={file.downloadUrl}
                        title="Download"
                        aria-label={`Download ${file.filename}`}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:bg-card"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      title="Delete"
                      aria-label={`Delete ${file.filename}`}
                      disabled={deletingFileId === file.id}
                      onClick={() => void onDeleteFile(file.id)}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell email={email} onSignOut={() => void onSignOut()}>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an API key for AgentBlit, then browse files by end-user.
        </p>
      </div>

      {error ? (
        <div
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">
                API keys
              </h2>
            </div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="api-key-label"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  Label{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  id="api-key-label"
                  type="text"
                  maxLength={100}
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder="e.g. AgentBlit"
                  disabled={creatingKey}
                  className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition-shadow focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <button
                type="button"
                onClick={() => void onCreateKey()}
                disabled={creatingKey}
                className={buttonPrimaryClassName}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {creatingKey ? "Creating…" : "Create key"}
              </button>
            </div>

            {createdKey ? (
              <div className="mb-3 rounded-xl border border-primary/30 bg-primary-soft/50 px-4 py-3">
                <p className="text-xs font-medium text-foreground">
                  Copy this key now — it will not be shown again.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground">
                    {createdKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyCreatedKey()}
                    className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}

            {apiKeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No API keys yet. Create one to connect this connector in AgentBlit.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {apiKeys.map((key) => (
                  <li
                    key={key.id}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {key.label || "API key"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatKeyDate(key.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDeleteKey(key.id)}
                      title="Delete"
                      aria-label="Delete API key"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 focus-visible:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">
                Files by user
              </h2>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              End-users from{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                save_file
              </code>{" "}
              calls, grouped by{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                user_id
              </code>
              .
            </p>

            {owners.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No files stored yet.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {owners.map((owner) => (
                  <li key={owner.ownerKey}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/?user=${encodeURIComponent(owner.ownerKey)}`,
                        )
                      }
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {owner.ownerKey}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {owner.fileCount} file
                          {owner.fileCount === 1 ? "" : "s"}
                          {owner.latestAt
                            ? ` · latest ${formatKeyDate(owner.latestAt)}`
                            : ""}
                        </p>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

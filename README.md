# File Storage Connector

Standalone [AgentBlit custom HTTP connector](https://docs.agentblit.com/docs/connectors/custom/http) for saving and retrieving user files in S3.

## HTTP contract

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/1.0/tools/list` | GET | `X-API-Key` |
| `/api/1.0/tools/call` | POST | `X-API-Key` |
| `/api/1.0/resources/read` | GET | `X-API-Key` |
| `/api/health` | GET | None |

In the dashboard (`/`): manage **API keys** and browse stored files organized by end-user (recent first). Paste a key into AgentBlit when connecting this connector.

### Tools

| Tool | Purpose |
|------|---------|
| `save_file` | Save a file for a user from a URL (`user_id` required) |
| `list_files` | List files for a user (recent first; default/max 20) |
| `retrieve_file` | Return metadata + a short-lived signed download URL |

## AgentBlit integration notes

When AgentBlit auto-saves chat attachments, it currently passes **`user_id = chat session_id`**, so files group **per conversation** in this dashboard (not per person).

S3 object keys use:

```
user_files/{workspaceId}/{user_id}/{fileId}/{filename}
```

### Backlog

- **Stable end-user `user_id`:** once AgentBlit chat has login / authenticated end-user identity, switch auto-save from `session_id` to that user id so files group by person across sessions.

## Local development

```bash
cp .env.example .env
# fill AWS_* and BETTER_AUTH_SECRET
docker compose up -d
pnpm install
pnpm dev
# app: http://localhost:3081
# postgres: localhost:5434
```

Reset the database:

```bash
pnpm db:clean
pnpm dev
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection |
| `PUBLIC_BASE_URL` | App base URL (Better Auth) |
| `BETTER_AUTH_SECRET` | Better Auth signing secret |
| `AWS_ACCESS_KEY_ID` | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials |
| `AWS_REGION` | S3 region |
| `AWS_S3_BUCKET` | Target bucket |
| `AWS_S3_ENDPOINT` | Optional custom endpoint (MinIO, etc.) |
| `AWS_S3_FORCE_PATH_STYLE` | Optional `true` for path-style S3 |

## Build and push

```bash
docker build --platform linux/amd64 -t registry.agentblit.com/file-storage-connector:latest .
docker push registry.agentblit.com/file-storage-connector:latest
```

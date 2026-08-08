import { z } from "zod";

/** Matches AgentBlit `ToolPermissionMode` wire values. */
export enum ToolPermissionMode {
  AlwaysAllow = "always_allow",
  NeedsApproval = "needs_approval",
  Blocked = "blocked",
}

export type Tool = {
  name: string;
  description: string;
  parameters: object;
  permissionMode: ToolPermissionMode;
};

const allow = ToolPermissionMode.AlwaysAllow;

export const FILE_STORAGE_CONNECTOR_KEY = "file_storage";

export const LIST_FILES_DEFAULT_LIMIT = 20;
export const LIST_FILES_MAX_LIMIT = 20;

export const saveFileArgsSchema = z.object({
  url: z.string().trim().url("url must be a valid http(s) URL"),
  user_id: z.string().trim().min(1, "user_id is required").max(255),
  filename: z.string().trim().min(1).max(512).optional(),
});

export const listFilesArgsSchema = z.object({
  user_id: z.string().trim().min(1, "user_id is required").max(255),
  limit: z
    .number()
    .int()
    .min(1)
    .max(LIST_FILES_MAX_LIMIT)
    .optional(),
});

export const retrieveFileArgsSchema = z.object({
  file_id: z.string().uuid("file_id must be a valid UUID"),
});

export const FILE_STORAGE_TOOLS: Tool[] = [
  {
    name: "save_file",
    description:
      "Save a file for a user from a URL. Requires user_id. Optionally pass filename.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the file to save",
        },
        user_id: {
          type: "string",
          description: "User to save the file for",
        },
        filename: {
          type: "string",
          description:
            "Optional filename. When omitted, derived from the URL path.",
        },
      },
      required: ["url", "user_id"],
    },
    permissionMode: allow,
  },
  {
    name: "list_files",
    description:
      "List a user's stored files, most recent first. Requires user_id. Optional limit (default 20, max 20).",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User whose files to list",
        },
        limit: {
          type: "integer",
          description: "Max files to return (1–20). Default 20.",
        },
      },
      required: ["user_id"],
    },
    permissionMode: allow,
  },
  {
    name: "retrieve_file",
    description:
      "Get a stored file by file_id, including a short-lived download link.",
    parameters: {
      type: "object",
      properties: {
        file_id: {
          type: "string",
          description: "UUID of the file returned by save_file or list_files",
        },
      },
      required: ["file_id"],
    },
    permissionMode: allow,
  },
];

/** OpenAI tools/list shape including `permission_mode`. */
export function toOpenAiToolsList() {
  return {
    tools: FILE_STORAGE_TOOLS.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
      permission_mode: tool.permissionMode,
    })),
  };
}

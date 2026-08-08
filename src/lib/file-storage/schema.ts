import {
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const fileStorageSchema = pgSchema("file_storage");

/** One workspace per dashboard user. */
export const fileStorageWorkspaces = fileStorageSchema.table(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("file_storage_workspaces_user_id_uidx").on(t.userId)],
);

export const fileStorageApiKeys = fileStorageSchema.table(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => fileStorageWorkspaces.id, { onDelete: "cascade" }),
    apiKeyHash: varchar("api_key_hash", { length: 128 }).notNull().unique(),
    label: varchar("label", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("file_storage_api_keys_workspace_id_idx").on(t.workspaceId)],
);

/** Files stored in S3, scoped by workspace + end-user key. */
export const fileStorageFiles = fileStorageSchema.table(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => fileStorageWorkspaces.id, { onDelete: "cascade" }),
    /** End-user identity from the agent tool call; defaults to "test". */
    ownerKey: varchar("owner_key", { length: 255 }).notNull(),
    filename: varchar("filename", { length: 512 }).notNull(),
    contentType: varchar("content_type", { length: 255 }),
    sizeBytes: integer("size_bytes").notNull(),
    sourceUrl: text("source_url").notNull(),
    s3Key: text("s3_key").notNull(),
    s3Bucket: varchar("s3_bucket", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("file_storage_files_workspace_owner_created_idx").on(
      t.workspaceId,
      t.ownerKey,
      t.createdAt,
    ),
    index("file_storage_files_workspace_created_idx").on(
      t.workspaceId,
      t.createdAt,
    ),
  ],
);

export type FileStorageWorkspaceRow = typeof fileStorageWorkspaces.$inferSelect;
export type FileStorageApiKeyRow = typeof fileStorageApiKeys.$inferSelect;
export type FileStorageFileRow = typeof fileStorageFiles.$inferSelect;

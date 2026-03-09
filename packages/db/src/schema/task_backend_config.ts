import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const taskBackendConfig = pgTable(
  "task_backend_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    planeApiUrl: text("plane_api_url"),
    planeApiKeyEncrypted: text("plane_api_key_encrypted"),
    planeWorkspaceSlug: text("plane_workspace_slug"),
    planeDefaultProjectId: text("plane_default_project_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("task_backend_config_company_idx").on(table.companyId),
    companyUniq: unique("task_backend_config_company_uniq").on(table.companyId),
  }),
);

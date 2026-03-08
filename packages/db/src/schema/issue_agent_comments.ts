import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { issues } from "./issues.js";

export const issueAgentComments = pgTable(
  "issue_agent_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id").notNull().references(() => issues.id),
    agentName: text("agent_name").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<{
      statusUpdate?: string;
      blocker?: string;
      progress?: number;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("issue_agent_comments_issue_idx").on(table.issueId),
    agentIdx: index("issue_agent_comments_agent_idx").on(table.agentName),
    issueAgentIdx: index("issue_agent_comments_issue_agent_idx").on(table.issueId, table.agentName),
  }),
);

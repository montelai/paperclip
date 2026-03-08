import { eq, and } from 'drizzle-orm';
import type { Db } from '@paperclipai/db';
import { issues } from '@paperclipai/db';
import type {
  TaskBackend,
  Issue,
  CreateIssueInput,
  UpdateIssueInput,
  IssueFilters,
  DependencyInfo,
} from '../types.js';

export class PaperclipBackend implements TaskBackend {
  readonly name = 'paperclip';

  constructor(
    private readonly db: Db,
    private readonly companyId: string
  ) {}

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    const now = new Date();
    const [row] = await this.db
      .insert(issues)
      .values({
        companyId: this.companyId,
        title: input.title,
        description: input.description || null,
        status: input.status || 'backlog',
        priority: input.priority || 'medium',
        assigneeAgentId: input.assigneeId || null,
        projectId: input.projectId || null,
        goalId: input.goalId || null,
        parentId: input.parentId || null,
        backendType: 'paperclip',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapRowToIssue(row);
  }

  async getIssue(id: string): Promise<Issue | null> {
    const [row] = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.id, id), eq(issues.companyId, this.companyId)));

    return row ? this.mapRowToIssue(row) : null;
  }

  async listIssues(filters?: IssueFilters): Promise<Issue[]> {
    const conditions = [eq(issues.companyId, this.companyId)];

    if (filters?.status) {
      conditions.push(eq(issues.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(issues.priority, filters.priority));
    }
    if (filters?.assigneeId) {
      conditions.push(eq(issues.assigneeAgentId, filters.assigneeId));
    }
    if (filters?.projectId) {
      conditions.push(eq(issues.projectId, filters.projectId));
    }
    if (filters?.goalId) {
      conditions.push(eq(issues.goalId, filters.goalId));
    }
    if (filters?.parentId) {
      conditions.push(eq(issues.parentId, filters.parentId));
    }

    const rows = await this.db
      .select()
      .from(issues)
      .where(and(...conditions));

    return rows.map(row => this.mapRowToIssue(row));
  }

  async updateIssue(id: string, input: UpdateIssueInput): Promise<Issue> {
    const existing = await this.getIssue(id);
    if (!existing) {
      throw new Error(`Issue ${id} not found`);
    }

    const [row] = await this.db
      .update(issues)
      .set({
        ...input,
        assigneeAgentId: input.assigneeId !== undefined ? input.assigneeId : existing.assigneeId,
        updatedAt: new Date(),
      })
      .where(and(eq(issues.id, id), eq(issues.companyId, this.companyId)))
      .returning();

    if (!row) {
      throw new Error(`Failed to update issue ${id}`);
    }

    return this.mapRowToIssue(row);
  }

  async deleteIssue(id: string): Promise<void> {
    const existing = await this.getIssue(id);
    if (!existing) {
      throw new Error(`Issue ${id} not found`);
    }

    await this.db
      .delete(issues)
      .where(and(eq(issues.id, id), eq(issues.companyId, this.companyId)));
  }

  async listDependencies(issueId: string): Promise<DependencyInfo[]> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      return [];
    }

    const dependencies: DependencyInfo[] = [];

    // If this issue has a parent, it's blocked by the parent
    if (issue.parentId) {
      dependencies.push({
        id: `${issueId}-blocked-by-${issue.parentId}`,
        issueId: issueId,
        dependsOnIssueId: issue.parentId,
        type: 'blocked_by',
      });
    }

    // Find all children that have this issue as parent - this issue blocks them
    const children = await this.db
      .select()
      .from(issues)
      .where(
        and(
          eq(issues.parentId, issueId),
          eq(issues.companyId, this.companyId)
        )
      );

    for (const child of children) {
      dependencies.push({
        id: `${issueId}-blocks-${child.id}`,
        issueId: issueId,
        dependsOnIssueId: child.id,
        type: 'blocks',
      });
    }

    return dependencies;
  }

  private mapRowToIssue(row: any): Issue {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assigneeAgentId || undefined,
      projectId: row.projectId || undefined,
      goalId: row.goalId || undefined,
      parentId: row.parentId || undefined,
      backendType: row.backendType || 'paperclip',
      externalId: row.externalId || undefined,
      externalMetadata: row.externalMetadata || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

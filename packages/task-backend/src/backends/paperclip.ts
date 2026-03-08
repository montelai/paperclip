import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '@paperclipai/db';
import { issues, issueAgentComments } from '@paperclipai/db';
import type {
  TaskBackend,
  Issue,
  CreateIssueInput,
  UpdateIssueInput,
  IssueFilters,
  DependencyInfo,
  IssueAgentComment,
  CreateAgentCommentInput,
} from '../types.js';

export class PaperclipBackend implements TaskBackend {
  readonly name = 'paperclip';
  
  constructor(
    private db: Db,
    private companyId: string,
  ) {}

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    const [row] = await this.db.insert(issues).values({
      companyId: this.companyId,
      title: input.title,
      description: input.description,
      status: input.status ?? 'backlog',
      priority: input.priority ?? 'medium',
      assigneeUserId: input.assigneeId,
      projectId: input.projectId,
      goalId: input.goalId,
      parentId: input.parentId,
      backendType: 'paperclip',
    }).returning();
    
    return this.mapIssue(row);
  }

  async getIssue(id: string): Promise<Issue | null> {
    const [row] = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.id, id), eq(issues.companyId, this.companyId)))
      .limit(1);
    return row ? this.mapIssue(row) : null;
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
      conditions.push(eq(issues.assigneeUserId, filters.assigneeId));
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
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return rows.map(row => this.mapIssue(row));
  }

  async updateIssue(id: string, input: UpdateIssueInput): Promise<Issue> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.assigneeId !== undefined) updateData.assigneeUserId = input.assigneeId;
    if (input.projectId !== undefined) updateData.projectId = input.projectId;
    if (input.goalId !== undefined) updateData.goalId = input.goalId;
    if (input.parentId !== undefined) updateData.parentId = input.parentId;

    const [row] = await this.db
      .update(issues)
      .set(updateData)
      .where(and(eq(issues.id, id), eq(issues.companyId, this.companyId)))
      .returning();
    
    return this.mapIssue(row);
  }

  async deleteIssue(id: string): Promise<void> {
    await this.db
      .delete(issues)
      .where(and(eq(issues.id, id), eq(issues.companyId, this.companyId)));
  }

  async listDependencies(_issueId: string): Promise<DependencyInfo[]> {
    // Dependencies are tracked via parentId in issues table
    // For now, return empty array as full dependency tracking is not implemented
    return [];
  }

  async createAgentComment(issueId: string, input: CreateAgentCommentInput): Promise<IssueAgentComment> {
    const [row] = await this.db.insert(issueAgentComments).values({
      issueId,
      agentName: input.agentName,
      content: input.content,
      metadata: input.metadata,
    }).returning();
    
    return this.mapAgentComment(row);
  }

  async listAgentComments(issueId: string, agentName?: string): Promise<IssueAgentComment[]> {
    const conditions = [eq(issueAgentComments.issueId, issueId)];
    
    if (agentName) {
      conditions.push(eq(issueAgentComments.agentName, agentName));
    }

    const rows = await this.db
      .select()
      .from(issueAgentComments)
      .where(and(...conditions))
      .orderBy(desc(issueAgentComments.createdAt));
    
    return rows.map(row => this.mapAgentComment(row));
  }

  async getLatestAgentComment(issueId: string, agentName: string): Promise<IssueAgentComment | null> {
    const [row] = await this.db
      .select()
      .from(issueAgentComments)
      .where(
        and(
          eq(issueAgentComments.issueId, issueId),
          eq(issueAgentComments.agentName, agentName)
        )
      )
      .orderBy(desc(issueAgentComments.createdAt))
      .limit(1);
    
    return row ? this.mapAgentComment(row) : null;
  }

  private mapIssue(row: typeof issues.$inferSelect): Issue {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assigneeUserId ?? undefined,
      projectId: row.projectId ?? undefined,
      goalId: row.goalId ?? undefined,
      parentId: row.parentId ?? undefined,
      backendType: row.backendType as 'paperclip' | 'plane',
      externalId: row.externalId ?? undefined,
      externalMetadata: row.externalMetadata ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapAgentComment(row: typeof issueAgentComments.$inferSelect): IssueAgentComment {
    return {
      id: row.id,
      issueId: row.issueId,
      agentName: row.agentName,
      content: row.content,
      metadata: row.metadata ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

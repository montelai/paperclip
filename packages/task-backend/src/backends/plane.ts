import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '@paperclipai/db';
import { issueAgentComments } from '@paperclipai/db';
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

interface PlaneIssue {
  id: string;
  name: string;
  description_html?: string;
  state: string;
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  project: string;
  created_at: string;
  updated_at: string;
}

interface PlaneState {
  id: string;
  name: string;
  group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
}

interface PlaneProject {
  id: string;
  name: string;
}

class PlaneClient {
  constructor(
    private apiUrl: string,
    private apiKey: string,
  ) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Plane API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Plane API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Plane API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Plane API error: ${response.status} ${response.statusText}`);
    }
  }
}

export class PlaneBackend implements TaskBackend {
  readonly name = 'plane';
  private client: PlaneClient;
  private stateCache: Map<string, string> = new Map();

  constructor(
    private db: Db,
    apiUrl: string,
    apiKey: string,
    private workspaceSlug: string,
    private defaultProjectId: string,
  ) {
    this.client = new PlaneClient(apiUrl, apiKey);
  }

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    const planeIssue = await this.client.post<PlaneIssue>(
      `/workspaces/${this.workspaceSlug}/projects/${input.projectId ?? this.defaultProjectId}/issues/`,
      {
        name: input.title,
        description_html: input.description,
        priority: this.mapPriorityToPlane(input.priority ?? 'medium'),
        state: await this.getOrCreateStateId(input.status ?? 'backlog'),
        assignees: input.assigneeId ? [input.assigneeId] : [],
      },
    );

    return this.mapIssue(planeIssue, input.projectId ?? this.defaultProjectId);
  }

  async getIssue(id: string): Promise<Issue | null> {
    try {
      const planeIssue = await this.client.get<PlaneIssue>(
        `/workspaces/${this.workspaceSlug}/projects/${this.defaultProjectId}/issues/${id}/`,
      );
      return this.mapIssue(planeIssue, this.defaultProjectId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async listIssues(filters?: IssueFilters): Promise<Issue[]> {
    const projectId = filters?.projectId ?? this.defaultProjectId;
    const planeIssues = await this.client.get<PlaneIssue[]>(
      `/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/`,
    );

    let issues = planeIssues.map(issue => this.mapIssue(issue, projectId));

    if (filters) {
      issues = issues.filter(issue => {
        if (filters.status && issue.status !== filters.status) return false;
        if (filters.priority && issue.priority !== filters.priority) return false;
        if (filters.assigneeId && issue.assigneeId !== filters.assigneeId) return false;
        if (filters.projectId && issue.projectId !== filters.projectId) return false;
        if (filters.goalId && issue.goalId !== filters.goalId) return false;
        if (filters.parentId && issue.parentId !== filters.parentId) return false;
        return true;
      });
    }

    return issues;
  }

  async updateIssue(id: string, input: UpdateIssueInput): Promise<Issue> {
    const projectId = input.projectId ?? this.defaultProjectId;
    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) updateData.name = input.title;
    if (input.description !== undefined) updateData.description_html = input.description;
    if (input.priority !== undefined) updateData.priority = this.mapPriorityToPlane(input.priority);
    if (input.status !== undefined) updateData.state = await this.getOrCreateStateId(input.status);
    if (input.assigneeId !== undefined) updateData.assignees = input.assigneeId ? [input.assigneeId] : [];

    const planeIssue = await this.client.patch<PlaneIssue>(
      `/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${id}/`,
      updateData,
    );

    return this.mapIssue(planeIssue, projectId);
  }

  async deleteIssue(id: string): Promise<void> {
    await this.client.delete(
      `/workspaces/${this.workspaceSlug}/projects/${this.defaultProjectId}/issues/${id}/`,
    );
  }

  async listDependencies(_issueId: string): Promise<DependencyInfo[]> {
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
          eq(issueAgentComments.agentName, agentName),
        ),
      )
      .orderBy(desc(issueAgentComments.createdAt))
      .limit(1);

    return row ? this.mapAgentComment(row) : null;
  }

  private mapIssue(planeIssue: PlaneIssue, projectId: string): Issue {
    return {
      id: planeIssue.id,
      title: planeIssue.name,
      description: planeIssue.description_html,
      status: planeIssue.state,
      priority: planeIssue.priority,
      assigneeId: planeIssue.assignees[0],
      projectId,
      backendType: 'plane',
      externalId: planeIssue.id,
      externalMetadata: {
        planeProjectId: projectId,
        planeStateId: planeIssue.state,
      },
      createdAt: new Date(planeIssue.created_at),
      updatedAt: new Date(planeIssue.updated_at),
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

  private mapPriorityToPlane(priority: string): 'none' | 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap: Record<string, 'none' | 'low' | 'medium' | 'high' | 'urgent'> = {
      none: 'none',
      low: 'low',
      medium: 'medium',
      high: 'high',
      urgent: 'urgent',
    };
    return priorityMap[priority] ?? 'medium';
  }

  private async getOrCreateStateId(status: string): Promise<string> {
    if (this.stateCache.has(status)) {
      return this.stateCache.get(status)!;
    }

    try {
      const states = await this.client.get<PlaneState[]>(
        `/workspaces/${this.workspaceSlug}/projects/${this.defaultProjectId}/states/`,
      );

      const matchingState = states.find(s => s.name.toLowerCase() === status.toLowerCase());
      if (matchingState) {
        this.stateCache.set(status, matchingState.id);
        return matchingState.id;
      }

      const defaultState = states.find(s => s.group === 'backlog') ?? states[0];
      if (defaultState) {
        this.stateCache.set(status, defaultState.id);
        return defaultState.id;
      }
    } catch (error) {
      console.error('Failed to fetch states:', error);
    }

    return status;
  }
}

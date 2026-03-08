export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  backendType: 'paperclip' | 'plane';
  externalId?: string;
  externalMetadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
}

export interface IssueFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
}

export interface DependencyInfo {
  id: string;
  issueId: string;
  dependsOnIssueId: string;
  type: 'blocks' | 'blocked_by';
}

export interface TaskBackend {
  readonly name: string;
  createIssue(input: CreateIssueInput): Promise<Issue>;
  getIssue(id: string): Promise<Issue | null>;
  listIssues(filters?: IssueFilters): Promise<Issue[]>;
  updateIssue(id: string, input: UpdateIssueInput): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;
  listDependencies(issueId: string): Promise<DependencyInfo[]>;
}

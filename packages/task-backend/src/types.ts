export enum IssueStatus {
  todo = 'todo',
  in_progress = 'in_progress',
  in_review = 'in_review',
  done = 'done',
}

export enum IssuePriority {
  none = 'none',
  low = 'low',
  medium = 'medium',
  high = 'high',
}

export enum DependencyType {
  blocks = 'blocks',
  blocked_by = 'blocked_by',
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: Date;
  updatedAt: Date;
  backendType: string;
  externalId?: string;
  externalMetadata?: Record<string, unknown>;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
}

export interface IssueFilters {
  status?: IssueStatus;
  priority?: IssuePriority;
  search?: string;
}

export interface DependencyInfo {
  issueId: string;
  dependsOnIssueId: string;
  type: DependencyType;
}

export interface TaskBackend {
  createIssue(input: CreateIssueInput): Promise<Issue>;
  getIssue(id: string): Promise<Issue | null>;
  listIssues(filters?: IssueFilters): Promise<Issue[]>;
  updateIssue(id: string, input: UpdateIssueInput): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;
  listDependencies(issueId: string): Promise<DependencyInfo[]>;
}

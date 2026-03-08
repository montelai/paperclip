import { describe, it, expect } from 'vitest';
import {
  IssueStatus,
  IssuePriority,
  DependencyType,
  type Issue,
  type CreateIssueInput,
  type UpdateIssueInput,
  type IssueFilters,
  type DependencyInfo,
  type TaskBackend,
} from './types.js';

describe('IssueStatus enum', () => {
  it('should have todo status', () => {
    expect(IssueStatus.todo).toBe('todo');
  });

  it('should have in_progress status', () => {
    expect(IssueStatus.in_progress).toBe('in_progress');
  });

  it('should have in_review status', () => {
    expect(IssueStatus.in_review).toBe('in_review');
  });

  it('should have done status', () => {
    expect(IssueStatus.done).toBe('done');
  });
});

describe('IssuePriority enum', () => {
  it('should have none priority', () => {
    expect(IssuePriority.none).toBe('none');
  });

  it('should have low priority', () => {
    expect(IssuePriority.low).toBe('low');
  });

  it('should have medium priority', () => {
    expect(IssuePriority.medium).toBe('medium');
  });

  it('should have high priority', () => {
    expect(IssuePriority.high).toBe('high');
  });
});

describe('DependencyType enum', () => {
  it('should have blocks type', () => {
    expect(DependencyType.blocks).toBe('blocks');
  });

  it('should have blocked_by type', () => {
    expect(DependencyType.blocked_by).toBe('blocked_by');
  });
});

describe('Type definitions', () => {
  it('should create a valid Issue object', () => {
    const issue: Issue = {
      id: 'test-1',
      title: 'Test Issue',
      description: 'Test description',
      status: IssueStatus.todo,
      priority: IssuePriority.medium,
      createdAt: new Date(),
      updatedAt: new Date(),
      backendType: 'test',
    };
    expect(issue.id).toBe('test-1');
    expect(issue.status).toBe(IssueStatus.todo);
  });

  it('should create a valid CreateIssueInput object', () => {
    const input: CreateIssueInput = {
      title: 'New Issue',
      description: 'Description',
      status: IssueStatus.todo,
      priority: IssuePriority.high,
    };
    expect(input.title).toBe('New Issue');
  });

  it('should create a valid UpdateIssueInput object', () => {
    const input: UpdateIssueInput = {
      status: IssueStatus.done,
    };
    expect(input.status).toBe(IssueStatus.done);
  });

  it('should create a valid IssueFilters object', () => {
    const filters: IssueFilters = {
      status: IssueStatus.in_progress,
      priority: IssuePriority.high,
      search: 'test',
    };
    expect(filters.search).toBe('test');
  });

  it('should create a valid DependencyInfo object', () => {
    const dep: DependencyInfo = {
      issueId: 'issue-1',
      dependsOnIssueId: 'issue-2',
      type: DependencyType.blocks,
    };
    expect(dep.type).toBe(DependencyType.blocks);
  });

  it('should define TaskBackend interface methods', () => {
    const mockBackend: TaskBackend = {
      createIssue: async (input: CreateIssueInput) => ({
        id: '1',
        title: input.title,
        description: input.description,
        status: input.status || IssueStatus.todo,
        priority: input.priority || IssuePriority.none,
        createdAt: new Date(),
        updatedAt: new Date(),
        backendType: 'mock',
      }),
      getIssue: async (id: string) => null,
      listIssues: async (filters?: IssueFilters) => [],
      updateIssue: async (id: string, input: UpdateIssueInput) => ({
        id,
        title: 'Updated',
        status: IssueStatus.done,
        priority: IssuePriority.none,
        createdAt: new Date(),
        updatedAt: new Date(),
        backendType: 'mock',
      }),
      deleteIssue: async (id: string) => {},
      listDependencies: async (issueId: string) => [],
    };
    expect(typeof mockBackend.createIssue).toBe('function');
    expect(typeof mockBackend.getIssue).toBe('function');
  });
});

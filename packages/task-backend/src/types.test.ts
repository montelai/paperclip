import { describe, it, expect } from 'vitest';
import {
  type Issue,
  type CreateIssueInput,
  type UpdateIssueInput,
  type IssueFilters,
  type DependencyInfo,
  type TaskBackend,
} from './types.js';

describe('Type definitions', () => {
  it('should create a valid Issue object', () => {
    const issue: Issue = {
      id: 'test-1',
      title: 'Test Issue',
      description: 'Test description',
      status: 'todo',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      backendType: 'paperclip',
    };
    expect(issue.id).toBe('test-1');
    expect(issue.status).toBe('todo');
  });

  it('should create a valid CreateIssueInput object', () => {
    const input: CreateIssueInput = {
      title: 'New Issue',
      description: 'Description',
      status: 'todo',
      priority: 'high',
    };
    expect(input.title).toBe('New Issue');
  });

  it('should create a valid UpdateIssueInput object', () => {
    const input: UpdateIssueInput = {
      status: 'done',
    };
    expect(input.status).toBe('done');
  });

  it('should create a valid IssueFilters object', () => {
    const filters: IssueFilters = {
      status: 'in_progress',
      priority: 'high',
    };
    expect(filters.status).toBe('in_progress');
  });

  it('should create a valid DependencyInfo object', () => {
    const dep: DependencyInfo = {
      id: 'dep-1',
      issueId: 'issue-1',
      dependsOnIssueId: 'issue-2',
      type: 'blocks',
    };
    expect(dep.type).toBe('blocks');
  });

  it('should define TaskBackend interface methods', () => {
    const mockBackend: TaskBackend = {
      name: 'mock',
      createIssue: async (input: CreateIssueInput) => ({
        id: '1',
        title: input.title,
        description: input.description,
        status: input.status || 'todo',
        priority: input.priority || 'none',
        backendType: 'paperclip',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getIssue: async (id: string) => null,
      listIssues: async (filters?: IssueFilters) => [],
      updateIssue: async (id: string, input: UpdateIssueInput) => ({
        id,
        title: 'Updated',
        status: 'done',
        priority: 'none',
        backendType: 'paperclip',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      deleteIssue: async (id: string) => {},
      listDependencies: async (issueId: string) => [],
      createAgentComment: async () => ({
        id: 'comment-1',
        issueId: 'issue-1',
        agentName: 'test-agent',
        content: 'Test comment',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      listAgentComments: async () => [],
      getLatestAgentComment: async () => null,
    };
    expect(typeof mockBackend.createIssue).toBe('function');
    expect(typeof mockBackend.getIssue).toBe('function');
    expect(mockBackend.name).toBe('mock');
  });
});

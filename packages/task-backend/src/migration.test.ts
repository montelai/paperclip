import { describe, it, expect, vi } from 'vitest';
import { migrateIssues } from './migration.js';
import type { TaskBackend, Issue, CreateIssueInput } from './types.js';

function createMockBackend(issues: Issue[] = []): TaskBackend {
  const storedIssues = [...issues];
  
  return {
    name: 'mock-backend',
    createIssue: vi.fn(async (input: CreateIssueInput): Promise<Issue> => {
      const issue: Issue = {
        id: `issue-${storedIssues.length + 1}`,
        title: input.title,
        description: input.description,
        status: input.status || 'open',
        priority: input.priority || 'medium',
        assigneeId: input.assigneeId,
        projectId: input.projectId,
        goalId: input.goalId,
        parentId: input.parentId,
        backendType: 'paperclip',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      storedIssues.push(issue);
      return issue;
    }),
    getIssue: vi.fn(async (id: string) => storedIssues.find(i => i.id === id) || null),
    listIssues: vi.fn(async () => [...storedIssues]),
    updateIssue: vi.fn(async (id: string, input) => {
      const issue = storedIssues.find(i => i.id === id);
      if (!issue) throw new Error('Issue not found');
      Object.assign(issue, input, { updatedAt: new Date() });
      return issue;
    }),
    deleteIssue: vi.fn(async (id: string) => {
      const index = storedIssues.findIndex(i => i.id === id);
      if (index >= 0) storedIssues.splice(index, 1);
    }),
    listDependencies: vi.fn(async () => []),
    createAgentComment: vi.fn(async () => ({
      id: 'comment-1',
      issueId: 'issue-1',
      agentName: 'test-agent',
      content: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    listAgentComments: vi.fn(async () => []),
    getLatestAgentComment: vi.fn(async () => null),
  };
}

function createTestIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: `issue-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Issue',
    description: 'Test description',
    status: 'open',
    priority: 'medium',
    backendType: 'paperclip',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('migrateIssues', () => {
  it('should perform dry run without creating issues', async () => {
    const issues = [
      createTestIssue({ id: 'issue-1', title: 'Issue 1' }),
      createTestIssue({ id: 'issue-2', title: 'Issue 2' }),
    ];
    const sourceBackend = createMockBackend(issues);
    const targetBackend = createMockBackend([]);
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: true,
    });
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(targetBackend.createIssue).not.toHaveBeenCalled();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should successfully migrate all issues', async () => {
    const issues = [
      createTestIssue({ id: 'issue-1', title: 'Issue 1', description: 'Desc 1', status: 'open', priority: 'high' }),
      createTestIssue({ id: 'issue-2', title: 'Issue 2', description: 'Desc 2', status: 'in_progress', priority: 'low' }),
    ];
    const sourceBackend = createMockBackend(issues);
    const targetBackend = createMockBackend([]);
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
    });
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(targetBackend.createIssue).toHaveBeenCalledTimes(2);
    expect(targetBackend.createIssue).toHaveBeenCalledWith({
      title: 'Issue 1',
      description: 'Desc 1',
      status: 'open',
      priority: 'high',
      assigneeId: undefined,
      projectId: undefined,
      goalId: undefined,
      parentId: undefined,
    });
    expect(targetBackend.createIssue).toHaveBeenCalledWith({
      title: 'Issue 2',
      description: 'Desc 2',
      status: 'in_progress',
      priority: 'low',
      assigneeId: undefined,
      projectId: undefined,
      goalId: undefined,
      parentId: undefined,
    });
  });

  it('should handle errors during migration', async () => {
    const issues = [
      createTestIssue({ id: 'issue-1', title: 'Issue 1' }),
      createTestIssue({ id: 'issue-2', title: 'Issue 2' }),
    ];
    const sourceBackend = createMockBackend(issues);
    const targetBackend = createMockBackend([]);
    
    (targetBackend.createIssue as any).mockImplementation(async (input: CreateIssueInput) => {
      if (input.title === 'Issue 2') {
        throw new Error('Failed to create issue');
      }
      return createTestIssue({ title: input.title });
    });
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
    });
    
    expect(result.success).toBe(false);
    expect(result.migrated).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      issueId: 'issue-2',
      error: 'Failed to create issue',
    });
  });

  it('should process issues in batches', async () => {
    const issues = [
      createTestIssue({ id: 'issue-1' }),
      createTestIssue({ id: 'issue-2' }),
      createTestIssue({ id: 'issue-3' }),
      createTestIssue({ id: 'issue-4' }),
      createTestIssue({ id: 'issue-5' }),
    ];
    const sourceBackend = createMockBackend(issues);
    const targetBackend = createMockBackend([]);
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
      batchSize: 2,
    });
    
    expect(result.migrated).toBe(5);
    expect(targetBackend.createIssue).toHaveBeenCalledTimes(5);
  });

  it('should call progress callback during migration', async () => {
    const issues = [
      createTestIssue({ id: 'issue-1' }),
      createTestIssue({ id: 'issue-2' }),
      createTestIssue({ id: 'issue-3' }),
    ];
    const sourceBackend = createMockBackend(issues);
    const targetBackend = createMockBackend([]);
    const onProgress = vi.fn();
    
    await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
      batchSize: 2,
      onProgress,
    });
    
    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenNthCalledWith(1, 2, 3);
    expect(onProgress).toHaveBeenNthCalledWith(2, 3, 3);
  });

  it('should migrate issues with all optional fields', async () => {
    const issue = createTestIssue({
      id: 'issue-1',
      title: 'Complex Issue',
      description: 'Description',
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'assignee-123',
      projectId: 'project-456',
      goalId: 'goal-789',
      parentId: 'parent-000',
    });
    const sourceBackend = createMockBackend([issue]);
    const targetBackend = createMockBackend([]);
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
    });
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(1);
    expect(targetBackend.createIssue).toHaveBeenCalledWith({
      title: 'Complex Issue',
      description: 'Description',
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'assignee-123',
      projectId: 'project-456',
      goalId: 'goal-789',
      parentId: 'parent-000',
    });
  });

  it('should handle empty source backend', async () => {
    const sourceBackend = createMockBackend([]);
    const targetBackend = createMockBackend([]);
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
    });
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(targetBackend.createIssue).not.toHaveBeenCalled();
  });

  it('should handle non-Error errors', async () => {
    const issues = [createTestIssue({ id: 'issue-1' })];
    const sourceBackend = createMockBackend(issues);
    const targetBackend = createMockBackend([]);
    
    (targetBackend.createIssue as any).mockImplementation(async () => {
      throw 'String error';
    });
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
    });
    
    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toEqual({
      issueId: 'issue-1',
      error: 'String error',
    });
  });

  it('should report duration', async () => {
    const issues = [createTestIssue({ id: 'issue-1' })];
    const sourceBackend = createMockBackend(issues);
    const targetBackend = createMockBackend([]);
    
    const result = await migrateIssues({
      sourceBackend,
      targetBackend,
      dryRun: false,
    });
    
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(typeof result.duration).toBe('number');
  });
});

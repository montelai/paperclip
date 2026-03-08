import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Db } from '@paperclipai/db';
import { PaperclipBackend } from './paperclip.js';
import type { CreateIssueInput, UpdateIssueInput, IssueFilters } from '../types.js';

describe('PaperclipBackend', () => {
  let backend: PaperclipBackend;
  let mockDb: Db;
  let issuesStore: Map<string, any>;

  beforeEach(() => {
    issuesStore = new Map();
    mockDb = createMockDb(issuesStore);
    backend = new PaperclipBackend(mockDb, 'test-company-id');
  });

  describe('createIssue', () => {
    it('creates an issue with required fields', async () => {
      const input: CreateIssueInput = {
        title: 'Test Issue',
      };

      const issue = await backend.createIssue(input);

      expect(issue.title).toBe('Test Issue');
      expect(issue.status).toBe('backlog');
      expect(issue.priority).toBe('medium');
      expect(issue.backendType).toBe('paperclip');
      expect(issue.id).toBeDefined();
      expect(issue.createdAt).toBeInstanceOf(Date);
      expect(issue.updatedAt).toBeInstanceOf(Date);
    });

    it('creates an issue with all optional fields', async () => {
      const input: CreateIssueInput = {
        title: 'Test Issue',
        description: 'Test description',
        status: 'in_progress',
        priority: 'high',
        assigneeId: 'agent-123',
        projectId: 'project-456',
        goalId: 'goal-789',
        parentId: 'parent-001',
      };

      const issue = await backend.createIssue(input);

      expect(issue.title).toBe('Test Issue');
      expect(issue.description).toBe('Test description');
      expect(issue.status).toBe('in_progress');
      expect(issue.priority).toBe('high');
      expect(issue.assigneeId).toBe('agent-123');
      expect(issue.projectId).toBe('project-456');
      expect(issue.goalId).toBe('goal-789');
      expect(issue.parentId).toBe('parent-001');
    });
  });

  describe('name property', () => {
    it('returns paperclip as backend name', () => {
      expect(backend.name).toBe('paperclip');
    });
  });
});

function createMockDb(issuesStore: Map<string, any>): Db {
  let currentId = 1;

  const generateId = () => {
    return `issue-${currentId++}-${Date.now()}`;
  };

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockImplementation((data: any) => ({
      returning: vi.fn().mockImplementation(async () => {
        const id = generateId();
        const issue = {
          id,
          companyId: data.companyId,
          projectId: data.projectId || null,
          goalId: data.goalId || null,
          parentId: data.parentId || null,
          title: data.title,
          description: data.description || null,
          status: data.status || 'backlog',
          priority: data.priority || 'medium',
          assigneeAgentId: data.assigneeAgentId || null,
          assigneeUserId: data.assigneeUserId || null,
          backendType: data.backendType || 'paperclip',
          externalId: data.externalId || null,
          externalMetadata: data.externalMetadata || null,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
        };
        issuesStore.set(id, issue);
        return [issue];
      }),
    })),
  });

  return {
    insert: mockInsert,
  } as any;
}

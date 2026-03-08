import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaneBackend } from './plane.js';
import type { Db } from '@paperclipai/db';
import { issueAgentComments } from '@paperclipai/db';

vi.stubGlobal('fetch', vi.fn());

const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as Db;

const mockFetch = vi.mocked(fetch);

function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
  } as Response;
}

describe('PlaneBackend', () => {
  let backend: PlaneBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new PlaneBackend(
      mockDb,
      'https://api.plane.so/api/v1',
      'test-api-key',
      'test-workspace',
      'default-project-id',
    );
  });

  describe('createIssue', () => {
    it('should create an issue in Plane', async () => {
      const mockPlaneIssue = {
        id: 'plane-issue-1',
        name: 'Test Issue',
        description_html: '<p>Test description</p>',
        state: 'state-1',
        priority: 'medium' as const,
        assignees: ['user-1'],
        project: 'project-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse([]))
        .mockResolvedValueOnce(createMockResponse(mockPlaneIssue));

      const issue = await backend.createIssue({
        title: 'Test Issue',
        description: '<p>Test description</p>',
        priority: 'medium',
        assigneeId: 'user-1',
        projectId: 'project-1',
      });

      expect(issue.id).toBe('plane-issue-1');
      expect(issue.title).toBe('Test Issue');
      expect(issue.description).toBe('<p>Test description</p>');
      expect(issue.priority).toBe('medium');
      expect(issue.assigneeId).toBe('user-1');
      expect(issue.backendType).toBe('plane');
      expect(issue.externalId).toBe('plane-issue-1');
      expect(issue.externalMetadata).toEqual({
        planeProjectId: 'project-1',
        planeStateId: 'state-1',
      });
    });

    it('should use default project if not specified', async () => {
      const mockPlaneIssue = {
        id: 'plane-issue-2',
        name: 'Test Issue 2',
        description_html: undefined,
        state: 'state-2',
        priority: 'high' as const,
        assignees: [],
        project: 'default-project-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse([]))
        .mockResolvedValueOnce(createMockResponse(mockPlaneIssue));

      const issue = await backend.createIssue({
        title: 'Test Issue 2',
      });

      expect(issue.projectId).toBe('default-project-id');
    });
  });

  describe('getIssue', () => {
    it('should get an issue by ID', async () => {
      const mockPlaneIssue = {
        id: 'plane-issue-3',
        name: 'Test Issue 3',
        description_html: 'Description',
        state: 'state-3',
        priority: 'low' as const,
        assignees: [],
        project: 'default-project-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockPlaneIssue));

      const issue = await backend.getIssue('plane-issue-3');

      expect(issue).not.toBeNull();
      expect(issue?.id).toBe('plane-issue-3');
      expect(issue?.title).toBe('Test Issue 3');
    });

    it('should return null if issue not found', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 404));

      const issue = await backend.getIssue('non-existent');

      expect(issue).toBeNull();
    });
  });

  describe('listIssues', () => {
    it('should list all issues', async () => {
      const mockPlaneIssues = [
        {
          id: 'plane-issue-4',
          name: 'Issue 1',
          description_html: 'Desc 1',
          state: 'state-1',
          priority: 'high' as const,
          assignees: [],
          project: 'default-project-id',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'plane-issue-5',
          name: 'Issue 2',
          description_html: 'Desc 2',
          state: 'state-2',
          priority: 'medium' as const,
          assignees: ['user-1'],
          project: 'default-project-id',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(mockPlaneIssues));

      const issues = await backend.listIssues();

      expect(issues).toHaveLength(2);
      expect(issues[0].id).toBe('plane-issue-4');
      expect(issues[1].id).toBe('plane-issue-5');
    });

    it('should filter issues by priority', async () => {
      const mockPlaneIssues = [
        {
          id: 'plane-issue-6',
          name: 'High Priority Issue',
          description_html: 'Desc',
          state: 'state-1',
          priority: 'high' as const,
          assignees: [],
          project: 'default-project-id',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'plane-issue-7',
          name: 'Low Priority Issue',
          description_html: 'Desc',
          state: 'state-2',
          priority: 'low' as const,
          assignees: [],
          project: 'default-project-id',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(mockPlaneIssues));

      const issues = await backend.listIssues({ priority: 'high' });

      expect(issues).toHaveLength(1);
      expect(issues[0].priority).toBe('high');
    });
  });

  describe('updateIssue', () => {
    it('should update an issue', async () => {
      const mockPlaneIssue = {
        id: 'plane-issue-8',
        name: 'Updated Title',
        description_html: 'Updated Description',
        state: 'state-1',
        priority: 'urgent' as const,
        assignees: ['user-2'],
        project: 'default-project-id',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockPlaneIssue));

      const issue = await backend.updateIssue('plane-issue-8', {
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'urgent',
        assigneeId: 'user-2',
      });

      expect(issue.title).toBe('Updated Title');
      expect(issue.description).toBe('Updated Description');
      expect(issue.priority).toBe('urgent');
      expect(issue.assigneeId).toBe('user-2');
    });
  });

  describe('deleteIssue', () => {
    it('should delete an issue', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 204));

      await expect(backend.deleteIssue('plane-issue-9')).resolves.not.toThrow();
    });
  });

  describe('listDependencies', () => {
    it('should return empty array (not implemented)', async () => {
      const deps = await backend.listDependencies('issue-1');
      expect(deps).toEqual([]);
    });
  });

  describe('createAgentComment', () => {
    it('should create an agent comment in Paperclip DB', async () => {
      const mockComment = {
        id: 'comment-1',
        issueId: 'issue-1',
        agentName: 'test-agent',
        content: 'Test comment',
        metadata: { progress: 50 },
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockComment]),
        }),
      });

      (mockDb as any).insert = mockInsert;

      const comment = await backend.createAgentComment('issue-1', {
        agentName: 'test-agent',
        content: 'Test comment',
        metadata: { progress: 50 },
      });

      expect(comment.id).toBe('comment-1');
      expect(comment.agentName).toBe('test-agent');
      expect(comment.content).toBe('Test comment');
      expect(comment.metadata).toEqual({ progress: 50 });
    });
  });

  describe('listAgentComments', () => {
    it('should list agent comments', async () => {
      const mockComments = [
        {
          id: 'comment-2',
          issueId: 'issue-2',
          agentName: 'agent-1',
          content: 'Comment 1',
          metadata: null,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        },
        {
          id: 'comment-3',
          issueId: 'issue-2',
          agentName: 'agent-2',
          content: 'Comment 2',
          metadata: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockComments),
          }),
        }),
      });

      (mockDb as any).select = mockSelect;

      const comments = await backend.listAgentComments('issue-2');

      expect(comments).toHaveLength(2);
    });

    it('should filter by agent name', async () => {
      const mockComments = [
        {
          id: 'comment-4',
          issueId: 'issue-3',
          agentName: 'agent-1',
          content: 'Comment',
          metadata: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockComments),
          }),
        }),
      });

      (mockDb as any).select = mockSelect;

      const comments = await backend.listAgentComments('issue-3', 'agent-1');

      expect(comments).toHaveLength(1);
      expect(comments[0].agentName).toBe('agent-1');
    });
  });

  describe('getLatestAgentComment', () => {
    it('should get the latest comment for an agent', async () => {
      const mockComment = {
        id: 'comment-5',
        issueId: 'issue-4',
        agentName: 'agent-1',
        content: 'Latest comment',
        metadata: { statusUpdate: 'in_progress' },
        createdAt: new Date('2024-01-03T00:00:00Z'),
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockComment]),
            }),
          }),
        }),
      });

      (mockDb as any).select = mockSelect;

      const comment = await backend.getLatestAgentComment('issue-4', 'agent-1');

      expect(comment).not.toBeNull();
      expect(comment?.id).toBe('comment-5');
      expect(comment?.content).toBe('Latest comment');
    });

    it('should return null if no comments found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      (mockDb as any).select = mockSelect;

      const comment = await backend.getLatestAgentComment('issue-5', 'agent-1');

      expect(comment).toBeNull();
    });
  });
});

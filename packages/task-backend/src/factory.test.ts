import { describe, it, expect } from 'vitest';
import { createTaskBackend, PlaneConfigValidationError } from './factory.js';
import { PaperclipBackend } from './backends/paperclip.js';
import { PlaneBackend } from './backends/plane.js';
import type { Db } from '@paperclipai/db';

const mockDb = {} as Db;
const companyId = 'test-company-id';

describe('createTaskBackend', () => {
  it('should create PaperclipBackend for paperclip type', () => {
    const backend = createTaskBackend({ type: 'paperclip' }, mockDb, companyId);
    expect(backend).toBeInstanceOf(PaperclipBackend);
    expect(backend.name).toBe('paperclip');
  });

  it('should create PlaneBackend for plane type with config', () => {
    const backend = createTaskBackend(
      {
        type: 'plane',
        plane: {
          apiUrl: 'https://api.plane.so',
          apiKey: 'test-key',
          workspaceSlug: 'workspace',
          defaultProjectId: 'project-123',
        },
      },
      mockDb,
      companyId,
    );
    expect(backend).toBeInstanceOf(PlaneBackend);
    expect(backend.name).toBe('plane');
  });

  it('should throw error for plane type without config', () => {
    expect(() => 
      createTaskBackend({ type: 'plane' }, mockDb, companyId)
    ).toThrow('Plane config required for plane backend');
  });

  it('should throw error for unknown type', () => {
    expect(() => 
      createTaskBackend({ type: 'unknown' } as any, mockDb, companyId)
    ).toThrow('Unknown backend type: unknown');
  });

  it('should throw PlaneConfigValidationError when apiKey is empty', () => {
    expect(() =>
      createTaskBackend(
        {
          type: 'plane',
          plane: {
            apiUrl: 'https://api.plane.so',
            apiKey: '',
            workspaceSlug: 'workspace',
            defaultProjectId: 'project-123',
          },
        },
        mockDb,
        companyId,
      )
    ).toThrow(PlaneConfigValidationError);
  });

  it('should throw PlaneConfigValidationError when workspaceSlug is empty', () => {
    expect(() =>
      createTaskBackend(
        {
          type: 'plane',
          plane: {
            apiUrl: 'https://api.plane.so',
            apiKey: 'test-key',
            workspaceSlug: '',
            defaultProjectId: 'project-123',
          },
        },
        mockDb,
        companyId,
      )
    ).toThrow(PlaneConfigValidationError);
  });

  it('should throw PlaneConfigValidationError when defaultProjectId is empty', () => {
    expect(() =>
      createTaskBackend(
        {
          type: 'plane',
          plane: {
            apiUrl: 'https://api.plane.so',
            apiKey: 'test-key',
            workspaceSlug: 'workspace',
            defaultProjectId: '',
          },
        },
        mockDb,
        companyId,
      )
    ).toThrow(PlaneConfigValidationError);
  });

  it('should include all missing fields in error message', () => {
    expect(() =>
      createTaskBackend(
        {
          type: 'plane',
          plane: {
            apiUrl: 'https://api.plane.so',
            apiKey: '',
            workspaceSlug: '',
            defaultProjectId: '',
          },
        },
        mockDb,
        companyId,
      )
    ).toThrow('apiKey, workspaceSlug, defaultProjectId');
  });
});

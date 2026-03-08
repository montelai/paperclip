import { describe, it, expect } from 'vitest';
import { parseTaskBackendConfig } from './config.js';

describe('parseTaskBackendConfig', () => {
  it('should return paperclip config by default', () => {
    const config = parseTaskBackendConfig({});
    expect(config.type).toBe('paperclip');
    expect(config.plane).toBeUndefined();
  });

  it('should return paperclip config when explicitly set', () => {
    const config = parseTaskBackendConfig({ TASK_BACKEND_TYPE: 'paperclip' });
    expect(config.type).toBe('paperclip');
    expect(config.plane).toBeUndefined();
  });

  it('should parse plane config from environment', () => {
    const config = parseTaskBackendConfig({
      TASK_BACKEND_TYPE: 'plane',
      PLANE_API_URL: 'https://api.plane.so',
      PLANE_API_KEY: 'test-key',
      PLANE_WORKSPACE_SLUG: 'my-workspace',
      PLANE_DEFAULT_PROJECT_ID: 'project-123',
    });
    
    expect(config.type).toBe('plane');
    expect(config.plane).toEqual({
      apiUrl: 'https://api.plane.so',
      apiKey: 'test-key',
      workspaceSlug: 'my-workspace',
      defaultProjectId: 'project-123',
    });
  });

  it('should use default values for plane config if not provided', () => {
    const config = parseTaskBackendConfig({
      TASK_BACKEND_TYPE: 'plane',
    });
    
    expect(config.type).toBe('plane');
    expect(config.plane).toEqual({
      apiUrl: 'https://api.plane.so',
      apiKey: '',
      workspaceSlug: '',
      defaultProjectId: '',
    });
  });

  it('should use partial plane config if some values are provided', () => {
    const config = parseTaskBackendConfig({
      TASK_BACKEND_TYPE: 'plane',
      PLANE_API_URL: 'https://custom.plane.so',
      PLANE_API_KEY: 'custom-key',
    });
    
    expect(config.type).toBe('plane');
    expect(config.plane).toEqual({
      apiUrl: 'https://custom.plane.so',
      apiKey: 'custom-key',
      workspaceSlug: '',
      defaultProjectId: '',
    });
  });
});

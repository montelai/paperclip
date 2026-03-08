export interface TaskBackendConfig {
  type: 'paperclip' | 'plane';
  plane?: {
    apiUrl: string;
    apiKey: string;
    workspaceSlug: string;
    defaultProjectId: string;
  };
}

export function parseTaskBackendConfig(env: Record<string, string | undefined>): TaskBackendConfig {
  const type = (env.TASK_BACKEND_TYPE as 'paperclip' | 'plane') ?? 'paperclip';
  
  if (type === 'plane') {
    return {
      type: 'plane',
      plane: {
        apiUrl: env.PLANE_API_URL ?? 'https://api.plane.so',
        apiKey: env.PLANE_API_KEY ?? '',
        workspaceSlug: env.PLANE_WORKSPACE_SLUG ?? '',
        defaultProjectId: env.PLANE_DEFAULT_PROJECT_ID ?? '',
      },
    };
  }
  
  return { type: 'paperclip' };
}

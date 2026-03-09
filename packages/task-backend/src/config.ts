export interface TaskBackendConfig {
  type: 'paperclip' | 'plane';
  plane?: {
    apiUrl: string;
    apiKey: string;
    workspaceSlug: string;
    defaultProjectId: string;
  };
}

const VALID_BACKEND_TYPES = ['paperclip', 'plane'] as const;
type BackendType = (typeof VALID_BACKEND_TYPES)[number];

export class InvalidBackendTypeError extends Error {
  constructor(readonly invalidType: string) {
    super(`Invalid TASK_BACKEND_TYPE: "${invalidType}". Must be one of: ${VALID_BACKEND_TYPES.join(', ')}`);
    this.name = 'InvalidBackendTypeError';
  }
}

export function parseTaskBackendConfig(env: Record<string, string | undefined>): TaskBackendConfig {
  const rawType = env.TASK_BACKEND_TYPE;
  
  if (rawType !== undefined && !VALID_BACKEND_TYPES.includes(rawType as BackendType)) {
    throw new InvalidBackendTypeError(rawType);
  }
  
  const type = (rawType as BackendType) ?? 'paperclip';
  
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

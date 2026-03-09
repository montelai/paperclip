import type { Db } from '@paperclipai/db';
import type { TaskBackend } from './types.js';
import type { TaskBackendConfig } from './config.js';
import { PaperclipBackend } from './backends/paperclip.js';
import { PlaneBackend } from './backends/plane.js';

export class PlaneConfigValidationError extends Error {
  constructor(readonly missingFields: string[]) {
    super(`Plane backend requires non-empty values for: ${missingFields.join(', ')}`);
    this.name = 'PlaneConfigValidationError';
  }
}

export function createTaskBackend(
  config: TaskBackendConfig,
  db: Db,
  companyId: string,
): TaskBackend {
  switch (config.type) {
    case 'paperclip':
      return new PaperclipBackend(db, companyId);
    case 'plane':
      if (!config.plane) throw new Error('Plane config required for plane backend');
      
      const missingFields: string[] = [];
      if (!config.plane.apiKey) missingFields.push('apiKey');
      if (!config.plane.workspaceSlug) missingFields.push('workspaceSlug');
      if (!config.plane.defaultProjectId) missingFields.push('defaultProjectId');
      
      if (missingFields.length > 0) {
        throw new PlaneConfigValidationError(missingFields);
      }
      
      return new PlaneBackend(
        db,
        config.plane.apiUrl,
        config.plane.apiKey,
        config.plane.workspaceSlug,
        config.plane.defaultProjectId,
      );
    default:
      throw new Error(`Unknown backend type: ${(config as { type: string }).type}`);
  }
}

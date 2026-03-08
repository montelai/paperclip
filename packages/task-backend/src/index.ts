export type {
  Issue,
  CreateIssueInput,
  UpdateIssueInput,
  IssueFilters,
  DependencyInfo,
  IssueAgentComment,
  CreateAgentCommentInput,
  TaskBackend,
} from './types.js';

export type { TaskBackendConfig } from './config.js';
export { parseTaskBackendConfig, InvalidBackendTypeError } from './config.js';

export { createTaskBackend, PlaneConfigValidationError } from './factory.js';

export { PaperclipBackend } from './backends/paperclip.js';
export { PlaneBackend } from './backends/plane.js';

export type { MigrationOptions, MigrationResult } from './migration.js';
export { migrateIssues } from './migration.js';

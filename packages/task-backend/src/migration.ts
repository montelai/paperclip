import type { TaskBackend, Issue } from './types.js';

export interface MigrationOptions {
  sourceBackend: TaskBackend;
  targetBackend: TaskBackend;
  dryRun?: boolean;
  batchSize?: number;
  onProgress?: (current: number, total: number) => void;
}

export interface MigrationResult {
  success: boolean;
  migrated: number;
  failed: number;
  errors: Array<{ issueId: string; error: string }>;
  duration: number;
}

export async function migrateIssues(options: MigrationOptions): Promise<MigrationResult> {
  const { sourceBackend, targetBackend, dryRun = false, batchSize = 10, onProgress } = options;
  
  const startTime = Date.now();
  const errors: MigrationResult['errors'] = [];
  let migrated = 0;
  let failed = 0;
  
  const issues = await sourceBackend.listIssues();
  const total = issues.length;
  
  for (let i = 0; i < issues.length; i += batchSize) {
    const batch = issues.slice(i, i + batchSize);
    
    for (const issue of batch) {
      try {
        if (!dryRun) {
          await targetBackend.createIssue({
            title: issue.title,
            description: issue.description,
            status: issue.status,
            priority: issue.priority,
            assigneeId: issue.assigneeId,
            projectId: issue.projectId,
            goalId: issue.goalId,
            parentId: issue.parentId,
          });
        }
        migrated++;
      } catch (error) {
        failed++;
        errors.push({
          issueId: issue.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    onProgress?.(Math.min(i + batchSize, total), total);
  }
  
  return { success: failed === 0, migrated, failed, errors, duration: Date.now() - startTime };
}

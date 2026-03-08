# Task Backend User Guide

This guide covers how to use the task backend system in Paperclip.

## Table of Contents

- [Getting Started](#getting-started)
- [Switching Backends](#switching-backends)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Getting Started

### What is the Task Backend?

The task backend is a pluggable abstraction layer that allows Paperclip to work with different task management systems. Currently supported:

- **PaperclipBackend**: Native Paperclip database storage (default)
- **PlaneBackend**: Integration with [Plane.so](https://plane.so)

### Default Configuration

By default, Paperclip uses the built-in database backend. No configuration is required.

```typescript
import { createTaskBackend } from '@paperclipai/task-backend';

// Uses PaperclipBackend by default
const backend = createTaskBackend(config, db, companyId);
```

### Checking Current Backend

```typescript
console.log(`Using backend: ${backend.constructor.name}`);
```

## Switching Backends

### Switching to Plane

#### Prerequisites

1. A Plane.so account with API access
2. API key from Plane
3. Workspace slug and project ID

#### Configuration

Set environment variables:

```bash
# Required
TASK_BACKEND_TYPE=plane
PLANE_API_KEY=your-api-key-here
PLANE_WORKSPACE_SLUG=your-workspace-slug
PLANE_DEFAULT_PROJECT_ID=your-project-uuid

# Optional (defaults shown)
PLANE_API_URL=https://api.plane.so
```

#### Getting Plane Credentials

1. **API Key**:
   - Log into Plane.so
   - Go to Settings → API Tokens
   - Create a new token with appropriate permissions

2. **Workspace Slug**:
   - Found in your Plane URL: `https://plane.so/[workspace-slug]`
   - Or check Workspace Settings

3. **Project ID**:
   - Open your project in Plane
   - Check the URL or project settings for the UUID

#### Verification

After configuration, verify the connection:

```typescript
const backend = createTaskBackend(config, db, companyId);

try {
  const issues = await backend.listIssues({ limit: 1 });
  console.log('✅ Connected to Plane successfully');
} catch (error) {
  console.error('❌ Failed to connect to Plane:', error);
}
```

### Switching Back to Paperclip

To switch back to the native Paperclip backend:

```bash
TASK_BACKEND_TYPE=paperclip
```

Or simply remove/unset the `TASK_BACKEND_TYPE` variable.

## Migration Guide

### When to Migrate

Consider migrating when:
- Moving from self-hosted to Plane for better collaboration
- Consolidating multiple Paperclip instances
- Changing organizational requirements

### Pre-Migration Checklist

- [ ] Verify source backend is accessible
- [ ] Verify target backend is configured and accessible
- [ ] Ensure target project/workspace exists
- [ ] Plan for migration window (service may be slower during migration)
- [ ] Backup data if needed
- [ ] Test with dry-run first

### Running Migration

#### Step 1: Dry Run

Always start with a dry run to preview changes:

```typescript
import { migrateIssues, createTaskBackend } from '@paperclipai/task-backend';

const sourceBackend = createTaskBackend(sourceConfig, db, companyId);
const targetBackend = createTaskBackend(targetConfig, db, companyId);

const result = await migrateIssues({
  sourceBackend,
  targetBackend,
  dryRun: true,
  batchSize: 10,
  onProgress: (current, total) => {
    console.log(`Preview: ${current}/${total}`);
  }
});

console.log('Preview Results:');
console.log(`- Total issues: ${result.totalIssues}`);
console.log(`- Would migrate: ${result.migratedIssues}`);
console.log(`- Would fail: ${result.failedIssues}`);
```

#### Step 2: Review Errors

Check for any potential issues:

```typescript
if (result.errors.length > 0) {
  console.error('Preview Errors:');
  result.errors.forEach(err => {
    console.error(`- Issue ${err.issueId}: ${err.error}`);
  });
}
```

#### Step 3: Execute Migration

Once satisfied with the preview:

```typescript
const result = await migrateIssues({
  sourceBackend,
  targetBackend,
  dryRun: false,  // Now apply changes
  batchSize: 10,
  onProgress: (current, total) => {
    console.log(`Migrating: ${current}/${total} (${Math.round(current/total*100)}%)`);
  }
});

console.log('Migration Complete:');
console.log(`- Migrated: ${result.migratedIssues}/${result.totalIssues}`);
console.log(`- Failed: ${result.failedIssues}`);

if (result.failedIssues > 0) {
  console.error('Failed migrations:');
  result.errors.forEach(err => {
    console.error(`- Issue ${err.issueId}: ${err.error}`);
  });
}
```

### Migration Best Practices

1. **Start Small**: Test with a small batch first
2. **Monitor Progress**: Use the `onProgress` callback
3. **Batch Size**: Adjust based on your data volume
   - Small batches (5-10): More granular progress, easier to retry
   - Large batches (20-50): Faster overall, but harder to pinpoint failures
4. **Business Hours**: Run migrations during low-traffic periods
5. **Keep Source Data**: Don't delete source data immediately after migration

### Post-Migration

1. **Verify Data**: Check a sample of migrated issues
2. **Update Configuration**: Switch your production config to the new backend
3. **Monitor**: Watch for any issues in the first few days
4. **Cleanup**: Archive or delete source data when confident

## Troubleshooting

### Common Issues

#### "Authentication failed"

**Plane Backend**:
- Verify `PLANE_API_KEY` is correct
- Check if API key has required permissions
- Ensure API key hasn't expired

**Solution**:
```bash
# Test your API key
curl -H "x-api-key: YOUR_API_KEY" https://api.plane.so/api/workspaces/
```

#### "Workspace not found"

**Cause**: Invalid workspace slug

**Solution**:
- Check workspace slug in Plane URL
- Verify `PLANE_WORKSPACE_SLUG` matches exactly (case-sensitive)

#### "Project not found"

**Cause**: Invalid project ID

**Solution**:
- Get project ID from Plane project settings
- Verify `PLANE_DEFAULT_PROJECT_ID` is correct UUID format

#### "Rate limit exceeded"

**Cause**: Too many API requests to Plane

**Solution**:
- Reduce batch size in migration
- Add delays between batches
- Contact Plane for rate limit increase

#### Migration fails with validation errors

**Cause**: Source data doesn't meet target backend requirements

**Solution**:
- Review error details in `MigrationResult.errors`
- Fix data issues in source backend
- Re-run migration

### Debugging

#### Enable Debug Logging

```typescript
// Add logging to backend operations
const backend = createTaskBackend(config, db, companyId);

const originalCreateIssue = backend.createIssue.bind(backend);
backend.createIssue = async (input) => {
  console.log('[DEBUG] Creating issue:', input);
  try {
    const result = await originalCreateIssue(input);
    console.log('[DEBUG] Created issue:', result.id);
    return result;
  } catch (error) {
    console.error('[DEBUG] Failed to create issue:', error);
    throw error;
  }
};
```

#### Check Configuration

```typescript
import { parseTaskBackendConfig } from '@paperclipai/task-backend';

const config = parseTaskBackendConfig(process.env);
console.log('Backend type:', config.type);

if (config.type === 'plane') {
  console.log('Plane API URL:', config.plane?.apiUrl);
  console.log('Workspace:', config.plane?.workspaceSlug);
  console.log('Project ID:', config.plane?.defaultProjectId ? '***' : 'NOT SET');
}
```

### Getting Help

1. **Check Logs**: Review application logs for detailed error messages
2. **Documentation**: See [API Reference](../../packages/task-backend/README.md)
3. **Developer Guide**: See [Developer Guide](./TASK-BACKEND-DEV-GUIDE.md)
4. **Issues**: Report bugs on GitHub issues

## Best Practices

### Configuration Management

1. **Use Environment Variables**: Never hardcode credentials
2. **Secure Storage**: Use secret management for API keys
3. **Environment-Specific Configs**: Different configs for dev/staging/production

### Performance

1. **Batch Operations**: Use batch processing for bulk operations
2. **Caching**: Cache frequently accessed issues when appropriate
3. **Connection Pooling**: Reuse backend instances

### Error Handling

```typescript
import { 
  TaskBackend, 
  ValidationError, 
  NotFoundError,
  AuthenticationError 
} from '@paperclipai/task-backend';

try {
  const issue = await backend.createIssue(input);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle invalid input
    console.error('Invalid data:', error.details);
  } else if (error instanceof AuthenticationError) {
    // Handle auth issues
    console.error('Authentication failed:', error.message);
  } else if (error instanceof NotFoundError) {
    // Handle missing resources
    console.error('Resource not found:', error.message);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

### Monitoring

Monitor these metrics:
- Backend response times
- Error rates by operation type
- Migration progress (during migrations)
- API rate limit usage (for external backends)

## Next Steps

- Read the [API Reference](../../packages/task-backend/README.md) for detailed API docs
- Check the [Developer Guide](./TASK-BACKEND-DEV-GUIDE.md) for implementation details
- Review integration examples in the codebase

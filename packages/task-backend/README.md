# @paperclipai/task-backend

Pluggable task backend abstraction for Paperclip.

## Installation

```bash
pnpm add @paperclipai/task-backend
```

## Usage

### Using PaperclipBackend

```typescript
import { PaperclipBackend } from '@paperclipai/task-backend';
import { db } from '@paperclipai/db';

const backend = new PaperclipBackend(db, companyId);
const issue = await backend.createIssue({ title: 'New task' });
```

### Using PlaneBackend

```typescript
import { PlaneBackend } from '@paperclipai/task-backend';

const backend = new PlaneBackend(
  'https://api.plane.so',
  apiKey,
  workspaceSlug,
  projectId,
  db,
  companyId
);
```

### Using Factory

```typescript
import { createTaskBackend, parseTaskBackendConfig } from '@paperclipai/task-backend';

const config = parseTaskBackendConfig(process.env);
const backend = createTaskBackend(config, db, companyId);
```

### Migrating Between Backends

```typescript
import { migrateIssues } from '@paperclipai/task-backend';

const result = await migrateIssues({
  sourceBackend: paperclipBackend,
  targetBackend: planeBackend,
  dryRun: false,
  batchSize: 10,
  onProgress: (current, total) => console.log(`${current}/${total}`)
});
```

## API Reference

### TaskBackend Interface

The `TaskBackend` interface defines the contract for task management operations:

#### Issue Operations

- **createIssue(input): Promise\<Issue\>** - Create a new issue
- **getIssue(id): Promise\<Issue | null\>** - Retrieve an issue by ID
- **listIssues(filters?): Promise\<Issue[]\>** - List issues with optional filters
- **updateIssue(id, input): Promise\<Issue\>** - Update an existing issue
- **deleteIssue(id): Promise\<void\>** - Delete an issue

#### Dependency Operations

- **listDependencies(issueId): Promise\<DependencyInfo[]\>** - List dependencies for an issue

#### Agent Comment Operations

- **createAgentComment(issueId, input): Promise\<IssueAgentComment\>** - Create an agent comment
- **listAgentComments(issueId, agentName?): Promise\<IssueAgentComment[]\>** - List agent comments
- **getLatestAgentComment(issueId, agentName): Promise\<IssueAgentComment | null\>** - Get the latest comment from a specific agent

### Types

See `src/types.ts` for full type definitions.

Key types include:
- `Issue` - Task/issue data structure
- `IssueInput` - Input for creating/updating issues
- `DependencyInfo` - Dependency relationship information
- `IssueAgentComment` - Agent comment data structure
- `TaskBackendConfig` - Configuration for backend selection

## Configuration

### Environment Variables

Configure the task backend using environment variables:

- **TASK_BACKEND_TYPE**: Backend type - `'paperclip'` | `'plane'` (default: `'paperclip'`)
- **PLANE_API_URL**: Plane API URL (default: `'https://api.plane.so'`)
- **PLANE_API_KEY**: Plane API key (required for Plane backend)
- **PLANE_WORKSPACE_SLUG**: Plane workspace slug (required for Plane backend)
- **PLANE_DEFAULT_PROJECT_ID**: Default Plane project ID (required for Plane backend)

### Configuration Object

```typescript
import { parseTaskBackendConfig } from '@paperclipai/task-backend';

// Parse from environment
const config = parseTaskBackendConfig(process.env);

// Or create manually
const config: TaskBackendConfig = {
  type: 'plane',
  plane: {
    apiUrl: 'https://api.plane.so',
    apiKey: 'your-api-key',
    workspaceSlug: 'my-workspace',
    defaultProjectId: 'project-uuid'
  }
};
```

## Migration

### Overview

The migration system allows moving issues between different backends (e.g., from Paperclip to Plane).

### Features

- **Dry-run mode**: Preview changes without applying them
- **Batch processing**: Control migration speed with configurable batch sizes
- **Progress tracking**: Monitor migration progress via callbacks
- **Error handling**: Detailed error reporting for failed migrations

### Migration Options

```typescript
interface MigrationOptions {
  sourceBackend: TaskBackend;      // Source backend instance
  targetBackend: TaskBackend;       // Target backend instance
  dryRun?: boolean;                 // Preview without applying (default: false)
  batchSize?: number;               // Issues per batch (default: 10)
  onProgress?: (current: number, total: number) => void;
}
```

### Migration Result

```typescript
interface MigrationResult {
  totalIssues: number;              // Total issues to migrate
  migratedIssues: number;           // Successfully migrated
  failedIssues: number;             // Failed migrations
  errors: MigrationError[];         // Error details
}
```

## Architecture

### Design Principles

1. **Abstraction Layer**: Common interface for different task management systems
2. **Extensibility**: Easy to add new backend implementations
3. **Configuration-Driven**: Switch backends via environment variables
4. **Migration Support**: Built-in tools for moving between backends

### Components

- **TaskBackend Interface**: Core contract for backend implementations
- **PaperclipBackend**: Native Paperclip database backend
- **PlaneBackend**: Integration with Plane.so
- **Factory**: Backend instantiation based on configuration
- **Migration System**: Tools for migrating between backends

## Error Handling

All backend methods may throw errors. Common error types:

- `NotFoundError`: Requested resource not found
- `ValidationError`: Invalid input data
- `AuthenticationError`: Invalid credentials
- `RateLimitError`: API rate limit exceeded
- `NetworkError`: Connection issues

```typescript
try {
  const issue = await backend.createIssue(input);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
  }
  // Handle other errors
}
```

## Testing

Each backend implementation includes comprehensive tests. Run tests with:

```bash
pnpm test
```

## Contributing

See [Developer Guide](../../docs/integrations/TASK-BACKEND-DEV-GUIDE.md) for:
- Adding new backend implementations
- Testing guidelines
- Code style requirements

## License

MIT

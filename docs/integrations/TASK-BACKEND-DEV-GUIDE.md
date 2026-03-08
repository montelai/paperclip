# Task Backend Developer Guide

This guide is for developers working on the task backend system, including adding new backend implementations.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Implementing New Backends](#implementing-new-backends)
- [Testing Guidelines](#testing-guidelines)
- [Contributing](#contributing)

## Architecture Overview

### System Design

The task backend system follows the **Strategy Pattern** to enable pluggable task management backends.

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Uses TaskBackend interface)           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      TaskBackend Interface              │
│  - createIssue()                        │
│  - getIssue()                           │
│  - listIssues()                         │
│  - updateIssue()                        │
│  - deleteIssue()                        │
│  - listDependencies()                   │
│  - createAgentComment()                 │
│  - listAgentComments()                  │
│  - getLatestAgentComment()              │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│  Paperclip   │ │    Plane     │
│   Backend    │ │   Backend    │
└──────────────┘ └──────────────┘
       │               │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │  Plane API   │
│   (Drizzle)  │ │   (HTTP)     │
└──────────────┘ └──────────────┘
```

### Core Components

#### 1. TaskBackend Interface (`src/types.ts`)

The contract that all backends must implement:

```typescript
export interface TaskBackend {
  createIssue(input: IssueInput): Promise<Issue>;
  getIssue(id: string): Promise<Issue | null>;
  listIssues(filters?: IssueFilters): Promise<Issue[]>;
  updateIssue(id: string, input: Partial<IssueInput>): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;
  listDependencies(issueId: string): Promise<DependencyInfo[]>;
  createAgentComment(issueId: string, input: AgentCommentInput): Promise<IssueAgentComment>;
  listAgentComments(issueId: string, agentName?: string): Promise<IssueAgentComment[]>;
  getLatestAgentComment(issueId: string, agentName: string): Promise<IssueAgentComment | null>;
}
```

#### 2. Configuration System (`src/config.ts`)

Environment-based configuration:

```typescript
export type TaskBackendType = 'paperclip' | 'plane';

export interface TaskBackendConfig {
  type: TaskBackendType;
  plane?: {
    apiUrl: string;
    apiKey: string;
    workspaceSlug: string;
    defaultProjectId: string;
  };
}

export function parseTaskBackendConfig(env: Record<string, string | undefined>): TaskBackendConfig;
```

#### 3. Factory Pattern (`src/factory.ts`)

Backend instantiation based on configuration:

```typescript
export function createTaskBackend(
  config: TaskBackendConfig,
  db: Database,
  companyId: string
): TaskBackend {
  switch (config.type) {
    case 'paperclip':
      return new PaperclipBackend(db, companyId);
    case 'plane':
      return new PlaneBackend(
        config.plane!.apiUrl,
        config.plane!.apiKey,
        config.plane!.workspaceSlug,
        config.plane!.defaultProjectId,
        db,
        companyId
      );
    default:
      throw new Error(`Unknown backend type: ${config.type}`);
  }
}
```

#### 4. Migration System (`src/migration.ts`)

Tools for moving data between backends:

```typescript
export interface MigrationOptions {
  sourceBackend: TaskBackend;
  targetBackend: TaskBackend;
  dryRun?: boolean;
  batchSize?: number;
  onProgress?: (current: number, total: number) => void;
}

export interface MigrationResult {
  totalIssues: number;
  migratedIssues: number;
  failedIssues: number;
  errors: MigrationError[];
}

export async function migrateIssues(options: MigrationOptions): Promise<MigrationResult>;
```

### Data Flow

#### Creating an Issue

```
User Request
    │
    ▼
Backend.createIssue(input)
    │
    ├─ PaperclipBackend
    │   └─ Insert into PostgreSQL via Drizzle
    │
    └─ PlaneBackend
        ├─ Transform to Plane format
        ├─ POST to Plane API
        └─ Store reference in PostgreSQL
    │
    ▼
Return Issue
```

## Implementing New Backends

### Step 1: Understand the Interface

Study `src/types.ts` to understand:
- Required methods
- Input/output types
- Error handling expectations

### Step 2: Create Backend Class

Create a new file in `src/backends/`:

```typescript
// src/backends/my-backend.ts

import { TaskBackend, Issue, IssueInput, /* ... */ } from '../types';
import { Database } from '@paperclipai/db';

export class MyBackend implements TaskBackend {
  constructor(
    private readonly apiClient: MyApiClient,
    private readonly db: Database,
    private readonly companyId: string
  ) {}

  async createIssue(input: IssueInput): Promise<Issue> {
    // Implementation
  }

  async getIssue(id: string): Promise<Issue | null> {
    // Implementation
  }

  // ... implement all interface methods
}
```

### Step 3: Implement Methods

#### Example: createIssue

```typescript
async createIssue(input: IssueInput): Promise<Issue> {
  // 1. Validate input
  this.validateInput(input);

  // 2. Transform to backend format
  const backendInput = this.toBackendFormat(input);

  // 3. Call external API
  let response;
  try {
    response = await this.apiClient.createIssue(backendInput);
  } catch (error) {
    throw this.handleApiError(error);
  }

  // 4. Transform to common format
  const issue = this.fromBackendFormat(response);

  // 5. Store reference (if needed)
  await this.storeReference(issue);

  return issue;
}
```

### Step 4: Data Transformation

Implement transformation methods:

```typescript
private toBackendFormat(input: IssueInput): MyBackendIssueInput {
  return {
    title: input.title,
    description: input.description || '',
    // Map other fields
    // Handle missing/optional fields
  };
}

private fromBackendFormat(backendIssue: MyBackendIssue): Issue {
  return {
    id: backendIssue.id.toString(),
    title: backendIssue.title,
    description: backendIssue.description,
    status: this.mapStatus(backendIssue.status),
    priority: this.mapPriority(backendIssue.priority),
    // Map other fields
    createdAt: new Date(backendIssue.created_at),
    updatedAt: new Date(backendIssue.updated_at),
  };
}
```

### Step 5: Error Handling

Map backend-specific errors to standard errors:

```typescript
private handleApiError(error: unknown): Error {
  if (error instanceof MyBackendApiError) {
    switch (error.code) {
      case 'NOT_FOUND':
        return new NotFoundError(error.message);
      case 'VALIDATION_ERROR':
        return new ValidationError(error.message, error.details);
      case 'UNAUTHORIZED':
        return new AuthenticationError(error.message);
      default:
        return new Error(`Backend error: ${error.message}`);
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}
```

### Step 6: Add Configuration

Update `src/config.ts`:

```typescript
export type TaskBackendType = 'paperclip' | 'plane' | 'mybackend';

export interface TaskBackendConfig {
  type: TaskBackendType;
  plane?: PlaneConfig;
  mybackend?: MyBackendConfig;
}

export function parseTaskBackendConfig(env: Record<string, string | undefined>): TaskBackendConfig {
  const type = (env.TASK_BACKEND_TYPE as TaskBackendType) || 'paperclip';

  return {
    type,
    mybackend: type === 'mybackend' ? {
      apiUrl: env.MYBACKEND_API_URL || 'https://api.mybackend.com',
      apiKey: env.MYBACKEND_API_KEY!,
      // Other config
    } : undefined,
    // ... other backends
  };
}
```

### Step 7: Update Factory

Update `src/factory.ts`:

```typescript
export function createTaskBackend(
  config: TaskBackendConfig,
  db: Database,
  companyId: string
): TaskBackend {
  switch (config.type) {
    case 'paperclip':
      return new PaperclipBackend(db, companyId);
    case 'plane':
      return new PlaneBackend(/* ... */);
    case 'mybackend':
      return new MyBackend(
        new MyApiClient(config.mybackend!.apiUrl, config.mybackend!.apiKey),
        db,
        companyId
      );
    default:
      throw new Error(`Unknown backend type: ${(config as any).type}`);
  }
}
```

### Step 8: Export

Update `src/index.ts`:

```typescript
export { MyBackend } from './backends/my-backend';
```

## Testing Guidelines

### Test Structure

```
packages/task-backend/
├── src/
│   ├── backends/
│   │   ├── paperclip-backend.test.ts
│   │   ├── plane-backend.test.ts
│   │   └── my-backend.test.ts
│   ├── config.test.ts
│   ├── factory.test.ts
│   └── migration.test.ts
```

### Unit Tests

#### Testing Backend Implementation

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyBackend } from './my-backend';
import { mockDb, createMockDb } from '@paperclipai/db/testing';

describe('MyBackend', () => {
  let backend: MyBackend;
  let mockApiClient: MockApiClient;

  beforeEach(() => {
    mockApiClient = new MockApiClient();
    backend = new MyBackend(mockApiClient, mockDb, 'company-123');
  });

  describe('createIssue', () => {
    it('should create an issue successfully', async () => {
      const input = {
        title: 'Test Issue',
        description: 'Test description',
      };

      mockApiClient.createIssue.mockResolvedValue({
        id: 'ext-123',
        title: input.title,
        description: input.description,
      });

      const result = await backend.createIssue(input);

      expect(result.title).toBe(input.title);
      expect(result.id).toBe('ext-123');
    });

    it('should throw ValidationError for invalid input', async () => {
      const input = { title: '' }; // Invalid

      await expect(backend.createIssue(input)).rejects.toThrow(ValidationError);
    });
  });

  // Test all interface methods...
});
```

#### Testing Configuration

```typescript
describe('parseTaskBackendConfig', () => {
  it('should parse paperclip config by default', () => {
    const config = parseTaskBackendConfig({});
    expect(config.type).toBe('paperclip');
  });

  it('should parse mybackend config', () => {
    const config = parseTaskBackendConfig({
      TASK_BACKEND_TYPE: 'mybackend',
      MYBACKEND_API_KEY: 'test-key',
    });

    expect(config.type).toBe('mybackend');
    expect(config.mybackend?.apiKey).toBe('test-key');
  });
});
```

#### Testing Factory

```typescript
describe('createTaskBackend', () => {
  it('should create MyBackend instance', () => {
    const config = { type: 'mybackend', mybackend: { /* ... */ } };
    const backend = createTaskBackend(config, mockDb, 'company-123');

    expect(backend).toBeInstanceOf(MyBackend);
  });
});
```

### Integration Tests

Test with real API (use test fixtures/mocking):

```typescript
describe('MyBackend (integration)', () => {
  let backend: MyBackend;

  beforeAll(() => {
    // Use test API credentials
    backend = new MyBackend(
      new MyApiClient(process.env.TEST_MYBACKEND_API_URL!, process.env.TEST_MYBACKEND_API_KEY!),
      testDb,
      'test-company'
    );
  });

  it('should perform CRUD operations', async () => {
    // Create
    const created = await backend.createIssue({
      title: 'Integration Test',
    });
    expect(created.id).toBeDefined();

    // Read
    const fetched = await backend.getIssue(created.id);
    expect(fetched?.title).toBe('Integration Test');

    // Update
    const updated = await backend.updateIssue(created.id, {
      title: 'Updated Title',
    });
    expect(updated.title).toBe('Updated Title');

    // Delete
    await backend.deleteIssue(created.id);
    const deleted = await backend.getIssue(created.id);
    expect(deleted).toBeNull();
  });
});
```

### Test Coverage Requirements

- **Minimum coverage**: 80%
- **Critical paths**: 100% (create, update, delete, error handling)
- **Edge cases**: Document and test

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test my-backend.test.ts
```

## Contributing

### Development Setup

1. **Clone and install**:
   ```bash
   git clone https://github.com/montelai/paperclip
   cd paperclip
   pnpm install
   ```

2. **Build packages**:
   ```bash
   pnpm build
   ```

3. **Run tests**:
   ```bash
   pnpm test
   ```

### Code Style

- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Use meaningful variable names
- Add JSDoc comments for public APIs
- No `any` types without justification
- No type assertions without justification

### Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(task-backend): add JiraBackend implementation
fix(task-backend): handle rate limiting in PlaneBackend
docs(task-backend): update migration guide
test(task-backend): add tests for MyBackend
refactor(task-backend): simplify error handling
```

### Pull Request Process

1. **Create branch**: `feat/task-backend-<feature>`
2. **Write code**: Follow guidelines above
3. **Add tests**: Ensure coverage > 80%
4. **Update docs**: Update README and guides
5. **Run checks**: `pnpm typecheck && pnpm test && pnpm build`
6. **Submit PR**: Include description of changes

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Coverage meets requirements (> 80%)
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Commit messages follow convention

### Review Criteria

PRs will be reviewed for:

1. **Correctness**: Does it work as expected?
2. **Code Quality**: Is it maintainable and readable?
3. **Test Coverage**: Are edge cases covered?
4. **Documentation**: Is it well-documented?
5. **Performance**: Are there performance implications?
6. **Security**: Are there security concerns?

### Getting Help

- **GitHub Issues**: Report bugs or request features
- **Pull Requests**: Submit contributions
- **Documentation**: Check [User Guide](./TASK-BACKEND-USER-GUIDE.md) and [API Reference](../../packages/task-backend/README.md)

## Advanced Topics

### Caching Strategy

For backends with rate limits or slow APIs:

```typescript
export class CachedBackend implements TaskBackend {
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    private readonly backend: TaskBackend,
    private readonly ttlMs: number = 60000
  ) {}

  async getIssue(id: string): Promise<Issue | null> {
    const cached = this.getFromCache(`issue:${id}`);
    if (cached) return cached;

    const issue = await this.backend.getIssue(id);
    if (issue) {
      this.setCache(`issue:${id}`, issue);
    }
    return issue;
  }

  // Delegate other methods...
}
```

### Rate Limiting

Handle API rate limits gracefully:

```typescript
export class RateLimitedBackend implements TaskBackend {
  private readonly limiter = new RateLimiter(100, 60000); // 100 req/min

  async createIssue(input: IssueInput): Promise<Issue> {
    await this.limiter.wait();
    return this.backend.createIssue(input);
  }

  // ... wrap all API methods
}
```

### Batch Operations

Optimize bulk operations:

```typescript
async createIssues(inputs: IssueInput[]): Promise<Issue[]> {
  // Check if backend supports batch creation
  if ('createIssues' in this.apiClient) {
    return this.apiClient.createIssues(inputs);
  }

  // Fallback to sequential creation
  return Promise.all(inputs.map(input => this.createIssue(input)));
}
```

## Future Enhancements

Potential improvements:

1. **WebSocket Support**: Real-time issue updates
2. **Offline Mode**: Queue operations when offline
3. **Batch API**: Bulk operations endpoint
4. **Plugin System**: Third-party backend extensions
5. **Metrics**: Performance and usage metrics

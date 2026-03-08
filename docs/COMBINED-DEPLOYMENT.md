# Paperclip + Plane Combined Deployment

This deployment runs both **Paperclip** and **Plane** together with the Task Backend integration enabled.

## Quick Start

```bash
# 1. Start all services
./start-combined.sh

# Or manually:
docker compose -f docker-compose.combined.yml up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Paperclip** | 3100 | AI agent task management |
| **Plane** | 3000 | Project management UI |
| **MinIO** | 9090 | Object storage (plane/planepassword) |
| **PostgreSQL** | 5432 | Paperclip database |
| **Redis** | 6379 | Plane cache/queue |

## Configuration

### Environment Variables

Copy `.env.combined` and update values:

```bash
cp .env.combined .env.local
# Edit .env.local with your values
```

### Task Backend Integration

To enable Plane as the task backend:

1. Access Plane at http://localhost:3000
2. Create a workspace and project
3. Generate an API key in Plane settings
4. Update `.env.combined`:
   ```
   TASK_BACKEND_TYPE=plane
   PLANE_API_KEY=your-api-key
   PLANE_WORKSPACE_SLUG=your-workspace
   PLANE_DEFAULT_PROJECT_ID=your-project-id
   ```
5. Restart Paperclip:
   ```bash
   docker compose -f docker-compose.combined.yml restart paperclip
   ```

## Management

```bash
# View logs
docker compose -f docker-compose.combined.yml logs -f

# Stop services
docker compose -f docker-compose.combined.yml down

# Restart services
docker compose -f docker-compose.combined.yml restart

# Remove all data (⚠️ destructive)
docker compose -f docker-compose.combined.yml down -v
```

## Architecture

```
                    ┌─────────────┐
                    │   Nginx     │ :80, :443
                    │  (optional) │
                    └──────┬──────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
   ┌──────▼──────┐                  ┌──────▼──────┐
   │  Paperclip  │ :3100            │    Plane    │ :3000
   │   Server    │◄─────────────────│   Frontend  │
   └──────┬──────┘  Task Backend    └──────┬──────┘
          │         Integration            │
   ┌──────▼──────┐                  ┌──────▼──────┐
   │ PostgreSQL  │                  │   Plane     │
   │  (shared)   │                  │    API      │
   └─────────────┘                  └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │ PostgreSQL  │
                                    │   (Plane)   │
                                    └─────────────┘
```

## Tailscale Integration

To expose via Tailscale:

```bash
# Install Tailscale (requires sudo)
curl -fsSL https://tailscale.com/install.sh | sudo sh

# Authenticate
sudo tailscale up

# Get your Tailscale IP
tailscale ip
```

Update `.env.combined`:
```
PAPERCLIP_PUBLIC_URL=http://100.x.y.z:3100
WEB_URL=http://100.x.y.z:3000
```

## Troubleshooting

### Port conflicts
If ports are already in use, edit `docker-compose.combined.yml` and change the port mappings.

### Database connection errors
Wait for PostgreSQL to be ready (healthcheck passes). Check logs:
```bash
docker compose -f docker-compose.combined.yml logs db
```

### Plane not starting
Check all dependencies are running:
```bash
docker compose -f docker-compose.combined.yml ps
```

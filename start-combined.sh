#!/bin/bash
# Combined Paperclip + Plane Deployment Script

set -e

echo "🚀 Starting Paperclip + Plane Combined Deployment"
echo "================================================"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Load environment variables
if [ -f .env.combined ]; then
    echo "✅ Loading environment from .env.combined"
    export $(cat .env.combined | grep -v '^#' | xargs)
else
    echo "⚠️  No .env.combined file found, using defaults"
fi

# Generate secrets if not set
if [ -z "$BETTER_AUTH_SECRET" ] || [ "$BETTER_AUTH_SECRET" == "change-this-in-production-use-openssl-rand-hex-32" ]; then
    echo "🔐 Generating BETTER_AUTH_SECRET..."
    export BETTER_AUTH_SECRET=$(openssl rand -hex 32)
fi

if [ -z "$SECRET_KEY_BASE" ] || [ "$SECRET_KEY_BASE" == "change-this-in-production-use-openssl-rand-hex-32" ]; then
    echo "🔐 Generating SECRET_KEY_BASE..."
    export SECRET_KEY_BASE=$(openssl rand -hex 32)
fi

# Create MinIO bucket on first run
echo "📦 Setting up MinIO bucket for Plane..."
until docker compose -f docker-compose.combined.yml exec -T minio mc alias set local http://minio:9000 plane planepassword 2>/dev/null; do
    echo "   Waiting for MinIO to start..."
    sleep 2
done
docker compose -f docker-compose.combined.yml exec -T minio mc mb local/plane-uploads 2>/dev/null || true

# Start services
echo "🐳 Starting Docker services..."
docker compose -f docker-compose.combined.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show status
echo ""
echo "✅ Deployment Complete!"
echo "====================="
echo ""
echo "📱 Services:"
echo "   • Paperclip:  http://localhost:3100"
echo "   • Plane:      http://localhost:3000"
echo "   • MinIO:      http://localhost:9090 (plane/planepassword)"
echo ""
echo "🔧 Management:"
echo "   • Stop:       docker compose -f docker-compose.combined.yml down"
echo "   • Logs:       docker compose -f docker-compose.combined.yml logs -f"
echo "   • Restart:    docker compose -f docker-compose.combined.yml restart"
echo ""
echo "📚 Next Steps:"
echo "   1. Access Plane at http://localhost:3000"
echo "   2. Create your workspace and project"
echo "   3. Generate an API key in Plane settings"
echo "   4. Update .env.combined with PLANE_API_KEY and workspace info"
echo "   5. Restart Paperclip: docker compose -f docker-compose.combined.yml restart paperclip"
echo ""

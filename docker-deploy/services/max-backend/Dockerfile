# ========================================
# MAX Backend Dockerfile
# Node.js 20 Alpine - Production Optimized
# ========================================
FROM node:20-alpine AS base

# Install security updates and required tools
RUN apk update && apk upgrade && \
    apk add --no-cache curl

WORKDIR /app

# ========================================
# Dependencies Stage
# ========================================
FROM base AS dependencies

COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ========================================
# Production Stage
# ========================================
FROM base AS production

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs conversations data && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port 3005 (FIXED - never change)
EXPOSE 3005

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start server
CMD ["node", "server.js"]

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspaces package files if any, or workspace definitions
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies (workspaces supported)
RUN npm ci

# Copy API source code
COPY apps/api/ ./apps/api/

# Build TypeScript to Javascript
WORKDIR /app/apps/api
RUN npm run build

# Stage 2: Production Run
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy build artifacts and SQL migration file
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/migrations ./apps/api/migrations

EXPOSE 4000

ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV UPLOAD_DIR=/app/uploads

# Run startup command
WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]

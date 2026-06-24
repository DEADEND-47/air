# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspaces package files if any, or workspace definitions
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies (workspaces supported)
RUN npm ci

# Copy web source code
COPY apps/web/ ./apps/web/

# Set build argument for Vite API URL
ARG VITE_API_URL=http://localhost:4000/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build web application
WORKDIR /app/apps/web
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

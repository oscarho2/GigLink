# Build frontend assets
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Install backend dependencies
FROM node:18 AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./

# Production image
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy backend with node_modules
COPY --from=backend-builder /app/backend/ ./backend

# Copy frontend build where server expects it
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Use non-root user for runtime
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs \
  && chown -R nodejs:nodejs /app
USER nodejs

WORKDIR /app/backend
EXPOSE 5001

CMD ["node", "server.js"]

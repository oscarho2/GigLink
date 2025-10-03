# Stage 1: Build the frontend
FROM node:18 AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM node:18 AS backend
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm install
COPY backend/ ./

# Stage 3: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=backend /app/backend/ ./
COPY --from=frontend /app/frontend/build/ ./frontend/build

ENV NODE_ENV=production

EXPOSE 5001

CMD ["node", "server.js"]

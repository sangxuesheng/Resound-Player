# Gemini Music — Docker Build Stage
#
# This Dockerfile builds the frontend static assets.
# Used with docker-compose for the full stack, or standalone for the frontend only.
#
# Usage:
#   docker build -f deploy/Dockerfile -t gemini-music-frontend .
#   docker run -p 8080:80 gemini-music-frontend

# ── Build stage ──
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
ARG VITE_BASE_URL=/
ENV VITE_BASE_URL=$VITE_BASE_URL
RUN npm run build:web

# ── Production stage ──
FROM nginx:alpine

# Copy built frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY deploy/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
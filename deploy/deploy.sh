#!/usr/bin/env bash
# ============================================================================
# Resound-Player — Production Deployment Script (pm2 + Nginx)
# ============================================================================
#
# Prerequisites:
#   - Node.js 22+ installed
#   - Nginx installed
#   - pm2 installed globally: npm i -g pm2
#
# Usage:
#   chmod +x deploy/deploy.sh
#   sudo ./deploy/deploy.sh
#
# Steps performed:
#   1. Pull latest code (git pull)
#   2. Install dependencies
#   3. Build frontend (Vite)
#   4. Copy built files to Nginx web root
#   5. Copy Nginx config
#   6. Reload Nginx
#   7. Restart backend services via pm2
#
# Configurable variables — adjust for your environment:
# ============================================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="${PROJECT_DIR}/deploy"
NGINX_ROOT="/var/www/resound-player/dist"
NGINX_CONF_DEST="/etc/nginx/sites-available/resound-player"
NGINX_CONF_LINK="/etc/nginx/sites-enabled/resound-player"
BUILD_DIR="${PROJECT_DIR}/dist"
LOG_DIR="${PROJECT_DIR}/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Pre-flight checks ──────────────────────────────────────────────────────
info "Starting deployment..."

if [[ $EUID -ne 0 ]]; then
    warn "Not running as root. Some steps (Nginx config, root dir creation) may require sudo."
fi

command -v node >/dev/null 2>&1 || { error "Node.js is required"; exit 1; }
command -v npm  >/dev/null 2>&1 || { error "npm is required"; exit 1; }
command -v pm2  >/dev/null 2>&1 || { warn "pm2 not found globally"; info "Installing pm2..."; npm install -g pm2; }
command -v nginx >/dev/null 2>&1 || { error "Nginx is required"; exit 1; }

# ── Step 1: Pull latest code (if in a git repo) ────────────────────────────
if git -C "${PROJECT_DIR}" rev-parse --git-dir > /dev/null 2>&1; then
    info "Pulling latest code..."
    git -C "${PROJECT_DIR}" pull
else
    warn "Not a git repository, skipping pull."
fi

# ── Step 2: Install dependencies ──────────────────────────────────────────
info "Installing dependencies..."
cd "${PROJECT_DIR}"
npm ci

# ── Step 3: Build frontend ─────────────────────────────────────────────────
info "Building frontend..."
VITE_BASE_URL=/ npm run build:web

if [ ! -d "${BUILD_DIR}" ]; then
    error "Build failed: ${BUILD_DIR} not found"
    exit 1
fi
info "Frontend built successfully."

# ── Step 4: Copy to Nginx root ─────────────────────────────────────────────
info "Copying built files to ${NGINX_ROOT}..."
mkdir -p "${NGINX_ROOT}"
cp -r "${BUILD_DIR}/"* "${NGINX_ROOT}/"
info "Files deployed."

# ── Step 5: Install Nginx config ───────────────────────────────────────────
info "Installing Nginx configuration..."
if [ -d "/etc/nginx/sites-available" ]; then
    cp "${DEPLOY_DIR}/nginx.conf" "${NGINX_CONF_DEST}"
    ln -sf "${NGINX_CONF_DEST}" "${NGINX_CONF_LINK}"
else
    warn "/etc/nginx/sites-available not found — copying to /etc/nginx/conf.d/"
    cp "${DEPLOY_DIR}/nginx.conf" "/etc/nginx/conf.d/resound-player.conf"
fi

# ── Step 6: Test and reload Nginx ──────────────────────────────────────────
info "Testing Nginx configuration..."
nginx -t || { error "Nginx configuration test failed"; exit 1; }

info "Reloading Nginx..."
if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx || systemctl restart nginx
else
    nginx -s reload || true
fi

# ── Step 7: Create log directory ───────────────────────────────────────────
mkdir -p "${LOG_DIR}"

# ── Step 8: Start/restart pm2 processes ────────────────────────────────────
info "Starting backend services via pm2..."
pm2 startOrReload "${DEPLOY_DIR}/ecosystem.config.cjs" --update-env
pm2 save

# ── Done ───────────────────────────────────────────────────────────────────
info "╔══════════════════════════════════════════════════════════════╗"
info "║  Deployment complete!                                      ║"
info "║                                                            ║"
info "║  Frontend:    http://localhost                              ║"
info "║  API:         http://localhost/api                          ║"
info "║  Unblock:     http://localhost/unblock-api                  ║"
info "║                                                            ║"
info "║  pm2 status:  pm2 status                                   ║"
info "║  pm2 logs:    pm2 logs                                     ║"
info "╚══════════════════════════════════════════════════════════════╝"
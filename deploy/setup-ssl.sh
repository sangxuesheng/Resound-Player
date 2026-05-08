#!/usr/bin/env bash
# ============================================================================
# Gemini Music — HTTPS Certificate Setup (Let's Encrypt / Certbot)
# ============================================================================
#
# This script helps set up SSL/TLS certificates for your production domain.
#
# Prerequisites:
#   - A registered domain pointing to your server's public IP
#   - Port 80 accessible from the internet (for HTTP-01 challenge)
#   - Certbot installed: https://certbot.eff.org/
#
# Usage:
#   chmod +x deploy/setup-ssl.sh
#   sudo ./deploy/setup-ssl.sh your-domain.com
#
# After running, uncomment the SSL section in deploy/nginx.conf
# and run deploy/deploy.sh again to reload with HTTPS.
# ============================================================================

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Check arguments ──
if [ $# -lt 1 ]; then
    echo "Usage: $0 <your-domain.com> [email]"
    echo ""
    echo "Examples:"
    echo "  sudo $0 music.example.com"
    echo "  sudo $0 music.example.com admin@example.com"
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-}"  # Optional: for renewal notifications

# ── Pre-flight ──
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (certbot needs privileged ports)."
    exit 1
fi

command -v certbot >/dev/null 2>&1 || {
    warn "Certbot not found. Installing..."

    # Detect OS and install certbot
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif command -v yum >/dev/null 2>&1; then
        yum install -y certbot python3-certbot-nginx
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y certbot python3-certbot-nginx
    elif command -v apk >/dev/null 2>&1; then
        apk add certbot
    else
        error "Could not install certbot automatically."
        error "Please install it manually: https://certbot.eff.org/"
        exit 1
    fi
    info "Certbot installed."
}

# ── Check if certificate already exists ──
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
if [ -d "${CERT_DIR}" ]; then
    info "Certificate already exists at ${CERT_DIR}"
    info "Checking expiry..."
    certbot certificates
    warn "To force renewal: certbot renew --force-renewal"
    exit 0
fi

# ── Obtain certificate ──
info "Obtaining SSL certificate for: ${DOMAIN}"

CERTBOT_CMD="certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos"
if [ -n "${EMAIL}" ]; then
    CERTBOT_CMD="${CERTBOT_CMD} -m ${EMAIL}"
else
    CERTBOT_CMD="${CERTBOT_CMD} --register-unsafely-without-email"
fi

echo "Running: ${CERTBOT_CMD}"
eval "${CERTBOT_CMD}"

# ── Verify ──
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    info "╔══════════════════════════════════════════════════════════════╗"
    info "║  SSL certificate obtained successfully!                     ║"
    info "║                                                            ║"
    info "║  Domain:       ${DOMAIN}"
    info "║  Certificate:  ${CERT_DIR}/fullchain.pem"
    info "║  Private key:  ${CERT_DIR}/privkey.pem"
    info "║                                                            ║"
    info "║  Next steps:                                               ║"
    info "║  1. Edit deploy/nginx.conf:                                ║"
    info "║     - Uncomment the SSL server block (port 443)             ║"
    info "║  2. Run deploy/deploy.sh to reload Nginx with HTTPS         ║"
    info "║                                                            ║"
    info "║  Auto-renewal is configured via systemd timer or cron.     ║"
    info "║  Test renewal: certbot renew --dry-run                      ║"
    info "╚══════════════════════════════════════════════════════════════╝"
else
    error "Certificate not found at expected path: ${CERT_DIR}"
    error "Check certbot output above for errors."
    exit 1
fi
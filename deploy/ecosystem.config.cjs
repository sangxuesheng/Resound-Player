// PM2 Ecosystem Configuration — Gemini Music
//
// Manages 3 backend processes:
//   1. netease-api     — NeteaseCloudMusicApiEnhanced (port 38761)
//   2. unblock-proxy   — UnblockNeteaseMusic server     (port 38762)
//   3. unblock-match   — Custom match server             (port 38763)
//
// Usage:
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save                           # make restart on boot persistent
//   pm2 status
//   pm2 logs
//   pm2 restart <name>

module.exports = {
  apps: [
    {
      name: 'netease-api',
      script: 'scripts/start-api.cjs',
      cwd: __dirname + '/..',
      env: {
        PORT: '38761',
        NODE_ENV: 'production',
      },
      // Prevent event-loop exit: API server holds TCP listener
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      error_file: './logs/netease-api-error.log',
      out_file: './logs/netease-api-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'unblock-proxy',
      script: 'node_modules/@unblockneteasemusic/server/app.js',
      cwd: __dirname + '/..',
      args: '-p 38762 -o bodian kugou migu qq bilibili -s',
      env: {
        ENABLE_FLAC: 'true',
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      error_file: './logs/unblock-proxy-error.log',
      out_file: './logs/unblock-proxy-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'unblock-match',
      script: 'server/unblock-match-server.mjs',
      cwd: __dirname + '/..',
      env: {
        PORT: '38763',
        UNBLOCK_SOURCES: 'bodian,kugou,migu,qq,bilibili',
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      error_file: './logs/unblock-match-error.log',
      out_file: './logs/unblock-match-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
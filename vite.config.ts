import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import http from 'http';
import https from 'https';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:38761';

  return {
    base: './',
    plugins: [
      vue(),
      {
        name: 'download-proxy',
        configureServer(server) {
          server.middlewares.use('/dl-proxy', (req, res) => {
            const params = new URL(req.url || '', 'http://localhost').searchParams;
            const targetUrl = params.get('url');
            const cookie = params.get('cookie');
            if (!targetUrl) { res.statusCode = 400; res.end('Missing url'); return; }
            try {
              const u = new URL(targetUrl);
              const mod = u.protocol === 'https:' ? https : http;
              const opts: http.RequestOptions = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET' };
              if (cookie) opts.headers = { Cookie: cookie };
              mod.get(opts, (proxyRes) => {
                const headers: Record<string, string> = {};
                if (proxyRes.headers['content-type']) headers['Content-Type'] = proxyRes.headers['content-type'];
                if (proxyRes.headers['content-length']) headers['Content-Length'] = proxyRes.headers['content-length'];
                headers['Access-Control-Allow-Origin'] = '*';
                res.writeHead(proxyRes.statusCode || 200, headers);
                proxyRes.pipe(res);
              }).on('error', (err) => { res.statusCode = 500; res.end(err.message); });
            } catch { res.statusCode = 400; res.end('Invalid URL'); }
          });
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['192.168.2.2'],
      watch: {
        ignored: ['**/播放页相关/**'],
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/unblock-api': {
          target: 'http://127.0.0.1:38763',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/unblock-api/, ''),
        },
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
  };
});

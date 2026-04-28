import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:38761';

  return {
    base: './',
    plugins: [vue()],
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

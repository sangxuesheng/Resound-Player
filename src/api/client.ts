import axios from 'axios';

const ncmProxy = import.meta.env.VITE_NCM_PROXY;

export function getResolvedApiBaseUrl() {
  // Electron: 优先使用 preload 注入的动态端口
  if (window.appEnv?.apiBaseUrl) return window.appEnv.apiBaseUrl;

  // Web 模式默认走同源代理，避免 cookie 丢失
  return '/api';
}

export const apiClient = axios.create({
  baseURL: getResolvedApiBaseUrl(),
  withCredentials: true,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  if (!ncmProxy) {
    return config;
  }

  config.params = {
    ...(config.params || {}),
    proxy: ncmProxy,
  };

  return config;
});

export async function waitForApiReady(options?: {
  maxAttempts?: number;
  intervalMs?: number;
}) {
  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 500;

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      await apiClient.get('/banner', { params: { timestamp: Date.now() }, timeout: 2500 });
      return true;
    } catch (err: any) {
      // ECONNREFUSED 在启动期属于预期，不打印到控制台刷屏
      if (err?.code && err.code !== 'ERR_NETWORK') {
        // 保留其它类型异常用于排查
        // eslint-disable-next-line no-console
        console.debug('[api-wait]', err.code, err.message);
      }
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}

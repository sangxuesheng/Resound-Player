import { contextBridge, ipcRenderer } from 'electron';

// Parse the --service-ports argument injected by main.js
const portsArg = process.argv.find((s) => s.startsWith('--service-ports='));
let ports = { api: 38761, unblockProxy: 38762, unblockMatch: 38763 };
if (portsArg) {
  try {
    const parsed = JSON.parse(portsArg.split('=')[1]);
    ports = { ...ports, ...parsed };
  } catch {
    // fall back to defaults
  }
}

contextBridge.exposeInMainWorld('appEnv', {
  apiPort: ports.api,
  apiBaseUrl: `http://127.0.0.1:${ports.api}`,
  unblockProxyUrl: `http://127.0.0.1:${ports.unblockProxy}`,
  unblockMatchUrl: `http://127.0.0.1:${ports.unblockMatch}`,
  isDesktop: true,
  platform: process.platform,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
  cacheApi: {
    getItem: () => ipcRenderer.invoke('cache:get'),
    setItem: (data) => ipcRenderer.invoke('cache:set', data),
    clear: () => ipcRenderer.invoke('cache:clear'),
  },
});

// ── 窗口控制：通过主进程 page-title-updated 事件实现 ──
// 最小化/最大化通过 document.title 触发 page-title-updated 事件
// 关闭使用原生 window.close()（Electron 会将其转为 BrowserWindow.close()）

// 主进程广播最大化状态 → data-win-maximized 渲染进程通过 MutationObserver 获取
ipcRenderer.on('win-state-change', (_event, maximized) => {
  if (maximized) {
    document.documentElement.dataset.winMaximized = '';
  } else {
    delete document.documentElement.dataset.winMaximized;
  }
});

// 标记桌面端，供 CSS 选择器控制平台专属 UI 显隐
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('resound-desktop');
});
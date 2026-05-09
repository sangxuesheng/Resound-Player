import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveServicePorts } from './port-manager.js';
import { startAllServices, waitApiReady, killAllServices } from './serviceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.commandLine.appendSwitch('no-sandbox');

// ── 中文应用菜单 ──
function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    {
      label: '文件',
      submenu: [
        isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: '全部置于顶层' },
        ] : [{ role: 'close', label: '关闭' }]),
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 GeminiMusic',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于 GeminiMusic',
              message: 'GeminiMusic v0.1.0',
              detail: '基于 NeteaseCloudMusicApi 的跨平台音乐播放器',
            });
          },
        },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

let serviceChildren = {};
let win = null;

/**
 * 设置中文菜单
 */
function setupChineseMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS 应用菜单（手动中文定义）
    ...(isMac ? [{
      label: 'Gemini Music',
      submenu: [
        {
          label: '关于 Gemini Music',
          click: async () => {
            const { dialog } = await import('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于 Gemini Music',
              message: 'Gemini Music',
              detail: '基于 NeteaseCloudMusicApi 的跨平台音乐播放器\n版本 ' + app.getVersion(),
            });
          },
        },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏 Gemini Music' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出 Gemini Music' },
      ],
    }] : []),

    // 文件
    {
      label: '文件',
      submenu: [
        isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' },
      ],
    },

    // 编辑
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },

    // 视图
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },

    // 窗口
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        ...(isMac ? [
          { role: 'zoom', label: '缩放' },
          { type: 'separator' },
          { role: 'front', label: '全部置于顶层' },
        ] : [
          { role: 'close', label: '关闭' },
        ]),
      ],
    },

    // 帮助
    {
      label: '帮助',
      submenu: [],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create the main window with all service ports passed to preload.
 */
async function createMainWindow(ports) {
  const preloadPath = path.join(__dirname, 'preload.js');

  // Serialize port map into additionalArguments for preload
  const portArgs = [
    `--service-ports=${JSON.stringify(ports)}`,
  ];

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    show: true,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: portArgs,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

/**
 * Show an error window when startup fails.
 */
async function createErrorWindow(errorMessage) {
  console.error('[main] 启动失败:', errorMessage);

  const errorWin = new BrowserWindow({
    width: 600,
    height: 500,
    resizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>启动失败</title>
<style>
body{font-family:-apple-system,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#fff}
.container{text-align:center;max-width:480px}
h1{font-size:22px;margin-bottom:16px}
p{color:rgba(255,255,255,0.65);line-height:1.6;font-size:14px}
.btn{margin-top:20px;padding:8px 24px;border:none;border-radius:6px;background:#e74c3c;color:#fff;cursor:pointer}
</style></head><body>
<div class="container">
<h1>⚠️ 应用启动失败</h1>
<p>${errorMessage.replace(/\n/g, '<br>')}</p>
<button class="btn" onclick="window.close()">退出</button>
</div></body></html>`;

  await errorWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  errorWin.show();
  errorWin.on('closed', () => app.quit());
}

async function bootstrap() {
  console.log('[main] 应用启动中...');
  console.log('[main] 平台:', process.platform, 'cwd:', process.cwd());

  // 设置中文菜单
  Menu.setApplicationMenu(buildAppMenu());

  // ── In dev mode, ports may already be pre-resolved ──
  // When started via scripts/start-desktop.mjs, SERVICE_PORTS env is set.
  // In production (packaged app), we resolve ports here.
  let ports;
  if (process.env.SERVICE_PORTS) {
    try {
      ports = JSON.parse(process.env.SERVICE_PORTS);
      console.log('[main] 使用外部已探测端口:', ports);
    } catch {
      ports = null;
    }
  }

  if (!ports) {
    try {
      ports = await resolveServicePorts();
      console.log('[main] 自动探测端口:', ports);
    } catch (err) {
      await createErrorWindow(`端口探测失败: ${err.message}`);
      return;
    }
  }

  // ── Start backend services ──
  // In dev mode (SERVICE_PORTS from orchestrator), unblock services are already
  // started by the orchestrator, but the Netease API still needs to be spawned here.
  // In production (packaged app), all services are started here.
  const isDev = !!process.env.SERVICE_PORTS;
  try {
    serviceChildren = startAllServices({
      api: ports.api,
      unblockProxy: ports.unblockProxy,
      unblockMatch: ports.unblockMatch,
    }, isDev);  // pass flag to skip unblock in dev mode
  } catch (err) {
    await createErrorWindow(`启动后端服务失败: ${err.message}`);
    return;
  }

  // ── Wait for API to be ready ──
  const timeoutMs = process.platform === 'win32' ? 60000 : 45000;
  console.log(`[main] 等待 API 就绪 (:${ports.api}, 超时 ${timeoutMs}ms)...`);
  const ready = await waitApiReady(`http://127.0.0.1:${ports.api}`, timeoutMs);

  if (!ready) {
    killAllServices(serviceChildren);
    await createErrorWindow(`API 服务未能在 ${timeoutMs / 1000} 秒内就绪。<br>请检查端口 ${ports.api} 是否被占用。`);
    return;
  }

  // ── Create main window ──
  console.log('[main] API 就绪，创建主窗口...');
  setupChineseMenu();
  await createMainWindow(ports);
  console.log('[main] 启动流程完成，端口:', ports);
}

app.whenReady().then(bootstrap);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) bootstrap();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  killAllServices(serviceChildren);
});
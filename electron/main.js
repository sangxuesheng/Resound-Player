import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
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
          label: '关于 Resound-Player',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于 Resound-Player',
              message: 'Resound-Player v0.1.0',
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
      label: 'Resound-Player',
      submenu: [
        {
          label: '关于 Resound-Player',
          click: async () => {
            const { dialog } = await import('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于 Resound-Player',
              message: 'Resound-Player',
              detail: '基于 NeteaseCloudMusicApi 的跨平台音乐播放器\n版本 ' + app.getVersion(),
            });
          },
        },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏 Resound-Player' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出 Resound-Player' },
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

  const isMac = process.platform === 'darwin';

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#1a1a2e',
    // macOS: titleBarStyle hidden → 红绿灯 hover 显示、无原生标题栏边条
    // 其他平台：frame: false → 无边框，依赖自定义控件
    ...(isMac
      ? { titleBarStyle: 'customButtonsOnHover' }
      : { frame: false }
    ),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      additionalArguments: portArgs,
    },
  });

  // 内容准备就绪后再显示窗口，避免 resize 时因 GPU 效果滞后导致卡顿
  win.once('ready-to-show', () => {
    win.show();
  });

  // 向渲染进程广播窗口最大化状态变更（供右上角自定义按钮切换图标）
  win.on('maximize', () => {
    win.webContents.send('win-state-change', true);
  });
  win.on('unmaximize', () => {
    win.webContents.send('win-state-change', false);
  });

  // 窗口控制：通过 page-title-updated 事件监听 document.title 变更
  // 必须在 loadURL 之前注册，确保从页面加载初期就能捕获标题变更
  let _originalTitle = '';
  win.webContents.on('page-title-updated', (event, title) => {
    if (title.startsWith('cmd:')) {
      event.preventDefault();
      const cmd = title.split(':')[1];
      if (cmd === 'minimize') {
        win.minimize();
      } else if (cmd === 'restore') {
        win.unmaximize();
      } else if (cmd === 'maximize') {
        // frameless 窗口二次最大化修复：先重置 maximizable 再调用 maximize
        win.setMaximizable(true);
        win.maximize();
      }
      // 延迟恢复原标题，确保 macOS 窗口动画（~350ms）完成后再重置
      setTimeout(() => {
        if (!win.isDestroyed()) win.setTitle(_originalTitle || 'Resound-Player');
      }, 500);
    } else {
      _originalTitle = title;
    }
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

// ── 窗口控制 IPC ──
ipcMain.handle('window-minimize', (event) => {
  const bw = BrowserWindow.fromWebContents(event.sender);
  bw?.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  const bw = BrowserWindow.fromWebContents(event.sender);
  if (bw?.isMaximized()) {
    bw.unmaximize();
  } else {
    bw?.maximize();
  }
});

ipcMain.handle('window-is-maximized', (event) => {
  const bw = BrowserWindow.fromWebContents(event.sender);
  return bw?.isMaximized() ?? false;
});

ipcMain.handle('window-close', (event) => {
  const bw = BrowserWindow.fromWebContents(event.sender);
  bw?.close();
});

// ── 缓存持久化 IPC ──
const CACHE_FILE = path.join(app.getPath('userData'), 'api-cache.json');

ipcMain.handle('cache:get', () => {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('cache:set', (_event, data) => {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, data, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('cache:clear', () => {
  try {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
    return true;
  } catch {
    return false;
  }
});
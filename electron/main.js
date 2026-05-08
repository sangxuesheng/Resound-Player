import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveServicePorts } from './port-manager.js';
import { startAllServices, waitApiReady, killAllServices } from './serviceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.commandLine.appendSwitch('no-sandbox');

let serviceChildren = {};
let win = null;

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
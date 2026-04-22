import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickPort } from './port.js';
import { startEmbeddedApi, waitApiReady } from './apiProcess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_PORT_BASE = 38761;
const API_PORT_MAX_TRIES = 20;

let apiChild = null;
let win = null;

async function createMainWindow(apiPort) {
  const preloadPath = path.join(__dirname, 'preload.js');

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--embedded-api-port=${apiPort}`],
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

async function bootstrap() {
  const port = await pickPort(API_PORT_BASE, API_PORT_MAX_TRIES);

  process.env.EMBEDDED_API_PORT = String(port);
  apiChild = startEmbeddedApi(port);

  const ready = await waitApiReady(`http://127.0.0.1:${port}`);
  if (!ready) {
    await dialog.showErrorBox('启动失败', `内嵌 API 启动超时（端口: ${port}）`);
    app.quit();
    return;
  }

  await createMainWindow(port);
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (apiChild && !apiChild.killed) {
    apiChild.kill('SIGTERM');
  }
});

import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickPort } from './port.js';
import { startEmbeddedApi, waitApiReady } from './apiProcess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('no-sandbox');

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

async function createErrorWindow(errorMessage) {
  console.log('[main] 创建错误窗口，显示启动失败信息');
  
  const errorWin = new BrowserWindow({
    width: 600,
    height: 500,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 创建简单的HTML内容显示错误信息
  const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>应用启动失败 - Gemini Music</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .error-container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      max-width: 500px;
      text-align: center;
    }
    .error-icon {
      color: #e74c3c;
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .error-title {
      color: #2c3e50;
      margin-bottom: 1rem;
    }
    .error-message {
      color: #7f8c8d;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .error-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #3498db;
      color: white;
    }
    .btn-primary:hover {
      background: #2980b9;
    }
    .btn-danger {
      background: #e74c3c;
      color: white;
    }
    .btn-danger:hover {
      background: #c0392b;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h1 class="error-title">应用启动失败</h1>
    <p class="error-message">${errorMessage}</p>
    <div class="error-actions">
      <button class="btn btn-primary" onclick="window.location.reload()">重新启动</button>
      <button class="btn btn-danger" onclick="window.close()">退出应用</button>
    </div>
  </div>
</body>
</html>`;

  await errorWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
  errorWin.show();
  
  // 窗口关闭时退出应用
  errorWin.on('closed', () => {
    app.quit();
  });
  
  return errorWin;
}

async function bootstrap() {
  console.log('[main] 应用启动中...');
  console.log('[main] 当前平台:', process.platform);
  console.log('[main] 当前工作目录:', process.cwd());
  console.log('[main] 应用版本:', app.getVersion());
  
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`[main] 启动尝试 ${retryCount + 1}/${maxRetries}`);
      const port = await pickPort(API_PORT_BASE, API_PORT_MAX_TRIES);
      console.log(`[main] 选择的端口: ${port}`);

      process.env.EMBEDDED_API_PORT = String(port);
      console.log('[main] 启动内嵌API服务...');
      apiChild = startEmbeddedApi(port);
      console.log('[main] API服务进程已启动, PID:', apiChild.pid);

      // 增加更长的等待时间，特别是Windows平台
      const timeoutMs = process.platform === 'win32' ? 60000 : 45000; // 增加到60秒
      console.log(`[main] 等待API服务就绪 (端口: ${port}, 超时: ${timeoutMs}ms)...`);
      const ready = await waitApiReady(`http://127.0.0.1:${port}`, timeoutMs);
      
      if (ready) {
        console.log('[main] API服务就绪，创建主窗口...');
        await createMainWindow(port);
        console.log('[main] 启动流程完成');
        return; // 成功则退出循环
      }
      
      // API未就绪，重试
      console.log(`[main] API服务未就绪，重试 ${retryCount + 1}/${maxRetries}`);
      retryCount++;
      if (apiChild && !apiChild.killed) {
        console.log('[main] 终止API服务进程...');
        apiChild.kill('SIGTERM');
      }
      await new Promise(r => setTimeout(r, 3000)); // 增加到3秒后重试
      
    } catch (err) {
      console.error(`[main] 启动错误 (尝试 ${retryCount + 1}):`, err);
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error('[main] 所有重试都失败，显示错误窗口');
        const errorMessage = `启动失败: ${err.message}\n\n已重试 ${maxRetries} 次，请检查：\n1. API服务依赖是否正确安装\n2. 端口 ${API_PORT_BASE} 是否被占用\n3. Windows防火墙设置`;
        await createErrorWindow(errorMessage);
        return; // 不退出应用，让错误窗口保持打开
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  // 所有重试都失败
  console.error('[main] API服务启动失败，所有重试次数已用完');
  const errorMessage = `内嵌 API 启动失败，已重试 ${maxRetries} 次。\n\n可能的原因：\n1. API服务依赖缺失或损坏\n2. 端口 ${API_PORT_BASE} 被其他程序占用\n3. Windows防火墙阻止了网络访问\n4. 系统权限不足\n\n建议：\n1. 重新安装应用\n2. 检查端口占用情况\n3. 暂时关闭防火墙测试\n4. 以管理员权限运行应用`;
  await createErrorWindow(errorMessage);
}

async function showStartupErrorDialog(title, message) {
  try {
    await dialog.showMessageBox(null, {
      type: 'error',
      title: title,
      message: message,
      buttons: ['确定', '查看日志'],
      defaultId: 0,
      cancelId: 0
    });
  } catch (dialogErr) {
    console.error('[main] 显示错误对话框失败:', dialogErr);
    // 如果对话框显示失败，至少确保应用退出
  }
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

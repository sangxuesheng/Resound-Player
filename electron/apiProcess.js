import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkHealth(apiBaseUrl) {
  return new Promise((resolve) => {
    const req = http.get(`${apiBaseUrl}/banner`, (res) => {
      resolve(Boolean(res.statusCode && res.statusCode < 500));
      res.resume();
    });

    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function waitApiReady(apiBaseUrl, timeoutMs = 25000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkHealth(apiBaseUrl);
    if (ok) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveApiEntrypoint() {
  // 优先检查asar包外路径
  const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@neteasecloudmusicapienhanced', 'api');
  const unpackedPkgJsonPath = path.join(unpackedPath, 'package.json');
  
  if (isFile(unpackedPkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(unpackedPkgJsonPath, 'utf-8'));
      const candidates = [
        'app.js',
        'index.js',
        'server.js',
        pkgJson.main,
        pkgJson.module,
      ].filter(Boolean);

      for (const rel of candidates) {
        const abs = path.resolve(unpackedPath, rel);
        if (isFile(abs)) {
          console.log('[apiProcess] resolved api entrypoint (unpacked):', abs);
          return abs;
        }
      }
    } catch (err) {
      console.warn('[apiProcess] failed to parse unpacked package.json:', err.message);
    }
  }

  // 如果asar包外不存在，尝试从asar包内复制到临时目录
  const asarPath = path.join(process.resourcesPath, 'app', 'node_modules', '@neteasecloudmusicapienhanced', 'api');
  const asarPkgJsonPath = path.join(asarPath, 'package.json');
  
  if (isFile(asarPkgJsonPath)) {
    try {
      // 创建临时目录用于解压API模块
      const tempDir = path.join(require('os').tmpdir(), 'gemini-music-api');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 复制API模块到临时目录
      const apiTempPath = path.join(tempDir, 'api');
      if (!fs.existsSync(apiTempPath)) {
        fs.mkdirSync(apiTempPath, { recursive: true });
      }
      
      // 复制package.json和入口文件
      const pkgJson = JSON.parse(fs.readFileSync(asarPkgJsonPath, 'utf-8'));
      const candidates = [
        'app.js',
        'index.js',
        'server.js',
        pkgJson.main,
        pkgJson.module,
      ].filter(Boolean);

      // 复制所有相关文件
      for (const rel of candidates) {
        const asarFile = path.join(asarPath, rel);
        const tempFile = path.join(apiTempPath, rel);
        
        if (isFile(asarFile)) {
          // 确保目标目录存在
          const tempDirForFile = path.dirname(tempFile);
          if (!fs.existsSync(tempDirForFile)) {
            fs.mkdirSync(tempDirForFile, { recursive: true });
          }
          
          // 复制文件
          fs.copyFileSync(asarFile, tempFile);
          console.log('[apiProcess] copied api file to temp:', tempFile);
        }
      }
      
      // 复制package.json
      fs.copyFileSync(asarPkgJsonPath, path.join(apiTempPath, 'package.json'));
      
      // 返回临时目录中的入口文件
      const mainEntry = candidates[0] || 'app.js';
      const tempEntry = path.join(apiTempPath, mainEntry);
      
      if (isFile(tempEntry)) {
        console.log('[apiProcess] resolved api entrypoint (temp):', tempEntry);
        return tempEntry;
      }
    } catch (err) {
      console.warn('[apiProcess] failed to extract api from asar:', err.message);
    }
  }

  // 最后尝试开发环境路径
  const devPaths = [
    path.join(__dirname, '..', 'node_modules', '@neteasecloudmusicapienhanced', 'api'),
    path.join(process.cwd(), 'node_modules', '@neteasecloudmusicapienhanced', 'api'),
  ];

  for (const pkgRoot of devPaths) {
    const pkgJsonPath = path.join(pkgRoot, 'package.json');
    if (isFile(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        const candidates = [
          'app.js',
          'index.js',
          'server.js',
          pkgJson.main,
          pkgJson.module,
        ].filter(Boolean);

        for (const rel of candidates) {
          const abs = path.resolve(pkgRoot, rel);
          if (isFile(abs)) {
            console.log('[apiProcess] resolved api entrypoint (dev):', abs);
            return abs;
          }
        }
      } catch (err) {
        console.warn('[apiProcess] failed to parse dev package.json:', err.message);
      }
    }
  }

  throw new Error('无法解析 api-enhanced 启动入口，请检查依赖安装和打包配置');
}

export function startEmbeddedApi(port) {
  const apiEntrypoint = resolveApiEntrypoint();
  console.log('[apiProcess] resolved api entrypoint:', apiEntrypoint);

  // Windows平台特殊处理
  const spawnOptions = {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(port),
      CORS_ALLOW_ORIGIN: '*',
      // Windows平台确保必要的环境变量
      Path: process.env.Path || process.env.PATH,
      SystemRoot: process.env.SystemRoot || 'C:\\Windows',
      TEMP: process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  };

  // Windows平台需要特殊配置
  if (process.platform === 'win32') {
    spawnOptions.shell = false; // 禁用shell，直接使用node执行
    spawnOptions.windowsHide = false; // 显示窗口便于调试
    
    // 确保使用正确的node路径
    const nodePath = process.execPath;
    console.log('[apiProcess] using node path:', nodePath);
    
    // 直接使用node执行API入口文件
    const child = spawn(nodePath, [apiEntrypoint], spawnOptions);
    return child;
  }

  // 非Windows平台使用标准方式
  const child = spawn(process.execPath, [apiEntrypoint], spawnOptions);

  console.log('[apiProcess] spawned child process, pid:', child.pid);

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    console.log(`[embedded-api] ${text.trim()}`);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    console.error(`[embedded-api:err] ${text.trim()}`);
  });

  child.on('error', (err) => {
    console.error('[embedded-api:spawn-error]', err.message);
  });

  child.on('exit', (code, signal) => {
    console.log(`[embedded-api] process exited with code ${code}, signal ${signal}`);
  });

  child.on('close', (code) => {
    console.log(`[embedded-api] process closed with code ${code}`);
  });

  return child;
}

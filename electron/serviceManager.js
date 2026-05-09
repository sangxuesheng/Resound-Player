import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Health check ──

function checkHealth(apiBaseUrl) {
  return new Promise((resolve) => {
    const req = http.get(`${apiBaseUrl}/banner`, (res) => {
      resolve(Boolean(res.statusCode && res.statusCode < 500));
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => { req.destroy(); resolve(false); });
  });
}

export async function waitApiReady(apiBaseUrl, timeoutMs = 25000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const ok = await checkHealth(apiBaseUrl);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ── API entrypoint resolver (copied from apiProcess.js) ──

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function resolveApiEntrypoint() {
  const root = path.join(__dirname, '..');
  const unpackedPath = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', '@neteasecloudmusicapienhanced', 'api');

  if (isFile(path.join(unpackedPath, 'package.json'))) {
    const entry = findEntry(unpackedPath);
    if (entry) return entry;
  }

  const devPaths = [
    path.join(root, 'node_modules', '@neteasecloudmusicapienhanced', 'api'),
  ];
  for (const p of devPaths) {
    const entry = findEntry(p);
    if (entry) return entry;
  }

  throw new Error('Cannot resolve api-enhanced entrypoint');
}

function findEntry(pkgRoot) {
  const pkgPath = path.join(pkgRoot, 'package.json');
  if (!isFile(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const candidates = ['app.js', 'index.js', 'server.js', pkg.main, pkg.module].filter(Boolean);
    for (const rel of candidates) {
      const abs = path.resolve(pkgRoot, rel);
      if (isFile(abs)) return abs;
    }
  } catch {}
  return null;
}

// ── Spawn functions ──

function spawnNeteaseApi(port) {
  const apiEntrypoint = resolveApiEntrypoint();
  const child = spawn(process.execPath, [apiEntrypoint], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(port),
      CORS_ALLOW_ORIGIN: '*',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    console.log(`[netease-api] ${chunk.toString().trim()}`);
  });
  child.stderr.on('data', (chunk) => {
    console.error(`[netease-api:err] ${chunk.toString().trim()}`);
  });
  child.on('exit', (code, signal) => {
    console.log(`[netease-api] exited code=${code} signal=${signal}`);
  });
  return child;
}

function spawnUnblockProxy(port) {
  const appScript = path.join(__dirname, '..', 'node_modules', '@unblockneteasemusic', 'server', 'app.js');
  const child = spawn(process.execPath, [
    appScript,
    '-p', String(port),
    '-o', 'bodian', 'kugou', 'migu', 'qq', 'bilibili',
    '-s',
  ], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      ENABLE_FLAC: 'true',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    console.log(`[unblock-proxy] ${chunk.toString().trim()}`);
  });
  child.stderr.on('data', (chunk) => {
    console.error(`[unblock-proxy:err] ${chunk.toString().trim()}`);
  });
  child.on('exit', (code, signal) => {
    console.log(`[unblock-proxy] exited code=${code} signal=${signal}`);
  });
  return child;
}

function spawnUnblockMatch(port, unblockProxyPort) {
  const appScript = path.join(__dirname, '..', 'server', 'unblock-match-server.mjs');
  const child = spawn(process.execPath, [appScript], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      UNBLOCK_PROXY_URL: `http://127.0.0.1:${unblockProxyPort}`,
      UNBLOCK_SOURCES: 'bodian,kugou,migu,qq,bilibili',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    console.log(`[unblock-match] ${chunk.toString().trim()}`);
  });
  child.stderr.on('data', (chunk) => {
    console.error(`[unblock-match:err] ${chunk.toString().trim()}`);
  });
  child.on('exit', (code, signal) => {
    console.log(`[unblock-match] exited code=${code} signal=${signal}`);
  });
  return child;
}

// ── Public API ──

/**
 * Start all 3 backend services with dynamically resolved ports.
 *
 * @param {{ api:number, unblockProxy:number, unblockMatch:number }} ports
 * @param {boolean} [skipUnblock=false]  When true, only start the Netease API (dev mode)
 * @returns {{ apiChild, proxyChild, matchChild }}
 */
export function startAllServices(ports, skipUnblock = false) {
  if (skipUnblock) {
    console.log(`[serviceManager] 开发模式：仅启动 Netease API (:${ports.api})`);
  } else {
    console.log(`[serviceManager] starting services:
    Netease API      → :${ports.api}
    Unblock Proxy    → :${ports.unblockProxy}
    Unblock Match    → :${ports.unblockMatch}`);
  }

  const apiChild = spawnNeteaseApi(ports.api);
  const proxyChild = skipUnblock ? null : spawnUnblockProxy(ports.unblockProxy);
  const matchChild = skipUnblock ? null : spawnUnblockMatch(ports.unblockMatch, ports.unblockProxy);

  return { apiChild, proxyChild, matchChild };
}

/**
 * Kill a child process, using taskkill on Windows for process tree cleanup.
 */
function killProcess(name, child) {
  if (!child || child.killed) return;
  console.log(`[serviceManager] killing ${name} (pid ${child.pid})`);
  if (process.platform === 'win32') {
    try {
      spawnSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' });
    } catch {
      child.kill('SIGTERM');
    }
  } else {
    child.kill('SIGTERM');
  }
}

/**
 * Kill all child processes gracefully.
 */
export function killAllServices(children) {
  for (const [name, child] of Object.entries(children)) {
    killProcess(name, child);
  }
}
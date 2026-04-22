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
  const pkgRoot = path.join(
    __dirname,
    '..',
    'node_modules',
    '@neteasecloudmusicapienhanced',
    'api',
  );

  const pkgJsonPath = path.join(pkgRoot, 'package.json');
  if (!isFile(pkgJsonPath)) {
    throw new Error('未找到 @neteasecloudmusicapienhanced/api，请先执行 npm i');
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

  const candidates = [
    pkgJson.main,
    pkgJson.module,
    'app.js',
    'index.js',
    'server.js',
  ].filter(Boolean);

  for (const rel of candidates) {
    const abs = path.resolve(pkgRoot, rel);
    if (isFile(abs)) return abs;
  }

  throw new Error('无法解析 api-enhanced 启动入口，请检查依赖版本');
}

export function startEmbeddedApi(port) {
  const apiEntrypoint = resolveApiEntrypoint();

  const child = spawn(process.execPath, [apiEntrypoint], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      CORS_ALLOW_ORIGIN: '*',
    },
    stdio: 'pipe',
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(`[embedded-api] ${text}`);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    process.stderr.write(`[embedded-api:err] ${text}`);
  });

  child.on('error', (err) => {
    process.stderr.write(`[embedded-api:spawn-error] ${err.message}\n`);
  });

  return child;
}

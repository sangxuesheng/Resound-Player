import { contextBridge } from 'electron';

const arg = process.argv.find((s) => s.startsWith('--embedded-api-port='));
const parsed = arg ? Number(arg.split('=')[1]) : NaN;
const apiPort = Number.isFinite(parsed) ? parsed : 38761;

contextBridge.exposeInMainWorld('appEnv', {
  apiPort,
  apiBaseUrl: `http://127.0.0.1:${apiPort}`,
});

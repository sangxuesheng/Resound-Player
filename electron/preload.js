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
});
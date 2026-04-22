import net from 'node:net';

export async function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, host);
  });
}

export async function pickPort(basePort, maxTries = 20) {
  for (let i = 0; i <= maxTries; i += 1) {
    const port = basePort + i;
    // eslint-disable-next-line no-await-in-loop
    const ok = await isPortAvailable(port);
    if (ok) return port;
  }
  throw new Error(`No available port from ${basePort} to ${basePort + maxTries}`);
}

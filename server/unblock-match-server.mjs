import http from 'http';

const PORT = 38763;

/**
 * @param {number} id - Netease song ID
 * @param {string[]} sources - Source priority list
 * @returns {Promise<{url:string|null, source:string|null, br:number, size:number}>}
 */
async function matchSong(id, sources) {
  try {
    const match = await import('@unblockneteasemusic/server');
    const result = await match.default(id, sources || ['kugou', 'migu']);
    return {
      url: result?.url || null,
      source: result?.source || null,
      br: result?.br || 0,
      size: result?.size || 0,
    };
  } catch {
    return { url: null, source: null, br: 0, size: 0 };
  }
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/match' && req.method === 'GET') {
    const id = Number(url.searchParams.get('id') || 0);
    const sourcesParam = url.searchParams.get('sources') || 'kugou,migu,bilibili';
    const sources = sourcesParam.split(',').filter(Boolean);

    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing id parameter' }));
      return;
    }

    const result = await matchSong(id, sources);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[unblock-match] server running on http://127.0.0.1:${PORT}`);
});

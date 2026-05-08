import http from 'http';

const PORT = Number(process.env.PORT) || 38763;

// FOLLOW_SOURCE_ORDER not set — uses Promise.any (race all sources, fastest wins)

// Initialize global state required by the unblock server's match function
global.source = (process.env.UNBLOCK_SOURCES || 'bodian,kugou,migu,qq,bilibili').split(',').filter(Boolean);
global.proxy = process.env.UNBLOCK_PROXY_URL ? new URL(process.env.UNBLOCK_PROXY_URL) : null;
global.cnrelay = process.env.UNBLOCK_CNRELAY || null;

/**
 * @param {number} id - Netease song ID
 * @param {string[]} sources - Source priority list
 * @returns {Promise<{url:string|null, source:string|null, br:number, size:number, errors:string[]}>}
 */
async function matchSong(id, sources) {
  const errors = [];
  try {
    const match = await import('@unblockneteasemusic/server');
    const effectiveSources = sources?.length ? sources : global.source || ['kugou', 'kuwo', 'migu', 'qq'];
    console.log(`[unblock-match] matching song ${id} with sources:`, effectiveSources);
    const result = await match.default(id, effectiveSources);
    if (result?.url) {
      console.log(`[unblock-match] matched: ${result.source} br:${result.br} size:${result.size}`);
    } else {
      console.log(`[unblock-match] no match found for song ${id}`);
    }
    return {
      url: result?.url || null,
      source: result?.source || null,
      br: result?.br || 0,
      size: result?.size || 0,
      errors,
    };
  } catch (e) {
    const errMsg = e?.message || String(e || 'unknown error');
    console.error(`[unblock-match] match error for song ${id}:`, errMsg);
    errors.push(errMsg);
    return { url: null, source: null, br: 0, size: 0, errors };
  }
}

const server = http.createServer(async (req, res) => {
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
    const sourcesParam = url.searchParams.get('sources') || 'bodian,kugou,migu,qq,bilibili';
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
    res.end(JSON.stringify({ ok: true, sources: global.source }));
    return;
  }

  // ── /dl-proxy: proxy audio with CORS + Range/206 support ──
  if (path === '/dl-proxy' && (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS')) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }

    let target;
    try {
      target = new URL(targetUrl);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid URL');
      return;
    }

    const cookie = url.searchParams.get('cookie') || '';
    const isHead = req.method === 'HEAD';

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: isHead ? 'HEAD' : 'GET',
      headers: {},
    };

    if (cookie) options.headers.Cookie = cookie;
    if (req.headers.range) options.headers.Range = req.headers.range;
    if (req.headers['if-range']) options.headers['If-Range'] = req.headers['if-range'];

    const mod = target.protocol === 'https:' ? await import('https') : await import('http');

    const proxyReq = mod.request(options, (proxyRes) => {
      const responseHeaders = {};
      const passthroughHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
        'etag',
        'last-modified',
      ];
      for (const key of passthroughHeaders) {
        const value = proxyRes.headers[key];
        if (typeof value === 'string') responseHeaders[key] = value;
      }
      responseHeaders['Access-Control-Allow-Origin'] = '*';
      responseHeaders['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges';

      res.writeHead(proxyRes.statusCode || 200, responseHeaders);
      if (isHead) {
        res.end();
        proxyRes.resume();
      } else {
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(err.message);
    });

    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'text/plain' });
        res.end('Upstream timeout');
      }
    });

    proxyReq.end();
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`[unblock-match] server running on http://127.0.0.1:${PORT}`);
  console.log(`[unblock-match] default sources: ${global.source.join(',')}`);
  // 预初始化：加载匹配模块 + 预热 DNS，避免首次匹配延迟
  try {
    const preload = await import('@unblockneteasemusic/server');
    console.log('[unblock-match] preload: module ready');
    if (typeof preload.default === 'function') {
      await preload.default(186016, global.source).catch(() => {});
      console.log('[unblock-match] preload: warmup done');
    }
  } catch (e) {
    console.log('[unblock-match] preload skipped:', e.message);
  }
});

import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const rootDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const tmdbApiKey = process.env.TMDB_API_KEY || '';
const allowedOrigin = process.env.CORS_ORIGIN || '*';
const requestWindowMs = 60_000;
const requestLimit = 90;
const requestCounts = new Map();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(payload));
}

function isRateLimited(ip) {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now - record.startedAt > requestWindowMs) {
    requestCounts.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  record.count += 1;
  return record.count > requestLimit;
}

async function proxyTmdb(request, response, pathname, search) {
  if (!tmdbApiKey) {
    sendJson(response, 503, { success: false, message: 'TMDB integration is not configured.' });
    return;
  }

  const target = new URL(`https://api.themoviedb.org/3${pathname.slice('/api/tmdb'.length)}`);
  new URLSearchParams(search).forEach((value, key) => target.searchParams.set(key, value));
  target.searchParams.set('api_key', tmdbApiKey);

  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(8_000) });
    const body = await upstream.text();
    response.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(body);
  } catch {
    sendJson(response, 502, { success: false, message: 'Unable to reach the content service.' });
  }
}

function serveStatic(response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(normalize(join(rootDir, requestedPath)));
  const insideRoot = filePath === rootDir || filePath.startsWith(`${rootDir}\`) || filePath.startsWith(`${rootDir}/`);
  if (!insideRoot || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(response, 404, { success: false, message: 'Resource not found.' });
    return;
  }
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://api.themoviedb.org; img-src 'self' data: https://image.tmdb.org https://image.tmdb.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://www.youtube.com; script-src 'self'"
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const origin = request.headers.origin;
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : origin === allowedOrigin ? origin : allowedOrigin);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { success: false, message: 'Method not allowed.' });
    return;
  }
  if (isRateLimited(request.socket.remoteAddress || 'unknown')) {
    sendJson(response, 429, { success: false, message: 'Too many requests. Try again shortly.' });
    return;
  }
  if (requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { success: true, service: 'tnstreaming', tmdbConfigured: Boolean(tmdbApiKey) });
    return;
  }
  if (requestUrl.pathname.startsWith('/api/tmdb/')) {
    await proxyTmdb(request, response, requestUrl.pathname, requestUrl.search);
    return;
  }
  serveStatic(response, requestUrl.pathname);
});

server.listen(port, () => {
  console.log(`TNSTREAMING server listening on http://localhost:${port}`);
});

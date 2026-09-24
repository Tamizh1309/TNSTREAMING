import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 4199;
let serverProcess;

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8_000) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Test server did not start.');
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port), TMDB_API_KEY: '' },
    stdio: 'ignore'
  });
  await waitForServer();
});

test.after(() => serverProcess?.kill());

test('health endpoint reports secure configuration state', async () => {
  const response = await fetch(`http://localhost:${port}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    service: 'tnstreaming',
    tmdbConfigured: false
  });
});

test('static app shell is served by the backend', async () => {
  const response = await fetch(`http://localhost:${port}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /TN STREAMING/);
});

test('TMDB proxy fails safely when not configured', async () => {
  const response = await fetch(`http://localhost:${port}/api/tmdb/trending/movie/week`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'TMDB integration is not configured.'
  });
});

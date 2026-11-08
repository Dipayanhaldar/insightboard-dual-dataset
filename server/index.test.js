import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import app from './index.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections?.();
  });
});

test('liveness probe is available without a database connection', async () => {
  const response = await fetch(`${baseUrl}/api/health/live`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'alive');
  assert.equal(body.service, 'InsightBoard V2 API');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-request-id') || '', /^[0-9a-f-]{36}$/i);
});

test('readiness probe returns 503 while MongoDB is disconnected', async () => {
  const response = await fetch(`${baseUrl}/api/health/ready`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, 'not_ready');
  assert.equal(body.database, false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('legacy health endpoint retains its HTTP 200 response contract', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    status: 'degraded',
    database: false,
    service: 'InsightBoard V2 API'
  });
});

test('version endpoint returns release metadata without exposing configuration', async () => {
  const response = await fetch(`${baseUrl}/api/version`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.service, 'InsightBoard V2 API');
  assert.equal(typeof body.version, 'string');
  assert.ok(body.commit === null || typeof body.commit === 'string');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(Object.hasOwn(body, 'env'), false);
  assert.equal(Object.hasOwn(body, 'secrets'), false);
});


test('security headers prevent framing and MIME sniffing', async () => {
  const response = await fetch(`${baseUrl}/api/health/live`);
  const csp = response.headers.get('content-security-policy') || '';

  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /worker-src[^;]*blob:/);
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('API responses are never cached', async () => {
  const response = await fetch(`${baseUrl}/api/health/live`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

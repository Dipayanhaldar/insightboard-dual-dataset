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

test('voice status and ai status endpoints respond with HTTP 200', async () => {
  const voiceRes = await fetch(`${baseUrl}/api/voice/status`);
  const voiceBody = await voiceRes.json();
  assert.equal(voiceRes.status, 200);
  assert.equal(voiceBody.available, true);

  const aiRes = await fetch(`${baseUrl}/api/ai/status`);
  const aiBody = await aiRes.json();
  assert.equal(aiRes.status, 200);
  assert.equal(typeof aiBody.available, 'boolean');
  assert.equal(typeof aiBody.model, 'string');
});

test('in-memory auth and report persistence work when MongoDB is offline', async () => {
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tester@example.com', password: 'password12345' })
  });
  const registerBody = await registerRes.json();
  assert.equal(registerRes.status, 201);
  assert.ok(registerBody.token);
  assert.equal(registerBody.user.email, 'tester@example.com');

  const saveRes = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registerBody.token}`
    },
    body: JSON.stringify({
      title: 'Test Snapshot',
      snapshot: { datasetName: 'Metro', recordCount: 57 },
      summary: 'Test summary'
    })
  });
  assert.equal(saveRes.status, 201);

  const listRes = await fetch(`${baseUrl}/api/reports`, {
    headers: { Authorization: `Bearer ${registerBody.token}` }
  });
  const listBody = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.equal(listBody.reports.length, 1);
  assert.equal(listBody.reports[0].title, 'Test Snapshot');
});


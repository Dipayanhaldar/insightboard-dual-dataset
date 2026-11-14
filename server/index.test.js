import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

test('production account routes fail closed when JWT_SECRET is not configured', () => {
  const script = `
    import app from './server/index.js';
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'blocked@example.com', password: 'password12345' })
        });
        const body = await response.json();
        if (response.status !== 503 || !String(body.error || '').includes('not configured')) process.exitCode = 1;
      } catch {
        process.exitCode = 1;
      } finally {
        server.close(() => process.exit(process.exitCode || 0));
      }
    });
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '' }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
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
  assert.equal(body.service, 'InsightBoard VDB API');
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

test('lifetime-free AI summary and retail optimization endpoints work without personal API keys', async () => {
  const summaryRes = await fetch(`${baseUrl}/api/ai/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'en',
      snapshot: {
        datasetName: 'Shopping Mall & Retail Sales — Flagship Portfolio',
        recordCount: 16,
        sourceRecordCount: 16,
        fields: ['Store Name', 'Mall Zone', 'Monthly Revenue Inr'],
        numericMetrics: [{ field: 'Monthly Revenue Inr', average: 8950000, sum: 143200000 }],
        topCategories: [{ category: 'Atrium Ground', average: 18350000, count: 3, total: 55050000 }]
      }
    })
  });
  const summaryBody = await summaryRes.json();
  assert.equal(summaryRes.status, 200);
  assert.ok(typeof summaryBody.summary === 'string' && summaryBody.summary.length > 40);

  const optimizeRes = await fetch(`${baseUrl}/api/ai/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      datasetName: 'Shopping Mall & Retail Sales — Flagship Portfolio',
      metrics: {
        totalRevenue: 143200000,
        targetAttainment: 98.4,
        avgConversionRate: 18.2,
        revenuePerSqft: 2450
      }
    })
  });
  const optimizeBody = await optimizeRes.json();
  assert.equal(optimizeRes.status, 200);
  assert.ok(typeof optimizeBody.plan === 'string' && optimizeBody.plan.length > 40);
});

test('Google sign-in requires a verified Firebase ID token; email/password remains available', async () => {
  const portableRes = await fetch(`${baseUrl}/api/auth/google/portable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mall.manager@corporate.com', name: 'Mall Manager' })
  });
  assert.equal(portableRes.status, 404);

  const oauthUrlRes = await fetch(`${baseUrl}/api/auth/google/url`);
  assert.equal(oauthUrlRes.status, 404);

  const forgedIdentityRes = await fetch(`${baseUrl}/api/auth/google/firebase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mall.manager@corporate.com', name: 'Mall Manager' })
  });
  assert.equal(forgedIdentityRes.status, 401);

  const invalidTokenRes = await fetch(`${baseUrl}/api/auth/google/firebase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: 'not-a-firebase-id-token' })
  });
  assert.equal(invalidTokenRes.status, 401);

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'email-login@example.com', password: 'password12345' })
  });
  assert.equal(registerRes.status, 201);
});

test('Python scientific backend health and OLS/IQR/Monte Carlo analysis endpoints work automatically', async () => {
  const healthRes = await fetch(`${baseUrl}/api/python/health`);
  const healthBody = await healthRes.json();
  assert.equal(healthRes.status, 200);
  assert.equal(healthBody.status, 'ok');
  assert.ok(Array.isArray(healthBody.capabilities));

  const analyzeRes = await fetch(`${baseUrl}/api/python/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      datasetName: 'Enterprise Revenue & Workforce',
      fields: ['department', 'revenue', 'headcount'],
      primaryMetric: 'revenue',
      secondaryMetric: 'headcount',
      primaryCategory: 'department',
      rows: [
        { department: 'Cloud', revenue: 120000, headcount: 12 },
        { department: 'Cloud', revenue: 150000, headcount: 15 },
        { department: 'AI', revenue: 210000, headcount: 20 },
        { department: 'Ops', revenue: 80000, headcount: 8 }
      ]
    })
  });
  const analyzeBody = await analyzeRes.json();
  assert.equal(analyzeRes.status, 200);
  assert.equal(analyzeBody.status, 'ok');
  assert.equal(analyzeBody.statistics.sum, 560000);
  assert.ok(analyzeBody.regression);
  assert.ok(analyzeBody.monteCarloForecast.p90Optimistic >= analyzeBody.monteCarloForecast.p10Conservative);
});

test('Search grounding, audio transcription, and live voice conversation endpoints work silently without personal keys', async () => {
  const searchRes = await fetch(`${baseUrl}/api/ai/search-grounding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Hyderabad Metro Rail corridor ridership benchmarks',
      datasetName: 'Hyderabad Metro station reference',
      snapshot: {
        datasetName: 'Hyderabad Metro station reference',
        recordCount: 57,
        fields: ['Station Name', 'Line', 'Platforms']
      }
    })
  });
  const searchBody = await searchRes.json();
  assert.equal(searchRes.status, 200);
  assert.ok(typeof searchBody.answer === 'string' && searchBody.answer.length > 20);
  assert.ok(Array.isArray(searchBody.sources) && searchBody.sources.length >= 1);

  const transcribeRes = await fetch(`${baseUrl}/api/ai/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mimeType: 'audio/webm',
      clientTranscript: 'Compare top performing corridors and flag outliers',
      datasetName: 'Hyderabad Metro station reference'
    })
  });
  const transcribeBody = await transcribeRes.json();
  assert.equal(transcribeRes.status, 200);
  assert.equal(transcribeBody.model, 'gemini-3.5-transcribe');
  assert.ok(transcribeBody.transcript.includes('Compare top performing'));

  const liveRes = await fetch(`${baseUrl}/api/ai/live-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What is our leading segment?',
      snapshot: {
        datasetName: 'Corporate Dataset',
        recordCount: 16,
        fields: ['Unit', 'Segment', 'Revenue'],
        numericMetrics: [{ field: 'Revenue', average: 5410000, sum: 86560000 }],
        topCategories: [{ category: 'Central Plaza', count: 4, average: 8200000, total: 32800000 }]
      }
    })
  });
  const liveBody = await liveRes.json();
  assert.equal(liveRes.status, 200);
  assert.equal(liveBody.model, 'gemini-3.8-live');
  assert.ok(typeof liveBody.reply === 'string' && liveBody.reply.length > 20);
});

test('security hardening status, SHA-256 dataset integrity verification, and payload sanitization work without external dependencies', async () => {
  const statusRes = await fetch(`${baseUrl}/api/security/status`);
  const statusBody = await statusRes.json();
  assert.equal(statusRes.status, 200);
  assert.equal(statusBody.status, 'hardened');
  assert.equal(statusBody.vendorIndependent, true);
  assert.equal(responseHeaderPresent(statusRes, 'x-content-type-options'), true);

  const verifyRes = await fetch(`${baseUrl}/api/security/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      datasetName: 'Audit Portfolio',
      rows: [
        { store: 'Anchor A', revenue: 125000, note: '=CMD|"/C calc"!A0' },
        { store: 'Anchor B', revenue: 190000, note: 'Standard record' }
      ]
    })
  });
  const verifyBody = await verifyRes.json();
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyBody.verified, true);
  assert.equal(verifyBody.algorithm, 'SHA-256');
  assert.match(verifyBody.sha256, /^[0-9a-f]{64}$/);
  assert.equal(verifyBody.formulaTriggersNeutralized, 1);
});

function responseHeaderPresent(res, headerName) {
  return Boolean(res.headers.get(headerName));
}

test('Universal Connector OpenAPI 3.1 spec, live POS webhook feed, and stateless INSI analyze endpoints return valid structured schemas', async () => {
  const openApiRes = await fetch(`${baseUrl}/api/connector/openapi.json`);
  const openApiBody = await openApiRes.json();
  assert.equal(openApiRes.status, 200);
  assert.equal(openApiBody.openapi, '3.1.0');
  assert.ok(openApiBody.paths['/api/connector/analyze']);

  const feedRes = await fetch(`${baseUrl}/api/connector/sample-pos-feed`);
  const feedBody = await feedRes.json();
  assert.equal(feedRes.status, 200);
  assert.equal(feedBody.status, 'ok');
  assert.ok(Array.isArray(feedBody.data?.stores) && feedBody.data.stores.length > 0);

  const analyzeRes = await fetch(`${baseUrl}/api/connector/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: 'Hey NC, show revenue by store as a bar chart, highlight the bottom 2 stores in red, and export a CSV',
      active_mode: 'api_webhook',
      dataset_name: 'External POS Webhook'
    })
  });
  const analyzeBody = await analyzeRes.json();
  assert.equal(analyzeRes.status, 200);
  assert.ok(analyzeBody.mascot_state);
  assert.equal(analyzeBody.connector_status.active_mode, 'api_webhook');
  assert.ok(analyzeBody.voice_reply.split(/\s+/).length <= 35);
  assert.ok(Array.isArray(analyzeBody.dashboard_actions) && analyzeBody.dashboard_actions.length >= 2);
  assert.ok(Array.isArray(analyzeBody.processed_data) && analyzeBody.processed_data.length > 0);
});



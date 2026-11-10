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

test('cross-platform Google OAuth URL and portable Google SSO endpoints function across hosts', async () => {
  const urlRes = await fetch(`${baseUrl}/api/auth/google/url?origin=${encodeURIComponent(baseUrl)}`);
  const urlBody = await urlRes.json();
  assert.equal(urlRes.status, 200);
  assert.equal(typeof urlBody.redirectUri, 'string');
  assert.ok(urlBody.redirectUri.endsWith('/auth/callback'));

  const ssoRes = await fetch(`${baseUrl}/api/auth/google/portable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mall.manager@corporate.com', name: 'Mall Manager' })
  });
  const ssoBody = await ssoRes.json();
  assert.equal(ssoRes.status, 200);
  assert.ok(ssoBody.token);
  assert.equal(ssoBody.user.email, 'mall.manager@corporate.com');
  assert.equal(ssoBody.user.provider, 'google');
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

import test from 'node:test';
import assert from 'node:assert/strict';

import authHandler, { __testResetAuthLimiter } from '../api/auth.js';
import geminiHandler, { __testResetGeminiLimiter } from '../api/gemini.js';
import reportsHandler, { buildCosmosSigningText } from '../api/reports.js';
import { hasValidSession, setSessionCookie } from '../lib/serverAuth.js';

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function getSessionCookieValue() {
  const req = { headers: { 'x-forwarded-proto': 'https' } };
  const res = createRes();
  setSessionCookie(req, res);
  return String(res.headers['Set-Cookie']).split(';')[0];
}

test('malformed cookie does not throw and is treated as invalid', () => {
  process.env.INSIGHTBOARD_APP_PASSWORD = 'secret';
  process.env.INSIGHTBOARD_SESSION_SECRET = 'super-secret-value';

  const req = { headers: { cookie: 'insightboard_session=%E0%A4%A' } };
  assert.doesNotThrow(() => hasValidSession(req));
  assert.equal(hasValidSession(req), false);
});

test('auth failed-login throttling returns 429 after repeated failures', async () => {
  process.env.INSIGHTBOARD_APP_PASSWORD = 'correct-password';
  process.env.INSIGHTBOARD_SESSION_SECRET = 'super-secret-value';
  delete process.env.GEMINI_API_KEY;
  __testResetAuthLimiter();

  let statusCodes = [];
  for (let i = 0; i < 7; i += 1) {
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.10' },
      body: { password: 'wrong-password' },
    };
    const res = createRes();
    await authHandler(req, res);
    statusCodes.push(res.statusCode);
  }

  assert.equal(statusCodes.at(-1), 429);
});

test('gemini rejects oversized context with 413', async () => {
  process.env.INSIGHTBOARD_APP_PASSWORD = 'secret';
  process.env.INSIGHTBOARD_SESSION_SECRET = 'super-secret-value';
  process.env.GEMINI_API_KEY = 'not-a-real-key';
  __testResetGeminiLimiter();

  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('fetch should not be called for oversized context');
  };

  try {
    const req = {
      method: 'POST',
      headers: {
        cookie: getSessionCookieValue(),
        'x-forwarded-for': '203.0.113.11',
      },
      body: {
        message: 'Summarize this dataset',
        context: { sample: 'x'.repeat(30_100) },
        history: [],
      },
    };
    const res = createRes();
    await geminiHandler(req, res);
    assert.equal(res.statusCode, 413);
  } finally {
    global.fetch = originalFetch;
  }
});

test('reports rejects oversized metrics with 413', async () => {
  process.env.INSIGHTBOARD_APP_PASSWORD = 'secret';
  process.env.INSIGHTBOARD_SESSION_SECRET = 'super-secret-value';
  process.env.AZURE_COSMOS_ENDPOINT = 'https://example-cosmos.documents.azure.com';
  process.env.AZURE_COSMOS_KEY = Buffer.from('test-key').toString('base64');
  delete process.env.AZURE_COSMOS_DATABASE;
  delete process.env.AZURE_COSMOS_CONTAINER;

  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('fetch should not be called for oversized metrics');
  };

  try {
    const req = {
      method: 'POST',
      headers: {
        cookie: getSessionCookieValue(),
      },
      body: {
        answer: 'Summary text',
        metrics: { giant: 'x'.repeat(13_000) },
      },
    };
    const res = createRes();
    await reportsHandler(req, res);
    assert.equal(res.statusCode, 413);
  } finally {
    global.fetch = originalFetch;
  }
});

test('cosmos signing text preserves resource-link case', () => {
  const resourceLink = 'dbs/InsightBoardDB/colls/ReportsContainer';
  const text = buildCosmosSigningText('POST', 'docs', resourceLink, 'Mon, 01 Jan 2026 00:00:00 GMT');
  assert.match(text, new RegExp(resourceLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(text.includes(resourceLink.toLowerCase()), false);
});

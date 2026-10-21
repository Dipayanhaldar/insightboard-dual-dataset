import crypto from 'node:crypto';
import { requireSession } from '../lib/serverAuth.js';

const PROJECT_SHARED_OWNER_ID = 'insightboard';
// Prototype behavior: every authenticated user shares this project-wide owner partition.
// This is not per-user isolation and must not be used for sensitive or personal data.

const MAX_BODY_BYTES = 120_000;
const MAX_DATASET_NAME_CHARS = 150;
const MAX_QUESTION_CHARS = 1200;
const MAX_ANSWER_CHARS = 8000;
const MAX_METRICS_SERIALIZED_CHARS = 12_000;
const MAX_METRICS_DEPTH = 5;
const MAX_METRICS_KEYS = 250;
const MAX_METRICS_ARRAY_ITEMS = 250;
const MAX_REPORTS_PER_PROJECT = 250;
const HISTORY_LIST_LIMIT = 25;

function getCosmosConfig() {
  const endpoint = process.env.AZURE_COSMOS_ENDPOINT?.replace(/\/+$/, '');
  const key = process.env.AZURE_COSMOS_KEY;
  const database = process.env.AZURE_COSMOS_DATABASE || 'insightboard';
  const container = process.env.AZURE_COSMOS_CONTAINER || 'reports';
  return endpoint && key ? { endpoint, key, database, container } : null;
}

export function buildCosmosSigningText(method, resourceType, resourceLink, date) {
  return `${method.toLowerCase()}\n${resourceType.toLowerCase()}\n${resourceLink}\n${date.toLowerCase()}\n\n`;
}

function getContentLength(req) {
  const raw = req.headers?.['content-length'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateMetrics(value, depth = 0, state = { keys: 0 }) {
  if (depth > MAX_METRICS_DEPTH) return false;
  if (value === null) return true;

  const type = typeof value;
  if (type === 'string') return value.length <= 1000;
  if (type === 'number') return Number.isFinite(value);
  if (type === 'boolean') return true;

  if (Array.isArray(value)) {
    if (value.length > MAX_METRICS_ARRAY_ITEMS) return false;
    return value.every((item) => validateMetrics(item, depth + 1, state));
  }

  if (type === 'object') {
    const entries = Object.entries(value);
    state.keys += entries.length;
    if (state.keys > MAX_METRICS_KEYS) return false;
    for (const [key, nested] of entries) {
      if (key.length > 120) return false;
      if (!validateMetrics(nested, depth + 1, state)) return false;
    }
    return true;
  }

  return false;
}

async function cosmosRequest(config, method, resourceType, resourceLink, path, body, extraHeaders = {}) {
  const date = new Date().toUTCString();
  const signingText = buildCosmosSigningText(method, resourceType, resourceLink, date);
  const signature = crypto.createHmac('sha256', Buffer.from(config.key, 'base64')).update(signingText).digest('base64');
  const authorization = encodeURIComponent(`type=master&ver=1.0&sig=${signature}`);

  const response = await fetch(`${config.endpoint}/${path}`, {
    method,
    headers: {
      Authorization: authorization,
      'x-ms-date': date,
      'x-ms-version': '2018-12-31',
      Accept: 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = String(result?.message || result?.Message || '').slice(0, 250);
    console.error('Cosmos request failed', { status: response.status, path, detail });
    throw new Error('Cosmos request failed');
  }

  return result;
}

async function getExistingReportCount(config, resourceLink, documentPath) {
  const querySpec = {
    query: 'SELECT VALUE COUNT(1) FROM c WHERE c.ownerId = @ownerId',
    parameters: [{ name: '@ownerId', value: PROJECT_SHARED_OWNER_ID }],
  };

  const result = await cosmosRequest(config, 'POST', 'docs', resourceLink, documentPath, querySpec, {
    'Content-Type': 'application/query+json',
    'x-ms-documentdb-isquery': 'True',
    'x-ms-documentdb-query-enablecrosspartition': 'True',
    'x-ms-documentdb-partitionkey': JSON.stringify([PROJECT_SHARED_OWNER_ID]),
  });

  const count = Array.isArray(result.Documents) ? Number(result.Documents[0]) : 0;
  return Number.isFinite(count) ? count : 0;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  if (!requireSession(req, res)) return;

  const config = getCosmosConfig();
  if (!config) {
    return res.status(503).json({ error: 'Saved report history is not configured. Add AZURE_COSMOS_ENDPOINT and AZURE_COSMOS_KEY in Vercel.' });
  }

  const bodyBytes = getContentLength(req);
  if (bodyBytes !== null && bodyBytes > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request payload is too large.' });
  }

  const resourceLink = `dbs/${config.database}/colls/${config.container}`;
  const documentPath = `${resourceLink}/docs`;

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body || '{}');
        } catch {
          return res.status(400).json({ error: 'Invalid JSON request body.' });
        }
      }
      body = body && typeof body === 'object' ? body : {};

      if (Object.prototype.hasOwnProperty.call(body, 'ownerId')) {
        return res.status(400).json({ error: 'ownerId is controlled by the server in this prototype.' });
      }

      const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
      if (!answer) return res.status(400).json({ error: 'A non-empty AI summary is required.' });
      if (answer.length > MAX_ANSWER_CHARS) return res.status(413).json({ error: 'Summary is too large.' });

      const datasetName = String(body.datasetName || 'Dataset').slice(0, MAX_DATASET_NAME_CHARS);
      const question = String(body.question || '').slice(0, MAX_QUESTION_CHARS);

      const metrics = body.metrics && typeof body.metrics === 'object' ? body.metrics : {};
      if (!validateMetrics(metrics)) {
        return res.status(413).json({ error: 'Metrics payload is too large or too deeply nested.' });
      }

      const metricsSerialized = JSON.stringify(metrics);
      if (metricsSerialized.length > MAX_METRICS_SERIALIZED_CHARS) {
        return res.status(413).json({ error: 'Metrics payload is too large or too deeply nested.' });
      }

      const existingCount = await getExistingReportCount(config, resourceLink, documentPath);
      if (existingCount >= MAX_REPORTS_PER_PROJECT) {
        return res.status(429).json({ error: 'Prototype report history limit reached. Remove older reports before saving new ones.' });
      }

      const doc = {
        id: crypto.randomUUID(),
        ownerId: PROJECT_SHARED_OWNER_ID,
        createdAt: new Date().toISOString(),
        datasetName,
        question,
        answer,
        metrics,
      };

      const result = await cosmosRequest(config, 'POST', 'docs', resourceLink, documentPath, doc, {
        'Content-Type': 'application/json',
        'x-ms-documentdb-partitionkey': JSON.stringify([PROJECT_SHARED_OWNER_ID]),
      });

      return res.status(201).json({ saved: true, report: result });
    }

    const querySpec = {
      query: `SELECT TOP ${HISTORY_LIST_LIMIT} c.id, c.ownerId, c.createdAt, c.datasetName, c.question, c.answer, c.metrics FROM c WHERE c.ownerId = @ownerId ORDER BY c.createdAt DESC`,
      parameters: [{ name: '@ownerId', value: PROJECT_SHARED_OWNER_ID }],
    };

    const result = await cosmosRequest(config, 'POST', 'docs', resourceLink, documentPath, querySpec, {
      'Content-Type': 'application/query+json',
      'x-ms-documentdb-isquery': 'True',
      'x-ms-documentdb-query-enablecrosspartition': 'True',
      'x-ms-documentdb-partitionkey': JSON.stringify([PROJECT_SHARED_OWNER_ID]),
    });

    return res.status(200).json({ reports: result.Documents || [] });
  } catch (error) {
    console.error('Report storage failure', { message: String(error?.message || error).slice(0, 120) });
    return res.status(502).json({ error: 'Saved report history is temporarily unavailable. Please try again.' });
  }
}

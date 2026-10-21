import crypto from 'node:crypto';
import { hasAuthConfiguration, hasValidSession, setSessionCookie, clearSessionCookie } from '../lib/serverAuth.js';

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_LOGINS_PER_WINDOW = 6;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

// Best-effort in-memory limiter for serverless functions.
// This is per-instance only; use a shared external store for global enforcement.
const failedLoginAttempts = new Map();

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getClientKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 120);
  }
  return String(req.socket?.remoteAddress || 'unknown').slice(0, 120);
}

function reportsConfigured() {
  return Boolean(process.env.AZURE_COSMOS_ENDPOINT && process.env.AZURE_COSMOS_KEY);
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getThrottleState(key, now) {
  const state = failedLoginAttempts.get(key);
  if (!state) return null;
  if (state.blockedUntil > now) return state;
  if (now - state.windowStart > LOGIN_WINDOW_MS) {
    failedLoginAttempts.delete(key);
    return null;
  }
  return state;
}

function registerFailedLogin(key, now) {
  const current = getThrottleState(key, now);
  if (!current) {
    failedLoginAttempts.set(key, { windowStart: now, failures: 1, blockedUntil: 0 });
    return { blockedUntil: 0, failures: 1 };
  }

  const failures = current.failures + 1;
  const blockedUntil = failures >= MAX_FAILED_LOGINS_PER_WINDOW ? now + BLOCK_DURATION_MS : 0;
  failedLoginAttempts.set(key, { ...current, failures, blockedUntil });
  return { blockedUntil, failures };
}

function clearFailedLogins(key) {
  failedLoginAttempts.delete(key);
}

export function __testResetAuthLimiter() {
  failedLoginAttempts.clear();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const configured = hasAuthConfiguration();
    const response = {
      configured,
      authenticated: configured && hasValidSession(req),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      reportsConfigured: reportsConfigured(),
    };
    if (!isProduction()) {
      response.missing = [
        ...(!process.env.INSIGHTBOARD_APP_PASSWORD ? ['INSIGHTBOARD_APP_PASSWORD'] : []),
        ...(!process.env.INSIGHTBOARD_SESSION_SECRET ? ['INSIGHTBOARD_SESSION_SECRET'] : []),
        ...(!process.env.GEMINI_API_KEY ? ['GEMINI_API_KEY'] : []),
      ];
    }
    return res.status(200).json(response);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body.' });
    }
  }
  body = body || {};

  if (body.action === 'logout') {
    clearSessionCookie(req, res);
    return res.status(200).json({ configured: hasAuthConfiguration(), authenticated: false });
  }

  if (!hasAuthConfiguration()) {
    return res.status(503).json({ error: 'Authentication is not configured for this deployment.' });
  }

  const key = getClientKey(req);
  const now = Date.now();
  const throttle = getThrottleState(key, now);
  if (throttle?.blockedUntil > now) {
    const retryAfter = Math.ceil((throttle.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many failed login attempts. Try again later.' });
  }

  if (!safeEqual(body.password, process.env.INSIGHTBOARD_APP_PASSWORD)) {
    const failed = registerFailedLogin(key, now);
    if (failed.blockedUntil > now) {
      res.setHeader('Retry-After', String(Math.ceil((failed.blockedUntil - now) / 1000)));
      return res.status(429).json({ error: 'Too many failed login attempts. Try again later.' });
    }
    return res.status(401).json({ error: 'Incorrect project access password.' });
  }

  clearFailedLogins(key);
  setSessionCookie(req, res);
  return res.status(200).json({
    configured: true,
    authenticated: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    reportsConfigured: reportsConfigured(),
  });
}

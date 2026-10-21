import crypto from 'node:crypto';

const COOKIE_NAME = 'insightboard_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const COOKIE_SAME_SITE = 'Lax';

export function hasAuthConfiguration() {
  return Boolean(process.env.INSIGHTBOARD_APP_PASSWORD && process.env.INSIGHTBOARD_SESSION_SECRET);
}

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf('=');
        if (i < 0) return [part, ''];
        const key = part.slice(0, i);
        try {
          return [key, decodeURIComponent(part.slice(i + 1))];
        } catch {
          return [key, ''];
        }
      })
  );
}

function signature(expiry) {
  return crypto.createHmac('sha256', process.env.INSIGHTBOARD_SESSION_SECRET).update(String(expiry)).digest('hex');
}

function forwardedProto(req) {
  const value = req.headers?.['x-forwarded-proto'];
  if (typeof value !== 'string') return '';
  const first = value.split(',')[0]?.trim().toLowerCase();
  if (first === 'https' || first === 'http') return first;
  return '';
}

function shouldUseSecureCookie(req) {
  if (process.env.NODE_ENV === 'production') return true;
  return forwardedProto(req) === 'https';
}

function buildCookie(req, value, maxAgeSeconds) {
  const maxAge = Math.max(0, Math.floor(Number(maxAgeSeconds) || 0));
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Path=/',
    `SameSite=${COOKIE_SAME_SITE}`,
    `Max-Age=${maxAge}`,
  ];
  if (maxAge === 0) attrs.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  if (shouldUseSecureCookie(req)) attrs.push('Secure');
  return attrs.join('; ');
}

export function hasValidSession(req) {
  if (!hasAuthConfiguration()) return false;
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return false;

  const [expiryText, provided, extra] = token.split('.');
  const expiry = Number(expiryText);
  if (extra !== undefined || !Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
  if (!provided || !/^[a-f0-9]+$/i.test(provided)) return false;

  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(signature(expiryText), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function requireSession(req, res) {
  if (!hasAuthConfiguration()) {
    res.status(503).json({ error: 'Backend authentication is not configured. Add INSIGHTBOARD_APP_PASSWORD and INSIGHTBOARD_SESSION_SECRET in Vercel.' });
    return false;
  }
  if (!hasValidSession(req)) {
    res.status(401).json({ error: 'Your session is missing or expired. Reopen the AI panel and sign in again.' });
    return false;
  }
  return true;
}

export function setSessionCookie(req, res) {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = `${expiry}.${signature(expiry)}`;
  res.setHeader('Set-Cookie', buildCookie(req, token, SESSION_TTL_SECONDS));
}

export function clearSessionCookie(req, res) {
  res.setHeader('Set-Cookie', buildCookie(req, '', 0));
}

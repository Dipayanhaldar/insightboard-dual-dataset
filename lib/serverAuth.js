import crypto from 'node:crypto';
const COOKIE_NAME = 'insightboard_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
export function hasAuthConfiguration() { return Boolean(process.env.INSIGHTBOARD_APP_PASSWORD && process.env.INSIGHTBOARD_SESSION_SECRET); }
function parseCookies(req) {
  const header = req.headers?.cookie || '';
  return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const i = part.indexOf('='); return i < 0 ? [part, ''] : [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
  }));
}
function signature(expiry) { return crypto.createHmac('sha256', process.env.INSIGHTBOARD_SESSION_SECRET).update(String(expiry)).digest('hex'); }
export function hasValidSession(req) {
  if (!hasAuthConfiguration()) return false;
  const token = parseCookies(req)[COOKIE_NAME]; if (!token) return false;
  const [expiryText, provided] = token.split('.'); const expiry = Number(expiryText);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now()/1000) || !provided) return false;
  const a = Buffer.from(provided,'hex'), b = Buffer.from(signature(expiryText),'hex');
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
export function requireSession(req,res) {
  if (!hasAuthConfiguration()) { res.status(503).json({error:'Backend authentication is not configured. Add INSIGHTBOARD_APP_PASSWORD and INSIGHTBOARD_SESSION_SECRET in Vercel.'}); return false; }
  if (!hasValidSession(req)) { res.status(401).json({error:'Your session is missing or expired. Reopen the AI panel and sign in again.'}); return false; }
  return true;
}
export function setSessionCookie(req,res) {
  const expiry=Math.floor(Date.now()/1000)+SESSION_TTL_SECONDS; const token=expiry+'.'+signature(expiry);
  const secure=req.headers?.['x-forwarded-proto']==='https'?'; Secure':'';
  res.setHeader('Set-Cookie',COOKIE_NAME+'='+encodeURIComponent(token)+'; HttpOnly; Path=/; SameSite=Lax; Max-Age='+SESSION_TTL_SECONDS+secure);
}
export function clearSessionCookie(req,res) {
  const secure=req.headers?.['x-forwarded-proto']==='https'?'; Secure':'';
  res.setHeader('Set-Cookie',COOKIE_NAME+'=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'+secure);
}

import jwt from 'jsonwebtoken';

const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const keyCache = new Map();

async function getFirebaseSigningKeys(fetchImpl = fetch) {
  const now = Date.now();
  const cached = keyCache.get(FIREBASE_CERTS_URL);
  if (cached && cached.expiresAt > now) return cached.keys;

  const response = await fetchImpl(FIREBASE_CERTS_URL, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error('Firebase signing keys are temporarily unavailable.');
  }

  const keys = await response.json();
  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) {
    throw new Error('Firebase signing key response was invalid.');
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\\d+)/i)?.[1] || 3600);
  keyCache.set(FIREBASE_CERTS_URL, {
    keys,
    expiresAt: now + Math.max(60, Math.min(maxAge, 86400)) * 1000
  });
  return keys;
}

export async function verifyFirebaseGoogleIdToken(idToken, projectId, fetchImpl = fetch) {
  if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 10000) {
    throw new Error('A valid Firebase ID token is required.');
  }
  if (typeof projectId !== 'string' || !/^[a-z0-9-]{3,128}$/.test(projectId)) {
    throw new Error('Firebase project ID is not configured.');
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || decoded.header?.alg !== 'RS256' || typeof decoded.header?.kid !== 'string') {
    throw new Error('Firebase ID token format is invalid.');
  }

  const keys = await getFirebaseSigningKeys(fetchImpl);
  const certificate = keys[decoded.header.kid];
  if (typeof certificate !== 'string') {
    keyCache.delete(FIREBASE_CERTS_URL);
    throw new Error('Firebase ID token signing key is unknown.');
  }

  const claims = jwt.verify(idToken, certificate, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
    clockTolerance: 5
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    typeof claims.sub !== 'string' ||
    !claims.sub ||
    !Number.isFinite(claims.iat) ||
    claims.iat > nowSeconds + 5 ||
    !Number.isFinite(claims.auth_time) ||
    claims.auth_time > nowSeconds + 5
  ) {
    throw new Error('Firebase ID token claims are invalid.');
  }
  return claims;
}

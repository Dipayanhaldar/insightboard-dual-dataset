import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyFirebaseGoogleIdToken } from './firebaseToken.js';

test('Firebase Google token verifier rejects malformed tokens before network access', async () => {
  let requested = false;
  await assert.rejects(
    verifyFirebaseGoogleIdToken('not-a-token', 'banded-field-nbcxw', async () => {
      requested = true;
      throw new Error('Network should not be called for malformed tokens.');
    }),
    /valid Firebase ID token/
  );
  assert.equal(requested, false);
});

test('Firebase Google token verifier requires a valid Firebase project ID', async () => {
  await assert.rejects(
    verifyFirebaseGoogleIdToken('x'.repeat(120), 'invalid project id'),
    /project ID/
  );
});

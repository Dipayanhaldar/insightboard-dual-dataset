# InsightBoard VDB — Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every unlisted path in `/databases/{database}/documents/{document=**}` is strictly denied (`allow read, write: if false;`).
2. **Verified Identity**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every document ID (`{userId}`, `{reportId}`) must satisfy `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Strict Ownership (`/users/{userId}` & `/reports/{reportId}`)**:
   - A `UserProfile` at `/users/{userId}` can only be read, created, or updated by `request.auth.uid == userId`, with `incoming().uid == request.auth.uid` and `plan == 'free'` (preventing self-assigned privilege escalation).
   - A `SavedReport` at `/reports/{reportId}` must reference an existing `/users/$(request.auth.uid)` profile (`exists(/databases/$(database)/documents/users/$(request.auth.uid))`), have `ownerId == request.auth.uid`, and can only be read (`get`/`list`), updated, or deleted by its owner (`resource.data.ownerId == request.auth.uid`).
5. **Temporal & Immutable Integrity**:
   - On `create`: `incoming().createdAt == request.time && incoming().updatedAt == request.time`.
   - On `update`: `incoming().createdAt == existing().createdAt && incoming().updatedAt == request.time`, and `ownerId` / `uid` are strictly immutable.

---

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Creating `/reports/rep_1` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating `/users/user_1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Report Create**: Authenticated as `user_A`, creating `/reports/rep_1` with `ownerId: "user_B"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection ("Ghost Field")**: Creating `/reports/rep_1` with an undeclared key `isAdmin: true` -> `PERMISSION_DENIED` via `hasOnly()`.
5. **Self-Assigned Paid Plan Escalation**: Creating or updating `/users/user_A` with `plan: "enterprise"` -> `PERMISSION_DENIED` (only `'free'` is permitted by client writes).
6. **ID Poisoning Attack**: Creating `/reports/rep$invalid!id` or a 500-char ID -> `PERMISSION_DENIED` via `isValidId(reportId)`.
7. **Denial-of-Wallet Oversized String**: Creating `/reports/rep_1` with a 50,000-character `summary` string -> `PERMISSION_DENIED` (`summary.size() <= 8000`).
8. **Orphaned Report Write**: Creating `/reports/rep_1` when `/users/$(request.auth.uid)` does not exist -> `PERMISSION_DENIED` via `exists()` check.
9. **Immutable Field Tampering**: Updating `/reports/rep_1` to change `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
10. **Forged Client Timestamp**: Creating `/reports/rep_1` with a past/future `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
11. **Unauthorized Cross-User List Scraping**: Executing a blanket `list` query on `/reports` without filtering `where('ownerId', '==', request.auth.uid)` -> `PERMISSION_DENIED` (`resource.data.ownerId == request.auth.uid`).
12. **Value Poisoning on Update**: Updating `/reports/rep_1` with `title: 99999` (number instead of string) -> `PERMISSION_DENIED` because `isValidSavedReport(incoming())` wraps the entire `allow update` block.

---

## 3. Red Team Audit & Verification Summary
- **Shadow Update Test**: Passed (`data.keys().hasAll(...) && data.keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` + `isValid[Entity](incoming())` on update).
- **Email Spoofing Test**: Passed (`isVerifiedUser()` checks `request.auth.token.email_verified == true`).
- **PII Blanket Test**: Passed (no email/phone stored in public profile; `/users/{userId}` restricted strictly to `isOwner(userId)`).
- **Query Trust Test**: Passed (`allow list` on `/reports/{reportId}` explicitly checks `isSignedIn() && resource.data.ownerId == request.auth.uid`).

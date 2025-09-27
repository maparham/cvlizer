# User Impersonation Feature — Design Plan (MVP)

## Approach Summary
- Goal: Let verified admins temporarily act as users with full auditability.
- Strategy: Server-side, DB-tracked impersonation sessions; opaque cookie; middleware sets effective identity.
- Guardrails: Block admin/inactive targets; strict TTL; full logging; clear banner; easy stop.

## Personas & Definitions
- Admin: Verified admin who can initiate impersonation.
- Target User: Non-admin, active account to impersonate.
- Original Identity: Admin’s authenticated identity.
- Effective Identity: Target user applied to authorization checks.

## Core Flows
- Start: Admin requests impersonation → server validates → creates session → sets cookie → redirect to user dashboard with banner.
- In-Session: App uses effective identity; admin features disabled; banner shows user + countdown; stop ends session.
- End: Admin stops or TTL expires → session closed, cookie cleared → redirect back to admin dashboard.
- Validate: Middleware checks cookie each request → sets effective/original identities accordingly.

## Authorization Rules
- Only verified admins can start sessions.
- Cannot impersonate admins or privileged/system accounts.
- Cannot impersonate inactive/suspended/deleted users.
- Enforce tenant/project boundaries (no cross-tenant).
- One active impersonation per admin; starting a new one ends the old.
- Optional: Require justification note per session.

## Data Model
### Table: `impersonation_sessions`
- `id` (uuid, pk)
- `admin_id` (fk), `target_user_id` (fk), `tenant_id` (nullable if single-tenant)
- `started_at`, `expires_at` (default 30m), `ended_at`
- `end_reason` (ended_by_admin|expired|revoked)
- `admin_ip`, `admin_user_agent`
- `original_admin_session_id` (fk to auth sessions)
- `revoked` (bool, default false)
- `justification` (text, optional)

Indexes:
- Unique partial: `(admin_id) WHERE ended_at IS NULL` (single active session per admin)
- `expires_at`, `target_user_id`, `tenant_id`

### Table: `audit_logs` (or reuse existing)
- `id`, `actor_id`, `actor_role`, `action`, `target_id`, `context` (json), `created_at`
- Actions: `impersonation_start`, `impersonation_end`, `impersonation_expire`, `impersonation_denied`, `impersonation_revoke`

## Token & Session Strategy
- Use opaque, random `session_id` stored only server-side.
- Cookie: `impersonation_session=<id>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`.
- Hard expiry (no refresh); default TTL 30 minutes.
- Bind to admin IP + user agent (configurable tolerance).
- No localStorage/sessionStorage; no tokens exposed to JS.
- For JWT stacks: optionally mint short-lived impersonation JWT with `sub_effective`, `sub_original`, `imp=true`, `exp`, but always validate against DB.

## API Design
- POST `/api/admin/impersonations/start`
  - Body: `target_user_id`, optional `justification`.
  - Admin-only, CSRF-protected, rate-limited.
  - On success: create session, set cookie, return `{ target, expires_at }` and/or redirect.
- POST `/api/admin/impersonations/end`
  - Admin-only; ends active session for caller; clears cookie; 204.
- GET `/api/admin/impersonations/active`
  - Admin-only; list active sessions (scoped by admin/tenant).
- GET `/api/auth/impersonation/status`
  - Any authenticated; returns `active`, `target_user`, `expires_at`, `remaining_seconds`.
- POST `/api/admin/impersonations/revoke/:id` (optional)
  - Higher-privilege admin revokes another admin’s session.

## Backend Middleware
- Resolve `originalUser` from standard auth.
- If `impersonation_session` cookie present:
  - Load session; check active, not expired, matches `admin_id`, IP/UA, tenant.
  - Set context: `effectiveUser = target`, `originalUser = admin`, `isImpersonating = true`.
- If expired/revoked: clear cookie; mark ended; respond 401 with `impersonation_expired` or redirect.
- Enforce: when `isImpersonating = true`, deny admin-only endpoints regardless of `originalUser`.
- Add observability headers: `X-Impersonating: true`, `X-Impersonating-User: <id>`.

## Frontend Integration
- Admin UI: “Impersonate” action on user list/profile; confirmation modal with policy + optional note.
- Global Banner: High-contrast warning; shows target name/email/id + “Time left: mm:ss” + “Stop” button.
- Status Polling: On app load and route changes, call `/api/auth/impersonation/status` to drive banner.
- Stop Action: Calls `/api/admin/impersonations/end`; on success, banner disappears; redirect to admin dashboard.
- Redirects: After start → target dashboard; after end/expire → admin dashboard (or last admin page).
- Accessibility: Keyboard focus management; ARIA-live countdown announcements (low frequency).

## Security Controls
- Cookies: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`.
- CSRF protection on all POST endpoints.
- Rate limiting: start endpoint by admin and by target.
- Input validation: strict types; reject unknown fields; consistent error codes.
- XSS: Never expose tokens to client; sanitize banner text; enforce CSP.
- Session binding: IP/UA checks; configurable strictness.
- Privilege reduction: Admin-only features disabled during impersonation.
- Strong randomness for session ids; rotate after admin login.

## Auditing & Logging
- Audit events include: admin, target, tenant, ip/ua, justification, expires_at, end_reason, duration, denial reasons.
- App logs: include `request_id`, `isImpersonating`, `originalUserId`, `effectiveUserId`.
- Reporting: Admin view + export by admin/target/tenant/date.

## Expiry & Cleanup
- Middleware treats past `expires_at` as invalid; ends session and clears cookie.
- Scheduled cleanup deletes sessions older than retention; retain audit logs per compliance.

## Rate Limiting
- Start: e.g., 10/hour per admin; 5/day per target (configurable).
- End: protected but lenient; return 429 with reset hints on abuse.

## Configuration
- `IMPERSONATION_ENABLED` (bool)
- `IMPERSONATION_TTL_SECONDS` (default 1800)
- `IMPERSONATION_COOKIE_NAME` (default `impersonation_session`)
- `IMPERSONATION_RATE_LIMIT_ADMIN_PER_HOUR`
- `IMPERSONATION_RATE_LIMIT_TARGET_PER_DAY`
- `IMPERSONATION_STRICT_IP_BINDING` (bool)
- `DATA_RETENTION_DAYS_SESSIONS`, `DATA_RETENTION_DAYS_AUDIT`

## Testing Strategy
- Unit: middleware identity switching; admin-feature denial; validation failures; expiry (time-travel).
- Integration: start → banner visible → actions use effective user → end → banner gone.
- Concurrency: starting a new session ends old; single active across devices.
- Security: CSRF tokens; cookie flags; IP/UA mismatch handling; rate limiting.
- E2E: redirects, countdown, expiry auto-end.

## Monitoring & Alerts
- Metrics: `impersonation_sessions_started_total`, `impersonation_sessions_active`, `impersonation_sessions_denied_total{reason}`, `impersonation_sessions_duration_seconds`.
- Alerts: spikes in denied starts; unusual active duration; high rate per admin.

## Rollout Plan
- Feature-flagged; internal admins first; gradual tenant/group enablement.
- Kill switch to revoke all sessions and disable endpoints.

## Data Retention & Compliance
- Retain sessions (e.g., 90 days); audit logs (e.g., 365 days).
- Document purpose and access controls; comply with regional regulations.

## Scalability & Architecture
- Stateless app nodes; DB-backed sessions; shared cookie signing keys.
- Proper indexing and pagination for listings.
- Idempotent cleanup workers; safe under retries.

## Edge Cases
- Admin logs out mid-session: end and clear cookie.
- Target suspended/deleted: revoke on next request.
- Clock skew: server-time authoritative; client countdown advisory.
- Multi-device admin: enforce one active session globally.
- Tenant switch: block during impersonation.

## Acceptance Criteria
- Simple start/stop via UI; optional justification.
- Clear banner with user identity and time remaining.
- Full audit trail for all actions and denials.
- Sessions auto-expire at 30 minutes; manual end works reliably.
- Admin-only features disabled while impersonating; effective user permissions enforced.
- Secure cookies, CSRF, rate limiting, input validation, and CSP in place.
- Seamless integration with existing auth; robust middleware behavior.
- Documentation for admins, developers, and operations.


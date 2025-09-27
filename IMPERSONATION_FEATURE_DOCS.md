# Admin User Impersonation Feature

This document describes the admin user impersonation feature, which allows verified administrators to temporarily act as other users for support and troubleshooting purposes.

## Overview

The impersonation feature enables verified admins to:
- Temporarily assume the identity of non-admin users
- Experience the application from the user's perspective
- Troubleshoot user-specific issues
- Provide direct user support

All impersonation activities are fully logged and audited for security and compliance.

## Security Features

### Authentication & Authorization
- Only verified admin users can start impersonation sessions
- Cannot impersonate other admin users
- Cannot impersonate inactive/suspended users
- Admin privileges are disabled during impersonation
- Sessions are bound to the original admin's IP and user agent

### Session Management
- Short-lived sessions (30 minutes default, configurable)
- Secure HTTP-only cookies with proper security flags
- Automatic session expiration and cleanup
- One active session per admin (starting new session ends previous)
- Server-side session validation on every request

### Audit Trail
- Complete logging of all impersonation activities:
  - Session start/end events
  - Session expiration
  - Failed impersonation attempts
  - All actions performed during impersonation
- Configurable data retention policies
- Admin and target user tracking

### Rate Limiting
- Configurable limits per admin (default: 10 sessions/hour)
- Configurable limits per target user (default: 5 sessions/day)
- Automatic rate limit enforcement with proper error messages

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Impersonation Feature Toggle
IMPERSONATION_ENABLED=true

# Session Configuration
IMPERSONATION_TTL_SECONDS=1800  # 30 minutes
IMPERSONATION_COOKIE_SECURE=false  # Set to true for production

# Rate Limiting
IMPERSONATION_RATE_LIMIT_ADMIN_PER_HOUR=10
IMPERSONATION_RATE_LIMIT_TARGET_PER_DAY=5

# Security
IMPERSONATION_STRICT_IP_BINDING=true

# Data Retention
DATA_RETENTION_DAYS_SESSIONS=90
DATA_RETENTION_DAYS_AUDIT=365

# Cleanup Service
CLEANUP_INTERVAL_MINUTES=60
```

### Admin User Configuration

Ensure the `ADMIN_EMAIL` environment variable is set to identify admin users:

```bash
ADMIN_EMAIL=admin@yourcompany.com
```

### Frontend Configuration

Ensure the admin email is configured in the frontend environment:

```bash
VITE_ADMIN_EMAIL=admin@yourcompany.com
```

## Database Schema

The feature adds one new table:

### `impersonation_sessions`
- `id` (UUID, primary key)
- `admin_id` (foreign key to users table)
- `target_user_id` (foreign key to users table)
- `started_at` (timestamp)
- `expires_at` (timestamp)
- `ended_at` (timestamp, nullable)
- `end_reason` (string: ended_by_admin|expired|revoked)
- `admin_ip` (string, nullable)
- `admin_user_agent` (text, nullable)
- `justification` (text, nullable)
- `revoked` (boolean, default false)

### Database Migration

The database tables will be created automatically when the application starts. The impersonation session model is imported in `/backend/src/database.py`.

## API Endpoints

### Admin Endpoints (requires admin privileges)

#### Start Impersonation
```
POST /api/admin/impersonations/start
Content-Type: application/json

{
  "target_user_id": "user-uuid",
  "justification": "Optional reason for impersonation"
}
```

#### End Impersonation
```
POST /api/admin/impersonations/end
```

#### List Active Sessions
```
GET /api/admin/impersonations/active?limit=100&offset=0
```

#### Revoke Session
```
POST /api/admin/impersonations/revoke/{session_id}
```

### Public Endpoints (any authenticated user)

#### Get Impersonation Status
```
GET /api/auth/impersonation/status
```

## Frontend Components

### Impersonation Banner
- Automatically displays when impersonation is active
- Shows target user information and countdown timer
- Provides one-click session termination
- Keyboard shortcut: Ctrl+Shift+E to end impersonation
- Accessible design with ARIA support

### Admin Dashboard Integration
- Impersonation button in user actions column
- Confirmation dialog with justification field
- Comprehensive warning about impersonation effects
- Automatic redirect to user dashboard after start

## Usage Guide

### For Administrators

1. **Starting Impersonation**
   - Navigate to Admin Dashboard
   - Find the target user in the Users tab
   - Click the impersonation icon (PersonAdd)
   - Optional: Provide justification for the impersonation
   - Click "Start Impersonation"
   - You'll be redirected to the user dashboard

2. **During Impersonation**
   - A prominent banner appears at the top showing:
     - Target user's email
     - Remaining session time
     - Quick stop button
   - All admin features are disabled
   - All actions are performed as the target user
   - Use Ctrl+Shift+E for quick session termination

3. **Ending Impersonation**
   - Click "Stop" in the banner
   - Use keyboard shortcut Ctrl+Shift+E
   - Session automatically expires after 30 minutes
   - You'll be redirected back to admin dashboard

### For Monitoring

1. **Audit Logs**
   - All impersonation activities are logged in the `audit_logs` table
   - Search for actions: `impersonation_start`, `impersonation_end`, `impersonation_expire`
   - Each log includes admin, target user, IP, timestamp, and details

2. **Active Sessions**
   - View current active sessions in Admin Dashboard
   - Monitor session duration and remaining time
   - Revoke sessions if necessary

## Security Considerations

### Deployment Recommendations
- Enable HTTPS in production (`IMPERSONATION_COOKIE_SECURE=true`)
- Configure proper CORS origins
- Set strong CSP headers
- Monitor impersonation logs regularly
- Set appropriate data retention policies

### Monitoring & Alerting
Set up alerts for:
- High frequency of impersonation attempts
- Failed impersonation attempts
- Long-running impersonation sessions
- Unusual patterns in audit logs

### Compliance
- Document your organization's impersonation policy
- Ensure justification requirements meet compliance needs
- Configure appropriate data retention periods
- Regular audit log reviews

## Troubleshooting

### Common Issues

1. **"Admin privileges required" error**
   - Ensure `ADMIN_EMAIL` environment variable is set
   - Verify the admin user's email matches exactly
   - Check that the admin user account is active

2. **"Rate limit exceeded" error**
   - Check rate limiting configuration
   - Wait for the rate limit window to reset
   - Consider adjusting limits if necessary

3. **Session not starting**
   - Verify target user is active and not an admin
   - Check browser console for JavaScript errors
   - Verify API endpoints are accessible

4. **Banner not appearing**
   - Check browser console for errors
   - Verify impersonation session cookie is set
   - Check that ImpersonationBanner is imported in App.tsx

### Testing

1. **Backend Testing**
   ```bash
   cd backend
   python -m pytest tests/unit/test_impersonation_service.py -v
   ```

2. **Frontend Testing**
   ```bash
   cd frontend
   npm test -- --testPathPattern=impersonation
   ```

3. **Manual Testing**
   - Create test admin and regular user accounts
   - Test full impersonation flow
   - Verify audit logging
   - Test session expiration
   - Test rate limiting

## Implementation Notes

### Backend Architecture
- Service layer: `impersonation_service.py` handles business logic
- API layer: `impersonation.py` provides REST endpoints
- Middleware: Enhanced `clerk_auth.py` with impersonation support
- Models: `impersonation_session.py` for database schema
- Cleanup: `cleanup_service.py` for session maintenance

### Frontend Architecture
- Service: `impersonationService.ts` for API communication
- Component: `ImpersonationBanner.tsx` for UI display
- Integration: Enhanced `AdminDashboard.tsx` with impersonation controls
- State management: Local component state with context support

### Key Design Decisions
- Server-side session storage for security
- Opaque session IDs in HTTP-only cookies
- Strict session validation with IP binding
- Comprehensive audit logging
- Automatic cleanup and expiration
- Rate limiting at multiple levels

## Future Enhancements

Potential improvements for future versions:
- Approval workflow for sensitive accounts
- Read-only impersonation mode
- Session notes and ticket linking
- User notification on impersonation
- Enhanced reporting dashboard
- Multi-tenant support with tenant boundaries
- Integration with external audit systems

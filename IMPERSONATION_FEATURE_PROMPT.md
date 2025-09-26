# User Impersonation Feature Implementation Prompt

## Overview

Implement a secure user impersonation feature that allows administrators to temporarily access user accounts for support and debugging purposes. The feature should enable admins to:

- Temporarily access any user's account with their permissions
- Debug user-reported issues by experiencing the same interface
- Provide support by viewing the user's exact perspective
- Maintain security through time-limited sessions and audit logging

## Core Requirements

### Authentication & Authorization
- Only verified administrators should be able to initiate impersonation
- Impersonation sessions should be time-limited (suggested: 30 minutes)
- Admins should not be able to impersonate other admins
- Inactive users should not be impersonatable

### Security Features
- All impersonation activities must be logged for audit purposes
- Sessions should automatically expire after the time limit
- Clear visual indication when impersonation is active
- Easy way to end impersonation sessions
- Protection against XSS attacks and token theft

### User Experience
- Prominent warning banner when impersonation is active
- Session duration and time remaining display
- One-click impersonation start/stop functionality
- Automatic redirect to appropriate dashboard after impersonation ends
- Clear indication of which user is being impersonated

### Data Management
- Track impersonation sessions with metadata (admin, target user, timestamps, IP, user agent)
- Store session information securely
- Clean up expired sessions automatically
- Maintain audit trail of all impersonation activities

## Technical Considerations

### Token Management
- Decide between JWT tokens, session cookies, or database sessions
- Consider security implications of client-side vs server-side token storage
- Implement proper token validation and refresh mechanisms
- Handle token expiration gracefully

### Database Design
- Design tables to track impersonation sessions
- Include necessary metadata for auditing
- Consider indexing for performance
- Plan for data retention and cleanup

### API Design
- Endpoints for starting impersonation
- Endpoints for ending impersonation
- Validation endpoints for checking active sessions
- Admin endpoints for managing active sessions

### Frontend Integration
- Banner component for impersonation status
- Integration with existing admin dashboard
- Update authentication flow to handle impersonation
- Ensure proper state management

## Security Best Practices

- Use strong, unique secrets for token generation
- Implement rate limiting on impersonation endpoints
- Log all impersonation activities with full context
- Use secure cookie settings (httpOnly, secure, sameSite)
- Validate all inputs and handle edge cases
- Implement proper error handling without information leakage

## Implementation Flexibility

The implementation approach is left to the developer's discretion. Consider:

- **Backend-focused**: Server-side session management with secure tokens
- **Frontend-focused**: Client-side state management with secure storage
- **Hybrid approach**: Combination of both with clear separation of concerns

Choose the approach that best fits your existing architecture, security requirements, and team expertise.

## Success Criteria

The feature is complete when:

1. Admins can impersonate users through a simple interface
2. Impersonation sessions are clearly indicated to the admin
3. All impersonation activities are properly logged
4. Sessions expire automatically and can be ended manually
5. The feature integrates seamlessly with existing authentication
6. Security best practices are followed throughout
7. The implementation is maintainable and well-documented

## Additional Considerations

- Consider implementing impersonation session limits per admin
- Plan for monitoring and alerting on suspicious impersonation patterns
- Design for scalability if you expect high impersonation usage
- Consider implementing impersonation approval workflows for sensitive accounts
- Plan for compliance with data protection regulations in your jurisdiction

This prompt provides the requirements and considerations for implementing a user impersonation feature while leaving the specific technical implementation details to the developer's discretion.

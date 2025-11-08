"""Security utilities module.

This module previously provided security-related decorators and utilities.
These have been moved to app.auth2.middleware for consistency.

For authentication:
- Use app.auth2.middleware.auth_required (decorator)
- Use app.auth2.middleware.get_current_user_from_token() (function)

For rate limiting:
- Use app.auth2.middleware.rate_limit (decorator)

For security headers:
- Use app.auth2.middleware.SecurityHeaders.apply_security_headers()
"""

# Security headers are now handled by app.auth2.middleware.SecurityHeaders
# This provides more comprehensive security headers including CSP, stricter frame options, etc.
# Rate limiting is handled by app.auth2.middleware.rate_limit
# Authentication is handled by app.auth2.middleware.auth_required and get_current_user_from_token 
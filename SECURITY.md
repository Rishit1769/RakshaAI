# Security Policy

## Supported Versions

| Component | Supported |
|---|---|
| Main branch | Yes |
| Current release line | Yes |
| Legacy branches without active maintenance | No |

## Reporting a Vulnerability

If you discover a security issue:

1. Do not open a public issue.
2. Contact the maintainers privately through the project’s primary communication channel.
3. Include:
   - a short summary
   - affected route or component
   - reproduction steps
   - impact assessment
   - screenshots or logs if helpful

Expected response timeline:

- initial acknowledgement: within 2 business days
- triage: within 5 business days
- remediation plan: based on severity and exploitability

## Security Architecture Overview

RakshaAI uses:

- JWT access tokens
- HttpOnly refresh-token cookies
- server-side authentication middleware
- role-based authorization checks
- request validation with Zod and related middleware
- TLS termination at the reverse proxy or platform edge

Data protection relies on:

- least-privilege role access
- hashed passwords and MPINs
- token rotation
- soft lifecycle flags for user status
- database-backed audit trails

## Known Security Considerations

- Client-side access tokens live in browser storage and should be treated as sensitive.
- The UI does not provide a global hardening layer for every modal or popup.
- Some integrations, such as email and object storage, are operational dependencies and can fail independently.
- Public self-registration is intentionally constrained for managed responder roles.

## Security Best Practices for Deployers

- Store secrets in a secret manager, not in source control.
- Use strong random JWT secrets.
- Keep PostgreSQL, MinIO, and SMTP access private to the deployment network.
- Enforce HTTPS at the proxy or ingress layer.
- Limit admin access to known IPs where possible.
- Review dependencies regularly and upgrade promptly for security fixes.

## Dependency Security

Recommended practice:

- run dependency audits during regular maintenance
- keep the backend and frontend package locks under review
- patch critical vulnerabilities promptly
- re-check any package that touches auth, crypto, uploads, or sockets before upgrade


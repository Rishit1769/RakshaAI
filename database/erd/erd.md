# RakshaAI — Entity Relationship Diagram

## Core Auth & RBAC Relationships

```
User (1) ─────────── (0..1) Worker
User (1) ─────────── (0..*)  Organization [created_by]
User (1) ─────────── (0..*) AuditLog [actor]
User (1) ─────────── (0..*) OtpVerification
User (1) ─────────── (0..*) UserSession
User (1) ─────────── (0..1) UserSafetyProfile
User (1) ─────────── (0..*) EmergencyContact
User (1) ─────────── (0..1) Volunteer
User (1) ─────────── (0..1) PoliceAccount

Organization (1) ──── (0..*) Worker

Worker (*) ──────────── (1) Organization
Worker (0..1) ────────── (1) User [optional link]
```

## Key Constraints

- A `super_admin` creates Organizations
- An `organization_admin` creates Workers
- Workers can only log in — they cannot self-register
- Users self-register → OTP verify → MPIN setup

## Cascade Rules

| Relation          | On Delete  |
|-------------------|------------|
| User → Session    | CASCADE    |
| User → OTP        | CASCADE    |
| User → SafetyProfile | CASCADE |
| Organization → Worker | CASCADE |
| Worker → User     | SET NULL   |
| AuditLog → User   | SET NULL   |

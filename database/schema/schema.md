# RakshaAI — Core Schema Reference

## users
| Column           | Type         | Notes                                   |
|------------------|--------------|-----------------------------------------|
| id               | UUID PK      | uuid_generate_v4()                      |
| full_name        | VARCHAR(100) |                                         |
| email            | VARCHAR(150) | UNIQUE                                  |
| phone            | VARCHAR(15)  | UNIQUE                                  |
| aadhaar_number   | VARCHAR(12)  | UNIQUE, nullable                        |
| password_hash    | TEXT         | bcrypt                                  |
| mpin_hash        | TEXT         | bcrypt, nullable — set after first login|
| role             | UserRole     | user/volunteer/police/admin/guardian/super_admin/organization_admin/worker |
| is_active        | BOOLEAN      | DEFAULT true                            |
| is_verified      | BOOLEAN      | DEFAULT false                           |
| is_email_verified| BOOLEAN      | DEFAULT false                           |
| last_login_at    | TIMESTAMPTZ  | nullable                                |
| created_at       | TIMESTAMPTZ  | DEFAULT now()                           |
| updated_at       | TIMESTAMPTZ  |                                         |
| deleted_at       | TIMESTAMPTZ  | nullable — soft delete                  |

## organizations
| Column            | Type              | Notes                     |
|-------------------|-------------------|---------------------------|
| id                | UUID PK           |                           |
| organization_name | VARCHAR(200)      |                           |
| organization_type | OrganizationType  | police/ngo/medical/government |
| description       | TEXT              | nullable                  |
| email             | VARCHAR(150)      | UNIQUE, nullable          |
| phone             | VARCHAR(15)       | nullable                  |
| address           | TEXT              | nullable                  |
| city              | VARCHAR(100)      | nullable                  |
| state             | VARCHAR(100)      | nullable                  |
| pincode           | VARCHAR(10)       | nullable                  |
| logo_url          | TEXT              | nullable                  |
| status            | OrganizationStatus| pending/approved/suspended/rejected |
| created_by_id     | UUID FK → users   |                           |
| approved_at       | TIMESTAMPTZ       | nullable                  |
| suspended_at      | TIMESTAMPTZ       | nullable                  |
| suspend_reason    | TEXT              | nullable                  |
| created_at        | TIMESTAMPTZ       |                           |
| updated_at        | TIMESTAMPTZ       |                           |

## workers
| Column          | Type         | Notes                                  |
|-----------------|--------------|----------------------------------------|
| id              | UUID PK      |                                        |
| user_id         | UUID FK      | → users (nullable, set after login)    |
| organization_id | UUID FK      | → organizations (CASCADE)              |
| worker_type     | WorkerType   | police_officer/volunteer/coordinator/ngo_worker/custom |
| custom_role     | VARCHAR(100) | nullable — for custom worker types     |
| email           | VARCHAR(150) | UNIQUE                                 |
| password_hash   | TEXT         | bcrypt                                 |
| full_name       | VARCHAR(100) |                                        |
| phone           | VARCHAR(15)  | nullable                               |
| is_active       | BOOLEAN      | DEFAULT true                           |
| created_at      | TIMESTAMPTZ  |                                        |
| updated_at      | TIMESTAMPTZ  |                                        |

## otp_verifications
| Column      | Type         | Notes                           |
|-------------|--------------|----------------------------------|
| id          | UUID PK      |                                  |
| user_id     | UUID FK      | → users (nullable)               |
| identifier  | VARCHAR(150) | email or phone                   |
| otp_hash    | TEXT         | bcrypt hashed OTP                |
| purpose     | VARCHAR(30)  | register/login/reset/verify/mpin |
| attempts    | INT          | DEFAULT 0                        |
| max_attempts| INT          | DEFAULT 3                        |
| is_used     | BOOLEAN      | DEFAULT false                    |
| expires_at  | TIMESTAMPTZ  |                                  |
| created_at  | TIMESTAMPTZ  |                                  |

## user_sessions
| Column        | Type         | Notes                    |
|---------------|--------------|--------------------------|
| id            | UUID PK      |                          |
| user_id       | UUID FK      | → users (CASCADE)        |
| token_hash    | TEXT         | bcrypt hashed token      |
| device_type   | VARCHAR(20)  | nullable                 |
| device_id     | VARCHAR(200) | nullable                 |
| ip_address    | TEXT         | nullable                 |
| user_agent    | TEXT         | nullable                 |
| is_active     | BOOLEAN      | DEFAULT true             |
| expires_at    | TIMESTAMPTZ  |                          |
| created_at    | TIMESTAMPTZ  |                          |

## audit_logs
| Column      | Type         | Notes                              |
|-------------|--------------|-------------------------------------|
| id          | UUID PK      |                                     |
| actor_id    | UUID FK      | → users (SET NULL on delete)        |
| actor_role  | UserRole     | nullable                            |
| action      | VARCHAR(100) | e.g. "user.register", "org.create"  |
| entity_type | VARCHAR(50)  | nullable — "User", "Organization"   |
| entity_id   | UUID         | nullable                            |
| metadata    | JSONB        | nullable                            |
| ip_address  | TEXT         | nullable                            |
| user_agent  | TEXT         | nullable                            |
| created_at  | TIMESTAMPTZ  |                                     |

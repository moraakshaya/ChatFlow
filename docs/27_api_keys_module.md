# 🔑 API Keys Module

## 📋 Module Information

| Property                    | Value                                                                         |
| --------------------------- | ----------------------------------------------------------------------------- |
| **Module**                  | API Keys                                                                      |
| **Version**                 | v1.1                                                                          |
| **Status**                  | 🟡 In Development                                                             |
| **Phase**                   | Phase 6 — Integration Platform                                                |
| **Previous Module**         | Public API                                                                    |
| **Next Module**             | Webhooks                                                                      |
| **Depends On**              | Authentication, Authorization, Public API, Rate Limiting, Validation, Logging |
| **Database**                | MongoDB                                                                       |
| **Cache / Temporary State** | Redis                                                                         |

---

# 📌 Overview

The **API Keys module** provides a secure authentication mechanism for external applications integrating with the chat platform.

For example:

```text
CRM
 │
 │ API Key
 ▼
Chat Platform
 │
 └── Public API
```

The CRM does not need access to the internal user authentication system.

Instead, it receives a dedicated API key associated with a specific project.

This makes the chat platform reusable by:

```text
CRM
HRM
ERP
Helpdesk
Project Management System
Other SaaS Applications
```

The API Keys module establishes the **credential layer** required by the Public API.

---

# 🎯 Objectives

The API Keys module should:

* Generate API keys securely
* Associate keys with projects
* Store only hashed secrets
* Store a non-secret key identifier for efficient lookup
* Validate incoming API keys
* Support key permissions/scopes
* Support key expiration
* Support key revocation
* Support controlled key rotation
* Track key usage
* Prevent unauthorized access
* Integrate with global/IP rate limiting
* Integrate with per-key rate limiting
* Integrate with structured logging
* Never expose the full key after creation
* Support multiple keys per project
* Enforce project isolation
* Protect API-key management endpoints

---

# 🧠 Core Principle

The actual API key must **never be stored as plain text**.

Bad:

```text
Database

apiKey:
cp_live_abc123...
```

Correct:

```text
Generated API Key
       │
       ├──────────────► One-time response
       │
       ▼
   Secret Hash
       │
       ▼
    MongoDB
```

The user receives the original key only when it is created.

After that, the platform stores only:

```text
keyId
keyPrefix
keyHash
```

The secret itself is never stored.

---

# 🔐 Key Lookup Principle

A password-style salted hash such as bcrypt or Argon2 should **not** be used as the only database lookup value.

For example, this is not the preferred design:

```text
Incoming API Key
      │
      ▼
Hash
      │
      ▼
MongoDB lookup using hash
```

Because a salted password-style hash produces a different hash value each time.

Instead, every API key should contain:

```text
Non-secret key identifier
+
Secret
```

For example:

```text
cp_live_7f82a9_xxxxxxxxxxxxxxxxx
        │
        │
        └── keyId
```

The database stores:

```text
keyId
keyPrefix
keyHash
projectId
```

Authentication then becomes:

```text
Incoming API Key
       │
       ▼
Extract keyId
       │
       ▼
Find API Key by keyId
       │
       ▼
Securely compare secret
       │
       ▼
Check revocation
       │
       ▼
Check expiration
       │
       ▼
Attach project context
       │
       ▼
Authenticated
```

This provides both:

* Efficient database lookup
* Secure secret storage

---

# 🏗️ API Key Architecture

```text
                    External Application
                            │
                            │ API Key
                            ▼
                       Public API
                            │
                            ▼
                  Global / IP Rate Limit
                            │
                            ▼
                    API Key Middleware
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
             Extract keyId          Invalid
                  │                   │
                  ▼                   ▼
          Find Key by keyId          401
                  │
                  ▼
        Secure Secret Comparison
                  │
            ┌─────┴─────┐
            ▼           ▼
          Valid       Invalid
            │           │
            ▼           ▼
       Check Status     401
            │
            ▼
      Check Expiration
            │
            ▼
      Attach Project Context
            │
            ▼
       Per-Key Rate Limit
            │
            ▼
         Controller
```

---

# 📂 Recommended Structure

```text
src/
│
├── models/
│   └── ApiKey.js
│
├── controllers/
│   └── apiKey.controller.js
│
├── services/
│   └── apiKey.service.js
│
├── routes/
│   ├── apiKey.routes.js
│   └── public/
│       └── v1/
│
├── middleware/
│   ├── apiKey.middleware.js
│   ├── apiKeyScope.middleware.js
│   └── rateLimit.middleware.js
│
├── utils/
│   └── apiKey.utils.js
│
└── config/
```

Adapt this structure to the existing project architecture.

---

# 🗄️ API Key Collection

Recommended MongoDB collection:

```text
apiKeys
```

Example document:

```json
{
  "_id": "...",
  "keyId": "7f82a9",
  "projectId": "...",
  "name": "CRM Production Key",
  "keyPrefix": "cp_live",
  "keyHash": "...",
  "scopes": [
    "messages:read",
    "messages:write",
    "conversations:read"
  ],
  "expiresAt": null,
  "lastUsedAt": null,
  "revokedAt": null,
  "createdBy": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Important Fields

| Field        | Purpose                                      |
| ------------ | -------------------------------------------- |
| `keyId`      | Non-secret identifier used to locate the key |
| `projectId`  | Project that owns the key                    |
| `name`       | Human-readable key name                      |
| `keyPrefix`  | Safe identifier such as `cp_live`            |
| `keyHash`    | Secure hash of the secret                    |
| `scopes`     | Permissions assigned to the key              |
| `expiresAt`  | Optional expiration date                     |
| `lastUsedAt` | Last successful authentication time          |
| `revokedAt`  | Timestamp when the key was revoked           |
| `createdBy`  | User who created the key                     |
| `createdAt`  | Creation timestamp                           |
| `updatedAt`  | Last metadata update                         |

---

# 🔗 Relationship

The key belongs to a project.

```text
Organization
      │
      ▼
Project
      │
      ├── API Key
      ├── API Key
      └── API Key
```

A project can have multiple API keys.

For example:

```text
CRM Project

├── Development Key
├── Staging Key
└── Production Key
```

This is much better than having one permanent key.

---

# 🏷️ API Key Name

Every key should have a human-readable name.

Examples:

```text
CRM Development
CRM Production
HRM Production
ERP Testing
Local Development
```

The name helps administrators identify which key is being used.

---

# 🔐 Key Format

Use a recognizable environment-specific prefix and a non-secret key identifier.

Example:

```text
cp_live_7f82a9_xxxxxxxxxxxxxxxxx
```

or:

```text
cp_test_9a31bc_xxxxxxxxxxxxxxxxx
```

Possible environments:

```text
cp_test_
cp_live_
```

A key can conceptually contain:

```text
environment
+
keyId
+
secret
```

For example:

```text
cp_live_7f82a9_xxxxxxxxxxxxxxxxx
   │       │            │
   │       │            └── Secret
   │       └─────────────── Key Identifier
   └─────────────────────── Environment
```

The key identifier is not considered secret.

The secret portion must remain confidential.

---

# 🔑 Key Generation

The generation flow:

```text
Admin / Authorized Project Owner
             │
             ▼
       Create API Key
             │
             ▼
 Generate Cryptographically Secure
        Random Identifier
             │
             ▼
 Generate Cryptographically Secure
            Secret
             │
             ▼
       Build Full API Key
             │
       ┌─────┴─────┐
       ▼           ▼
 Return Once    Hash Secret
       │           │
       ▼           ▼
    Client      MongoDB
```

The generated key must use a cryptographically secure random generator.

Do not use:

```javascript
Math.random()
```

for secret generation.

---

# 🧂 Secret Hashing

Only the secret portion of the API key needs to be securely hashed.

Conceptually:

```text
Full API Key
      │
      ├── keyId
      │
      └── secret
             │
             ▼
         Secure Hash
             │
             ▼
          keyHash
             │
             ▼
          MongoDB
```

For example:

```text
Full Key:

cp_live_7f82a9_xxxxxxxxxxxxxxxxx
         │
         └── secret portion
```

The database stores:

```text
keyId: 7f82a9
keyHash: <secure hash>
```

---

# 🔍 Authentication Lookup

When a request arrives:

```text
Authorization: Bearer cp_live_7f82a9_xxxxxxxxxxxxxxxxx
```

The middleware should:

```text
Incoming API Key
       │
       ▼
Parse key format
       │
       ▼
Extract keyId
       │
       ▼
Find MongoDB record by keyId
       │
       ▼
Extract stored keyHash
       │
       ▼
Securely compare incoming secret
       │
       ▼
Check revocation
       │
       ▼
Check expiration
       │
       ▼
Attach API Key + Project Context
```

This avoids attempting to locate the record by a salted hash.

---

# 🚫 Never Store Plain API Keys

Do not store:

```text
fullKey
secretKey
apiKeyPlain
```

in MongoDB.

Store:

```text
keyId
keyPrefix
keyHash
```

instead.

---

# 👁️ Key Prefix and Identifier

The system should distinguish between:

```text
keyPrefix
```

and:

```text
keyId
```

Example:

```text
cp_live_7f82a9_xxxxxxxxxxxxxxxxx
   │       │
   │       └── keyId
   └────────── prefix
```

The prefix identifies the environment/type.

The `keyId` identifies the specific credential record.

Neither should reveal the secret.

---

# 🗂️ API Key Management vs Public API Authentication

API-key management and API-key authentication have different responsibilities.

## API-Key Management

Performed by:

```text
Authenticated Platform User
        │
        ▼
Admin / Authorized Project Owner
        │
        ▼
API Key Management
```

Responsibilities:

```text
Create API key
List API keys
View metadata
Revoke API key
Rotate API key
Manage scopes
```

These operations require the platform's normal authenticated user system and project-level authorization.

---

## External Public API Authentication

External applications use:

```text
CRM
 │
 ▼
API Key
 │
 ▼
Public API
```

The API key authenticates the external application against Public API resources.

The external application should not use the API-key management endpoints as a substitute for normal project administration.

---

# 🔒 API-Key Management Security Boundary

API-key management endpoints must be protected by the internal authentication and authorization system.

Example:

```text
Authenticated User
       │
       ▼
Project Authorization
       │
       ▼
API Key Management
```

An external API key should not automatically be allowed to create or manage other API keys.

This prevents credential escalation.

---

# 📤 API Key Creation

An administrator or authorized project owner can create a key.

Endpoint:

```http
POST /api/v1/api-keys
```

Example request:

```json
{
  "name": "CRM Production",
  "scopes": [
    "messages:read",
    "messages:write"
  ]
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "key_123",
    "keyId": "7f82a9",
    "name": "CRM Production",
    "key": "cp_live_7f82a9_xxxxxxxxx",
    "scopes": [
      "messages:read",
      "messages:write"
    ],
    "expiresAt": null
  }
}
```

The complete `key` should be returned **only during creation**.

---

# ⚠️ One-Time Secret Display

After creation:

```text
Create
  │
  ▼
Generate Key
  │
  ▼
Show Full Key Once
  │
  ▼
User Copies Key
  │
  ▼
Never Show Full Key Again
```

Future API-key listing should return:

```json
{
  "id": "key_123",
  "keyId": "7f82a9",
  "name": "CRM Production",
  "keyPrefix": "cp_live",
  "lastUsedAt": "...",
  "expiresAt": null
}
```

Not:

```json
{
  "key": "cp_live_7f82a9_xxxxxxxxx"
}
```

---

# 📋 List API Keys

Endpoint:

```http
GET /api/v1/api-keys
```

This endpoint is a **credential-management endpoint** and requires an authenticated platform user with appropriate project-level permissions.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "key_123",
      "keyId": "7f82a9",
      "name": "CRM Production",
      "keyPrefix": "cp_live",
      "status": "active",
      "lastUsedAt": "...",
      "expiresAt": null
    }
  ]
}
```

Never return the secret.

---

# 🔎 Get API Key Details

Endpoint:

```http
GET /api/v1/api-keys/:id
```

Return metadata only.

Example:

```json
{
  "success": true,
  "data": {
    "id": "key_123",
    "keyId": "7f82a9",
    "name": "CRM Production",
    "status": "active",
    "scopes": [
      "messages:read",
      "messages:write"
    ],
    "createdAt": "...",
    "lastUsedAt": "..."
  }
}
```

The secret must never be returned.

---

# 🚫 Delete vs Revoke

For API credentials, **revocation** is usually more useful than immediate physical deletion.

Example:

```text
Active
  │
  ▼
Revoked
```

The record remains available for administrative visibility and audit purposes.

Physical deletion can be considered later as a separate retention policy.

---

# 🔒 Revoke API Key

Endpoint:

```http
PATCH /api/v1/api-keys/:id/revoke
```

After revocation:

```text
API Request
     │
     ▼
API Key
     │
     ▼
Revoked
     │
     ▼
401 Unauthorized
```

The key should immediately stop working.

---

# 🔄 Key Rotation

Applications should periodically replace keys.

The recommended rotation workflow is:

```text
Old Key
   │
   ├── Create New Key
   │
   ├── Receive New Secret
   │
   ├── Update External Application
   │
   ├── Verify New Key
   │
   └── Revoke Old Key
```

Example:

```text
Old:
cp_live_old

New:
cp_live_new
```

This avoids unnecessary downtime.

---

# 🔄 Rotation Contract

For the portfolio implementation, rotation can be implemented as a controlled:

```text
Create New
     ↓
Migrate Application
     ↓
Verify New Credential
     ↓
Revoke Old
```

workflow.

A dedicated endpoint can be introduced later:

```http
POST /api/v1/api-keys/:id/rotate
```

If implemented, the endpoint should create a new credential while preserving the old key until the client has migrated successfully.

---

# ⏳ API Key Expiration

Keys can optionally have an expiration date.

Example:

```text
expiresAt:
2027-01-01
```

Validation:

```text
Current Time
      │
      ▼
Compare expiresAt
      │
 ┌────┴────┐
 ▼         ▼
Valid    Expired
 │         │
 ▼         ▼
Continue   401
```

For the portfolio version, expiration can be optional.

---

# 🔐 API Key Scopes

API keys should support permissions.

Example:

```text
messages:read
messages:write

conversations:read
conversations:write

members:read
members:write

notifications:read
```

This follows the Public API module's permission model.

---

# 🧠 Why Scopes Matter

Without scopes:

```text
One API Key
    │
    └── Everything
```

With scopes:

```text
CRM Key
 │
 ├── messages:read       ✅
 ├── messages:write      ✅
 ├── conversations:read ✅
 └── members:write       ❌
```

This follows the principle of least privilege.

---

# 🔐 Scope Validation

Request:

```http
POST /api/v1/messages
```

Required scope:

```text
messages:write
```

Flow:

```text
API Key
   │
   ▼
Resolved Scopes
   │
   ▼
messages:write?
   │
 ┌─┴──────┐
 ▼        ▼
Yes       No
 │        │
 ▼        ▼
Allow     403
```

---

# 🏢 Project Isolation

API keys must remain scoped to their project.

Example:

```text
Project A
   │
   └── API Key A

Project B
   │
   └── API Key B
```

API Key A must never access Project B resources.

The project context must be derived from the authenticated API-key record.

Never trust a client-provided:

```text
projectId
```

as an authorization mechanism.

---

# 🔒 Organization Isolation

The project itself belongs to an organization.

Therefore:

```text
API Key
   │
   ▼
Project
   │
   ▼
Organization
```

Every resource access should verify the appropriate ownership relationship.

The effective authorization boundary is:

```text
API Key
   ↓
Project
   ↓
Workspace
   ↓
Conversation
   ↓
Message
```

---

# 🌐 API Key Authentication

Public requests should provide the API key using the standard `Authorization` header.

Recommended:

```http
Authorization: Bearer <API_KEY>
```

Example:

```http
Authorization: Bearer cp_live_7f82a9_xxxxxxxxxxxxxxxxx
```

Another possible convention is:

```http
X-API-Key: cp_live_7f82a9_xxxxxxxxxxxxxxxxx
```

For this platform, use:

```http
Authorization: Bearer <API_KEY>
```

consistently.

This keeps the API familiar to external developers.

---

# 🔄 Authentication Flow

```text
External Application
        │
        │ Authorization: Bearer ...
        ▼
Global / IP Rate Limiter
        │
        ▼
API Key Middleware
        │
        ▼
Extract API Key
        │
        ▼
Extract keyId
        │
        ▼
Find API Key by keyId
        │
        ▼
Secure Secret Comparison
        │
        ▼
Check Revocation
        │
        ▼
Check Expiration
        │
        ▼
Attach API Key Context
        │
        ▼
Per-Key Rate Limiter
        │
        ▼
Scope Authorization
        │
        ▼
Controller
```

---

# 🔍 Authentication Context

After successful authentication, the middleware should make the integration context available to downstream services.

Conceptually:

```text
req.apiKey
```

may contain:

```text
keyId
projectId
scopes
```

The secret should never be attached to the request context after authentication.

Example:

```text
Authenticated API Key
       │
       ├── keyId
       ├── projectId
       └── scopes
```

---

# ❌ Invalid Key

If the key does not exist or the secret comparison fails:

```text
401 Unauthorized
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key"
  }
}
```

Do not reveal:

```text
Key does not exist
Key was revoked
Key belongs to another project
Secret comparison failed
```

Avoid giving attackers unnecessary information.

---

# 🚫 Revoked Key

A revoked key should produce the same general authentication failure behavior.

```text
API Key
   │
   ▼
Revoked
   │
   ▼
401 Unauthorized
```

---

# ⏳ Expired Key

Expired keys should also fail authentication.

```text
API Key
   │
   ▼
Expiration Check
   │
   ▼
Expired
   │
   ▼
401 Unauthorized
```

---

# 🕒 Last Used Timestamp

Track when a key was last successfully used.

Example:

```text
lastUsedAt:
2026-08-10T10:30:00Z
```

This helps administrators identify unused credentials.

The timestamp should generally represent a **successful authenticated request**, not every failed attempt.

---

# 📊 Key Status

Possible statuses:

```text
active
revoked
expired
```

Status should generally be derived from:

```text
revokedAt
expiresAt
```

rather than creating unnecessary duplicated state.

Conceptually:

```text
revokedAt != null
        ↓
     revoked

expiresAt < now
        ↓
     expired

Otherwise
        ↓
      active
```

If both conditions exist, the implementation should define a consistent precedence for administrative display.

---

# 📈 API Key Usage

For the portfolio version, track lightweight metadata:

```text
lastUsedAt
```

You do not need to build a complete API analytics system.

Optional future fields:

```text
requestCount
lastUsedIp
lastUsedEndpoint
```

Be careful with storing IP addresses because they can be sensitive operational data.

---

# 🚦 API Key + Rate Limiting

The Public API should use **two levels of rate limiting**.

## Layer 1 — Global / IP Rate Limit

Protects the platform against:

```text
Invalid API-key attacks
Credential guessing
Abusive traffic
High-volume unauthenticated requests
```

Flow:

```text
Incoming Request
       │
       ▼
Global / IP Rate Limit
       │
 ┌─────┴─────┐
 ▼           ▼
Allowed     Blocked
 │           │
 ▼           ▼
Continue     429
```

---

## Layer 2 — Per API-Key Rate Limit

After successful API-key authentication:

```text
Authenticated API Key
       │
       ▼
Redis
       │
       ▼
Per-Key Counter
       │
 ┌─────┴─────┐
 ▼           ▼
Allowed     Limit Exceeded
 │           │
 ▼           ▼
Continue     429
```

Example Redis concept:

```text
rate_limit:api_key:<keyId>
```

This allows each integration to have its own rate limit.

---

# 🔥 Example

CRM sends:

```text
100 requests
```

The platform tracks:

```text
CRM API Key
     │
     ▼
Redis counter
     │
     ▼
Configured limit
```

Another application:

```text
HRM API Key
```

gets its own independent counter.

This prevents one integration from consuming the entire platform's API capacity.

---

# 🛡️ Rate-Limit Ordering

The recommended security pipeline is:

```text
Request
   │
   ▼
Global / IP Rate Limit
   │
   ▼
API Key Authentication
   │
   ▼
Per-Key Rate Limit
   │
   ▼
Scope Authorization
   │
   ▼
Controller
```

This protects both:

```text
Unauthenticated traffic
```

and:

```text
Authenticated abusive integrations
```

---

# 📝 Logging

Important API-key events should be logged.

Examples:

```text
api_key.created
api_key.revoked
api_key.expired
api_key.authentication_failed
api_key.scope_denied
api_key.rotation_started
api_key.rotation_completed
```

Example:

```json
{
  "level": "info",
  "event": "api_key.created",
  "projectId": "...",
  "keyId": "...",
  "createdBy": "..."
}
```

Never log:

```text
Full API key
API key secret
Authorization header
keyHash
```

The existing request ID from the Logging module should continue through the API-key lifecycle.

---

# 🔐 Security Considerations

Never:

```text
Log full API keys
Store plain API keys
Return keys from list endpoints
Put keys in URLs
Put keys in query parameters
Commit keys to Git
Expose keys to frontend code unnecessarily
Return keyHash through the API
```

Prefer:

```text
Cryptographically secure generation
Non-secret key identifier
Secure secret hashing
Authorization header
One-time display
Revocation
Expiration
Scopes
Project isolation
Rate limiting
Structured logging
```

---

# 🌍 Environment Separation

Use different key prefixes/environments.

Example:

```text
Development
cp_test_...

Production
cp_live_...
```

This reduces accidental use of production credentials during development.

---

# 🔄 Development → Production

Example:

```text
Local CRM
    │
    ▼
cp_test_...
    │
    ▼
Development Chat Platform
```

Production:

```text
Live CRM
    │
    ▼
cp_live_...
    │
    ▼
Production Chat Platform
```

Development and production credentials should be managed independently.

---

# 🔐 MongoDB Indexing

The API-key identifier should be indexed because it is used for authentication lookup.

Recommended:

```text
keyId → unique index
```

Conceptually:

```text
MongoDB
   │
   └── keyId
        └── unique
```

This provides efficient lookup and prevents duplicate identifiers.

The project relationship should also be indexed appropriately for administrative queries.

---

# 🧪 Testing Strategy

## Test 1 — Create Key

Create an API key.

Expected:

```text
Key created
Full key returned once
```

---

## Test 2 — Verify Storage

Inspect MongoDB.

Expected:

```text
keyId   → exists
keyHash → exists
full key → does not exist
```

---

## Test 3 — Key Lookup

Use a valid API key.

Expected:

```text
keyId extracted
       ↓
MongoDB lookup succeeds
       ↓
Secret comparison succeeds
       ↓
Authentication succeeds
```

---

## Test 4 — Valid Key

Call:

```http
GET /api/v1/conversations
```

with a valid key.

Expected:

```text
200 OK
```

---

## Test 5 — Invalid Key

Use a fake key.

Expected:

```text
401 Unauthorized
```

---

## Test 6 — Revoked Key

Revoke a valid key.

Call the API again.

Expected:

```text
401 Unauthorized
```

---

## Test 7 — Expired Key

Create a key with an expired date.

Expected:

```text
401 Unauthorized
```

---

## Test 8 — Scope

Create a key with:

```text
messages:read
```

Attempt:

```http
POST /api/v1/messages
```

Expected:

```text
403 Forbidden
```

---

## Test 9 — Project Isolation

Use Project A's key against Project B.

Expected:

```text
403 Forbidden
```

or a safe non-disclosing response.

---

## Test 10 — Global / IP Rate Limit

Send excessive requests from the same source before successful authentication.

Expected:

```text
429 Too Many Requests
```

---

## Test 11 — Per-Key Rate Limit

Authenticate successfully and exceed the API key's configured limit.

Expected:

```text
429 Too Many Requests
```

---

## Test 12 — Sensitive Logging

Verify that logs do not contain:

```text
Full API key
Authorization header
Secret
keyHash
```

---

## Test 13 — Rotation

Perform:

```text
Create New Key
      ↓
Update Client
      ↓
Verify New Key
      ↓
Revoke Old Key
```

Expected:

```text
Old Key → 401
New Key → Successful authentication
```

---

## Test 14 — One-Time Secret

Create a key.

Expected:

```text
Creation response → Full key
List response      → No full key
Detail response    → No full key
```

---

## Test 15 — API-Key Management Authorization

Attempt to create or revoke an API key using an unauthorized platform user.

Expected:

```text
403 Forbidden
```

---

# 📊 API Key Test Matrix

| Test                        | Expected                  |
| --------------------------- | ------------------------- |
| Generate key                | Success                   |
| Key identifier              | Unique                    |
| Hash storage                | Plain key absent          |
| Valid authentication        | 200                       |
| Invalid key                 | 401                       |
| Revoked key                 | 401                       |
| Expired key                 | 401                       |
| Missing scope               | 403                       |
| Wrong project               | Denied                    |
| Global/IP rate limit        | 429                       |
| Per-key rate limit          | 429                       |
| Rotation                    | New works / old revoked   |
| One-time display            | Secret returned only once |
| Unauthorized key management | 403                       |
| Logging                     | Secret protected          |

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] API key model created
* [ ] Secure key generation implemented
* [ ] Non-secret key identifier implemented
* [ ] Key prefix implemented
* [ ] API key hashing implemented
* [ ] Plain key never stored
* [ ] Unique `keyId` index implemented
* [ ] One-time key display implemented
* [ ] API key authentication middleware implemented
* [ ] Key lookup by `keyId` implemented
* [ ] Secure secret comparison implemented
* [ ] Project association implemented
* [ ] Organization isolation enforced
* [ ] Scope system implemented
* [ ] Scope validation implemented
* [ ] Key expiration supported
* [ ] Key revocation implemented
* [ ] Key listing implemented
* [ ] Key detail endpoint implemented
* [ ] API-key management authorization implemented
* [ ] Last-used tracking implemented
* [ ] Global/IP rate limiting integrated
* [ ] Per-key rate limiting integrated
* [ ] Logging integrated
* [ ] Sensitive data protected
* [ ] API key rotation documented
* [ ] Rotation workflow tested
* [ ] Testing completed

---

# 📊 Phase 6 Progress

```text
Phase 6 — Integration Platform

├── Public API       ✅
├── API Keys         🟡 Current
├── Webhooks         ⏳
└── Chat Widget      ⏳
```

---

# 🎯 Module Completion Criteria

The API Keys module is complete when:

```text
API Keys
│
├── Secure Generation          ✅
├── Key Identifier             ✅
├── Hash Storage               ✅
├── One-Time Display           ✅
├── Authentication             ✅
├── Key Lookup                 ✅
├── Project Association        ✅
├── Organization Isolation     ✅
├── Scope Permissions          ✅
├── Expiration                 ✅
├── Revocation                 ✅
├── Rotation Support           ✅
├── Global Rate Limiting       ✅
├── Per-Key Rate Limiting      ✅
├── Usage Tracking              ✅
├── Logging                    ✅
├── Management Authorization   ✅
├── Security                   ✅
└── Testing                    ✅
```

---

# 🏁 Result

After completing this module, external applications can securely authenticate with the platform:

```text
                    CHAT PLATFORM
                          │
                    Public API
                          │
                    API Key Auth
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
         CRM              HRM             ERP
      API Key A        API Key B       API Key C
```

Each integration has:

```text
Own API Key
Own Project
Own Permissions
Own Rate Limit
Own Lifecycle
```

The authentication architecture becomes:

```text
External Application
        │
        ▼
      API Key
        │
        ▼
      keyId
        │
        ▼
   MongoDB Lookup
        │
        ▼
 Secure Secret Check
        │
        ▼
 Project Context
        │
        ▼
      Scopes
        │
        ▼
   Public API
```

This is an important distinction between a **chat application** and a **chat integration platform**.

---

# 🧩 API Key Architecture Summary

The complete credential architecture is:

```text
                         API KEY SYSTEM
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Generation       Authentication     Lifecycle
             │                │                │
             ▼                ▼                ▼
          Secure           keyId Lookup     Expiration
          Random           + Hash Check     Revocation
             │                │              Rotation
             ▼                ▼
         One-Time         Project Context
          Display              │
                               ▼
                            Scopes
                               │
                               ▼
                         Rate Limiting
```

The external integration architecture becomes:

```text
                       CHAT PLATFORM
                            │
                       Public API
                            │
                       API Key Auth
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
         CRM               HRM               ERP
          │                 │                 │
      API Key A         API Key B         API Key C
          │                 │                 │
      Project A         Project B         Project C
```

Each integration remains isolated through:

```text
API Key
   ↓
Project
   ↓
Workspace
   ↓
Conversation
   ↓
Messages
```

---

# 🔄 Complete Phase 6 Authentication Flow

The Public API and API Keys modules now work together as:

```text
External Application
        │
        ▼
   Public API Request
        │
        ▼
Global / IP Rate Limit
        │
        ▼
API Key Authentication
        │
        ▼
Extract keyId
        │
        ▼
MongoDB Lookup
        │
        ▼
Secure Secret Comparison
        │
        ▼
Check Revocation
        │
        ▼
Check Expiration
        │
        ▼
Resolve Project
        │
        ▼
Per-Key Rate Limit
        │
        ▼
Scope Authorization
        │
        ▼
Resource Authorization
        │
        ▼
Controller
        │
        ▼
Service Layer
        │
        ▼
MongoDB
        │
        ▼
Socket.IO Event
```

This keeps authentication, authorization, business logic, and real-time delivery properly separated.

---

# 🚀 Next Module

The next module is:

```text
Phase 6 — Module 3

🪝 Webhooks
```

Webhooks will allow the chat platform to actively notify CRM, HRM, ERP, and other external applications when events occur.

Examples:

```text
message.created
message.updated
message.deleted

conversation.created
conversation.updated

member.added
member.removed

reaction.created
reaction.removed

notification.created
```

The Webhooks module will build on the Public API and API Keys foundation and introduce:

```text
Event Generation
       ↓
Webhook Registration
       ↓
Event Filtering
       ↓
Payload Signing
       ↓
HTTP Delivery
       ↓
Retry Handling
       ↓
Delivery Tracking
       ↓
Failure Handling
```

This continues Phase 6 from **API consumption** toward **event-driven integration**.

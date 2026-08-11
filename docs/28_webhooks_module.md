# 🪝 Webhooks Module

## 📋 Module Information

| Property                  | Value                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **Module**                | Webhooks                                                                                       |
| **Version**               | v1.1                                                                                           |
| **Status**                | 🟡 In Development                                                                              |
| **Phase**                 | Phase 6 — Integration Platform                                                                 |
| **Previous Module**       | API Keys                                                                                       |
| **Next Module**           | Chat Widget                                                                                    |
| **Depends On**            | Public API, API Keys, Authentication, Authorization, Validation, Rate Limiting, Logging, Redis |
| **Database**              | MongoDB                                                                                        |
| **Queue / Retry Support** | Redis                                                                                          |
| **Real-Time**             | Socket.IO                                                                                      |

---

# 📌 Overview

The **Webhooks module** allows the chat platform to notify external applications when important events occur.

Instead of an external application continuously asking:

```text
"Did a new message arrive?"
"Was a conversation created?"
"Was a member added?"
```

the chat platform automatically sends an HTTP request when a subscribed event occurs.

Architecture:

```text
Chat Platform
      │
      │ Domain Event
      ▼
Webhook Dispatcher
      │
      │ HTTP POST
      ▼
External Application
      │
 ┌────┼────┐
 ▼    ▼    ▼
CRM  HRM  ERP
```

The Webhooks module transforms the platform from an application that only **serves external systems** into one that can also **actively notify external systems**.

---

# 🎯 Objectives

The Webhooks module should:

* Allow applications to register webhook endpoints
* Associate webhooks with projects
* Support selected event types
* Generate consistent domain events
* Support event versioning
* Deliver events using HTTP POST
* Authenticate webhook requests
* Generate cryptographic webhook signatures
* Protect webhook secrets using encryption at rest
* Show the webhook secret only during creation
* Include timestamps for replay protection
* Use constant-time signature comparison on verification
* Support event IDs for idempotency
* Support webhook activation/deactivation
* Track delivery attempts
* Track delivery status
* Handle failed deliveries
* Retry transient failures
* Respect `Retry-After` when provided
* Stop retrying permanent failures
* Support request timeouts
* Support dead-letter/final-failure handling
* Integrate with Redis
* Integrate with logging
* Protect against SSRF
* Protect sensitive information
* Enforce project and organization isolation
* Prevent webhook configuration by unauthorized users

---

# 🧠 Why Webhooks?

Without webhooks:

```text
CRM
 │
 ├── GET /messages
 ├── GET /messages
 ├── GET /messages
 ├── GET /messages
 └── ...
```

This creates unnecessary network traffic and delays.

With webhooks:

```text
Chat Platform
      │
      │ message.created
      ▼
     CRM
```

The CRM receives the event only when something actually happens.

---

# 🔗 Webhook Architecture

The webhook system should separate:

```text
Domain Operations
      ↓
Domain Events
      ↓
Webhook Dispatching
      ↓
Delivery Jobs
      ↓
Asynchronous Delivery
```

Complete architecture:

```text
                         Chat Platform
                              │
                         Domain Operation
                              │
                              ▼
                         Domain Event
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
               Socket.IO         Webhook Dispatcher
                    │                   │
                    ▼                   ▼
            Connected Clients     Event Filtering
                                        │
                                        ▼
                               Delivery Job Created
                                        │
                                        ▼
                                   Redis Queue
                                        │
                                        ▼
                                  Webhook Worker
                                        │
                           ┌────────────┴────────────┐
                           ▼                         ▼
                      Sign Payload              HTTP POST
                                                     │
                                            ┌────────┴────────┐
                                            ▼                 ▼
                                         Success            Failure
                                            │                 │
                                            ▼                 ▼
                                        Complete            Retry
                                                              │
                                                              ▼
                                                         Max Attempts
                                                              │
                                                              ▼
                                                        Final Failure
```

This architecture ensures webhook delivery does not block the original chat operation.

---

# 📂 Recommended Structure

```text
src/
│
├── models/
│   ├── Webhook.js
│   └── WebhookDelivery.js
│
├── controllers/
│   └── webhook.controller.js
│
├── services/
│   ├── webhook.service.js
│   ├── webhookEvent.service.js
│   └── webhookDelivery.service.js
│
├── routes/
│   └── webhook.routes.js
│
├── middleware/
│   └── webhook.middleware.js
│
├── workers/
│   └── webhook.worker.js
│
├── queues/
│   └── webhook.queue.js
│
├── utils/
│   ├── webhookSignature.js
│   └── webhookSecret.js
│
└── config/
```

Adapt this structure to the existing project architecture.

---

# 🗄️ Webhook Collection

Recommended MongoDB collection:

```text
webhooks
```

Example document:

```json
{
  "_id": "...",
  "projectId": "...",
  "name": "CRM Webhook",
  "url": "https://crm.example.com/webhooks/chat",
  "events": [
    "message.created",
    "conversation.created"
  ],
  "secretEncrypted": "...",
  "status": "active",
  "createdBy": "...",
  "lastDeliveryAt": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Important Fields

| Field             | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `projectId`       | Project that owns the webhook                   |
| `name`            | Human-readable webhook name                     |
| `url`             | External destination URL                        |
| `events`          | Subscribed event types                          |
| `secretEncrypted` | Encrypted webhook signing secret                |
| `status`          | `active` or `inactive`                          |
| `createdBy`       | User who created the webhook                    |
| `lastDeliveryAt`  | Last successful or attempted delivery timestamp |
| `createdAt`       | Creation timestamp                              |
| `updatedAt`       | Last metadata update                            |

The plaintext webhook secret must never be stored in MongoDB.

---

# 🗄️ Webhook Delivery Collection

A separate collection tracks delivery jobs and attempts.

```text
webhookDeliveries
```

Example:

```json
{
  "_id": "...",
  "webhookId": "...",
  "eventId": "evt_123",
  "eventType": "message.created",
  "eventVersion": "v1",
  "status": "pending",
  "attempt": 0,
  "responseStatus": null,
  "lastAttemptAt": null,
  "nextRetryAt": null,
  "failureReason": null,
  "deliveredAt": null,
  "createdAt": "..."
}
```

## Recommended Delivery Fields

| Field            | Purpose                            |
| ---------------- | ---------------------------------- |
| `webhookId`      | Webhook receiving the event        |
| `eventId`        | Unique event identifier            |
| `eventType`      | Event name                         |
| `eventVersion`   | Event schema version               |
| `status`         | Current delivery state             |
| `attempt`        | Number of delivery attempts        |
| `responseStatus` | HTTP response from receiver        |
| `lastAttemptAt`  | Last delivery attempt              |
| `nextRetryAt`    | Scheduled retry time               |
| `failureReason`  | Reason for failed delivery         |
| `deliveredAt`    | Successful delivery timestamp      |
| `createdAt`      | Delivery record creation timestamp |

For a portfolio implementation, delivery history can remain lightweight while still supporting debugging and retry management.

---

# 🔗 Relationship

```text
Organization
      │
      ▼
Project
      │
      ├── API Keys
      │
      └── Webhooks
             │
             ├── Webhook A
             ├── Webhook B
             └── Webhook C
```

A webhook belongs to a specific project.

This maintains tenant isolation.

---

# 🌐 Webhook Endpoint

External applications provide a URL.

Example:

```text
https://crm.example.com/api/webhooks/chat
```

The chat platform sends:

```http
POST https://crm.example.com/api/webhooks/chat
```

The URL is controlled by the external application, but must pass server-side validation before being accepted.

---

# 📋 Create Webhook

Endpoint:

```http
POST /api/v1/webhooks
```

This endpoint is protected by the platform's normal authentication and project-level authorization.

Example request:

```json
{
  "name": "CRM Chat Events",
  "url": "https://crm.example.com/api/webhooks/chat",
  "events": [
    "message.created",
    "conversation.created"
  ]
}
```

The server generates the webhook secret.

Example response:

```json
{
  "success": true,
  "data": {
    "id": "webhook_123",
    "name": "CRM Chat Events",
    "url": "https://crm.example.com/api/webhooks/chat",
    "events": [
      "message.created",
      "conversation.created"
    ],
    "status": "active",
    "secret": "whsec_xxxxxxxxxxxxxxxxx"
  }
}
```

The complete webhook secret is returned **only during creation**.

---

# 🔐 Webhook Secret Architecture

Webhook signatures require the platform to possess the secret whenever it sends a webhook.

Therefore, a one-way hash alone is insufficient.

The platform needs a recoverable protected representation.

Recommended design:

```text
Generated Webhook Secret
        │
        ├──────────────► One-time response
        │
        ▼
     Encrypt
        │
        ▼
MongoDB
```

During delivery:

```text
Webhook Worker
      │
      ▼
Retrieve Encrypted Secret
      │
      ▼
Decrypt Secret
      │
      ▼
Generate HMAC
      │
      ▼
Send Signed Request
```

The encryption key used to protect webhook secrets must be stored outside the database, preferably in a secure environment secret or dedicated secret-management system.

---

# 🔐 Webhook Secret Generation

Secrets must be generated using a cryptographically secure random generator.

Do not use:

```javascript
Math.random()
```

for webhook secrets.

Conceptually:

```text
Secure Random Generator
        │
        ▼
Webhook Secret
        │
        ├── Return once
        │
        └── Encrypt for storage
```

Example:

```text
whsec_xxxxxxxxxxxxxxxxxxxxxxxxx
```

The exact secret length and encoding should be standardized during implementation.

---

# 👁️ One-Time Secret Display

After webhook creation:

```text
Create Webhook
      │
      ▼
Generate Secret
      │
      ▼
Encrypt Secret
      │
      ├──────────────► MongoDB
      │
      ▼
Show Secret Once
      │
      ▼
User Copies Secret
      │
      ▼
Never Return Full Secret Again
```

Future responses must return metadata only.

Never return:

```json
{
  "secret": "whsec_..."
}
```

from list or detail endpoints.

---

# 🔒 Secret Storage Rules

Never store:

```text
secret
webhookSecretPlain
```

in MongoDB.

Instead store:

```text
secretEncrypted
```

The encryption key must not be stored alongside the encrypted secret.

Never log:

```text
Webhook Secret
Encrypted Secret
Authorization Header
Signature Secret
```

---

# 🔏 Webhook Signature

Every outgoing webhook request should be cryptographically signed.

Recommended algorithm:

```text
HMAC-SHA256
```

The signing input should be explicitly defined.

Recommended signing input:

```text
timestamp + "." + rawRequestBody
```

Then:

```text
HMAC-SHA256(
    webhookSecret,
    timestamp + "." + rawRequestBody
)
```

The generated signature can be represented as:

```text
sha256=<hex_signature>
```

---

# 📦 Why Sign the Raw Request Body?

The receiver must verify the exact bytes that were sent.

Therefore:

```text
Raw Request Body
       │
       ▼
HMAC
```

should be used instead of parsing and re-serializing JSON before verification.

Different JSON formatting can produce different byte sequences.

The receiver should therefore preserve the raw request body for signature verification.

---

# 📝 Webhook Headers

Example outgoing request:

```http
POST /api/webhooks/chat

Content-Type: application/json
X-Webhook-ID: webhook_123
X-Webhook-Event: message.created
X-Webhook-Version: v1
X-Webhook-Timestamp: 1723280000
X-Webhook-Signature: sha256=...
```

The exact header names should remain standardized across the platform.

---

# ⏱️ Timestamp Protection

Every webhook request should include a timestamp.

Conceptually:

```text
Raw Request Body
+
Timestamp
+
Secret
      │
      ▼
HMAC-SHA256
      │
      ▼
Signature
```

Example:

```text
X-Webhook-Timestamp: 1723280000
```

The receiving application can verify that the timestamp falls within an acceptable tolerance window.

Example:

```text
Current Time
      │
      ▼
Compare Webhook Timestamp
      │
 ┌────┴─────┐
 ▼          ▼
Fresh      Too Old
 │          │
 ▼          ▼
Continue   Reject
```

The exact tolerance should be configurable.

---

# 🔁 Replay Protection

An attacker could capture a legitimate webhook and attempt to send it again later.

The combination of:

```text
Event ID
+
Timestamp
+
Signature
```

helps mitigate replay attacks.

Example:

```text
Attacker captures webhook
       │
       ▼
Attempts replay
       │
       ▼
Timestamp validation
       │
       ▼
Event ID / idempotency check
       │
       ▼
Reject duplicate or stale request
```

The receiving application should store processed event IDs.

---

# 🛡️ Constant-Time Signature Comparison

The receiver must not compare signatures using a normal early-exit string comparison.

Instead:

```text
Expected Signature
       │
       ├──────────────┐
       │              │
Received Signature    │
       │              │
       └───────┬──────┘
               ▼
      Constant-Time Compare
               │
          ┌────┴────┐
          ▼         ▼
        Match     Mismatch
          │         │
          ▼         ▼
       Process     Reject
```

This reduces timing side-channel information during signature verification.

---

# 📦 Webhook Event Structure

All webhook events should use a consistent structure.

Recommended:

```json
{
  "id": "evt_123",
  "type": "message.created",
  "version": "v1",
  "createdAt": "2026-08-10T10:30:00Z",
  "projectId": "project_123",
  "data": {
    "message": {
      "id": "message_123",
      "conversationId": "conversation_123",
      "content": "Hello"
    }
  }
}
```

---

# 🆔 Event ID

Every event must have a unique identifier.

Example:

```text
evt_123
```

The event ID allows receiving applications to detect duplicate deliveries.

The same event must retain the same:

```text
eventId
```

across retries.

For example:

```text
Attempt 1
eventId = evt_123

Attempt 2
eventId = evt_123

Attempt 3
eventId = evt_123
```

The event ID must not change during retries.

---

# 🧩 Event Versioning

Every event should contain an explicit version.

Example:

```json
{
  "id": "evt_123",
  "type": "message.created",
  "version": "v1"
}
```

This allows future schema changes.

For example:

```text
message.created v1
```

can later evolve into:

```text
message.created v2
```

without unexpectedly breaking existing integrations.

Versioning should be part of the event contract from the first implementation.

---

# 🔁 Idempotency

Webhook systems can deliver the same event more than once.

Example:

```text
Chat Platform
     │
     ├── Delivery 1
     │
     └── Retry
           │
           ▼
        Delivery 2
```

Both deliveries contain:

```text
eventId = evt_123
```

The receiving application should store processed event IDs.

Example:

```text
evt_123 → already processed
```

Then the duplicate event can safely be ignored.

---

# 📋 Supported Events

Keep the first version focused.

Recommended events:

```text
message.created
message.deleted

conversation.created
conversation.updated

member.added
member.removed

reaction.created
reaction.removed
```

Additional events can be introduced later.

---

# 💬 message.created

Triggered when a message is successfully created.

```text
Message Created
      │
      ▼
Domain Event
      │
      ▼
message.created
      │
      ├── Socket.IO
      │
      └── Webhook Dispatcher
```

Example payload:

```json
{
  "id": "evt_123",
  "type": "message.created",
  "version": "v1",
  "createdAt": "2026-08-10T10:30:00Z",
  "projectId": "project_123",
  "data": {
    "messageId": "message_123",
    "conversationId": "conversation_123"
  }
}
```

---

# 🗑️ message.deleted

Triggered when a message is deleted.

```text
Message Deleted
      │
      ▼
message.deleted
      │
      ▼
Webhook Dispatcher
      │
      ▼
External Application
```

The payload should contain only information the receiving application is authorized to receive.

---

# 💬 conversation.created

Triggered when a conversation is created.

```text
Conversation Created
        │
        ▼
conversation.created
        │
        ▼
Webhook Dispatcher
        │
        ▼
CRM
```

---

# 👥 member.added

Triggered when a member is added to a conversation.

Example:

```json
{
  "id": "evt_456",
  "type": "member.added",
  "version": "v1",
  "data": {
    "conversationId": "conversation_123",
    "userId": "user_456"
  }
}
```

---

# ❤️ reaction.created

Triggered when a reaction is added.

```text
Reaction Added
      │
      ▼
reaction.created
      │
      ▼
Webhook Dispatcher
      │
      ▼
External Application
```

---

# 🚦 Event Filtering

A webhook should receive only the events selected during configuration.

Example:

```text
CRM Webhook

Subscribed:
├── message.created
└── conversation.created
```

If:

```text
reaction.created
```

occurs:

```text
CRM Webhook
     │
     └── Not subscribed
```

No delivery job should be created for that webhook.

---

# 🧠 Domain Event Architecture

The domain operation and webhook delivery must remain separate.

For example:

```text
Message Service
      │
      ▼
Create Message
      │
      ▼
Domain Event
message.created
      │
      ├─────────────────┐
      ▼                 ▼
 Socket.IO       Webhook Dispatcher
      │                 │
      ▼                 ▼
Connected Users   Matching Webhooks
                        │
                        ▼
                   Delivery Jobs
                        │
                        ▼
                     Redis
```

The webhook system should consume domain events rather than being tightly coupled to individual controllers.

This makes the architecture easier to extend.

---

# 📡 Delivery Flow

When a domain event occurs:

```text
1. Domain Operation
       │
       ▼
2. Domain Event Created
       │
       ▼
3. Webhook Dispatcher
       │
       ▼
4. Find Matching Webhooks
       │
       ▼
5. Apply Event Filtering
       │
       ▼
6. Create Delivery Records
       │
       ▼
7. Queue Delivery Jobs
       │
       ▼
8. Worker Processes Delivery
       │
       ▼
9. Decrypt Webhook Secret
       │
       ▼
10. Generate Signature
       │
       ▼
11. HTTP POST
       │
       ▼
12. Receive Response
       │
       ▼
13. Mark Success / Retry / Final Failure
```

---

# ⚡ Asynchronous Delivery

Webhook requests must not block the original chat operation.

Bad:

```text
Create Message
     │
     ▼
Wait for CRM
     │
     ▼
Return response
```

A slow CRM could make the chat API slow.

Better:

```text
Create Message
     │
     ├──────────────────► Return response
     │
     ▼
Create Domain Event
     │
     ▼
Webhook Dispatcher
     │
     ▼
Queue Delivery
     │
     ▼
Redis
     │
     ▼
Worker
     │
     ▼
CRM
```

This keeps the primary chat operation responsive.

---

# 📬 Redis Delivery Queue

Webhook delivery jobs should be queued through Redis.

Conceptually:

```text
Domain Event
      │
      ▼
Webhook Dispatcher
      │
      ▼
Delivery Job
      │
      ▼
Redis Queue
      │
      ▼
Webhook Worker
```

The queue separates:

```text
Event generation
```

from:

```text
External HTTP delivery
```

---

# 🔴 Failed Delivery

External applications may be temporarily unavailable.

Example:

```text
Chat Platform
      │
      ▼
CRM
      │
      ▼
503 Service Unavailable
```

The event should not immediately be lost.

Instead:

```text
Delivery Failed
      │
      ▼
Classify Failure
      │
 ┌────┴───────────┐
 ▼                ▼
Retryable       Permanent
 ▼                ▼
Retry Queue      Final Failure
```

---

# 🔄 Retryable Failures

The following failures should normally be considered retryable:

```text
408 Request Timeout
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout

Network timeout
Connection failure
Temporary DNS/network failure
```

For:

```text
429 Too Many Requests
```

the worker should respect:

```text
Retry-After
```

when the receiving application provides it.

---

# 🚫 Permanent Failures

The following generally should not be retried indefinitely:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
422 Unprocessable Entity
```

These usually indicate a configuration or integration problem that requires user intervention.

The delivery should be marked as a final failure after the appropriate classification.

---

# 🔄 Retry Strategy

Use limited retries with increasing delays.

Example:

```text
Attempt 1
   │
   └── Failed
        │
        ▼
     Retry Delay
        │
        ▼
Attempt 2
   │
   └── Failed
        │
        ▼
     Retry Delay
        │
        ▼
Attempt 3
   │
   └── Failed
        │
        ▼
   Final Failure
```

For the portfolio implementation:

```text
Maximum Attempts = 3
```

is sufficient to demonstrate the concept.

The retry delay should increase between attempts.

---

# ⏱️ Retry Scheduling

Delivery records should track:

```text
nextRetryAt
```

Example:

```text
Attempt 1
   │
   ▼
Failure
   │
   ▼
nextRetryAt = future timestamp
   │
   ▼
Redis delayed job
   │
   ▼
Attempt 2
```

This prevents immediate retry loops.

---

# ⏱️ Request Timeout

Webhook requests must have a maximum timeout.

Example:

```text
Webhook Request
      │
      ▼
Timeout Timer
      │
 ┌────┴─────┐
 ▼          ▼
Response   Timeout
 │          │
 ▼          ▼
Success    Retry
```

Never allow an external webhook request to wait indefinitely.

---

# 📊 Delivery Status

Recommended delivery statuses:

```text
pending
processing
success
failed
```

Conceptual lifecycle:

```text
pending
   │
   ▼
processing
   │
 ┌─┴────────────┐
 ▼              ▼
success        failed
                  │
                  ▼
              Retryable?
               │      │
              Yes     No
               │      │
               ▼      ▼
             retry   final
```

---

# 📈 Delivery Tracking

Track lightweight operational information:

```text
eventId
webhookId
eventType
eventVersion
attempt
status
responseStatus
lastAttemptAt
nextRetryAt
failureReason
deliveredAt
createdAt
```

This provides enough information to diagnose delivery problems without building a complete analytics platform.

---

# ☠️ Final Failure / Dead-Letter Handling

After maximum retry attempts:

```text
Attempt 1
   ↓
Attempt 2
   ↓
Attempt 3
   ↓
Final Failure
```

The delivery should remain available for administrative inspection.

Conceptually:

```text
Final Failure
      │
      ▼
Failed / Dead-Letter State
      │
      ▼
Administrative Review
```

A dedicated dead-letter queue can be introduced later if the system grows.

For the portfolio implementation, retaining the final failed delivery record is sufficient.

---

# 🚦 Webhook Delivery Rate Limiting

Webhook delivery should be controlled to avoid overwhelming external systems.

Avoid:

```text
100,000 events
      │
      ▼
CRM
```

Instead:

```text
Webhook Queue
      │
      ▼
Controlled Worker Concurrency
      │
      ▼
External Application
```

Redis can help manage:

```text
Delivery concurrency
Rate limits
Retry scheduling
Queue state
```

---

# 🔐 Webhook Configuration Authorization

Only authorized project users should be able to:

```text
Create webhook
List webhooks
View webhook
Update webhook
Delete webhook
Enable webhook
Disable webhook
Test webhook
View delivery status
```

Authorization must use the platform's internal authentication and project-level permission system.

An external API key should not automatically receive webhook-management privileges.

---

# 🏢 Tenant Isolation

Webhook configuration must respect:

```text
Organization
      │
      ▼
Project
      │
      ▼
Webhook
```

Example:

```text
Project A
   │
   └── CRM Webhook

Project B
   │
   └── HRM Webhook
```

Project A must never:

```text
View Project B Webhooks
Update Project B Webhooks
Delete Project B Webhooks
Trigger Project B Webhooks
```

Project context must be derived from the authenticated user's authorized project context.

Never trust a client-provided `projectId` as the sole authorization mechanism.

---

# 🔄 Enable / Disable Webhook

Webhook status:

```text
active
inactive
```

Disable:

```http
PATCH /api/v1/webhooks/:id/disable
```

Enable:

```http
PATCH /api/v1/webhooks/:id/enable
```

Disabled webhooks should not receive new delivery jobs.

Existing in-flight deliveries should follow the implementation's defined policy.

Recommended portfolio behavior:

```text
Disable Webhook
      │
      ▼
Stop Creating New Delivery Jobs
```

Already queued jobs may either complete or be cancelled according to the delivery policy.

---

# 📋 List Webhooks

Endpoint:

```http
GET /api/v1/webhooks
```

This is a credential/configuration management operation and requires authenticated project-level authorization.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "webhook_123",
      "name": "CRM Chat Events",
      "url": "https://crm.example.com/api/webhooks/chat",
      "events": [
        "message.created"
      ],
      "status": "active",
      "lastDeliveryAt": "2026-08-10T10:30:00Z"
    }
  ]
}
```

Never expose:

```text
secret
secretEncrypted
```

---

# 🔎 Get Webhook

Endpoint:

```http
GET /api/v1/webhooks/:id
```

Return:

```text
id
name
url
events
status
createdAt
updatedAt
lastDeliveryAt
```

Do not return:

```text
secret
secretEncrypted
```

---

# ✏️ Update Webhook

Endpoint:

```http
PATCH /api/v1/webhooks/:id
```

Allowed fields may include:

```text
name
url
events
```

Changing the URL or subscribed events requires appropriate project authorization.

If the URL changes, the system should re-run URL validation and SSRF protections.

---

# 🗑️ Delete Webhook

Endpoint:

```http
DELETE /api/v1/webhooks/:id
```

After deletion:

```text
Webhook
   │
   ▼
No new deliveries
```

Existing delivery history can be retained according to the platform's audit/retention policy.

---

# 🧪 Test Webhook

A useful portfolio feature is a test endpoint.

```http
POST /api/v1/webhooks/:id/test
```

The platform sends a test event:

```json
{
  "id": "evt_test_123",
  "type": "webhook.test",
  "version": "v1",
  "createdAt": "2026-08-10T10:30:00Z",
  "data": {
    "message": "Webhook test successful"
  }
}
```

The test request should use the same:

```text
Secret
HMAC signing
Timestamp
Headers
HTTP delivery
Timeout
```

pipeline as a normal webhook.

This allows developers to verify their integrations before waiting for a real event.

---

# 🛡️ SSRF Protection

Webhook URLs are user-controlled.

The platform must not blindly make HTTP requests to arbitrary destinations.

Potential dangerous targets include:

```text
localhost
127.0.0.1
0.0.0.0
Private network addresses
Internal service addresses
Cloud metadata endpoints
Loopback addresses
Link-local addresses
```

The implementation should validate webhook URLs and consider blocking internal/private destinations.

At minimum:

```text
Validate URL
      │
      ▼
Resolve Host
      │
      ▼
Check Destination
      │
 ┌────┴─────┐
 ▼          ▼
Public     Private
 │          │
 ▼          ▼
Allow      Reject
```

DNS rebinding and redirect behavior should also be considered.

For a portfolio implementation, documenting these protections is important even if the first implementation uses a simplified allow/deny policy.

---

# 📦 Payload Size

Webhook payloads should have a maximum allowed size.

Example:

```text
Domain Event
      │
      ▼
Payload Size Validation
      │
 ┌────┴────┐
 ▼         ▼
Allowed   Too Large
 │         │
 ▼         ▼
Deliver   Reject
```

This prevents extremely large payloads from consuming excessive memory or bandwidth.

---

# 🔐 Sensitive Payload Data

Webhook payloads should contain only the information required by the receiving integration.

Avoid exposing:

```text
Passwords
Authentication tokens
API key secrets
Webhook secrets
Internal security metadata
Unnecessary personal information
```

The event payload should follow the same project and authorization boundaries as the underlying resource.

---

# 🧠 Webhook vs Socket.IO

These technologies have different responsibilities.

## Socket.IO

```text
Chat Platform
      │
      ▼
Connected Chat Client
```

Used for:

```text
Real-time messages
Typing indicators
Presence
Read receipts
Reactions
Notifications
```

## Webhooks

```text
Chat Platform
      │
      ▼
External Application
```

Used for:

```text
message.created
message.deleted
conversation.created
conversation.updated
member.added
member.removed
reaction.created
reaction.removed
```

Therefore:

```text
Socket.IO → Real-time connected clients

Webhooks → External systems
```

---

# 🔗 CRM Integration Example

The CRM registers:

```http
POST /api/v1/webhooks
```

with:

```text
URL:
https://crm.example.com/api/webhooks/chat

Events:
message.created
conversation.created
```

Then:

```text
Customer sends message
        │
        ▼
Message Service
        │
        ├── Store message
        │
        ├── Domain Event
        │       │
        │       ├── Socket.IO
        │       │
        │       └── Webhook Dispatcher
        │
        └───────────────────────┐
                                ▼
                              CRM
```

The CRM can then:

```text
Create activity
Update lead
Create notification
Trigger automation
Update conversation state
```

without continuously polling the chat API.

---

# 🔗 HRM Integration Example

```text
Employee sends message
        │
        ▼
Chat Platform
        │
        ▼
Domain Event
        │
        ▼
Webhook Dispatcher
        │
        ▼
HRM
```

The HRM could react to:

```text
conversation.created
member.added
message.created
```

---

# 🔗 ERP Integration Example

```text
ERP
 │
 └── Webhook Subscription
          │
          ▼
     Chat Platform
          │
          ▼
      Domain Event
          │
          ▼
     Webhook Delivery
          │
          ▼
          ERP
```

This allows the ERP to react to relevant chat activity without polling.

---

# 🧪 Testing Strategy

## Test 1 — Create Webhook

```http
POST /api/v1/webhooks
```

Expected:

```text
201 Created
```

Verify:

```text
Webhook created
Secret returned once
Encrypted secret stored
Plain secret absent from database
```

---

## Test 2 — List Webhooks

```http
GET /api/v1/webhooks
```

Expected:

```text
200 OK
```

Verify:

```text
Webhook metadata returned
Secret not returned
```

---

## Test 3 — Event Generation

Create a message.

Expected:

```text
message.created
```

domain event is generated.

---

## Test 4 — Event Filtering

Create a webhook subscribed only to:

```text
message.created
```

Trigger:

```text
reaction.created
```

Expected:

```text
No delivery job created
```

---

## Test 5 — Receive Webhook

Verify the external test endpoint receives:

```text
POST
```

with:

```text
eventId
eventType
eventVersion
timestamp
payload
signature
```

---

## Test 6 — Signature Verification

Receive a valid webhook.

Expected:

```text
Signature verification succeeds
```

Then modify the payload.

Expected:

```text
Signature verification fails
```

---

## Test 7 — Timestamp Validation

Send a webhook with an old timestamp.

Expected:

```text
Timestamp validation fails
```

---

## Test 8 — Replay Protection

Send the same valid event again.

Expected:

```text
Receiver detects duplicate eventId
```

---

## Test 9 — Constant-Time Comparison

Verify signature validation uses:

```text
Constant-Time Comparison
```

rather than normal early-exit comparison.

---

## Test 10 — Retry

Make the receiving endpoint return:

```text
500
```

Expected:

```text
Attempt 1 → 500
Attempt 2 → retry
Attempt 3 → retry
Final Failure
```

---

## Test 11 — Retryable Status

Test:

```text
408
429
500
502
503
504
```

Expected:

```text
Retry
```

For:

```text
429
```

verify:

```text
Retry-After
```

is respected when provided.

---

## Test 12 — Permanent Failure

Return:

```text
400
401
403
404
422
```

Expected:

```text
No repeated retry loop
Final Failure / configuration error
```

---

## Test 13 — Timeout

Make the receiving endpoint intentionally slow.

Expected:

```text
Timeout
   │
   ▼
Delivery Failure
   │
   ▼
Retry
```

---

## Test 14 — Disable Webhook

Disable the webhook.

Trigger another subscribed event.

Expected:

```text
No new delivery job
```

---

## Test 15 — Tenant Isolation

Project A attempts to access Project B's webhook.

Expected:

```text
403 Forbidden
```

---

## Test 16 — Unauthorized Configuration

An unauthorized platform user attempts:

```text
Create webhook
Update webhook
Delete webhook
```

Expected:

```text
403 Forbidden
```

---

## Test 17 — SSRF Protection

Attempt to register:

```text
http://localhost
http://127.0.0.1
http://10.x.x.x
http://192.168.x.x
http://169.254.x.x
```

Expected:

```text
Webhook rejected
```

according to the platform's URL security policy.

---

## Test 18 — Secret Protection

Inspect MongoDB and logs.

Expected:

```text
Plain webhook secret → absent
Encrypted secret → present
Logs → no secret
API responses → no secret after creation
```

---

## Test 19 — Test Webhook

Call:

```http
POST /api/v1/webhooks/:id/test
```

Expected:

```text
Test event delivered
Signature valid
Timestamp valid
```

---

## Test 20 — Delivery State

Force a failed delivery.

Expected tracking:

```text
pending
   ↓
processing
   ↓
failed
   ↓
retry
```

Verify:

```text
attempt
lastAttemptAt
nextRetryAt
failureReason
responseStatus
```

are updated correctly.

---

# 📊 Webhook Test Matrix

| Feature                  | Expected               |
| ------------------------ | ---------------------- |
| Create webhook           | 201                    |
| List webhook             | 200                    |
| Event filtering          | Works                  |
| Event generation         | Works                  |
| Event version            | Present                |
| Event ID                 | Unique                 |
| Event delivery           | Works                  |
| HMAC signature           | Verified               |
| Constant-time comparison | Implemented            |
| Timestamp                | Verified               |
| Replay protection        | Implemented            |
| Retryable errors         | Retried                |
| Permanent errors         | Not repeatedly retried |
| `Retry-After`            | Respected              |
| Timeout                  | Handled                |
| Disable                  | Works                  |
| Tenant isolation         | Enforced               |
| SSRF protection          | Enforced               |
| Duplicate events         | Safely handled         |
| Delivery tracking        | Implemented            |
| Final failure            | Recorded               |
| Logging                  | Implemented            |
| Secret protection        | Implemented            |
| Test webhook             | Works                  |

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Webhook model created
* [ ] Webhook delivery model created
* [ ] Project association implemented
* [ ] Webhook creation implemented
* [ ] Webhook listing implemented
* [ ] Webhook detail implemented
* [ ] Webhook update implemented
* [ ] Webhook deletion implemented
* [ ] Enable/disable implemented
* [ ] Event subscriptions implemented
* [ ] Event filtering implemented
* [ ] Domain event architecture implemented
* [ ] Event IDs implemented
* [ ] Event versioning implemented
* [ ] Webhook secret generated securely
* [ ] Webhook secret encrypted at rest
* [ ] Encryption key stored outside MongoDB
* [ ] Secret returned only during creation
* [ ] Secret excluded from logs
* [ ] Secret excluded from list/detail responses
* [ ] HMAC-SHA256 implemented
* [ ] Exact signing input defined
* [ ] Raw request body used for signing
* [ ] Timestamp included
* [ ] Timestamp validation implemented
* [ ] Constant-time signature comparison implemented
* [ ] Replay protection implemented
* [ ] URL validation implemented
* [ ] SSRF protection implemented
* [ ] Payload size limit implemented
* [ ] Async delivery implemented
* [ ] Redis queue implemented
* [ ] Delivery worker implemented
* [ ] Retryable status handling implemented
* [ ] Permanent failure handling implemented
* [ ] `Retry-After` support implemented
* [ ] Retry limit implemented
* [ ] Exponential/increasing retry delay implemented
* [ ] Request timeout implemented
* [ ] Delivery status tracked
* [ ] `nextRetryAt` tracked
* [ ] `failureReason` tracked
* [ ] Final failure/dead-letter handling implemented
* [ ] Delivery rate limiting considered
* [ ] Tenant isolation enforced
* [ ] Management authorization implemented
* [ ] Logging integrated
* [ ] Sensitive information protected
* [ ] Test webhook implemented
* [ ] Testing completed

---

# 📊 Phase 6 Progress

```text
Phase 6 — Integration Platform

├── Public API       ✅
├── API Keys         ✅
├── Webhooks         🟡 Current
└── Chat Widget      ⏳
```

---

# 🎯 Module Completion Criteria

The Webhooks module is complete when:

```text
Webhooks
│
├── Registration               ✅
├── Event Subscriptions        ✅
├── Domain Event Generation    ✅
├── Event Filtering            ✅
├── Event Versioning           ✅
├── Event IDs                  ✅
├── Async Delivery             ✅
├── Redis Queue                ✅
├── Worker                     ✅
├── Encrypted Secret Storage   ✅
├── HMAC Signing               ✅
├── Timestamp Protection       ✅
├── Replay Protection          ✅
├── Constant-Time Comparison   ✅
├── Retry System               ✅
├── Retry Classification       ✅
├── Retry-After Support        ✅
├── Timeout Handling            ✅
├── Delivery Tracking           ✅
├── Final Failure Handling      ✅
├── Enable / Disable            ✅
├── SSRF Protection             ✅
├── Tenant Isolation            ✅
├── Security                    ✅
├── Logging                     ✅
└── Testing                     ✅
```

---

# 🏁 Result

After completing this module, the platform can communicate **outward** with external applications.

The architecture becomes:

```text
                         CHAT PLATFORM
                              │
             ┌────────────────┼────────────────┐
             │                │                │
          REST API          API Keys        Webhooks
             │                │                │
             ▼                ▼                ▼
            CRM              CRM              CRM
             │
             ├── HRM
             └── ERP
```

More specifically:

```text
User sends message
       │
       ▼
Chat Platform
       │
       ├── MongoDB
       │
       ├── Domain Event
       │       │
       │       ├── Socket.IO
       │       │       └── Real-time users
       │       │
       │       └── Webhook Dispatcher
       │               │
       │               ▼
       │          Matching Webhooks
       │               │
       │               ▼
       │          Redis Queue
       │               │
       │               ▼
       │          Webhook Worker
       │               │
       │               ▼
       │          Signed HTTP POST
       │               │
       │               ▼
       │          CRM / HRM / ERP
       │
       └── Return API Response
```

This demonstrates an important backend concept:

> **The platform does not just serve users; it can integrate with and communicate with other systems asynchronously and securely.**

---

# 🧩 Complete Webhook Architecture Summary

The complete webhook architecture is:

```text
                         WEBHOOK SYSTEM
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
     Registration          Events             Delivery
          │                   │                   │
          ▼                   ▼                   ▼
       Webhook            Domain Event         Redis Queue
       Config             Event ID                 │
          │              Event Version              ▼
          │                   │                Worker
          ▼                   ▼                   │
     Project Scope            │                   ▼
          │             Event Filtering           │
          │                   │             Decrypt Secret
          │                   ▼                   │
          │             Dispatcher                ▼
          │                   │               HMAC-SHA256
          │                   │                   │
          │                   ▼                   ▼
          │              Delivery Job        HTTP POST
          │                                       │
          │                              ┌────────┴────────┐
          │                              ▼                 ▼
          │                           Success            Failure
          │                              │                 │
          │                              ▼                 ▼
          │                          Complete           Retry
          │                                                │
          │                                                ▼
          │                                           Max Attempts
          │                                                │

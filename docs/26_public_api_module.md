# 🌐 Public API Module

## 📋 Module Information

| Property       | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Module         | Public API                                                                |
| Version        | v1.0                                                                      |
| Status         | 🟡 In Development                                                         |
| Phase          | Phase 6 — Integration Platform                                            |
| Previous Phase | Phase 5 — Security & Production                                           |
| Next Module    | API Keys                                                                  |
| Depends On     | Authentication, Authorization, Validation, Error Handling, Logging, Redis |
| Backend        | Node.js + Express                                                         |
| Database       | MongoDB                                                                   |
| Real-Time      | Socket.IO                                                                 |

---

# 📌 Overview

The **Public API module** exposes the chat platform's core functionality to external applications.

The objective is to make the chat system reusable by:

```text
CRM
HRM
ERP
Project Management Systems
Internal Business Applications
Other SaaS Applications
```

Instead of every application building its own chat backend, external applications can communicate with the platform through a controlled public API.

The architecture becomes:

```text
                    CHAT PLATFORM
                         │
             ┌───────────┴───────────┐
             │                       │
        Internal API             Public API
             │                       │
             ▼                       ▼
      Chat Application        External Applications
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                   CRM           HRM           ERP
```

The Public API turns the application from a standalone chat system into a **reusable chat infrastructure platform**.

---

# 🎯 Objectives

The Public API should:

* Expose selected chat functionality externally
* Keep internal APIs separate from public APIs
* Provide predictable API contracts
* Reuse existing business logic
* Apply authentication and authorization
* Validate external requests
* Support multi-tenant access
* Return consistent responses
* Protect internal implementation details
* Support API versioning
* Provide API documentation
* Integrate with rate limiting
* Integrate with logging
* Prepare the authentication boundary for API keys
* Establish clear resource ownership
* Support reliable external integrations

---

# 🧠 Core Principle

The Public API should **not duplicate existing business logic**.

Avoid:

```text
Internal API
     │
     └── Controller A
            └── Business Logic A

Public API
     │
     └── Controller B
            └── Duplicate Business Logic B
```

Instead:

```text
Internal API ────────┐
                     │
Public API ──────────┤
                     ▼
              Service Layer
                     │
                     ▼
                  MongoDB
```

Both interfaces should reuse the same service layer.

This ensures that business rules remain centralized.

---

# 🏗️ Public API Architecture

```text
                         External Application
                                │
                                ▼
                           Public API
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
                Authentication        Validation
                     │                     │
                     └──────────┬──────────┘
                                ▼
                         Authorization
                                │
                                ▼
                         Rate Limiting
                                │
                                ▼
                           Controller
                                │
                                ▼
                            Service
                                │
                                ▼
                            MongoDB
```

The Public API is therefore a controlled gateway into the existing application services.

---

# 🌐 API Namespace

Public APIs should use a separate namespace.

Recommended:

```text
/api/v1/
```

Examples:

```text
GET  /api/v1/conversations
POST /api/v1/conversations

GET  /api/v1/messages
POST /api/v1/messages
```

This clearly separates public integration endpoints from internal application endpoints.

---

# 🔢 API Versioning

Version the public API from the beginning.

Recommended:

```text
/api/v1/
```

Example:

```text
/api/v1/messages
```

A future breaking version can use:

```text
/api/v2/messages
```

This allows existing integrations to continue working while newer clients migrate to a new contract.

---

# 🧠 Why API Versioning Matters

Imagine a CRM is using:

```text
/api/v1/messages
```

You later need to change the response structure.

Instead of immediately breaking the CRM:

```text
v1 → Existing clients
v2 → New clients
```

Both versions can coexist during a controlled migration period.

---

# 📂 Recommended Structure

```text
src/
│
├── routes/
│   ├── internal/
│   │   └── ...
│   │
│   └── public/
│       └── v1/
│           ├── conversation.routes.js
│           ├── message.routes.js
│           ├── member.routes.js
│           └── notification.routes.js
│
├── controllers/
│   └── public/
│       └── v1/
│
├── services/
│   ├── conversation.service.js
│   ├── message.service.js
│   └── ...
│
└── middleware/
    ├── apiAuthentication.middleware.js
    ├── authorization.middleware.js
    └── validation.middleware.js
```

The exact structure can follow the existing project architecture.

---

# 🔐 Authentication Boundary

The Public API establishes the authentication boundary for external applications.

The intended production authentication model is:

```text
External Application
        │
        ▼
      API Key
        │
        ▼
Identify Project / Integration
        │
        ▼
      Scopes
        │
        ▼
  Authorization
```

The responsibilities are intentionally separated.

### Public API Module

Responsible for:

```text
Authentication boundary
Authorization contract
Permission/scopes model
Authentication middleware integration
Tenant/resource authorization
```

### API Keys Module

Responsible for:

```text
Key generation
Secure key hashing
Key prefix / identifier
Key expiration
Key rotation
Key revocation
Key scopes
Key lifecycle management
```

The next **API Keys module** will implement the actual API-key credential lifecycle.

---

# 🔑 API Key Authentication Model

The intended external request flow is:

```text
External Application
        │
        ▼
      API Key
        │
        ▼
Authenticate Integration
        │
        ▼
Identify Project
        │
        ▼
Resolve Scopes
        │
        ▼
Authorization
        │
        ▼
Public Resource
```

The API key should establish the integration's **project context**.

The client should not be able to gain access to another project simply by submitting another `projectId`.

---

# 🏢 Multi-Tenant Architecture

The chat platform is organized around:

```text
Organization
    │
    ▼
Project
    │
    ▼
Workspace
    │
    ▼
Conversation
    │
    ▼
Messages
```

For the Public API, the authenticated integration establishes the **project context**.

The practical resource hierarchy is:

```text
API Key
   │
   ▼
Project
   │
   ▼
Workspace
   │
   ▼
Conversation
   │
   ▼
Messages
```

Example:

```text
CRM Integration
      │
      ▼
Project A
      │
      ▼
Workspace
      │
      ▼
Conversation
```

The integration must not be able to access:

```text
Another Organization
Another Project
Unauthorized Workspace
Unauthorized Conversation
Unauthorized Messages
```

---

# 🔒 Tenant Isolation & Resource Ownership

Every public request must be scoped to the authenticated integration's permitted project.

The authorization flow is:

```text
API Key
   ↓
Authenticated Project
   ↓
Requested Workspace
   ↓
Authorization Check
   ↓
Requested Resource
```

Never trust a client-provided:

```text
organizationId
projectId
workspaceId
```

as an authorization mechanism.

For example, do not assume this request is authorized simply because the client supplied a valid ID:

```json
{
  "projectId": "another-project"
}
```

The server must derive the integration's permitted project context from authentication.

Then it must verify that the requested workspace, conversation, message, or other resource belongs to that permitted context.

### Resource Ownership Rule

```text
API Key
   ↓
Authenticated Project
   ↓
Resource belongs to Project?
   │
   ├── Yes → Continue
   │
   └── No  → Deny
```

This prevents an integration associated with Project A from accessing resources belonging to Project B.

---

# 📋 Public API Resources

The first Public API should remain intentionally limited.

### Core Public Resources

```text
Workspaces
Conversations
Conversation Members
Messages
Notifications
```

These resources directly support the primary chat-integration use cases.

### Restricted Integration Resources

```text
Organizations
Projects
```

Organization and project management should **not** automatically become unrestricted public CRUD resources.

They should be exposed only through explicitly authorized integration-management operations where required.

The API key establishes the project context rather than allowing the external application to freely select arbitrary projects.

---

# 💬 Conversation API

External applications should be able to create and access conversations.

## Create Conversation

```text
POST /api/v1/conversations
```

Example request:

```json
{
  "workspaceId": "workspace_123",
  "name": "Customer Support"
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "conversation_123",
    "name": "Customer Support"
  }
}
```

The server must verify that `workspaceId` belongs to the authenticated integration's permitted project.

---

# 📥 Get Conversations

```text
GET /api/v1/conversations
```

Possible query parameters:

```text
workspaceId
page
limit
```

Example:

```text
GET /api/v1/conversations?workspaceId=workspace_123
```

The requested workspace must be authorized before returning conversations.

---

# 💬 Message API

Messages are one of the most important public resources.

## Send Message

```text
POST /api/v1/messages
```

Example:

```json
{
  "conversationId": "conversation_123",
  "content": "Hello from CRM"
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "message_123",
    "conversationId": "conversation_123",
    "content": "Hello from CRM"
  }
}
```

The server must verify that the conversation belongs to the authenticated integration's permitted project.

---

# 📥 Fetch Messages

```text
GET /api/v1/conversations/:conversationId/messages
```

Possible parameters:

```text
page
limit
before
after
```

This allows external applications to display conversation history while maintaining tenant and resource authorization.

---

# 👥 Conversation Members

External applications may need to manage conversation members.

Possible endpoints:

```text
GET    /api/v1/conversations/:id/members
POST   /api/v1/conversations/:id/members
DELETE /api/v1/conversations/:id/members/:userId
```

Every operation must verify:

```text
Authenticated integration
        ↓
Project ownership
        ↓
Conversation access
        ↓
Required permission
```

---

# 🔔 Notification API

External applications may retrieve notification information.

Example:

```text
GET /api/v1/notifications
```

Possible parameters:

```text
page
limit
unread
```

Persistent notification records remain stored in MongoDB.

---

# 🔎 Search API

The existing message-search functionality can optionally be exposed.

Example:

```text
GET /api/v1/messages/search?q=customer
```

Search must respect the same authorization boundaries as normal message access.

An integration must never be able to search messages outside its permitted tenant/project scope.

---

# 🚫 Do Not Expose Internal APIs Directly

Avoid exposing internal administrative or debugging endpoints such as:

```text
/internal/debug
/internal/database
/internal/system
```

Public APIs should expose only intentionally supported capabilities.

Internal implementation details should remain inaccessible to external applications.

---

# 🧩 Public API vs Internal API

| Feature                | Internal API | Public API |
| ---------------------- | ------------ | ---------- |
| Frontend application   | ✅            | Optional   |
| External applications  | ❌            | ✅          |
| Versioning             | Optional     | Required   |
| API keys               | Optional     | Required   |
| Strict validation      | ✅            | ✅          |
| Tenant isolation       | ✅            | ✅          |
| Rate limiting          | Recommended  | Required   |
| Documentation          | Internal     | Required   |
| Backward compatibility | Flexible     | Important  |
| Public contract        | ❌            | ✅          |

---

# 🛡️ Validation

Every public endpoint must validate incoming data.

Example:

```text
POST /api/v1/messages
```

Validate:

```text
conversationId → required
content → required
content length → limited
```

Invalid request:

```json
{
  "content": ""
}
```

Example response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message content is required"
  }
}
```

The Public API should reuse the validation infrastructure established in Phase 5.

---

# 🚦 Rate Limiting

Public APIs must use rate limiting.

Flow:

```text
External Application
        │
        ▼
    Public API
        │
        ▼
    Rate Limiter
        │
        ├── Allowed
        │
        └── Too Many Requests
                  │
                  ▼
                 429
```

Redis from Phase 5 can provide distributed rate limiting across multiple backend instances.

---

# 🔐 Authorization

Authentication answers:

> Who is making this request?

Authorization answers:

> What is this integration allowed to do?

Example:

```text
CRM API Key
     │
     ▼
Project A
     │
     ├── Read conversations ✅
     ├── Send messages      ✅
     ├── Read messages      ✅
     └── Access Project B   ❌
```

Authorization must be checked against both:

```text
Integration identity
+
Requested resource
```

---

# 🎭 API Permissions

The Public API should define a scope-based permission model.

Examples:

```text
conversations:read
conversations:write

messages:read
messages:write

members:read
members:write

notifications:read
```

The next **API Keys** module can associate these scopes with individual API keys.

Example:

```text
API Key
   │
   ├── messages:read
   ├── messages:write
   └── conversations:read
```

An API key without `messages:write` must not be allowed to create messages.

---

# 📦 Consistent Response Format

All public endpoints should follow a predictable response structure.

## Success

```json
{
  "success": true,
  "data": {}
}
```

## Error

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Conversation not found"
  }
}
```

This makes the platform easier for external developers to integrate with.

---

# 📊 HTTP Status Codes

Use standard HTTP status codes.

| Status | Meaning                                    |
| -----: | ------------------------------------------ |
|    200 | Successful request                         |
|    201 | Resource created                           |
|    204 | Successful operation with no response body |
|    400 | Invalid request                            |
|    401 | Authentication required or failed          |
|    403 | Forbidden                                  |
|    404 | Resource not found                         |
|    409 | Conflict                                   |
|    422 | Validation failure                         |
|    429 | Rate limit exceeded                        |
|    500 | Internal server error                      |

---

# 🧠 Error Consistency

Do not return completely different error structures from every endpoint.

Bad:

```json
{
  "error": "Something failed"
}
```

Another endpoint:

```json
{
  "message": "Invalid"
}
```

Prefer one standard structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request"
  }
}
```

This provides a predictable contract for external developers.

---

# 📄 Pagination

Large resources should not return everything at once.

Example:

```text
GET /api/v1/conversations?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 84,
    "totalPages": 5
  }
}
```

Apply pagination to:

```text
Messages
Conversations
Members
Notifications
Search results
```

---

# 🔍 Filtering

Public APIs can support controlled filtering.

Example:

```text
GET /api/v1/notifications?unread=true
```

Do not expose arbitrary MongoDB query objects.

Avoid:

```text
?where={}
?filter={}
?query={}
```

being passed directly to database operations.

Only explicitly supported filters should be accepted.

---

# 📈 Sorting

If required, support controlled sorting.

Example:

```text
GET /api/v1/messages?sort=createdAt&order=desc
```

Only predefined sortable fields should be accepted.

Never allow clients to provide arbitrary database field expressions.

---

# 🔄 Idempotency

Public write operations can be retried by external applications because of:

```text
Network failures
Timeouts
Connection interruptions
Client retries
```

For critical write operations such as:

```text
POST /api/v1/messages
POST /api/v1/conversations
```

idempotency should be supported.

Example:

```text
CRM
 │
 ├── Request + Idempotency-Key
 │
 └── Retry + same Idempotency-Key
          │
          ▼
     One logical operation
```

Without idempotency:

```text
CRM
 │
 ├── Request 1
 └── Retry
       │
       ▼
Two messages created
```

With idempotency:

```text
CRM
 │
 ├── Request + same key
 └── Retry + same key
          │
          ▼
      One message
```

For the portfolio version, the API should define the idempotency contract even if complete support is introduced incrementally.

A future implementation can store idempotency state in Redis with a controlled TTL.

---

# 🆔 External IDs

External applications may have their own user or customer identifiers.

Example:

```text
CRM
customerId = CRM-10023
```

Your chat platform may have:

```text
userId = CHAT-83921
```

Do not require both systems to use the same database identifiers.

Instead, maintain an external identity mapping.

Conceptually:

```text
CRM
customerId
    │
    ▼
Integration Mapping
    │
    ▼
Chat Platform
externalUserId
    │
    ▼
internal userId
```

This becomes especially useful when integrating the platform with CRM, HRM, or ERP systems.

---

# 🔗 Integration Example — CRM

A CRM can use the Public API like:

```text
CRM
 │
 ├── Customer created
 │
 ▼
Chat Platform API
 │
 ├── Identify chat user
 ├── Create conversation
 └── Add members
```

Then:

```text
CRM User
    │
    ▼
Chat Platform
    │
    ▼
Conversation
    │
    ▼
Messages
```

The CRM does not need to build its own chat backend.

---

# 🔗 Integration Example — HRM

The same platform can work with an HRM:

```text
HRM
 │
 ▼
Chat API
 │
 ├── Employee identity
 ├── Team conversation
 └── Messages
```

The HRM can reuse the same chat infrastructure.

---

# 🔗 Integration Example — ERP

Similarly:

```text
ERP
 │
 ▼
Chat API
 │
 ├── Users
 ├── Departments
 ├── Conversations
 └── Messages
```

The same chat backend can serve multiple business systems.

---

# 🌐 Public API Security Pipeline

The complete request flow should be:

```text
External Application
        │
        ▼
    API Request
        │
        ▼
    API Version
        │
        ▼
  Authentication
        │
        ▼
   Rate Limiting
        │
        ▼
    Validation
        │
        ▼
   Authorization
        │
        ▼
    Controller
        │
        ▼
     Service
        │
        ▼
     MongoDB
        │
        ▼
    Response
```

Important security and operational events should be logged throughout the pipeline.

---

# 📝 Logging

Use the Phase 5 structured logging system.

Example:

```json
{
  "level": "info",
  "event": "public_api.request",
  "method": "POST",
  "path": "/api/v1/messages",
  "projectId": "...",
  "requestId": "..."
}
```

Do not log:

```text
API keys
Passwords
JWT tokens
Private message content
Secrets
Authorization headers
Sensitive request bodies
```

The existing request ID from the Logging module should continue through the Public API request lifecycle.

---

# 🔌 Real-Time Integration

The Public REST API handles persistent operations.

Socket.IO continues to handle real-time events.

```text
External Application
       │
       ├──────── REST API ────────► Chat Platform
       │
       └──────── Socket.IO ───────► Chat Platform
```

For example:

```text
POST /api/v1/messages
        │
        ▼
Message stored
        │
        ▼
Socket.IO event
        │
        ▼
Other connected users
```

This maintains the architecture established during Phase 3.

---

# 🧠 REST vs Socket.IO

## Public REST API

Use REST for:

```text
Create conversation
Fetch conversations
Send message
Fetch messages
Manage members
Search
Notifications
Persistent operations
```

## Socket.IO

Use Socket.IO for:

```text
New message delivery
Typing indicators
Presence
Read receipts
Reactions
Real-time notifications
```

The two systems complement each other rather than replacing one another.

---

# 🔄 Message Delivery Architecture

A message created through the Public API should follow the same core business flow as an internally created message.

```text
External Application
        │
        ▼
POST /api/v1/messages
        │
        ▼
Authentication
        │
        ▼
Authorization
        │
        ▼
Message Service
        │
        ├──────────────► MongoDB
        │
        ▼
    Socket.IO
        │
        ▼
Connected Clients
```

This prevents the Public API from creating a separate messaging architecture.

---

# 📚 API Documentation

The Public API should eventually have machine-readable documentation.

Recommended:

```text
OpenAPI / Swagger
```

Documentation should describe:

```text
Endpoints
Authentication
Request body
Response body
Status codes
Parameters
Errors
Permissions
Pagination
Examples
Rate limits
Idempotency behavior
```

Example:

```text
POST /api/v1/messages
```

Request:

```json
{
  "conversationId": "...",
  "content": "Hello"
}
```

Response:

```text
201 Created
```

---

# 🧪 Testing Strategy

## Test 1 — Platform Health

Platform health should preferably be separated from the versioned integration contract.

Recommended:

```text
GET /health
```

Expected:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

The `/health` endpoint is intended for platform monitoring rather than being treated as a normal public integration resource.

---

## Test 2 — Authentication

Call a protected endpoint without valid credentials.

Expected:

```text
401 Unauthorized
```

---

## Test 3 — Authorization

Use valid credentials against a resource outside the permitted project.

Expected:

```text
403 Forbidden
```

or an appropriately non-disclosing response where resource existence should not be revealed.

---

## Test 4 — Validation

Send invalid message data.

Expected:

```text
400 / 422
```

with the standard error format.

---

## Test 5 — Create Conversation

```text
POST /api/v1/conversations
```

Expected:

```text
201 Created
```

---

## Test 6 — Fetch Conversations

```text
GET /api/v1/conversations
```

Expected:

```text
200 OK
```

with pagination.

---

## Test 7 — Send Message

```text
POST /api/v1/messages
```

Expected:

```text
201 Created
```

---

## Test 8 — Fetch Messages

```text
GET /api/v1/conversations/:id/messages
```

Expected:

```text
200 OK
```

---

## Test 9 — Rate Limiting

Send requests beyond the configured limit.

Expected:

```text
429 Too Many Requests
```

---

## Test 10 — Tenant Isolation

Attempt:

```text
Project A → Project B resource
```

Expected:

```text
403 Forbidden
```

or an appropriately non-disclosing response.

---

## Test 11 — API Scope

Attempt an operation that is not included in the API key's permissions.

Example:

```text
API Key
    │
    ├── messages:read  ✅
    └── messages:write ❌
```

Attempt:

```text
POST /api/v1/messages
```

Expected:

```text
403 Forbidden
```

---

## Test 12 — Idempotency

Send the same write request twice using the same idempotency key.

Expected:

```text
One logical operation
```

No duplicate message or conversation should be created.

---

# 📊 Public API Test Matrix

| Feature                | Expected                      |
| ---------------------- | ----------------------------- |
| API version            | `/api/v1`                     |
| Authentication         | Required                      |
| API key authentication | Supported                     |
| Authorization          | Required                      |
| Permission scopes      | Supported                     |
| Validation             | Required                      |
| Rate limiting          | Required                      |
| Pagination             | Supported                     |
| Standard responses     | Required                      |
| Error format           | Consistent                    |
| Tenant isolation       | Required                      |
| Project ownership      | Required                      |
| Idempotency            | Supported for critical writes |
| Logging                | Required                      |
| REST operations        | Supported                     |
| Socket events          | Separate                      |
| Documentation          | Required                      |

---

# 🚫 What This Module Does NOT Include

The following belong to the next or later modules:

```text
API key generation
API key hashing
API key rotation
API key revocation
API key expiration
Detailed key management UI
Webhook delivery
Webhook retries
Embedded chat widget
```

These should not be mixed into the Public API module.

The next module will specifically implement the API-key lifecycle.

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Public API namespace created
* [ ] `/api/v1` versioning implemented
* [ ] Public routes separated from internal routes
* [ ] Authentication boundary implemented
* [ ] API-key authentication contract defined
* [ ] Authorization enforced
* [ ] Permission scopes defined
* [ ] Tenant isolation enforced
* [ ] Project ownership enforced
* [ ] Request validation implemented
* [ ] Rate limiting integrated
* [ ] Standard response format implemented
* [ ] Standard error format implemented
* [ ] Pagination implemented
* [ ] Controlled filtering implemented
* [ ] Controlled sorting implemented
* [ ] Idempotency contract defined for critical writes
* [ ] Logging integrated
* [ ] Sensitive information protected
* [ ] REST and Socket.IO responsibilities separated
* [ ] API documentation prepared
* [ ] Public API tested

---

# 📊 Phase 6 Progress

```text
Phase 6 — Integration Platform

├── Public API       🟡 Current
├── API Keys         ⏳
├── Webhooks         ⏳
└── Chat Widget      ⏳
```

---

# 🎯 Module Completion Criteria

The Public API module is complete when:

```text
Public API
│
├── API Versioning              ✅
├── Public Routes               ✅
├── Authentication Boundary     ✅
├── API Key Contract            ✅
├── Authorization               ✅
├── Permission Scopes           ✅
├── Tenant Isolation            ✅
├── Project Ownership            ✅
├── Validation                  ✅
├── Rate Limiting               ✅
├── Pagination                  ✅
├── Standard Responses          ✅
├── Error Responses             ✅
├── Idempotency Contract        ✅
├── Logging                     ✅
├── REST API                    ✅
├── Socket Integration          ✅
├── Documentation               ✅
└── Testing                    ✅
```

---

# 🏁 Result

After completing this module, the application is no longer simply:

```text
"Chat Application"
```

It becomes:

```text
"Reusable Chat Platform"
```

with an architecture like:

```text
                    YOUR CHAT PLATFORM
                           │
              ┌────────────┴────────────┐
              │                         │
         Public REST API            Socket.IO
              │                         │
       ┌──────┼──────┐                  │
       ▼      ▼      ▼                  ▼
      CRM     HRM    ERP          Real-Time Events
```

External systems can consume the platform without implementing their own messaging infrastructure.

---

# 🧩 Integration Platform Architecture

The complete Phase 6 direction is:

```text
                         CHAT PLATFORM
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Public REST        Webhooks        Chat Widget
             │                │                │
             ▼                ▼                ▼
            CRM              HRM           Websites
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                         Socket.IO
                              │
                              ▼
                       Real-Time Chat
```

The progression is:

```text
Public API
     ↓
API Keys
     ↓
Webhooks
     ↓
Chat Widget
```

This transforms the project from a chat application into an **integration-ready communication platform**.

---

# 🚀 Next Module

The next module is:

```text
Module 2 — API Keys
```

The API Keys module will build the secure credential layer for the Public API.

It will cover:

```text
API key generation
        ↓
Secure key storage / hashing
        ↓
Key identification
        ↓
Project association
        ↓
Permission scopes
        ↓
Expiration
        ↓
Rotation
        ↓
Revocation
        ↓
Authentication middleware
```

This will connect the Public API to a real external-application authentication system.

# 🛡️ Rate Limiting Module

## 📋 Module Information

| Property            | Value                               |
| ------------------- | ----------------------------------- |
| **Module**          | Rate Limiting                       |
| **Version**         | v1.1                                |
| **Status**          | 🟡 In Development                   |
| **Phase**           | Phase 5 — Security & Production     |
| **Module Number**   | Module 2                            |
| **Previous Module** | Input Validation & Sanitization     |
| **Next Module**     | Authorization Hardening             |
| **Depends On**      | Authentication, REST API, Socket.IO |
| **Database**        | MongoDB                             |
| **Backend**         | Node.js + Express                   |
| **Real-Time Layer** | Socket.IO                           |

---

# 📌 Overview

The **Rate Limiting module** protects the chat platform from excessive requests, request flooding, brute-force attempts, spam, and abusive client behavior.

Without rate limiting, a client could repeatedly call APIs such as:

```text
Login
Signup
Password Reset
Message Creation
Search
File Upload
Notifications
```

and consume unnecessary:

```text
CPU
Memory
Database connections
Database queries
Storage
Socket.IO events
Notification processing
```

The rate limiter controls how frequently a client can perform specific operations within a defined time window.

The core flow is:

```text
Client
   │
   ▼
Request Parsing
   │
   ▼
Rate Limiting
   │
   ├── Within Limit ──► Continue
   │
   └── Exceeded ──────► Reject
```

Rate limiting should occur **before expensive application processing**.

However, its exact placement can vary depending on whether the endpoint is public or authenticated and which identifier is required to calculate the limit.

---

# 🎯 Objectives

The module should:

* Protect public APIs
* Protect authentication endpoints
* Protect expensive APIs
* Prevent request flooding
* Limit excessive message creation
* Limit expensive search operations
* Provide consistent `429` responses
* Support different limits for different endpoint categories
* Use an explicit client-identification strategy
* Avoid blocking normal users unnecessarily
* Handle reverse-proxy IP behavior correctly
* Protect important Socket.IO events
* Use event-specific Socket.IO policies
* Consider both burst and sustained traffic
* Provide retry information where appropriate
* Support standard rate-limit response headers
* Keep configuration centralized
* Prepare the application for distributed rate limiting
* Avoid implementing custom rate-limit algorithms unnecessarily

---

# 🧠 Core Principle

Rate limiting is not intended to prevent normal application usage.

Its purpose is to control **abnormally frequent or excessive activity**.

Normal user:

```text
Normal User
   │
   ▼
Requests within configured limit
   │
   ▼
Allowed
```

Abusive client:

```text
Abusive Client
   │
   ▼
Excessive request frequency
   │
   ▼
Rate Limit
   │
   ▼
429 Too Many Requests
```

The goal is:

> **Allow normal application behavior while preventing excessive traffic from consuming disproportionate application resources.**

---

# 🏗️ Rate-Limiting Architecture

The exact middleware order depends on whether the endpoint is public or authenticated.

## 🔐 Protected API Flow

For authenticated endpoints:

```text
                 Client
                    │
                    ▼
             Request Parsing
                    │
                    ▼
            Coarse Rate Limit
                    │
                    ▼
              Authentication
                    │
                    ▼
               Validation
                    │
                    ▼
              Normalization
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
```

The coarse rate limit provides an early protection layer before expensive authentication, validation, authorization, and business processing.

---

# 🌐 Public Endpoint Flow

Public endpoints do not have an authenticated user yet.

Examples:

```text
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/forgot-password
```

Their flow is:

```text
Request
   │
   ▼
Request Parsing
   │
   ▼
Rate Limiting
   │
   ▼
Validation
   │
   ▼
Normalization
   │
   ▼
Controller
```

This allows the application to protect authentication endpoints before expensive authentication logic executes.

---

# 🔐 Authenticated Endpoint Flow

For authenticated APIs:

```text
Request
   │
   ▼
Request Parsing
   │
   ▼
Coarse Rate Limiting
   │
   ▼
Authentication
   │
   ▼
Validation
   │
   ▼
Normalization
   │
   ▼
Authorization
   │
   ▼
Controller
   │
   ▼
Service
```

A second, more specific limiter can optionally be applied after authentication when the policy requires a **user-specific key**.

For example:

```text
Request
   │
   ▼
IP-based protection
   │
   ▼
Authentication
   │
   ▼
User-specific rate limit
   │
   ▼
Validation
   │
   ▼
Authorization
   │
   ▼
Controller
```

Therefore:

> **Rate limiting does not have one universal position for every endpoint. The placement depends on whether the limiter requires information that is only available after authentication.**

---

# 🧠 Rate Limiting vs Application Security Layers

Rate limiting is one security layer among several.

```text
Request
   │
   ▼
Rate Limiting
   │
   ▼
Authentication
   │
   ▼
Validation
   │
   ▼
Normalization
   │
   ▼
Authorization
   │
   ▼
Business Logic
```

Each layer has a separate responsibility.

### Rate Limiting

```text
Is this client sending requests too frequently?
```

### Authentication

```text
Who is making the request?
```

### Validation

```text
Is the request structurally valid?
```

### Authorization

```text
Is this authenticated user allowed to perform the operation?
```

---

# 📊 Rate-Limit Categories

A single identical limit should not be applied to every endpoint.

Different operations have different risk and resource characteristics.

Recommended categories:

```text
Authentication
General API
Message Creation
Search
Sensitive Operations
Socket Events
```

---

# 🔐 1. Authentication Rate Limiting

Authentication endpoints are high-value targets.

Examples:

```text
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

These endpoints should have stricter limits than ordinary APIs.

Example:

```text
Client
   │
   ▼
Authentication Request
   │
   ▼
Rate Limiter
   │
   ├── Within Limit → Continue
   │
   └── Exceeded → 429
```

This helps reduce:

* Brute-force attempts
* Credential stuffing
* Automated login abuse
* Password-reset abuse
* Signup flooding

---

# 🌐 2. General API Rate Limiting

Normal APIs can use a broader policy.

Examples:

```text
GET /api/conversations
GET /api/messages
GET /api/notifications
GET /api/workspaces
GET /api/projects
```

The goal is to prevent accidental or malicious request flooding without unnecessarily restricting normal application usage.

---

# 💬 3. Message Creation Rate Limiting

Message creation deserves a dedicated policy because a single request can trigger several operations:

```text
Database write
Socket.IO event
Notification
Unread counter update
Message-related processing
```

Flow:

```text
Send Message
     │
     ▼
Rate Limiter
     │
     ▼
Message Service
     │
     ├── MongoDB
     ├── Socket.IO
     ├── Notifications
     └── Unread Counter
```

A client generating hundreds of messages rapidly should not be allowed to trigger unlimited downstream processing.

For authenticated message creation, the primary limiter key should be:

```text
User ID
```

An additional IP-level protection layer may be used where appropriate.

---

# 🔍 4. Search Rate Limiting

Message search can be more expensive than a simple resource lookup.

Example:

```text
GET /api/messages/search?q=project
```

Search should therefore have its own policy.

```text
Search Request
      │
      ▼
Rate Limiter
      │
      ▼
Search Service
      │
      ▼
MongoDB
```

For authenticated search:

```text
Primary key → User ID
```

Search should also continue to use:

```text
Pagination limits
Query-length limits
Database indexes
Efficient query design
```

Rate limiting does not replace database-level performance protections.

---

# 📎 5. Sensitive Operations

Some operations require stricter limits.

Examples:

```text
Password reset
File upload
Account changes
API key operations
```

These should not necessarily use the same policy as normal GET requests.

Example:

```text
Sensitive Operation
        │
        ▼
Strict Rate Limit
        │
        ▼
Validation
        │
        ▼
Authorization
```

---

# 👤 Client Identification Policy

A rate limiter needs a clear way to identify clients.

For this project, the default policy is:

```text
Public endpoints
    → IP-based

Authenticated endpoints
    → User ID-based

Authentication endpoints
    → IP + normalized account identifier
```

An additional global IP-based limiter may be used to protect against abuse across multiple accounts.

---

# 🌐 Client Identification Matrix

| Endpoint Type     | Primary Rate-Limit Key                                   | Additional Protection               |
| ----------------- | -------------------------------------------------------- | ----------------------------------- |
| Public API        | IP                                                       | Optional global IP limit            |
| Login             | IP + normalized account identifier                       | Global IP protection                |
| Signup            | IP                                                       | Optional account-related protection |
| Forgot Password   | IP + normalized account identifier                       | Global IP protection                |
| Reset Password    | IP + authenticated/reset-flow identifier where available | IP protection                       |
| Authenticated API | User ID                                                  | Optional IP protection              |
| Message Creation  | User ID                                                  | Optional IP protection              |
| Search            | User ID                                                  | Optional IP protection              |
| File Upload       | User ID                                                  | Optional IP protection              |
| Socket.IO Events  | User ID / Socket identity                                | Optional IP protection              |

This gives the implementation a clear default policy without requiring a complex anti-bot system.

---

# 🔐 Authentication Endpoint Strategy

Authentication endpoints do not have an authenticated user yet.

Therefore, an IP-based layer is important.

For account-sensitive operations such as login:

```text
IP
 +
Normalized account identifier
```

can be used.

Example:

```text
Same IP
   │
   ├── Account A
   ├── Account B
   └── Account C
```

The limiter should avoid relying only on the account identifier because an attacker could simply change the identifier.

Similarly, relying only on IP can cause problems for users sharing the same public IP.

Therefore:

```text
IP protection
       +
Account-specific protection
```

provides a stronger baseline.

The portfolio implementation does not require a sophisticated anti-bot or reputation system.

---

# 🌐 Reverse Proxy and Client IP Handling

When deployed behind a reverse proxy:

```text
Client
   │
   ▼
Reverse Proxy
   │
   ▼
Node.js
```

the Node.js application may not directly see the client's real IP.

Possible infrastructure includes:

```text
Nginx
Cloudflare
Load Balancer
Hosting Proxy
Platform Proxy
```

If forwarded IP information is used for rate limiting, the backend must be correctly configured to trust **only the intended proxy infrastructure**.

Incorrect proxy configuration can result in:

```text
All users
   │
   ▼
Same proxy IP
   │
   ▼
Incorrect rate-limit bucket
```

This could unintentionally rate-limit multiple users together.

Therefore:

> **Forwarded client IP information must only be trusted when the deployment's proxy configuration is explicitly and correctly configured.**

The application should not blindly trust arbitrary client-provided IP headers.

---

# 🧩 Recommended Middleware Structure

Recommended structure:

```text
src/
│
├── middleware/
│   ├── auth.middleware.js
│   ├── validate.middleware.js
│   └── rateLimit.middleware.js
│
└── config/
    └── rateLimit.config.js
```

If the implementation requires additional abstraction:

```text
src/
│
├── middleware/
│   ├── rateLimit.middleware.js
│   └── authRateLimit.middleware.js
│
├── config/
│   └── rateLimit.config.js
│
├── services/
│   └── rateLimit.service.js
│
└── utils/
    └── rateLimitResponse.js
```

The exact structure may be adapted to the existing project architecture.

---

# ⚙️ Rate-Limit Configuration

Rate-limit policies should remain centralized.

Example:

```text
rateLimit.config.js

AUTH
GENERAL_API
MESSAGE
SEARCH
SENSITIVE
SOCKET
```

Conceptually:

```text
Rate Limit Configuration
        │
        ├── Authentication
        ├── General API
        ├── Messages
        ├── Search
        ├── Sensitive Operations
        └── Socket Events
```

This prevents limits from being hardcoded throughout controllers and routes.

---

# ⏱️ Time Window

A rate limit normally consists of:

```text
Maximum Requests
        +
Time Window
```

Example:

```text
100 requests
within
1 minute
```

However, numerical limits should be based on:

```text
Expected application usage
Endpoint cost
User behavior
Deployment capacity
Security requirements
```

They should not be selected simply because they are common examples.

---

# 💥 Burst vs Sustained Traffic

A simple fixed-window limit does not necessarily prevent short bursts.

For example:

```text
100 requests
within 1 minute
```

could potentially allow:

```text
100 requests
within 1 second
+
0 requests
for the remaining 59 seconds
```

Depending on the limiter algorithm, this may still create a significant short-term load.

Therefore, the rate-limiting strategy should consider:

```text
Short burst protection
        +
Sustained request protection
```

Possible algorithms include:

```text
Fixed Window
Sliding Window
Token Bucket
Leaky Bucket
```

For this portfolio project:

> **Use a maintained rate-limiting library rather than implementing the counter algorithm manually.**

The project should document the chosen strategy without unnecessarily building a custom rate-limiting algorithm.

---

# 📊 Rate-Limit Policy

The recommended policy is:

| Category             | Protection Level  | Primary Key                  |
| -------------------- | ----------------- | ---------------------------- |
| Authentication       | Strict            | IP + account identifier      |
| General API          | Moderate          | User ID                      |
| Message Creation     | Moderate          | User ID                      |
| Search               | Moderate / Strict | User ID                      |
| Sensitive Operations | Strict            | User ID / operation-specific |
| Socket Events        | Event-specific    | User ID                      |

The exact numerical values should be configured according to expected application behavior and deployment capacity.

---

# 📤 Rate-Limit Response

When a limit is exceeded, the REST API should return:

```text
429 Too Many Requests
```

Example:

```json
{
    "success": false,
    "message": "Too many requests. Please try again later."
}
```

The response should not expose internal rate-limiter implementation details.

---

# ⏳ Retry Information

Where appropriate, the response should communicate when the client may retry.

Example:

```text
429 Too Many Requests
Retry-After: 30
```

Conceptual response:

```json
{
    "success": false,
    "message": "Too many requests. Please try again later.",
    "retryAfter": 30
}
```

`Retry-After` should be preferred for communicating retry timing when supported by the selected implementation.

---

# 📊 Rate-Limit Headers

The API may expose rate-limit information through standard response headers.

Examples include:

```text
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
```

Example:

```text
RateLimit-Limit: 100
RateLimit-Remaining: 72
RateLimit-Reset: ...
```

The exact header format should follow the standard supported by the selected rate-limiting library/framework.

The application should avoid inventing incompatible custom header semantics.

---

# 💬 Message Rate Limiting

Authenticated message creation should primarily use:

```text
User ID
```

as the rate-limit key.

Example:

```text
User A
   │
   ├── Message 1
   ├── Message 2
   ├── Message 3
   └── ...
```

Once the configured threshold is reached:

```text
User A
   │
   ▼
Rate Limit Exceeded
   │
   ▼
429 / Event Rejection
```

An optional IP-level protection layer can provide additional defense against abuse from multiple accounts or unauthenticated sources.

---

# 🔍 Search Rate Limiting

Authenticated search requests should primarily use:

```text
User ID
```

Example:

```text
User A
   │
   ├── Search 1
   ├── Search 2
   └── Search N
```

Once the threshold is reached:

```text
429 Too Many Requests
```

Search rate limiting should work together with:

```text
Query length validation
Pagination limits
Database indexes
Efficient query design
```

---

# 📡 Socket.IO Rate Limiting

REST APIs are not the only application entry point.

The chat platform also accepts client-controlled events through:

```text
Socket.IO
```

Important events include:

```text
message:send
typing:start
typing:stop
message:reaction
message:read
conversation:join
conversation:leave
```

Each event should have an appropriate rate-limiting policy.

---

# 🧠 Socket.IO Rate-Limit Flow

```text
Socket Connection
       │
       ▼
Socket Authentication
       │
       ▼
Socket Event
       │
       ▼
Rate Limit Check
       │
    ┌──┴─────────┐
    ▼            ▼
 Allowed       Exceeded
    │            │
    ▼            ▼
Process       Reject /
              Throttle
```

Socket.IO rate limiting should primarily identify the client using:

```text
Authenticated User ID
```

when the socket is authenticated.

---

# 📊 Socket.IO Event Policies

Not every Socket.IO event should have the same limit.

Recommended categories:

| Socket Event         | Policy            |
| -------------------- | ----------------- |
| `message:send`       | Moderate / Strict |
| `message:reaction`   | Moderate          |
| `message:read`       | Moderate          |
| `conversation:join`  | Moderate          |
| `conversation:leave` | Moderate          |
| `typing:start`       | Lightweight       |
| `typing:stop`        | Lightweight       |

The exact numerical limits are intentionally configuration-dependent.

The important principle is:

> **Socket event limits must be event-specific because normal event frequency varies significantly between event types.**

---

# ⚠️ Do Not Aggressively Rate-Limit Typing Events

Typing indicators can naturally occur frequently.

For example:

```text
typing:start
typing:stop
typing:start
typing:stop
```

A strict message-style limiter could interfere with normal chat behavior.

Therefore:

```text
message:send
    → stronger protection

typing:start
    → lightweight protection
```

The goal is to control abuse without damaging normal real-time UX.

---

# 🧠 Rate Limiting vs Validation

These modules have different responsibilities.

### Validation

Checks:

```text
Is the request structurally valid?
```

Example:

```text
Invalid message
      │
      ▼
400 Bad Request
```

### Rate Limiting

Checks:

```text
Is the client sending requests too frequently?
```

Example:

```text
Too many requests
      │
      ▼
429 Too Many Requests
```

Together:

```text
Request
   │
   ▼
Rate Limit
   │
   ▼
Authentication
   │
   ▼
Validation
   │
   ▼
Normalization
   │
   ▼
Authorization
   │
   ▼
Business Logic
```

---

# 🧠 Rate Limiting vs Authorization

Rate limiting and authorization solve different problems.

Rate limiting asks:

```text
How frequently can this client perform this operation?
```

Authorization asks:

```text
Is this user allowed to perform this operation?
```

Example:

```text
User sends message
       │
       ├── Rate Limit
       │      ↓
       │   Is frequency allowed?
       │
       └── Authorization
              ↓
          Is user a member?
```

Both checks remain necessary.

---

# 🗃️ Storage Strategy

For a simple single-instance portfolio deployment, an in-memory limiter can be sufficient for development and basic deployments.

Example:

```text
Server
   │
   └── In-Memory Counters
```

However, multiple backend instances create a consistency problem.

Example:

```text
                 Client
                    │
             ┌──────┴──────┐
             ▼             ▼
          Server A       Server B
             │             │
       Counter A       Counter B
```

A client could potentially bypass a per-server limit by distributing requests across instances.

Therefore, distributed deployments should use shared rate-limit storage.

---

# 🔴 Redis and Distributed Rate Limiting

Redis can provide shared counters across application instances.

Architecture:

```text
                 Client
                    │
                    ▼
            Load Balancer / Proxy
                    │
             ┌──────┴──────┐
             ▼             ▼
          Server A       Server B
             │             │
             └──────┬──────┘
                    ▼
                  Redis
```

Redis allows:

```text
Server A
   │
   └── Shared Rate-Limit State
             ▲
             │
Server B
```

This provides consistent rate-limit state across multiple backend instances.

---

# ⚠️ Redis Is Not Required for the Basic Module

Redis should not become a hard dependency for completing the basic rate-limiting implementation.

The implementation can initially use:

```text
In-memory storage
```

for:

```text
Development
Single-instance deployment
Portfolio demonstration
```

Later, the project can move to:

```text
Redis
   │
   ▼
Distributed Rate Limiting
```

when multiple backend instances are introduced.

---

# 🧩 Rate-Limiter Algorithm Strategy

The project should not implement its own rate-limiting algorithm unless there is a specific learning requirement.

Prefer a maintained library that provides:

```text
Rate limiting
Configurable windows
Client keys
Standard responses
Retry information
Storage adapters
```

The application should focus on:

```text
Policy
Configuration
Endpoint protection
Client identification
Testing
Monitoring
```

rather than reinventing the underlying algorithm.

---

# 🔗 Applying Rate Limits

Authentication:

```text
Authentication
      │
      ▼
authRateLimiter
      │
      ▼
authController
```

General APIs:

```text
generalRateLimiter
      │
      ▼
Protected Routes
```

Messages:

```text
messageRateLimiter
      │
      ▼
Message Controller
```

Search:

```text
searchRateLimiter
      │
      ▼
Search Controller
```

Sensitive operations:

```text
sensitiveRateLimiter
      │
      ▼
Sensitive Controller
```

Socket events:

```text
Socket Event
      │
      ▼
eventRateLimiter
      │
      ▼
Event Handler
```

---

# 🗂️ Recommended Folder Structure

```text
src/
│
├── middleware/
│   ├── rateLimit.middleware.js
│   └── authRateLimit.middleware.js
│
├── config/
│   └── rateLimit.config.js
│
├── services/
│   └── rateLimit.service.js
│
└── utils/
    └── rateLimitResponse.js
```

If the selected library handles the majority of the implementation, the structure can remain smaller:

```text
src/
│
├── middleware/
│   └── rateLimit.middleware.js
│
└── config/
    └── rateLimit.config.js
```

The architecture should avoid unnecessary abstraction.

---

# 🧪 Testing Strategy

The module should be tested with normal, excessive, concurrent, and boundary traffic.

---

## 1. Normal Requests

Send requests below the configured limit.

Expected:

```text
200 / 201
```

---

## 2. Exceed Limit

Send requests beyond the configured limit.

Expected:

```text
429 Too Many Requests
```

---

## 3. Authentication Protection

Repeatedly call:

```text
POST /api/auth/login
```

Expected:

```text
Requests within limit → Allowed
Requests beyond limit → 429
```

---

## 4. Message Protection

Repeatedly create messages.

Expected:

```text
Allowed → Normal
Exceeded → 429
```

---

## 5. Search Protection

Repeatedly search messages.

Expected:

```text
Within limit → Allowed
Beyond limit → 429
```

---

## 6. Socket Protection

Generate excessive Socket.IO events.

Expected:

```text
Normal events → Processed
Excessive events → Rejected / throttled
```

---

## 7. Rate-Limit Reset

After the configured window expires:

```text
Limit exceeded
      │
      ▼
Wait
      │
      ▼
Window reset
      │
      ▼
Requests allowed again
```

---

## 8. Different Users

Verify that one user's rate limit does not unintentionally block another user.

```text
User A → Limit reached
User B → Still allowed
```

---

## 9. Different Endpoints

Verify that limits are independent where intended.

Example:

```text
Message limit reached
       │
       ▼
Message API → 429

Search API
       │
       ▼
May still be allowed
```

The exact relationship depends on the configured policy.

---

## 10. Burst Traffic

Generate a large number of requests in a very short period.

Example:

```text
100 requests
within 1 second
```

Expected:

```text
Burst protection should prevent
uncontrolled short-term load.
```

---

## 11. Sustained Traffic

Generate requests continuously over the configured time period.

Expected:

```text
Sustained traffic beyond policy
       │
       ▼
Rate limit enforced
```

---

## 12. Concurrent Requests

Send multiple requests simultaneously.

Expected:

```text
Rate-limit state remains consistent
```

This is especially important when using shared/distributed storage.

---

## 13. Shared IP Addresses

Test multiple users behind the same IP.

Expected:

```text
User A → Normal usage
User B → Normal usage
```

One user's authenticated user-level limit should not unintentionally block another user unless the global IP protection policy is intentionally triggered.

---

## 14. Proxy IP Handling

When deployed behind a reverse proxy, verify that:

```text
Client A
Client B
```

are not incorrectly treated as the same client because the application sees only the proxy's IP.

---

## 15. Rate-Limit Headers

Verify that the configured standard headers are returned when supported:

```text
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
```

---

## 16. Retry Information

When a request receives `429`, verify that retry information is available where configured:

```text
Retry-After
```

---

## 17. Server Restart

For an in-memory limiter:

```text
Server Restart
      │
      ▼
In-Memory State Lost
```

This behavior should be documented and considered acceptable for the basic single-instance implementation.

For distributed production deployments:

```text
Server Restart
      │
      ▼
Redis State Remains
```

depending on the Redis configuration.

---

# ⚠️ Edge Cases

The module should consider:

* Multiple requests arriving simultaneously
* Short request bursts
* Sustained request traffic
* Rate-limit window expiration
* Multiple authenticated users
* Multiple devices for the same user
* Shared IP addresses
* Reverse proxies
* Forwarded IP configuration
* Socket reconnections
* Server restarts
* Multiple backend instances
* Redis unavailable
* Extremely high request frequency
* Different endpoint policies
* Different Socket.IO event frequencies

---

# 🛡️ Failure Behavior

The application should define what happens if the rate-limit storage becomes unavailable.

For example:

```text
Rate Limiter
     │
     ▼
Redis unavailable
     │
     ├── Fail closed
     │
     └── Fail open
```

The correct behavior depends on the security requirements of the endpoint.

For this portfolio project:

```text
Authentication / sensitive operations
    → prefer stronger protection

General application traffic
    → avoid unnecessary complete service outage
```

The exact fallback policy should be explicitly configured rather than left undefined.

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Authentication endpoints protected
* [ ] General APIs protected
* [ ] Message creation protected
* [ ] Search endpoint protected
* [ ] Sensitive operations protected
* [ ] Socket events considered
* [ ] Socket event-specific policies defined
* [ ] `429 Too Many Requests` implemented
* [ ] Rate-limit configuration centralized
* [ ] Public endpoint key strategy defined
* [ ] Authenticated endpoint key strategy defined
* [ ] Authentication endpoint key strategy defined
* [ ] Reverse-proxy/IP handling documented
* [ ] Forwarded IP information is not blindly trusted
* [ ] Burst traffic considered
* [ ] Sustained traffic considered
* [ ] Maintained rate-limiting library preferred
* [ ] Rate-limit headers considered
* [ ] `Retry-After` behavior considered
* [ ] Rate-limit behavior tested
* [ ] Different users tested
* [ ] Different endpoint policies tested
* [ ] Distributed storage strategy documented
* [ ] Redis strategy documented
* [ ] Failure behavior documented

---

# 📊 Phase 5 Progress

```text
Phase 5 — Security & Production

├── Input Validation & Sanitization  ✅
├── Rate Limiting                    🟡 Current
├── Authorization Hardening          ⏳
├── Centralized Error Handling       ⏳
├── Logging & Monitoring             ⏳
└── Redis / Distributed Infrastructure ⏳
```

The ordering reflects the actual module progression.

---

# 🎯 Module Completion Criteria

The Rate Limiting module is complete when:

```text
Rate Limiting
│
├── Configuration                 ✅
├── Authentication limits         ✅
├── General API limits            ✅
├── Message limits                ✅
├── Search limits                 ✅
├── Sensitive-operation limits    ✅
├── Socket event policies         ✅
├── Client identification         ✅
├── Proxy/IP strategy             ✅
├── Burst protection strategy     ✅
├── Sustained traffic strategy    ✅
├── 429 handling                  ✅
├── Retry information             ✅
├── Rate-limit headers            ✅
├── Testing                       ✅
└── Production strategy           ✅
```

---

# 🏁 Summary

The **Rate Limiting module** adds an important security and resource-protection layer to the chat platform.

Its primary responsibility is:

> **Prevent excessive client activity from consuming disproportionate application resources while allowing normal users to use the platform normally.**

The overall REST security flow becomes:

```text
                    Client
                       │
                       ▼
                Request Parsing
                       │
                       ▼
               Coarse Rate Limit
                       │
                       ▼
                 Authentication
                       │
                       ▼
                  Validation
                       │
                       ▼
                 Normalization
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
```

For endpoints that require a user-specific rate-limit key:

```text
Request
   │
   ▼
Coarse IP Protection
   │
   ▼
Authentication
   │
   ▼
User-specific Rate Limit
   │
   ▼
Validation
   │
   ▼
Normalization
   │
   ▼
Authorization
   │
   ▼
Controller
```

For public authentication endpoints:

```text
Request
   │
   ▼
Request Parsing
   │
   ▼
Rate Limiting
   │
   ▼
Validation
   │
   ▼
Normalization
   │
   ▼
Controller
```

---

# 📡 Socket.IO Security Flow

Socket.IO uses a separate real-time flow:

```text
Socket Connection
       │
       ▼
Socket Authentication
       │
       ▼
Socket Event
       │
       ▼
Event-Specific Rate Limit
       │
       ▼
Payload Validation
       │
       ▼
Normalization
       │
       ▼
Authorization / Membership
       │
       ▼
Event Handler
       │
       ▼
Service
       │
       ▼
Database / Event Processing
```

The key principle is:

> **A connected socket is not an unlimited or trusted source of events.**

However, each event should have an appropriate limit based on its normal frequency.

---

# 🧠 Key Architectural Principles

## 1. Rate Limiting Is Endpoint-Specific

```text
Authentication
    → Strict

General API
    → Moderate

Messages
    → Moderate

Search
    → Moderate / Strict

Sensitive Operations
    → Strict

Socket Events
    → Event-specific
```

One global limit is not sufficient for the entire application.

---

## 2. Client Identification Must Be Explicit

The default policy is:

```text
Public
    → IP

Authenticated
    → User ID

Authentication
    → IP + normalized account identifier
```

Additional global IP protection may be applied where necessary.

---

## 3. IP Addresses Must Be Handled Carefully

```text
Client
   ↓
Reverse Proxy
   ↓
Node.js
```

Forwarded IP information should only be trusted when the application's proxy configuration explicitly supports it.

Never blindly trust arbitrary client-provided IP headers.

---

## 4. Burst and Sustained Traffic Are Different

```text
Short Burst
     +
Sustained Traffic
```

should both be considered when selecting a rate-limiting strategy.

A single fixed-window policy may not provide sufficient short-burst protection depending on its configuration and algorithm.

---

## 5. Do Not Reinvent Rate-Limiting Algorithms

Prefer a maintained library rather than implementing:

```text
Fixed Window
Sliding Window
Token Bucket
Leaky Bucket
```

from scratch.

The application should focus on:

```text
Policy
Configuration
Client Identification
Endpoint Protection
Testing
Monitoring
```

---

## 6. Rate Limiting Does Not Replace Validation

```text
Rate Limiting
      +
Validation
```

are separate controls.

Rate limiting asks:

```text
Is the request frequency acceptable?
```

Validation asks:

```text
Is the request data valid?
```

---

## 7. Rate Limiting Does Not Replace Authorization

A user may be within their rate limit but still lack permission.

```text
Rate Limit
    ↓
Allowed frequency

Authorization
    ↓
Allowed operation
```

Both remain necessary.

---

## 8. Redis Is a Distribution Layer

For a single backend instance:

```text
In-Memory Rate Limiter
```

may be sufficient.

For multiple instances:

```text
Server A
   │
   ├──────► Redis
   │
Server B
   │
   └──────► Redis
```

provides shared rate-limit state.

---

## 9. Rate Limiting Should Happen Before Expensive Work

The desired principle is:

```text
Client
   ↓
Rate Limiting
   ↓
Authentication / Validation
   ↓
Authorization
   ↓
Business Logic
```

Excessive requests should be rejected before they trigger unnecessary database queries or expensive downstream processing.

---

## 10. Normal Users Should Not Be Punished

The goal is not:

```text
Restrict users
```

The goal is:

```text
Normal traffic
      ↓
Allowed

Abusive traffic
      ↓
Controlled
```

Rate-limit policies should therefore be based on expected application behavior rather than arbitrary values.

---

# 🚀 Next Module

The next module is:

```text
PHASE 5 — Module 3
Authorization Hardening
```

The **Authorization Hardening** module will strengthen access control across the platform's resource hierarchy:

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
Conversation Member
     │
     ▼
Message
```

The Phase 5 security progression is:

```text
Input Validation & Sanitization
             │
             ▼
       Rate Limiting
             │
             ▼
   Authorization Hardening
             │
             ▼
 Centralized Error Handling
             │
             ▼
   Logging & Monitoring
             │
             ▼
Redis / Distributed Infrastructure
```

This progression establishes the application's security controls incrementally while keeping the implementation **centralized, testable, realistic, and appropriate for an interview-level portfolio chat application**.

---

# 🏁 Final Security Architecture

The resulting application security boundary is:

```text
                         CLIENT
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
        REST Request                 Socket Connection
             │                             │
             ▼                             ▼
       Request Parsing             Socket Authentication
             │                             │
             ▼                             ▼
       Coarse Rate Limit             Socket Event
             │                             │
             ▼                             ▼
       Authentication              Event-Specific
             │                       Rate Limit
             ▼                             │
        Validation                        ▼
             │                       Validation
             ▼                             │
       Normalization                      ▼
             │                       Normalization
             ▼                             │
       Authorization              Authorization /
             │                     Membership
             ▼                             │
         Controller                  Event Handler
             │                             │
             ▼                             ▼
          Service                       Service
             │                             │
             └──────────────┬──────────────┘
                            ▼
                         MongoDB
```

The core security boundary is:

```text
                 External Client
                        │
                        ▼
              ┌──────────────────┐
              │ Rate Limiting    │
              │ Authentication   │
              │ Validation       │
              │ Normalization    │
              │ Authorization    │
              └────────┬─────────┘
                       │
                       ▼
                 Business Logic
                       │
                       ▼
                    Database
```

The module therefore provides the **resource-protection foundation** for the remaining Phase 5 security work while avoiding unnecessary complexity for a portfolio-level implementation.

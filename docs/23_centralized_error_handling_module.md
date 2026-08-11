# ⚠️ Centralized Error Handling Module

## 📋 Module Information

| Property            | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Module**          | Centralized Error Handling                                                    |
| **Version**         | v1.1                                                                          |
| **Status**          | 🟡 In Development                                                             |
| **Phase**           | Phase 5 — Security & Production                                               |
| **Previous Module** | Authorization Hardening                                                       |
| **Next Module**     | Logging                                                                       |
| **Depends On**      | Authentication, Validation, Authorization, Rate Limiting, REST API, Socket.IO |
| **Database**        | MongoDB                                                                       |
| **Backend**         | Node.js + Express + Socket.IO                                                 |

---

# 📌 Overview

The **Centralized Error Handling module** provides a consistent way to detect, process, classify, sanitize, and return errors throughout the chat platform.

Without centralized error handling, different controllers may return completely different responses:

```text
Controller A
→ { error: "Something went wrong" }

Controller B
→ { message: "Failed" }

Controller C
→ HTML error page

Controller D
→ Raw database error
```

This makes the API difficult to consume, difficult to debug, and potentially unsafe.

The goal is to create one predictable error-handling system:

```text
Request
   │
   ▼
Controller / Service
   │
   ├── Success ──► Normal Response
   │
   └── Error
         │
         ▼
   Central Error Handler
         │
         ├── Identify
         ├── Classify
         ├── Log
         ├── Sanitize
         └── Return Consistent Response
```

The module applies the same core error principles across:

```text
REST API
   +
Socket.IO
```

while respecting the different communication semantics of HTTP and WebSockets.

---

# 🎯 Objectives

The module should:

* Centralize Express errors
* Provide consistent API error responses
* Define a stable application error contract
* Handle operational errors
* Handle validation errors
* Handle authentication errors
* Handle authorization errors
* Handle not-found errors
* Handle conflict errors
* Handle database errors
* Handle duplicate-key errors
* Handle invalid ObjectIds
* Handle rate-limit errors
* Handle unknown errors
* Prevent sensitive information leakage
* Support Socket.IO error handling
* Separate development and production behavior
* Support request IDs
* Prepare structured context for centralized logging
* Make errors easier to debug
* Keep services independent of HTTP response handling

---

# 🧠 Core Principle

Controllers should not contain repetitive error-response logic.

Avoid:

```js
try {
    ...
} catch (error) {
    res.status(500).json(...)
}
```

in every controller with different response formats.

Instead:

```text
Controller
    │
    ▼
throw / next(error)
    │
    ▼
Central Error Handler
    │
    ▼
Consistent Response
```

The centralized handler becomes the single place responsible for:

```text
Error
 │
 ├── Classification
 ├── Status mapping
 ├── Error-code mapping
 ├── Sanitization
 ├── Logging context
 └── Client response
```

---

# 🏗️ Error Handling Architecture

```text
                         Client
                           │
                           ▼
                        Request
                           │
                           ▼
                    Route / Middleware
                           │
                           ▼
                    Controller
                           │
                           ▼
                      Service
                           │
                           ▼
                        Model
                           │
                           ▼
                      MongoDB
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                 Success         Error
                    │             │
                    ▼             ▼
                Response    Central Handler
                                  │
                           ┌──────┼──────┐
                           ▼      ▼      ▼
                        Classify  Log  Sanitize
                                  │
                                  ▼
                            Safe Response
```

---

# 📂 Recommended Structure

```text
src/
│
├── middleware/
│   ├── error.middleware.js
│   ├── auth.middleware.js
│   ├── validate.middleware.js
│   └── rateLimit.middleware.js
│
├── errors/
│   ├── AppError.js
│   └── errorCodes.js
│
└── utils/
    └── asyncHandler.js
```

The exact structure can be adapted to the existing project.

---

# 🧩 Custom Application Error

Create a standard application error class.

## AppError Contract

```text
AppError
│
├── message
│   └── Safe client-facing message
│
├── statusCode
│   └── HTTP status code
│
├── code
│   └── Stable machine-readable identifier
│
├── isOperational
│   └── Whether this is an expected application error
│
└── details
    └── Optional safe structured metadata
```

Conceptually:

```js
new AppError(
    "Conversation not found",
    404,
    "CONVERSATION_NOT_FOUND"
)
```

### Field Rules

#### `message`

Must represent a safe client-facing message.

It must **never automatically contain raw third-party or database error messages**.

Bad:

```text
MongoServerError: E11000 duplicate key...
```

Good:

```text
Resource already exists
```

---

#### `statusCode`

Represents the HTTP status returned by the REST API.

Example:

```text
404
```

---

#### `code`

Represents a stable machine-readable application error code.

Example:

```text
CONVERSATION_NOT_FOUND
```

Frontend applications should depend on this value rather than parsing human-readable messages.

---

#### `isOperational`

Distinguishes expected application errors from unexpected programming/system failures.

Example:

```text
Validation error
→ operational

Resource not found
→ operational

Unexpected TypeError
→ non-operational
```

---

#### `details`

Optional structured metadata.

Only safe information should be included.

Example:

```json
{
    "field": "content",
    "reason": "required"
}
```

Never include:

```text
Passwords
JWT secrets
Database credentials
Stack traces
Internal file paths
Connection strings
```

---

# 🏷️ Error Code Contract

Error codes are part of the application's API contract.

Every error should conceptually contain:

```text
HTTP status
      +
Application error code
      +
Safe human-readable message
```

Example:

```json
{
    "success": false,
    "error": {
        "code": "MESSAGE_NOT_FOUND",
        "message": "Message not found"
    }
}
```

## Stability Rule

Error codes must remain stable even when human-readable messages change.

For example:

```text
MESSAGE_NOT_FOUND
```

may initially use:

```text
"Message not found"
```

and later change to:

```text
"The requested message could not be found"
```

The machine-readable code should remain:

```text
MESSAGE_NOT_FOUND
```

This prevents frontend logic from breaking because of message wording changes.

---

# 🏷️ Recommended Error Codes

```text
BAD_REQUEST

AUTH_REQUIRED
INVALID_TOKEN
TOKEN_EXPIRED

FORBIDDEN

RESOURCE_NOT_FOUND
ROUTE_NOT_FOUND
CONVERSATION_NOT_FOUND
MESSAGE_NOT_FOUND

INVALID_ID

DUPLICATE_RESOURCE

VALIDATION_ERROR

RATE_LIMIT_EXCEEDED

DATABASE_ERROR
SERVICE_UNAVAILABLE

INTERNAL_SERVER_ERROR
```

Additional resource-specific codes can be introduced when they provide meaningful client behavior.

---

# 📊 HTTP Error Categories

| Situation               | Status |
| ----------------------- | -----: |
| Invalid request         |    400 |
| Unauthenticated         |    401 |
| Unauthorized            |    403 |
| Resource not found      |    404 |
| Conflict                |    409 |
| Validation failure      |    422 |
| Rate limited            |    429 |
| Unexpected server error |    500 |
| Service unavailable     |    503 |

Use only statuses that accurately represent the actual error.

---

# 🔍 Error Mapping Contract

The following mapping provides the implementation contract between known errors and application responses.

| Source Error                 | Application Code        | HTTP |
| ---------------------------- | ----------------------- | ---: |
| Malformed request            | `BAD_REQUEST`           |  400 |
| Missing JWT                  | `AUTH_REQUIRED`         |  401 |
| Invalid JWT                  | `INVALID_TOKEN`         |  401 |
| Expired JWT                  | `TOKEN_EXPIRED`         |  401 |
| Authorization failure        | `FORBIDDEN`             |  403 |
| Missing resource             | `RESOURCE_NOT_FOUND`    |  404 |
| Unknown API route            | `ROUTE_NOT_FOUND`       |  404 |
| Invalid ObjectId             | `INVALID_ID`            |  400 |
| Mongoose validation          | `VALIDATION_ERROR`      |  422 |
| Mongo duplicate key          | `DUPLICATE_RESOURCE`    |  409 |
| Rate limiter                 | `RATE_LIMIT_EXCEEDED`   |  429 |
| Database/service unavailable | `SERVICE_UNAVAILABLE`   |  503 |
| Unknown exception            | `INTERNAL_SERVER_ERROR` |  500 |

This mapping should remain centralized rather than being recreated inside individual controllers.

---

# ❌ 400 — Bad Request

Use when the request itself is malformed or structurally invalid.

Example:

```text
Invalid request structure
```

Response:

```json
{
    "success": false,
    "error": {
        "code": "BAD_REQUEST",
        "message": "Invalid request"
    }
}
```

---

# 🔐 401 — Authentication Error

Use when the request lacks valid authentication.

Examples:

```text
Missing token
Invalid token
Expired token
```

Response:

```json
{
    "success": false,
    "error": {
        "code": "AUTH_REQUIRED",
        "message": "Authentication required"
    }
}
```

Do not expose:

```text
JWT verification stack traces
JWT secret information
Token parsing internals
Cryptographic errors
```

---

# 🚫 403 — Authorization Error

Use when the user is authenticated but does not have permission to perform the requested action.

Example:

```json
{
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "You are not authorized to access this resource"
    }
}
```

For sensitive resources, returning:

```text
404
```

instead of:

```text
403
```

may be appropriate to avoid revealing whether the resource exists.

---

# 🔎 404 — Not Found

Use when a requested resource does not exist.

Example:

```text
Conversation does not exist
```

Response:

```json
{
    "success": false,
    "error": {
        "code": "CONVERSATION_NOT_FOUND",
        "message": "Conversation not found"
    }
}
```

---

# ⚔️ 409 — Conflict

Use for resource conflicts.

Examples:

```text
Duplicate email
Duplicate organization
Duplicate membership
Duplicate API key
```

Response:

```json
{
    "success": false,
    "error": {
        "code": "DUPLICATE_RESOURCE",
        "message": "Resource already exists"
    }
}
```

---

# 📝 422 — Validation Error

Use when the request structure is valid but supplied values fail input or business validation.

Example:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
            {
                "field": "content",
                "message": "Message content is required"
            }
        ]
    }
}
```

This integrates with:

```text
Phase 5
Input Validation & Sanitization
```

---

# 🚦 429 — Rate Limit Error

This integrates with the Rate Limiting module.

Response:

```json
{
    "success": false,
    "error": {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "Too many requests. Please try again later."
    }
}
```

When applicable, the response should also provide:

```http
Retry-After: <seconds>
```

This tells the client when it should retry.

---

# 💥 500 — Internal Server Error

Unexpected errors should return a generic safe response.

```json
{
    "success": false,
    "error": {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "Something went wrong"
    }
}
```

Do not return:

```text
MongoDB stack trace
File path
Environment variables
Database connection strings
JWT secrets
Internal service details
Node.js stack traces
```

---

# 🟢 503 — Service Unavailable

Use when the application or a required dependency is temporarily unavailable.

Examples:

```text
Database unavailable
Required external service unavailable
Temporary infrastructure failure
```

Response:

```json
{
    "success": false,
    "error": {
        "code": "SERVICE_UNAVAILABLE",
        "message": "Service temporarily unavailable"
    }
}
```

When appropriate:

```http
Retry-After: <seconds>
```

may be returned.

---

# 🔒 Never Leak Sensitive Errors

Bad:

```json
{
    "error": "MongoServerError: E11000 duplicate key ... /home/server/src/..."
}
```

Good:

```json
{
    "success": false,
    "error": {
        "code": "DUPLICATE_RESOURCE",
        "message": "Resource already exists"
    }
}
```

Detailed diagnostic information belongs in server-side logs.

---

# 🌍 Environment-Based Error Responses

## Development

Development may expose controlled diagnostic information to simplify debugging.

Example:

```text
Error code
Message
Stack trace
Development-only diagnostic details
```

## Production

Production must return only safe client-facing information.

```text
Error code
Safe message
Safe details when applicable
Request ID when configured
```

Conceptually:

```text
Development
    │
    ▼
Detailed diagnostics

Production
    │
    ▼
Safe sanitized response
```

Production responses must never expose:

```text
Stack traces
File paths
Database errors
Secrets
Environment variables
Internal configuration
```

---

# 🧠 Operational vs Programming Errors

A useful distinction is between expected application errors and unexpected failures.

## Operational Errors

Expected application problems:

```text
Invalid input
Unauthorized access
Conversation not found
Duplicate resource
Rate limit exceeded
Invalid ObjectId
```

These can be safely classified and returned to the client.

## Programming / Unexpected Errors

Examples:

```text
Undefined variable
Unexpected TypeError
Broken application logic
Unhandled database failure
Unexpected infrastructure failure
```

These should be:

```text
Logged internally
Sanitized
Returned as a generic internal error
```

---

# 🔄 Error Processing Flow

```text
Error occurs
    │
    ▼
Identify error type
    │
    ▼
Is it known?
    │
 ┌──┴──┐
 ▼     ▼
Yes    No
 │      │
 ▼      ▼
Map    500
status
 │      │
 └──┬───┘
    ▼
Determine error code
    │
    ▼
Create logging context
    │
    ▼
Sanitize response
    │
    ▼
Send client response
```

---

# 🧩 Async Controller Handling

Async controllers can generate rejected promises.

Use a centralized async wrapper or framework-supported async error propagation.

Conceptually:

```text
asyncHandler(controller)
       │
       ▼
Promise rejection
       │
       ▼
next(error)
       │
       ▼
Central Error Handler
```

This avoids repetitive error handling inside every controller.

Example concept:

```js
asyncHandler(async (req, res) => {
    const message = await messageService.create(...);

    res.status(201).json({
        success: true,
        data: message
    });
});
```

The controller does not need its own repeated `try/catch` block for forwarding errors.

---

# 🛣️ Express Middleware Ordering

The error-handling middleware must be registered after application routes.

Recommended order:

```text
1. Request ID
        │
        ▼
2. Security middleware
        │
        ▼
3. Body parsing
        │
        ▼
4. Authentication
        │
        ▼
5. Validation
        │
        ▼
6. Routes
        │
        ▼
7. 404 handler
        │
        ▼
8. Central error handler
```

The exact middleware ordering can vary depending on the application, but the important rule is:

```text
404 handler
    ↓
Central error handler
```

The centralized error handler must be the final error-processing layer.

---

# 🔍 404 Route Handling

Unknown API routes should return a consistent JSON response.

Example:

```text
GET /api/unknown-route
```

Response:

```json
{
    "success": false,
    "error": {
        "code": "ROUTE_NOT_FOUND",
        "message": "Route not found"
    }
}
```

Avoid returning an HTML error page from an API.

---

# 🗃️ MongoDB / Mongoose Errors

The handler should recognize common database errors.

Examples:

```text
ValidationError
CastError
Duplicate key error
Connection errors
```

Database-specific implementation details should be translated into application-level errors.

---

# 🧬 Mongoose Validation Error

Example:

```text
Invalid field value
```

Convert the database-specific error into:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed"
    }
}
```

Field-level details may be included when safe.

---

# 🔢 Invalid ObjectId

Example:

```text
GET /api/messages/not-a-valid-id
```

Do not return:

```text
Cast to ObjectId failed...
```

Instead:

```json
{
    "success": false,
    "error": {
        "code": "INVALID_ID",
        "message": "Invalid resource ID"
    }
}
```

Recommended status:

```text
400 Bad Request
```

---

# ⚔️ Duplicate Key Errors

MongoDB may produce a duplicate-key error when a unique field conflicts.

Example:

```text
Email already exists
```

Convert it into:

```json
{
    "success": false,
    "error": {
        "code": "DUPLICATE_RESOURCE",
        "message": "A resource with these details already exists"
    }
}
```

Do not expose raw MongoDB index information unless it is explicitly safe and required.

---

# 🔌 Socket.IO Error Handling

REST APIs are not the only communication layer.

The platform also uses:

```text
Socket.IO
```

Therefore Socket.IO events require consistent error handling.

---

# 📡 Socket Error Flow

```text
Socket Event
     │
     ▼
Validation
     │
     ▼
Authentication
     │
     ▼
Authorization
     │
     ▼
Business Logic
     │
   Error
     │
     ▼
Socket Error Handling
     │
     ▼
Safe Client Error
```

---

# 🌐 REST vs Socket.IO Error Semantics

REST and Socket.IO should use the same application error concepts, but they do not communicate errors in exactly the same way.

## REST

REST uses:

```text
HTTP status
+
error.code
+
message
+
optional details
```

Example:

```json
{
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "You are not authorized to perform this action"
    }
}
```

## Socket.IO

Socket.IO does not use HTTP status codes as the primary event-level error mechanism.

Instead:

```text
error.code
+
message
+
optional details
```

Example:

```json
{
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "You are not authorized to perform this action"
    }
}
```

This allows both communication layers to share the same application error vocabulary.

---

# 💬 Socket.IO Error Event

For server-originated errors, use an application-specific event:

```text
chat:error
```

Example:

```json
{
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "You are not a member of this conversation"
    }
}
```

---

# 📡 Socket.IO Acknowledgement Errors

For request/response-style Socket.IO events, acknowledgements are recommended.

Conceptually:

```text
Client
   │
   │ message:send
   ▼
Server
   │
   ├── Success
   │      │
   │      ▼
   │   acknowledgement
   │
   └── Error
          │
          ▼
      acknowledgement
```

Example conceptually:

```js
socket.emit("message:send", payload, (error, result) => {
    if (error) {
        // handle application error
        return;
    }

    // handle success
});
```

This avoids treating every request/response failure as a broadcast event.

Use:

```text
Acknowledgement
```

for request-specific failures.

Use:

```text
chat:error
```

for server-originated or asynchronous errors where an acknowledgement is not appropriate.

---

# 🔐 Socket Error Security

Do not emit:

```text
MongoDB stack traces
Node.js stack traces
Server file paths
Database configuration
Connection strings
Environment variables
Internal service details
```

Socket clients should receive safe application-level errors just like REST clients.

---

# 🧠 REST and Socket Consistency

Both communication layers should use the same error concepts.

```text
                 Error System
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       REST API              Socket.IO
          │                     │
          ▼                     ▼
 HTTP status              Error code
 Error code               Safe message
 Safe message             Safe details
```

Example shared codes:

```text
VALIDATION_ERROR
AUTH_REQUIRED
INVALID_TOKEN
FORBIDDEN
RESOURCE_NOT_FOUND
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
```

---

# 📦 Standard API Error Format

Recommended REST format:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": []
    }
}
```

Not every error requires `details`.

Simple error:

```json
{
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "Access denied"
    }
}
```

---

# 📤 Successful Responses

Error handling must not change the existing successful response structure.

Example:

```json
{
    "success": true,
    "data": {}
}
```

The API therefore has predictable top-level behavior.

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
    "error": {}
}
```

---

# 🔄 Error Propagation

Recommended architecture:

```text
Controller
    │
    ▼
Service
    │
    ├── Success → return data
    │
    └── Error → throw AppError
                    │
                    ▼
             Central Handler
                    │
                    ▼
                Response
```

Services should not directly send HTTP responses.

Avoid:

```text
service
  └── res.status(...)
```

Services must remain independent of Express.

---

# 🧱 Controller Responsibility

Controllers should primarily handle:

```text
Request
   │
   ▼
Input
   │
   ▼
Service
   │
   ▼
Response
```

Errors should flow toward the centralized error handler.

This keeps controllers focused on transport-level concerns.

---

# 🧠 Service Responsibility

Services should:

* Execute business logic
* Throw meaningful application errors
* Avoid HTTP-specific response handling
* Avoid sending Express responses
* Avoid exposing raw third-party errors directly
* Preserve useful error context for centralized handling

Example:

```text
Message Service
      │
      ├── Message exists → Continue
      │
      └── Not found → throw MESSAGE_NOT_FOUND
```

---

# 🆔 Request ID

A request identifier helps connect:

```text
Client Request
      │
      ▼
Application Processing
      │
      ▼
Error
      │
      ▼
Server Log
```

Example:

```text
requestId: "req_123..."
```

The request ID should be generated or propagated near the beginning of request processing.

When safe and useful, the same ID can appear in:

```text
API response
Server logs
Error logs
```

Example response:

```json
{
    "success": false,
    "error": {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "Something went wrong"
    },
    "requestId": "req_123..."
}
```

The exact response placement can be standardized during implementation.

---

# 🔗 Request ID and Logging Boundary

This module is responsible for:

```text
Generate / propagate requestId
        │
        ▼
Attach requestId to error context
```

The next **Logging module** will use:

```text
requestId
userId
timestamp
HTTP method
route
error code
status code
stack
```

to create structured logs.

Therefore:

```text
Centralized Error Handling
          │
          ▼
       requestId
          │
          ▼
        Logging
```

This creates a clean boundary between the two modules.

---

# ⏱️ Errors After Response Has Started

The error handler must account for cases where the response has already started.

Conceptually:

```text
Error occurs
     │
     ▼
Has response started?
     │
 ┌───┴────┐
 ▼        ▼
No       Yes
 │        │
 ▼        ▼
Send    Do not attempt
safe    another response
JSON        │
            ▼
          Log error
            │
            ▼
       Delegate/close
```

If response headers have already been sent:

```text
Do not attempt another JSON response.
```

The error should instead be logged and handled according to the active HTTP/stream lifecycle.

This prevents secondary errors caused by attempting to write another response.

---

# 🔒 Security Rules

The error system must never expose:

```text
JWT secrets
Password hashes
Database credentials
MongoDB connection strings
Environment variables
Internal file paths
Stack traces in production
Private user information
Internal service configuration
Third-party service credentials
```

Errors returned to clients must always pass through sanitization.

---

# 📝 Error Logging Preparation

The centralized error handler should capture useful context for the next Logging module.

Potential context:

```text
Error code
HTTP status
Request ID
Request method
Request path
Authenticated user ID when appropriate
Timestamp
Environment
```

Detailed logging will be implemented in:

```text
Phase 5
Logging
```

The error handler should prepare the information without becoming the complete logging system.

---

# 🧪 Testing Strategy

## Test 1 — Validation Error

Send invalid input.

Expected:

```text
422
VALIDATION_ERROR
```

Verify:

```text
success === false
error.code === VALIDATION_ERROR
```

---

## Test 2 — Missing Authentication

Call a protected endpoint without a valid token.

Expected:

```text
401
AUTH_REQUIRED
```

---

## Test 3 — Invalid Authentication

Use an invalid or malformed token.

Expected:

```text
401
INVALID_TOKEN
```

No JWT internals should be returned.

---

## Test 4 — Authorization Failure

Use a valid user who lacks permission.

Expected:

```text
403
FORBIDDEN
```

---

## Test 5 — Resource Not Found

Request a valid-format but nonexistent resource ID.

Expected:

```text
404
RESOURCE_NOT_FOUND
```

---

## Test 6 — Invalid ObjectId

Send:

```text
/api/messages/invalid-id
```

Expected:

```text
400
INVALID_ID
```

No raw Mongoose CastError should be returned.

---

## Test 7 — Duplicate Resource

Attempt to create a duplicate unique resource.

Expected:

```text
409
DUPLICATE_RESOURCE
```

---

## Test 8 — Rate Limit

Exceed a configured rate limit.

Expected:

```text
429
RATE_LIMIT_EXCEEDED
```

When applicable:

```text
Retry-After
```

should be present.

---

## Test 9 — Unknown Route

Call an invalid endpoint.

Expected:

```text
404
ROUTE_NOT_FOUND
```

The response must be JSON rather than an HTML error page.

---

## Test 10 — Unexpected Error

Trigger a controlled internal error.

Expected:

```text
500
INTERNAL_SERVER_ERROR
```

Production response must not expose:

```text
Stack trace
File path
Database details
Environment variables
Secrets
```

---

## Test 11 — Error Response Contract

Verify all error responses follow the standard contract.

Minimum:

```text
success: false
error.code
error.message
```

For example:

```json
{
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "Access denied"
    }
}
```

---

## Test 12 — Production Sanitization

Trigger an internal error in production mode.

Verify that the response does **not** contain:

```text
❌ Stack trace
❌ Database details
❌ File paths
❌ Environment variables
❌ Secrets
❌ Internal configuration
```

---

## Test 13 — Development Error Detail

Trigger a controlled internal error in development.

Verify that appropriate diagnostic information is available for debugging while still avoiding secret leakage.

---

## Test 14 — Request ID

Trigger an error and verify:

```text
Request
   │
   ▼
requestId
   │
   ├── Error context
   └── Response
```

The request ID should be consistently propagated according to the application's request-ID strategy.

---

## Test 15 — Response Already Started

Trigger an error after the response has begun.

Verify:

```text
❌ No second response
❌ No duplicate headers
❌ No secondary error from error middleware
✅ Error is logged
```

---

## Test 16 — Socket Error

Trigger an authorization or validation failure through Socket.IO.

Expected request-specific failure:

```text
Acknowledgement
```

or server-originated failure:

```text
chat:error
```

with the same safe application error structure.

---

# 📊 Error Test Matrix

| Scenario            | Status Code | Error Code              |
| ------------------- | ----------: | ----------------------- |
| Invalid input       |         422 | `VALIDATION_ERROR`      |
| Missing token       |         401 | `AUTH_REQUIRED`         |
| Invalid token       |         401 | `INVALID_TOKEN`         |
| Expired token       |         401 | `TOKEN_EXPIRED`         |
| Unauthorized action |         403 | `FORBIDDEN`             |
| Missing resource    |         404 | `RESOURCE_NOT_FOUND`    |
| Invalid ObjectId    |         400 | `INVALID_ID`            |
| Duplicate resource  |         409 | `DUPLICATE_RESOURCE`    |
| Rate limit          |         429 | `RATE_LIMIT_EXCEEDED`   |
| Unknown route       |         404 | `ROUTE_NOT_FOUND`       |
| Service unavailable |         503 | `SERVICE_UNAVAILABLE`   |
| Unexpected error    |         500 | `INTERNAL_SERVER_ERROR` |

---

# ⚠️ Edge Cases

The implementation should handle:

* Async controller rejection
* Mongoose validation errors
* Invalid ObjectIds
* Duplicate keys
* Missing authentication
* Invalid JWT
* Expired JWT
* Authorization failures
* Rate-limit errors
* Unknown routes
* Socket errors
* Unexpected exceptions
* Production error sanitization
* Development diagnostics
* Errors after response has started
* Database connection failures
* Service dependency failures
* Request ID propagation
* Duplicate response attempts

---

# 🔐 Security Checklist

Before marking this module complete:

* ⬜ Central error middleware implemented
* ⬜ Custom `AppError` implemented
* ⬜ Standard error response defined
* ⬜ Error codes defined
* ⬜ Error-code stability rule documented
* ⬜ Error mapping table implemented
* ⬜ 400 handling implemented
* ⬜ 401 handling implemented
* ⬜ 403 handling implemented
* ⬜ 404 handling implemented
* ⬜ 409 handling implemented
* ⬜ 422 handling implemented
* ⬜ 429 handling implemented
* ⬜ 500 handling implemented
* ⬜ 503 handling implemented
* ⬜ Mongoose errors handled
* ⬜ Invalid ObjectIds handled
* ⬜ Duplicate keys handled
* ⬜ Unknown routes handled
* ⬜ Sensitive information hidden
* ⬜ Production error sanitization implemented
* ⬜ Development error diagnostics implemented
* ⬜ Socket.IO errors handled
* ⬜ Socket acknowledgements defined
* ⬜ `chat:error` semantics defined
* ⬜ Error propagation standardized
* ⬜ Request ID implemented
* ⬜ Response-started edge case handled
* ⬜ Error behavior tested

---

# 📊 Phase 5 Progress

```text
Phase 5 — Security & Production

├── Rate Limiting                    ✅
├── Input Validation & Sanitization  ✅
├── Authorization                    ✅
├── Error Handling                   🟡 Current
├── Logging                          ⏳
└── Redis                            ⏳
```

---

# 🎯 Module Completion Criteria

The module is considered complete only when all required implementation and testing items have been completed.

```text
Centralized Error Handling
│
├── AppError                    ⬜
├── Error Middleware            ⬜
├── Standard Response           ⬜
├── Error Codes                 ⬜
├── Error Mapping               ⬜
├── Validation Errors           ⬜
├── Authentication Errors       ⬜
├── Authorization Errors        ⬜
├── Not Found Errors            ⬜
├── Conflict Errors             ⬜
├── Rate Limit Errors           ⬜
├── Database Errors             ⬜
├── Service Errors              ⬜
├── Unknown Errors              ⬜
├── REST Error Handling          ⬜
├── Socket Error Handling        ⬜
├── Socket Acknowledgements      ⬜
├── Production Sanitization      ⬜
├── Development Diagnostics     ⬜
├── Request ID                  ⬜
├── Response-start handling     ⬜
└── Testing                     ⬜
```

Each item should be changed to:

```text
✅
```

only after the corresponding implementation or verification is actually completed.

---

# 🧭 Module Responsibility Boundary

This module is responsible for:

```text
Error Detection
      │
      ▼
Error Classification
      │
      ▼
Error Mapping
      │
      ▼
Error Sanitization
      │
      ▼
Safe Client Response
      │
      ▼
Logging Context
```

It is **not** responsible for implementing the complete logging system.

That belongs to:

```text
Next Module
    │
    ▼
Logging
```

---

# 🏁 Final Request Pipeline

The final REST request pipeline becomes:

```text
                         Client
                           │
                           ▼
                    Request ID
                           │
                           ▼
                    Rate Limiting
                           │
                           ▼
                 Input Validation
                           │
                           ▼
                    Authentication
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
                         Model
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                 Success         Error
                    │             │
                    ▼             ▼
                Response    Central Handler
                                  │
                           ┌──────┼──────┐
                           ▼      ▼      ▼
                       Classify  Log   Sanitize
                                  │      │
                                  │      ▼
                                  │  Safe Response
                                  │
                                  ▼
                              Logging
```

The Socket.IO pipeline follows the same application-level error concepts:

```text
Socket Event
     │
     ▼
Authentication
     │
     ▼
Validation
     │
     ▼
Authorization
     │
     ▼
Service
     │
 ┌───┴────┐
 ▼        ▼
Success  Error
 │        │
 ▼        ▼
Ack      Error Handler
          │
     ┌────┴────┐
     ▼         ▼
   Ack       chat:error
```

---

# 🏆 Summary

The **Centralized Error Handling module** gives the chat platform one predictable, secure, and maintainable error architecture.

It establishes:

```text
One Error Class
       │
       ▼
One Error Vocabulary
       │
       ▼
One Mapping Strategy
       │
       ▼
One Sanitization Layer
       │
       ├───────────────┐
       ▼               ▼
    REST API        Socket.IO
       │               │
       ▼               ▼
HTTP status       Error code
Error code        Safe message
Safe message      Safe details
```

The architecture keeps responsibilities separated:

```text
Controller
    │
    └── Handles transport

Service
    │
    └── Handles business logic

AppError
    │
    └── Represents known application failures

Central Error Handler
    │
    ├── Classifies
    ├── Maps
    ├── Sanitizes
    └── Prepares logging context

Logging Module
    │
    └── Handles structured logging
```

The result is a system where:

```text
Success
→ predictable success response

Known error
→ predictable application error

Unexpected error
→ safe internal error

REST failure
→ HTTP status + error code

Socket failure
→ acknowledgement / chat:error + error code

Production
→ sanitized response

Development
→ controlled diagnostics

Error
→ requestId → Logging
```

After completing this module, the next module is:

```text
Phase 5 — Module 5
Logging
```

# 🔐 Input Validation & Sanitization Module

## 📋 Module Information

| Property            | Value                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Module**          | Input Validation & Sanitization                                                                    |
| **Version**         | v1.1                                                                                               |
| **Status**          | 🟡 In Development                                                                                  |
| **Phase**           | Phase 5 — Security & Production                                                                    |
| **Previous Phase**  | Phase 4 — Notifications & Unread System                                                            |
| **Next Module**     | Rate Limiting                                                                                      |
| **Depends On**      | Authentication, Users, Organizations, Projects, Workspaces, Conversations, Messages, Notifications |
| **Database**        | MongoDB                                                                                            |
| **Backend**         | Node.js + Express                                                                                  |
| **Real-Time Layer** | Socket.IO                                                                                          |

---

# 📌 Overview

The **Input Validation & Sanitization module** establishes a security boundary between external clients and the application's business logic.

Every API request and Socket.IO event contains client-controlled data. The backend must never assume that incoming data is valid, correctly typed, correctly formatted, or authorized.

The validation layer protects the application from:

* Invalid data
* Malformed IDs
* Missing required fields
* Incorrect data types
* Unexpected fields
* Excessively large input
* Invalid enum values
* Malformed query parameters
* Invalid Socket.IO payloads
* Unnecessary database queries
* Unsafe input handling

The core principle is:

```text
Client Input
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
Database
```

Validation prevents malformed input from reaching business logic.

Authorization determines whether the authenticated user is allowed to perform the requested operation.

---

# 🎯 Objectives

The module should:

* Validate request body data
* Validate URL parameters
* Validate query parameters
* Validate ObjectIds
* Validate required fields
* Validate data types
* Validate enum values
* Validate string lengths
* Normalize appropriate user input
* Reject unexpected fields by default
* Prevent malformed requests from reaching services
* Provide consistent validation errors
* Reuse validation schemas across modules
* Validate Socket.IO event payloads
* Prevent unnecessary database queries
* Define clear validation behavior for file attachments
* Keep validation separate from authorization

---

# 🧠 Core Security Principle

> **Never trust client-controlled input.**

Unsafe:

```text
Client
   │
   ▼
Database
```

Correct:

```text
Client
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
   │
   ▼
Database
```

The backend remains responsible for determining whether incoming data is acceptable.

---

# 🏗️ REST Validation Architecture

The default REST request flow is:

```text
                 Client
                    │
                    ▼
             Request Parsing
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
                Database
```

### Responsibility of each layer

**Request Parsing**

Handles:

```text
JSON
URL parameters
Query parameters
Multipart/form-data
```

**Authentication**

Determines:

```text
Who is making the request?
```

**Validation**

Determines:

```text
Is the input structurally valid?
```

**Normalization**

Applies safe, field-specific transformations such as:

```text
Trim whitespace
Normalize email
Normalize expected casing
```

**Authorization**

Determines:

```text
Is this authenticated user allowed to perform this operation?
```

**Controller**

Handles the HTTP request and delegates business operations.

**Service**

Contains business logic.

**Database**

Stores and retrieves validated application data.

---

# 🌐 Public Endpoint Flow

Not every endpoint requires authentication.

For public endpoints such as signup:

```text
Request
   │
   ▼
Request Parsing
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

For authenticated endpoints:

```text
Request
   │
   ▼
Request Parsing
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
```

This provides a clear default without forcing authentication onto public routes.

---

# 📌 What Needs Validation?

The chat platform receives external data through several channels:

```text
REST Request Body
REST URL Parameters
REST Query Parameters
File Metadata
Socket.IO Payloads
```

Examples include:

```text
POST /api/messages
```

with:

```json
{
    "conversationId": "68conversation123",
    "content": "Hello"
}
```

The backend must validate the structure before processing the message.

---

# 📨 Request Body Validation

Request bodies should be validated against the expected schema.

Example:

```json
{
    "conversationId": "68conversation123",
    "content": "Hello"
}
```

Required fields:

```text
conversationId
content
```

Validation should verify:

```text
conversationId → valid ObjectId
content         → string
content         → not empty
content         → maximum length
```

Invalid requests should be rejected before business logic executes.

---

# 🔗 ObjectId Validation

MongoDB ObjectIds should be validated before database queries.

Example:

```text
/api/conversations/invalid-id
```

should not directly reach:

```text
Conversation.findById("invalid-id")
```

Instead:

```text
Invalid ID
   │
   ▼
Validation
   │
   ▼
400 Bad Request
```

Example response:

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "conversationId",
            "message": "Invalid conversation ID"
        }
    ]
}
```

This prevents malformed identifiers from unnecessarily reaching the database.

---

# 📏 String Validation

User-provided strings should have reasonable limits.

Example:

```text
Message content
├── required
├── string
├── non-empty
└── maximum configured length
```

Similarly:

```text
Organization name
Project name
Workspace name
Conversation name
```

should have defined length limits.

The limits should be based on application requirements rather than arbitrary values.

---

# 🚫 Empty Input

The API should reject empty and whitespace-only values where content is required.

Invalid:

```json
{
    "content": ""
}
```

Invalid:

```json
{
    "content": "      "
}
```

Normalization:

```text
"      "
   │
   ▼
""
   │
   ▼
Validation fails
```

Expected:

```text
400 Bad Request
```

---

# 🧹 Normalization vs Sanitization

The module uses the term **sanitization** carefully.

For this application, most input handling should be **validation and normalization**, rather than blindly modifying user content.

### Validation

Asks:

> Is this input allowed?

Example:

```text
content = ""
```

Result:

```text
❌ Invalid
```

### Normalization

Asks:

> Can this value be safely standardized without changing its intended meaning?

Example:

```text
"   Hello World   "
```

can become:

```text
"Hello World"
```

Another example:

```text
"USER@EXAMPLE.COM"
```

can be normalized according to the application's email policy.

---

# 🧠 Field-Specific Input Handling

Different fields require different treatment.

Recommended approach:

```text
Email
  → normalize

Name
  → trim

Search Query
  → trim / normalize

Enum
  → validate exact allowed values

Message Content
  → validate primarily

HTML
  → context-specific handling

Code
  → validate size/type without destructive modification
```

The application should not apply the same sanitization rules to every field.

---

# ⚠️ Do Not Over-Sanitize Messages

Chat messages may contain:

```text
URLs
Emoji
Markdown
Code
Symbols
Formatting
```

Therefore, the backend should not blindly remove characters or HTML from message content if doing so would destroy legitimate content.

For example:

```text
console.log("Hello")
```

should remain valid message content.

For messages, the primary backend responsibilities are:

```text
Type validation
Length validation
Required-field validation
Safe storage
```

The frontend must render user-generated content safely.

> **Input validation does not replace output encoding or safe frontend rendering.**

If HTML rendering is introduced later, the application should use an appropriate context-specific HTML sanitization strategy rather than relying on generic input cleaning.

---

# 📋 Enum Validation

Fields with predefined values should only accept supported enum values.

Example:

```text
conversationType
```

Allowed:

```text
DIRECT
GROUP
```

Reject:

```text
RANDOM
```

Similarly:

```text
Notification Type
```

might allow:

```text
MESSAGE
MENTION
REACTION
```

and reject:

```text
UNKNOWN_TYPE
```

---

# 🔐 Authentication Input

Authentication endpoints require strict validation.

## Signup

Validate:

```text
name
email
password
```

Example rules:

```text
Email
  → valid format

Password
  → minimum configured requirements

Name
  → required
  → valid type
  → allowed length
```

Validation should occur before unnecessary database operations.

---

## Login

Validate:

```text
email
password
```

Invalid structure should be rejected before authentication logic performs unnecessary work.

Authentication failure and validation failure remain separate concerns:

```text
Invalid email format
        ↓
400 Validation Error
```

versus:

```text
Valid credentials format
        ↓
Authentication check
        ↓
401 Unauthorized
```

---

# 📨 Message Validation

Message creation should validate:

```text
conversationId
content
attachments
replyTo
```

Example:

```json
{
    "conversationId": "68conversation123",
    "content": "Hello!",
    "replyTo": null
}
```

Potential rules:

```text
conversationId → valid ObjectId
content         → string
content         → valid length
replyTo         → valid ObjectId if supplied
attachments     → valid structure
```

---

# 📎 Attachment Validation

Attachments are an important input boundary because uploaded files can consume storage and processing resources.

For the portfolio implementation, attachment metadata should be validated for:

```text
filename
MIME type
file size
extension
storage key/path
```

Example:

```text
filename
   │
   ├── valid string
   └── allowed length

MIME type
   │
   └── allowed file type

file size
   │
   └── configured maximum

extension
   │
   └── allowed extension

storage key/path
   │
   └── valid application-generated value
```

### Important security rule

> **Client-provided MIME type must not be blindly trusted.**

Where actual file uploads are implemented, the backend/storage layer should use appropriate file-type verification rather than relying only on the MIME type supplied by the client.

The application should also avoid using raw client-provided filenames or paths as trusted storage paths.

The portfolio implementation does not require antivirus scanning or enterprise-grade file inspection.

---

# 👥 Conversation Validation

Validate:

```text
conversation name
conversation type
members
workspace
```

Example:

```text
conversationType
```

may allow:

```text
DIRECT
GROUP
```

and reject:

```text
RANDOM
```

Member IDs should be validated as:

```text
valid ObjectIds
```

Structural validation does not confirm membership permissions.

Authorization handles that separately.

---

# 🏢 Organization Validation

Example fields:

```text
name
description
```

Rules:

```text
name
├── required
├── string
├── trimmed
└── maximum length

description
├── optional
├── string
└── maximum length
```

---

# 📁 Project Validation

Validate:

```text
organization
name
description
```

Example:

```text
organization → valid ObjectId
name         → required string
description  → optional string
```

Validation confirms that the identifier is structurally valid.

Authorization later confirms that the authenticated user can access the organization.

---

# 🗂️ Workspace Validation

Validate:

```text
organization
project
name
description
```

Relationship IDs should be structurally valid:

```text
Organization
     │
     ▼
Project
     │
     ▼
Workspace
```

Validation confirms:

```text
Is this a valid ObjectId?
```

Authorization confirms:

```text
Can this user access this organization/project/workspace?
```

---

# 🔔 Notification Validation

Notification-related input should validate:

```text
notification ID
isRead
notification preferences
```

Example:

```json
{
    "reactions": false
}
```

Valid:

```text
false → Boolean
```

Invalid:

```text
"false" → String
```

unless the API explicitly defines type coercion.

---

# 🔍 Query Parameter Validation

Example:

```text
GET /api/messages/search?q=hello&page=1&limit=20
```

Validate:

```text
q
page
limit
```

Rules:

```text
page
  → positive integer

limit
  → positive integer
  → configured maximum

q
  → string
  → allowed length
```

---

# 📄 Pagination Validation

Pagination parameters should prevent unreasonable values.

Invalid:

```text
?page=-100
```

Invalid:

```text
?limit=1000000
```

Recommended:

```text
page  >= 1
limit >= 1
limit <= configured maximum
```

Example:

```text
?page=1&limit=20
```

---

# 🔎 Search Validation

Search input must have reasonable limits.

Example:

```text
GET /api/messages/search?q=project
```

Validate:

```text
q
```

and prevent:

```text
q = extremely-large-input
```

This reduces unnecessary processing and database work.

Search validation does not replace database-level protections such as proper indexing and query design.

---

# 📡 Socket.IO Payload Validation

Validation must also be applied to Socket.IO events.

A connected socket is still controlled by the client.

Example:

```text
message:send
```

Payload:

```json
{
    "conversationId": "68conversation123",
    "content": "Hello"
}
```

must be validated before processing.

---

# 🔄 Socket.IO Validation Architecture

The Socket.IO flow is:

```text
Socket Connection
       │
       ▼
Socket Authentication
       │
       ▼
Event Payload Validation
       │
       ▼
Authorization / Membership
       │
       ▼
Event Handler
       │
       ▼
Service
```

The key rule is:

> **A connected socket is not a trusted source of input.**

---

# 📡 Socket Events To Validate

Important events include:

```text
message:send
typing:start
typing:stop
message:read
message:reaction
conversation:join
conversation:leave
```

Each event should have a defined payload schema.

Example:

```text
message:send
├── conversationId → ObjectId
└── content        → string
```

---

# ⚠️ Socket.IO Validation Errors

Socket.IO does not return an HTTP `400` response in the same way as REST.

Therefore, validation failures should use a consistent socket error event.

Example:

```text
message:send
      │
      ▼
Payload Validation
      │
      ▼
Invalid
      │
      ▼
message:error
```

Example payload:

```json
{
    "code": "VALIDATION_ERROR",
    "message": "Invalid message payload",
    "errors": [
        {
            "field": "content",
            "message": "Message content is required"
        }
    ]
}
```

No message should be created when socket payload validation fails.

---

# 🧩 Validation Layer

Create reusable validators.

Recommended structure:

```text
src/
│
├── validators/
│   ├── auth.validator.js
│   ├── organization.validator.js
│   ├── project.validator.js
│   ├── workspace.validator.js
│   ├── conversation.validator.js
│   ├── message.validator.js
│   ├── notification.validator.js
│   └── common.validator.js
│
└── middleware/
    └── validate.js
```

The exact folder structure can be adjusted to the existing project architecture.

The important requirement is:

> **Validation rules should remain centralized and reusable.**

---

# 🧠 Common Validators

Create reusable validation helpers for:

```text
ObjectId
Email
Pagination
String
Boolean
Enum
Required fields
```

Example:

```text
common.validator.js
│
├── validateObjectId()
├── validatePagination()
├── validateString()
├── validateEmail()
└── validateEnum()
```

This prevents the same validation logic from being duplicated across controllers.

---

# 🔧 Validation Middleware

Use reusable middleware:

```text
validate(schema)
```

Conceptually:

```text
Route
 │
 ▼
validate(schema)
 │
 ├── Valid ───────► next()
 │
 └── Invalid ─────► Validation Error
```

Example:

```text
POST /api/messages
       │
       ▼
messageSchema
       │
       ▼
Message Controller
```

Validation should happen before controller business logic.

---

# 📤 Validation Error Response

REST APIs should use a consistent structure.

Example:

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "content",
            "message": "Message content is required"
        }
    ]
}
```

For multiple failures:

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "conversationId",
            "message": "Invalid conversation ID"
        },
        {
            "field": "content",
            "message": "Message content is required"
        }
    ]
}
```

---

# 📊 HTTP Status Convention

The project uses the following basic HTTP status convention:

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| `400`  | Malformed or invalid request                     |
| `401`  | Authentication required or authentication failed |
| `403`  | Authenticated but not authorized                 |
| `404`  | Requested resource not found                     |
| `409`  | Resource/state conflict                          |
| `500`  | Unexpected server error                          |

For this project:

```text
Validation Failure
       ↓
400 Bad Request
```

The application does not need to introduce `422 Unprocessable Entity` unless a future API design specifically requires it.

The important requirement is **consistent status-code behavior across the API**.

---

# 🧠 Validation vs Authorization

Validation and authorization must remain separate.

### Validation

Asks:

```text
"Is this conversationId structurally valid?"
```

### Authorization

Asks:

```text
"Is this user allowed to access this conversation?"
```

Example:

```text
conversationId
      │
      ▼
Valid ObjectId?
      │
      ▼
Validation ✅
      │
      ▼
Is user a member?
      │
      ▼
Authorization
```

A valid ObjectId does not mean the user has permission to access the resource.

---

# 🛡️ Unknown Fields Policy

The application should **reject unknown fields by default**.

Example:

```json
{
    "content": "Hello",
    "isAdmin": true
}
```

If `isAdmin` is not part of the schema:

```text
Validation
     │
     ▼
Unknown field
     │
     ▼
400 Bad Request
```

This is preferable for security-sensitive endpoints because it prevents clients from silently injecting unsupported properties.

The application should explicitly define schemas rather than accepting arbitrary request bodies.

---

# 🧹 Normalization Rules

Recommended basic normalization:

```text
Trim strings
Normalize email
Normalize expected enum casing where appropriate
Remove unnecessary surrounding whitespace
```

Normalization should not modify the semantic content of user-generated data.

For example:

```text
" Hello "
```

may become:

```text
"Hello"
```

but:

```text
"console.log('Hello')"
```

should not be altered merely because it contains symbols.

---

# ⚠️ Validation Does Not Replace Other Security Layers

Input validation is only one security boundary.

It does not replace:

```text
Authentication
Authorization
Rate Limiting
Output Encoding
Safe Frontend Rendering
Database Security
File Upload Security
Error Handling
```

The security model is therefore:

```text
Input Validation
       +
Authentication
       +
Authorization
       +
Safe Output Handling
       +
Rate Limiting
       +
Secure Database Access
```

---

# 📊 Validation Matrix

| Module         | Important Validation                 |
| -------------- | ------------------------------------ |
| Authentication | Email, password, name                |
| Organization   | Name, description                    |
| Project        | IDs, name, description               |
| Workspace      | IDs, name                            |
| Conversations  | IDs, type, name                      |
| Members        | User IDs, conversation IDs           |
| Messages       | Content, IDs, attachments            |
| Reactions      | Message ID, reaction type            |
| Read Receipts  | Message/conversation IDs             |
| Attachments    | Filename, MIME type, size, extension |
| Search         | Query, pagination                    |
| Notifications  | Notification ID                      |
| Unread         | Conversation ID                      |
| Preferences    | Boolean preferences                  |

---

# 🧪 Testing Strategy

The module should be tested with both valid and invalid inputs.

---

## 1. Valid Message

```json
{
    "conversationId": "validObjectId",
    "content": "Hello"
}
```

Expected:

```text
200/201
```

---

## 2. Missing Content

```json
{
    "conversationId": "validObjectId"
}
```

Expected:

```text
400 Bad Request
```

---

## 3. Empty Content

```json
{
    "conversationId": "validObjectId",
    "content": ""
}
```

Expected:

```text
400 Bad Request
```

---

## 4. Whitespace-Only Content

```json
{
    "conversationId": "validObjectId",
    "content": "      "
}
```

Expected:

```text
400 Bad Request
```

---

## 5. Invalid ObjectId

```text
conversationId = "abc"
```

Expected:

```text
400 Bad Request
```

---

## 6. Excessively Long Message

Send content exceeding the configured maximum.

Expected:

```text
400 Bad Request
```

---

## 7. Invalid Enum

Example:

```json
{
    "type": "INVALID_TYPE"
}
```

Expected:

```text
400 Bad Request
```

---

## 8. Invalid Pagination

```text
?page=-1&limit=999999
```

Expected:

```text
400 Bad Request
```

---

## 9. Invalid Socket Payload

Send:

```json
{
    "conversationId": 123,
    "content": true
}
```

Expected:

```text
message:error
```

with:

```text
code = VALIDATION_ERROR
```

No message should be created.

---

## 10. Unknown Field

Send:

```json
{
    "content": "Hello",
    "isAdmin": true
}
```

Expected:

```text
400 Bad Request
```

The unknown field should not reach the service layer.

---

## 11. Invalid Attachment Metadata

Example:

```text
fileSize > configured maximum
```

Expected:

```text
400 Bad Request
```

---

## 12. Invalid Boolean

Example:

```json
{
    "reactions": "false"
}
```

Expected:

```text
400 Bad Request
```

when the schema requires an actual Boolean.

---

## 13. Multiple Validation Errors

Send a request containing multiple invalid fields.

Expected:

```text
400 Bad Request
```

with all relevant validation errors returned.

---

## 14. Valid Message With Code

Send:

```text
console.log("Hello")
```

Expected:

```text
Message accepted
```

The validation layer should not destroy legitimate code or symbols.

---

# ⚠️ Edge Cases

The module should handle:

* Missing request body
* Empty request body
* Null values
* Undefined values
* Wrong data types
* Invalid ObjectIds
* Excessively long strings
* Unknown fields
* Invalid enum values
* Invalid pagination
* Malformed JSON
* Invalid Socket.IO payloads
* Multiple validation failures
* Unicode input
* Emoji input
* Whitespace-only strings
* Invalid attachment metadata
* Oversized attachments
* Missing attachment fields

---

# 📊 API Behavior

### Valid Request

```text
Client
  │
  ▼
Authentication
  │
  ▼
Validation ✅
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
Database
```

### Invalid Request

```text
Client
  │
  ▼
Validation ❌
  │
  ▼
400 Bad Request
```

The request should **not reach the controller's business logic or database** when basic validation fails.

---

# 🗂️ Recommended REST Middleware Flow

```text
Request
   │
   ▼
Request Parsing
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
Database
```

For public endpoints:

```text
Request
   │
   ▼
Request Parsing
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

Each layer should have one clear responsibility.

---

# 📡 Recommended Socket.IO Flow

```text
Socket Connection
       │
       ▼
Socket Authentication
       │
       ▼
Event Payload Validation
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

On validation failure:

```text
Event
  │
  ▼
Validation ❌
  │
  ▼
message:error
```

The event must not continue to the service layer.

---

# 🔐 Security Checklist

Before marking the module complete:

* [ ] Request body validation implemented
* [ ] URL parameter validation implemented
* [ ] Query parameter validation implemented
* [ ] ObjectId validation implemented
* [ ] Enum validation implemented
* [ ] String length validation implemented
* [ ] Required field validation implemented
* [ ] Pagination validation implemented
* [ ] Socket.IO payload validation implemented
* [ ] Attachment metadata validation implemented
* [ ] Common validators created
* [ ] Validation middleware created
* [ ] Consistent REST validation errors implemented
* [ ] Consistent Socket.IO validation errors implemented
* [ ] Unknown fields rejected by default
* [ ] Appropriate input normalization implemented
* [ ] Message content is not destructively sanitized
* [ ] Output encoding/safe rendering responsibility documented
* [ ] Validation occurs before business logic
* [ ] Validation occurs before database operations
* [ ] Validation remains separate from authorization

---

# 📊 Phase 5 Progress

```text
Phase 5 — Security & Production

├── Input Validation & Sanitization  🟡 Current
├── Rate Limiting                    ⏳
├── Authorization Hardening          ⏳
├── Centralized Error Handling       ⏳
└── Logging & Monitoring             ⏳
```

---

# 🎯 Module Completion Criteria

The module is complete when:

```text
Input Validation & Sanitization
│
├── Request validation          ✅
├── Parameter validation        ✅
├── Query validation            ✅
├── ObjectId validation         ✅
├── Enum validation             ✅
├── String validation           ✅
├── Pagination validation       ✅
├── Attachment validation       ✅
├── Socket validation           ✅
├── Normalization               ✅
├── Validation middleware       ✅
├── Unknown-field rejection     ✅
├── REST error responses        ✅
├── Socket error responses      ✅
└── Tests                       ✅
```

The final REST architecture should be:

```text
                 Client
                    │
                    ▼
             Request Parsing
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

The final Socket.IO architecture should be:

```text
Socket Connection
       │
       ▼
Socket Authentication
       │
       ▼
Event Payload Validation
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
```

---

# 🏁 Summary

The **Input Validation & Sanitization module** establishes a primary security boundary between external clients and the application's business logic.

Its core responsibility is:

> **Never allow invalid or unexpected client input to reach application business logic or the database.**

The module separates:

```text
Authentication
      ↓
Validation
      ↓
Normalization
      ↓
Authorization
      ↓
Business Logic
      ↓
Database
```

Validation determines whether input is structurally acceptable.

Normalization applies safe, field-specific transformations.

Authorization determines whether the authenticated user is allowed to perform the operation.

These responsibilities remain separate.

---

# 🧠 Key Architectural Principles

### 1. Client input is never trusted

```text
Client
  ↓
Validation
  ↓
Application
```

---

### 2. Authentication identifies the caller

```text
Authentication
      ↓
Who is making this request?
```

---

### 3. Validation checks structure

```text
Validation
      ↓
Is this input valid?
```

---

### 4. Normalization is field-specific

```text
Email     → normalize
Name      → trim
Search    → normalize
Message   → primarily validate
```

The system should avoid destructive transformations of legitimate message content.

---

### 5. Authorization checks permissions

```text
Valid conversation ID
        ↓
Is user allowed to access it?
```

A structurally valid identifier does not grant access.

---

### 6. Unknown fields are rejected by default

```text
Unexpected Field
      ↓
Validation Error
      ↓
400 Bad Request
```

This prevents unsupported properties from silently entering application logic.

---

### 7. Attachments have their own security boundary

```text
Filename
MIME Type
File Size
Extension
Storage Path
```

must be validated.

Client-provided MIME types and filenames must not automatically be treated as trusted values.

---

### 8. Validation does not replace output security

```text
Input Validation
       +
Safe Output Encoding
       +
Safe Frontend Rendering
```

are separate security responsibilities.

---

### 9. REST and Socket.IO use different error mechanisms

REST:

```text
Invalid Input
     ↓
400 Bad Request
```

Socket.IO:

```text
Invalid Payload
     ↓
message:error
```

Both should use a consistent validation error structure.

---

### 10. Validation happens before database operations

```text
Invalid Input
      ↓
Validation Error
      ↓
Stop
```

No unnecessary database query should occur.

---

# 🚀 Next Module

The next module is:

```text
PHASE 5 — Module 2
Rate Limiting
```

The **Rate Limiting** module will protect the REST APIs and Socket.IO system from excessive requests, brute-force attempts, spam, and abusive client behavior.

The Phase 5 security progression is:

```text
Input Validation
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
```

This keeps the security architecture incremental and appropriate for a portfolio-level chat application.

---

# 🏁 Final Architecture

After this module, the application's request security boundary is:

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
       Authentication             Payload Validation
             │                             │
             ▼                             ▼
        Validation                   Normalization
             │                             │
             ▼                             ▼
       Normalization             Authorization / Membership
             │                             │
             ▼                             ▼
       Authorization                 Event Handler
             │                             │
             ▼                             ▼
         Controller                    Service
             │                             │
             └──────────────┬──────────────┘
                            ▼
                         Service
                            │
                            ▼
                         MongoDB
```

The key security boundary is:

```text
                 External Client
                        │
                        ▼
              ┌──────────────────┐
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

This module therefore provides the foundation for the remaining Phase 5 security modules while keeping the implementation **minimal, centralized, testable, and appropriate for an interview-level portfolio project**.

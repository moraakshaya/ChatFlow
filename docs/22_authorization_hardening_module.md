# 🔐 Authorization Hardening Module

## 📋 Module Information

| Property            | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Module**          | Authorization Hardening                                                               |
| **Version**         | v1.1                                                                                  |
| **Status**          | 🟡 In Development                                                                     |
| **Phase**           | Phase 5 — Security & Production                                                       |
| **Module Number**   | Module 3                                                                              |
| **Previous Module** | Rate Limiting                                                                         |
| **Next Module**     | Centralized Error Handling                                                            |
| **Depends On**      | Authentication, Organizations, Projects, Workspaces, Conversations, Members, Messages |
| **Database**        | MongoDB                                                                               |
| **Backend**         | Node.js + Express + Socket.IO                                                         |

---

# 📌 Overview

The **Authorization Hardening module** strengthens access control throughout the chat platform.

Authentication answers:

> **Who are you?**

Authorization answers:

> **What are you allowed to access or do?**

A user having a valid JWT does **not** mean that the user can access every resource in the system.

The authorization hierarchy is:

```text
User
 │
 ▼
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
Messages
```

Every protected resource must verify that the authenticated user has permission to access or modify it.

The core principle is:

> **Authentication establishes identity. Authorization establishes access.**

---

# 🎯 Objectives

The module should:

* Enforce organization-level isolation
* Enforce project-level access
* Enforce workspace-level access
* Enforce conversation membership
* Protect messages
* Protect attachments
* Protect notifications
* Protect read receipts
* Protect reactions
* Protect unread counters
* Protect notification preferences
* Protect search
* Protect Socket.IO events
* Protect Socket.IO room joins
* Prevent ID-based authorization bypass
* Prevent client-controlled identity escalation
* Separate authentication from authorization
* Distinguish ownership, membership, hierarchy, and permissions
* Centralize reusable authorization logic
* Define clear authorization decision points
* Support role-based and permission-based access control
* Handle resource existence securely
* Handle concurrent membership changes safely
* Provide cross-user and cross-organization authorization tests

---

# 🧠 Core Security Principle

Never assume that because a user is authenticated, they are authorized.

Incorrect:

```text
JWT Valid
   │
   ▼
Access Resource
```

Correct:

```text
JWT Valid
   │
   ▼
Identify User
   │
   ▼
Determine Resource
   │
   ▼
Check Access / Membership / Permission
   │
   ├── Authorized → Continue
   │
   └── Unauthorized → Reject
```

The backend must make the final authorization decision.

Frontend controls such as hidden buttons, disabled inputs, or protected routes are **UX controls**, not security controls.

---

# 🔐 Authentication vs Authorization

## Authentication

Authentication determines the identity of the requester.

```text
POST /api/auth/login
        │
        ▼
Credentials
        │
        ▼
JWT
        │
        ▼
Authenticated User
```

The authenticated identity should be available to the application through:

```text
req.user.id
```

for REST APIs and the authenticated socket context for Socket.IO.

---

## Authorization

Authorization determines whether that authenticated user can perform a requested operation.

```text
Authenticated User
        │
        ▼
Identify Resource
        │
        ▼
Check Access
        │
    ┌───┴───┐
    ▼       ▼
   Yes      No
    │        │
    ▼        ▼
  Allow    Reject
```

Both authentication and authorization are required.

---

# 🏗️ Authorization Architecture

Authorization is divided into two conceptual stages:

```text
Request
   │
   ▼
Authentication
   │
   ▼
Identify User
   │
   ▼
Basic / Context Authorization
   │
   ▼
Validation
   │
   ▼
Resource Lookup
   │
   ▼
Resource Authorization
   │
   ▼
Controller / Service
   │
   ▼
Database
```

However, not every authorization decision requires a database lookup.

The implementation should distinguish between:

```text
Request-level authorization
        +
Resource-level authorization
        +
Action-level permission checks
```

---

# 🔍 Authorization Decision Point

The application should avoid placing all authorization logic blindly inside middleware.

Authorization belongs at the layer that has enough information to make the correct decision.

## Request-Level Authorization

Simple checks can be performed through middleware.

Example:

```text
Authentication
      │
      ▼
Organization Context
      │
      ▼
Basic Authorization
      │
      ▼
Controller
```

---

## Resource-Level Authorization

When authorization depends on a database resource, the service layer or a dedicated authorization service should perform the resource-specific check.

Example:

```text
Request
   │
   ▼
Authentication
   │
   ▼
Validation
   │
   ▼
Controller
   │
   ▼
Authorization Service
   │
   ├── Load conversation
   ├── Check membership
   └── Check permission
   │
   ▼
Business Service
```

This avoids creating overly complicated middleware that performs arbitrary database lookups for every endpoint.

---

# 🧩 Authorization Responsibility Model

The recommended responsibility split is:

```text
Authentication Middleware
        │
        └── Establish user identity

Validation Middleware
        │
        └── Validate request structure

Authorization Layer
        │
        ├── Resource access
        ├── Membership
        ├── Ownership
        └── Permissions

Business Service
        │
        └── Execute authorized operation
```

The authorization layer may be implemented through:

```text
Middleware
Authorization Service
Service-level checks
```

depending on the operation.

The important rule is:

> **Authorization must occur before the protected operation is executed, and the layer responsible for the decision must have access to the required resource and permission context.**

---

# 🏢 Multi-Tenant Isolation

The chat platform supports multiple organizations.

Example:

```text
Organization A
│
├── Project A1
│   └── Workspace A1
│       └── Conversations
│
└── Project A2


Organization B
│
├── Project B1
│   └── Workspace B1
│       └── Conversations
│
└── Project B2
```

A user belonging to Organization A must not be able to access Organization B's resources simply by changing an ID.

Incorrect:

```text
GET /api/projects/PROJECT_B_ID
```

and:

```text
Project.findById(projectId)
```

Correct:

```text
Project ID
    │
    ▼
Determine parent organization
    │
    ▼
Verify user access
    │
    ▼
Verify project belongs to authorized scope
    │
    ▼
Allow / Reject
```

---

# 🔗 Hierarchical Authorization

The application contains several resource levels:

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
Message
```

Authorization must respect this hierarchy.

However:

> **Access to a parent resource does not automatically grant every permission on its children.**

For example:

```text
Organization access
      ≠
Project management permission

Project access
      ≠
Workspace management permission

Workspace access
      ≠
Conversation administration permission

Conversation membership
      ≠
Conversation administration permission
```

Therefore, the application must distinguish:

```text
Resource Access
        +
Action Permission
```

---

# 🔐 Resource Authorization Models

Different resources use different authorization models.

The implementation should classify protected resources into four primary categories:

```text
Ownership
Membership
Hierarchy
Permission
```

---

# 👤 1. Ownership-Based Authorization

Some resources belong directly to a specific user.

Examples:

```text
Notifications
Preferences
Unread Counters
```

Authorization can use:

```text
resource.userId === req.user.id
```

or preferably derive the user identity directly from the authenticated request.

Example:

```text
Authenticated User
       │
       ▼
req.user.id
       │
       ▼
Find own notification
       │
       ▼
Allow
```

The client should not be trusted to decide whose resource is being accessed.

---

# 👥 2. Membership-Based Authorization

Some resources are accessible because the user is a member.

Examples:

```text
Conversation
Messages
Attachments
Reactions
Read Receipts
```

Authorization:

```text
User
 │
 ▼
Conversation
 │
 ▼
Conversation Members
 │
 ▼
Current user is a member?
 │
 ├── Yes → Allow
 └── No  → Reject
```

---

# 🏢 3. Hierarchical Authorization

Some resources inherit their accessibility from a parent hierarchy.

Examples:

```text
Organization
Project
Workspace
```

Authorization generally requires:

```text
User has access to parent
        +
Resource belongs to expected parent
        =
Authorized resource access
```

Example:

```text
User
 │
 ▼
Organization membership
 │
 ▼
Project belongs to organization
 │
 ▼
Project access
```

---

# 🛡️ 4. Permission-Based Authorization

Some operations require a specific permission even when the user can access the resource.

Examples:

```text
Manage members
Delete conversation
Update conversation role
Delete another user's message
Manage organization
```

The decision should be based on the permission required for the action.

Example:

```text
User
 ↓
Membership
 ↓
Role
 ↓
Permission
 ↓
Requested Action
```

Prefer:

```text
canManageMembers
canDeleteConversation
canManageOrganization
canEditMessage
```

over hardcoding:

```text
role === "admin"
```

throughout controllers.

---

# 🧠 Role-Based Authorization

Where roles exist, roles should map to permissions.

Example:

```text
Organization
│
├── Admin
├── Manager
└── Member
```

Conceptually:

```text
User
 │
 ▼
Organization Membership
 │
 ▼
Role
 │
 ▼
Permissions
 │
 ▼
Requested Action
```

Example:

```text
Admin
 ├── Manage organization
 ├── Manage projects
 └── Manage members

Manager
 ├── Manage workspace
 └── Manage conversations

Member
 ├── View allowed conversations
 └── Send messages
```

Roles should not automatically imply every possible operation.

The permission model should remain explicit.

---

# 📊 Authorization Decision Matrix

The following matrix defines the default authorization model.

| Resource            | Access Rule                                        | Management / Mutation Rule       |
| ------------------- | -------------------------------------------------- | -------------------------------- |
| Organization        | Organization membership                            | Organization permission          |
| Project             | Project membership / authorized organization scope | Project permission               |
| Workspace           | Workspace access                                   | Workspace permission             |
| Conversation        | Conversation membership                            | Conversation permission          |
| Conversation Member | Conversation membership                            | Member-management permission     |
| Message             | Conversation membership                            | Author / conversation permission |
| Attachment          | Parent message authorization                       | Parent resource permission       |
| Reaction            | Conversation/message authorization                 | Member permission                |
| Read Receipt        | Conversation membership                            | Current-user operation           |
| Notification        | `recipientId === req.user.id`                      | User only                        |
| Unread Counter      | Current user                                       | User only                        |
| Preferences         | `userId === req.user.id`                           | User only                        |
| Search Results      | Authorized conversations only                      | Search permission / access       |
| Socket Room         | Conversation membership                            | Event-specific permission        |
| Socket Event        | Authenticated user + resource access               | Event-specific permission        |

This matrix acts as the baseline authorization contract for the application.

---

# 🔒 Organization Authorization

When accessing organization resources:

```text
GET /api/organizations/:organizationId
```

the backend must verify:

```text
Authenticated User
        │
        ▼
Organization
        │
        ▼
User belongs to organization?
```

If the user does not have access:

```text
403 Forbidden
```

or, where resource existence should not be disclosed:

```text
404 Not Found
```

---

# 📁 Project Authorization

Projects belong to organizations.

```text
Organization
      │
      ▼
Project
```

When accessing a project:

```text
User
 │
 ▼
Organization access
 │
 ▼
Project belongs to organization
 │
 ▼
Project permission
 │
 ▼
Allow
```

Do not authorize based only on:

```text
projectId
```

---

# 🗂️ Workspace Authorization

Workspace access should respect the hierarchy:

```text
User
 │
 ▼
Organization
 │
 ▼
Project
 │
 ▼
Workspace
```

Example:

```text
GET /api/workspaces/:workspaceId
```

The backend should confirm:

```text
Workspace exists
      +
Workspace belongs to expected project
      +
User can access the parent project/organization
```

Management operations may additionally require:

```text
Workspace management permission
```

---

# 💬 Conversation Authorization

Conversation access is one of the most important authorization boundaries.

A user should generally only access conversations where they are a valid member.

```text
Conversation
     │
     ▼
Conversation Members
     │
     ▼
Does current user exist?
```

Example:

```text
User A → Conversation 1 ✅
User B → Conversation 1 ✅
User C → Conversation 1 ❌
```

User C must not be able to retrieve or modify the conversation.

---

# 👥 Conversation Member Authorization

Member operations are sensitive.

Examples:

```text
Add member
Remove member
Update member role
View members
```

Access and management should be separated.

Example:

| Action              | Owner |        Admin | Member |
| ------------------- | ----: | -----------: | -----: |
| View conversation   |     ✅ |            ✅ |      ✅ |
| Send message        |     ✅ |            ✅ |      ✅ |
| View members        |     ✅ |            ✅ |      ✅ |
| Add member          |     ✅ |            ✅ |      ❌ |
| Remove member       |     ✅ |            ✅ |      ❌ |
| Update member role  |     ✅ | Configurable |      ❌ |
| Delete conversation |     ✅ |            ❌ |      ❌ |

The exact role model should match the application's existing conversation design.

---

# 📨 Message Authorization

Messages inherit access from their conversation.

```text
User
 │
 ▼
Conversation Membership
 │
 ▼
Message
```

A user must not access a message simply because they know its ID.

Example:

```text
GET /api/messages/:messageId
```

Incorrect:

```text
Message.findById(messageId)
```

Correct:

```text
Message
  │
  ▼
Conversation
  │
  ▼
User membership
  │
  ▼
Permission
  │
  ▼
Authorized?
```

---

# ✏️ Message Modification

Operations such as:

```text
Edit message
Delete message
React to message
Mark message as read
```

must verify authorization.

For example:

```text
Delete Message
      │
      ▼
Load message
      │
      ▼
Identify conversation
      │
      ▼
Check membership
      │
      ▼
Check action permission
      │
      ├── Yes → Delete
      └── No  → Reject
```

For message editing/deletion, additional rules may apply:

```text
Message author
        +
Conversation permission
        +
Application policy
```

---

# ❤️ Reaction Authorization

A reaction must not be allowed merely because the message ID is valid.

Correct flow:

```text
Reaction
   │
   ▼
Message
   │
   ▼
Conversation
   │
   ▼
User membership
   │
   ▼
Reaction permission
   │
   ├── Yes → Allow
   └── No  → Reject
```

---

# ✅ Read Receipt Authorization

A user should only create or update read receipts for conversations they are authorized to access.

```text
Read Receipt
      │
      ▼
Message
      │
      ▼
Conversation
      │
      ▼
Membership Check
      │
      ▼
Current User
```

The operation should normally apply to the authenticated user rather than accepting an arbitrary user ID from the client.

---

# 📎 Attachment Authorization

Attachments must follow the authorization boundary of their associated message/conversation.

A user must not be able to access another user's private attachment by guessing a file ID.

```text
Attachment
    │
    ▼
Message
    │
    ▼
Conversation
    │
    ▼
Membership
    │
    ▼
Permission
```

For attachment downloads, authorization must happen **before returning the file or signed file URL**.

---

# 🔍 Message Search Authorization

Search is a particularly important authorization boundary.

A global search endpoint must never:

```text
Search entire database
        ↓
Return results
        ↓
Frontend filters unauthorized data
```

That leaks information before frontend filtering occurs.

Correct:

```text
Authenticated User
        │
        ▼
Determine authorized scope
        │
        ▼
Determine accessible conversations
        │
        ▼
Apply authorization to database query
        │
        ▼
Search messages
        │
        ▼
Return only authorized results
```

## Global Search Definition

For this platform:

> **Global Search means searching across all messages in the resources the authenticated user is authorized to access within their permitted organization/project/workspace/conversation scope.**

It does **not** mean:

```text
Search every message in MongoDB
```

The database query itself should enforce the authorization boundary whenever practical.

Search authorization should work together with:

```text
Query length validation
Pagination limits
Database indexes
Efficient query design
Rate limiting
```

---

# 🔔 Notification Authorization

Notifications belong to specific users.

Example:

```text
Notification
     │
     ▼
recipientId
     │
     ▼
Current User
```

A user must not retrieve another user's notifications.

```text
User A → Own notifications ✅
User B → User A notifications ❌
```

Prefer deriving the user from:

```text
req.user.id
```

rather than accepting:

```text
?userId=...
```

from the client.

---

# 🔢 Unread Counter Authorization

Unread counters are user-specific.

Example:

```text
User A
 └── Conversation 1 → 5 unread

User B
 └── Conversation 1 → 2 unread
```

User A must never receive User B's unread state.

Authorization should therefore be based on the authenticated user identity.

---

# ⚙️ Notification Preferences Authorization

Notification preferences are user-owned.

```text
User A
   │
   ▼
Own Preferences ✅
```

Not:

```text
User A
   │
   ▼
User B Preferences ❌
```

Prefer:

```text
req.user.id
```

as the source of identity.

---

# 🔐 Prevent Client-Controlled Identity

Avoid APIs where the client determines the identity of the target user for user-owned operations.

Dangerous:

```json
{
  "userId": "another-user-id",
  "notificationId": "..."
}
```

Safer:

```text
Authenticated JWT
       │
       ▼
req.user.id
       │
       ▼
Find current user's resource
```

This significantly reduces IDOR-style authorization vulnerabilities.

---

# 🚫 Never Trust User IDs From Request Body

Avoid:

```json
{
  "userId": "some-user-id"
}
```

when the operation is intended for the currently authenticated user.

Prefer:

```text
JWT
 │
 ▼
Authentication Middleware
 │
 ▼
req.user.id
```

The authenticated identity becomes the source of truth.

---

# 🧩 Authorization Middleware and Services

Recommended structure:

```text
src/
│
├── middleware/
│   ├── auth.middleware.js
│   ├── validate.middleware.js
│   ├── rateLimit.middleware.js
│   └── authorization.middleware.js
│
├── services/
│   └── authorization.service.js
│
└── utils/
    └── authorization.utils.js
```

The exact structure can be adapted to the existing application architecture.

---

# 🔧 Authorization Responsibilities

Reusable authorization functions may include:

```text
isOrganizationMember()
isProjectMember()
hasProjectAccess()
hasWorkspaceAccess()
isConversationMember()
canManageConversation()
canManageMembers()
canModifyMessage()
canDeleteMessage()
canAccessAttachment()
canAccessNotification()
canManageOrganization()
```

The exact function names are implementation details.

The important requirement is that authorization rules remain reusable and consistent.

---

# 🧠 Centralized Authorization

Avoid repeating complex authorization logic across controllers.

Avoid:

```text
Controller A
 └── custom authorization

Controller B
 └── different authorization

Controller C
 └── another authorization
```

Prefer:

```text
                 Authorization Layer
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Organization   Conversation     Message
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 Permission Decision
```

This reduces the chance that one endpoint accidentally implements weaker authorization than another.

---

# 📡 Socket.IO Authorization

REST API authorization alone is not enough.

Socket.IO events must independently verify authorization.

Example:

```text
message:send
```

Flow:

```text
Socket Event
     │
     ▼
Authenticated Socket
     │
     ▼
Validate Payload
     │
     ▼
Load Resource
     │
     ▼
Check Conversation Membership
     │
     ▼
Check Event Permission
     │
     ▼
Process Message
```

A valid socket connection does not grant unlimited access to every conversation.

---

# 🔌 Socket Conversation Join

When a user attempts:

```text
conversation:join
```

the server must verify:

```text
User authenticated?
        │
        ▼
Conversation exists?
        │
        ▼
User is member?
        │
        ▼
User has permission to join?
        │
        ├── Yes → Join room
        └── No  → Reject
```

Never perform:

```javascript
socket.join(conversationId);
```

without first checking authorization.

---

# 📡 Socket Message Sending

For:

```text
message:send
```

verify:

```text
Socket authenticated
        │
        ▼
Payload valid
        │
        ▼
Conversation exists
        │
        ▼
User is member
        │
        ▼
User has send-message permission
        │
        ▼
Create message
```

The Socket.IO path must enforce the same security boundary as the REST message API.

---

# 🟢 Presence Authorization

Presence information should respect the application's privacy model.

For example:

```text
User A
   │
   ▼
Can User A see User B's presence?
   │
   ├── Yes → Return presence
   └── No  → Do not expose
```

The exact visibility policy should be explicitly defined by the application.

---

# 🔄 Authorization and Concurrent Membership Changes

Authorization decisions can become stale if membership changes while an operation is in progress.

Example:

```text
User is member
      │
      ▼
Authorization passes
      │
      ▼
Membership removed
      │
      ▼
Operation attempts to execute
```

For sensitive operations, the implementation should avoid relying on stale authorization state.

Where practical:

```text
Authorization
      +
Mutation
```

should be designed so that the final operation still respects the current authorization state.

For example, a service may use an authorization-aware database update:

```text
Update message
WHERE
    message belongs to authorized conversation
    AND
    current user has required permission
```

The portfolio implementation does not require complex distributed locking.

The important principle is:

> **A previously valid authorization decision must not automatically be treated as permanently valid after the underlying membership or permission changes.**

---

# 🧠 Authorization and Deleted Resources

Authorization must also handle resources that no longer exist.

Examples:

```text
Deleted organization
Deleted project
Deleted workspace
Deleted conversation
Deleted message
Removed member
Deleted user
```

The application should distinguish:

```text
Resource does not exist
        ↓
404 / controlled response

Resource exists but user cannot access it
        ↓
403 or intentional 404
```

The exact response should follow the application's resource-enumeration policy.

---

# 🚨 ID-Based Authorization Attack

Example:

```text
GET /api/conversations/CONVERSATION_B_ID
```

A malicious user may discover another conversation ID.

Incorrect:

```text
conversationId received
        │
        ▼
Conversation.findById()
        │
        ▼
Return conversation
```

Correct:

```text
conversationId
      │
      ▼
Load conversation
      │
      ▼
Determine organization/project/workspace scope
      │
      ▼
Check current user's membership/access
      │
      ▼
Check requested permission
      │
      ├── Authorized → Continue
      └── Unauthorized → Reject
```

---

# ⚠️ Common Authorization Mistakes

## 1. Trusting IDs

```text
GET /messages/:id
```

and assuming the ID is enough.

❌ Incorrect.

---

## 2. Frontend-Only Authorization

Hiding:

```text
Delete button
```

does not provide security.

A malicious user can call the API manually.

Authorization must happen on the backend.

---

## 3. Checking Only Authentication

```text
JWT valid → Allow
```

❌ Incorrect.

Correct:

```text
JWT valid
   +
Resource access allowed
   +
Action permission
   =
Authorized
```

---

## 4. Role-Only Authorization

Avoid scattering:

```text
role === "admin"
```

throughout the application.

Prefer:

```text
Role
 ↓
Permission
 ↓
Action
```

This makes the system easier to extend.

---

## 5. Searching Before Authorization

Never retrieve unauthorized data and filter it afterward.

Authorization should be incorporated into the database query/access strategy whenever practical.

---

## 6. Assuming Parent Access Grants All Child Permissions

Incorrect:

```text
Organization member
      ↓
Can perform every organization operation
```

Correct:

```text
Organization access
      +
Required permission
      ↓
Requested operation
```

---

## 7. Checking Membership Only Once

Do not assume that a previous request proves authorization forever.

Protected operations should use current authorization state appropriate to the operation.

---

# 📤 Authorization Error Responses

When a user is authenticated but not authorized:

```text
403 Forbidden
```

Example:

```json
{
  "success": false,
  "message": "You are not authorized to access this resource"
}
```

For resources where revealing existence is itself sensitive, the API may intentionally return:

```text
404 Not Found
```

instead of exposing that the resource exists.

This behavior should be deliberate and consistent.

---

# 🔐 Authentication Error vs Authorization Error

## Authentication Failure

```text
No valid authentication
        │
        ▼
401 Unauthorized
```

Meaning:

> The server cannot establish a valid authenticated identity.

---

## Authorization Failure

```text
Authenticated User
        │
        ▼
No required permission
        │
        ▼
403 Forbidden
```

Meaning:

> The server knows who the user is, but the user is not allowed to perform the operation.

Conceptually:

```text
401 → "Who are you?"

403 → "I know who you are, but you cannot do this."
```

---

# 🧪 Testing Strategy

Authorization must be tested using multiple users and isolated resources.

Create:

```text
User A
User B
User C
```

and separate:

```text
Organization A
Organization B
Conversation A
Conversation B
```

Tests should verify both:

```text
Authorized access
```

and:

```text
Unauthorized access
```

---

# 🧪 Test 1 — Organization Isolation

```text
User A → Organization A ✅
User A → Organization B ❌
```

---

# 🧪 Test 2 — Project Isolation

```text
User A → Project A ✅
User A → Project B ❌
```

---

# 🧪 Test 3 — Workspace Isolation

```text
User A → Workspace A ✅
User A → Workspace B ❌
```

---

# 🧪 Test 4 — Conversation Membership

```text
User A → Conversation A ✅
User B → Conversation A ❌
```

when User B is not a member.

---

# 🧪 Test 5 — Message Access

```text
User A → Message in own conversation ✅
User B → Same message ❌
```

---

# 🧪 Test 6 — Message Modification

Verify that users cannot modify messages they do not have permission to modify.

```text
User A → Edit allowed message ✅
User B → Edit protected message ❌
```

---

# 🧪 Test 7 — Reactions

```text
Authorized member → Reaction ✅
Unauthorized user → Reaction ❌
```

---

# 🧪 Test 8 — Read Receipts

```text
Conversation member → Read receipt ✅
Non-member → Read receipt ❌
```

---

# 🧪 Test 9 — Notifications

```text
User A → Own notifications ✅
User A → User B notifications ❌
```

---

# 🧪 Test 10 — Preferences

```text
User A → Own preferences ✅
User A → User B preferences ❌
```

---

# 🧪 Test 11 — Search

Verify that search results never contain messages from conversations the current user cannot access.

```text
User A
   │
   ▼
Global Search
   │
   ▼
Authorized conversations only
```

---

# 🧪 Test 12 — Socket Conversation Join

Authorized member:

```text
conversation:join
      │
      ▼
Allowed
```

Non-member:

```text
conversation:join
      │
      ▼
Rejected
```

---

# 🧪 Test 13 — Socket Message

Verify that a user cannot send a message to a conversation they are not a member of.

```text
Unauthorized Socket User
        │
        ▼
message:send
        │
        ▼
Rejected
```

---

# 🧪 Test 14 — Role Permission

Verify that users with different roles cannot perform operations outside their permissions.

Example:

```text
Member
   │
   └── Delete conversation ❌

Conversation Admin
   │
   └── Delete conversation → Policy dependent

Owner
   │
   └── Delete conversation ✅
```

---

# 🧪 Test 15 — Removed Membership

Test a user who was previously authorized but has been removed.

```text
User A
  │
  ▼
Conversation member
  │
  ▼
Membership removed
  │
  ▼
Attempt access
  │
  ▼
Rejected
```

---

# 🧪 Test 16 — Concurrent Membership Change

Test authorization behavior when:

```text
Request begins
      │
      ▼
Membership exists
      │
      ▼
Membership removed
      │
      ▼
Protected mutation executes
```

Verify that sensitive operations do not rely on stale membership state.

---

# 🔍 Authorization Test Matrix

| Resource              |     Authorized User | Unauthorized User |
| --------------------- | ------------------: | ----------------: |
| Organization          |                   ✅ |                 ❌ |
| Project               |                   ✅ |                 ❌ |
| Workspace             |                   ✅ |                 ❌ |
| Conversation          |                   ✅ |                 ❌ |
| Members               |                   ✅ |                 ❌ |
| Messages              |                   ✅ |                 ❌ |
| Reactions             |                   ✅ |                 ❌ |
| Read Receipts         |                   ✅ |                 ❌ |
| Attachments           |                   ✅ |                 ❌ |
| Search Results        |     Authorized only |                 ❌ |
| Notifications         |            Own only |                 ❌ |
| Unread Counters       |            Own only |                 ❌ |
| Preferences           |            Own only |                 ❌ |
| Socket Rooms          |  Authorized members |                 ❌ |
| Socket Events         |    Authorized users |                 ❌ |
| Management Operations | Required permission |                 ❌ |

---

# ⚠️ Edge Cases

The module should consider:

* Valid JWT with deleted user
* Valid JWT with removed membership
* Deleted organization
* Deleted project
* Deleted workspace
* Deleted conversation
* Deleted message
* Removed conversation member
* Invalid resource ID
* User changing organization context
* Expired membership
* Unauthorized Socket.IO room join
* Unauthorized Socket.IO message
* Direct API access bypassing frontend
* Concurrent membership changes
* Concurrent permission changes
* Shared resources across multiple users
* Resource existence leakage
* Client-controlled user IDs
* Unauthorized attachment downloads
* Unauthorized search results
* Socket reconnection after membership removal

---

# 🧩 Recommended Folder Structure

A practical implementation can use:

```text
src/
│
├── middleware/
│   ├── auth.middleware.js
│   ├── validate.middleware.js
│   ├── rateLimit.middleware.js
│   └── authorization.middleware.js
│
├── services/
│   └── authorization.service.js
│
├── utils/
│   └── authorization.utils.js
│
└── config/
    └── authorization.config.js
```

If the application does not require a separate configuration file, the structure can remain smaller:

```text
src/
│
├── middleware/
│   ├── auth.middleware.js
│   └── authorization.middleware.js
│
└── services/
    └── authorization.service.js
```

Avoid unnecessary abstraction.

---

# 🧠 Recommended Authorization Flow

The REST API should follow this general security sequence:

```text
Client
   │
   ▼
Request Parsing
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
Resource Lookup
   │
   ▼
Authorization
   │
   ├── Ownership
   ├── Membership
   ├── Hierarchy
   └── Permission
   │
   ▼
Controller / Service
   │
   ▼
Database
```

The exact implementation can move resource authorization into the service layer when the authorization decision requires business/resource context.

---

# 📡 Socket.IO Security Flow

Socket.IO uses a separate real-time authorization flow:

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
Payload Validation
       │
       ▼
Resource Lookup
       │
       ▼
Authorization
       │
       ├── Membership
       ├── Permission
       └── Resource Access
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

For conversation-related events:

```text
Socket
   │
   ▼
Authenticated User
   │
   ▼
Conversation
   │
   ▼
Membership
   │
   ▼
Permission
   │
   ▼
Event Handler
```

---

# 🛡️ Security Boundary

The final authorization boundary should look like:

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

The critical rule is:

> **No protected business operation should execute until the authenticated user has passed the required authorization checks.**

---

# 🔐 Security Checklist

Before marking this module complete:

* ⬜ Organization isolation implemented
* ⬜ Project authorization implemented
* ⬜ Workspace authorization implemented
* ⬜ Conversation membership checked
* ⬜ Message authorization checked
* ⬜ Member management protected
* ⬜ Reactions protected
* ⬜ Read receipts protected
* ⬜ Attachments protected
* ⬜ Search authorization implemented
* ⬜ Notifications protected
* ⬜ Unread counters protected
* ⬜ Preferences protected
* ⬜ Socket.IO authorization implemented
* ⬜ Socket room joins protected
* ⬜ Client-provided user IDs avoided where possible
* ⬜ Ownership rules defined
* ⬜ Membership rules defined
* ⬜ Hierarchical access rules defined
* ⬜ Permission model defined
* ⬜ Authorization decision point defined
* ⬜ 401 and 403 responses handled correctly
* ⬜ Intentional 404 behavior documented where appropriate
* ⬜ Cross-user authorization tests completed
* ⬜ Cross-organization isolation tested
* ⬜ Removed-membership behavior tested
* ⬜ Concurrent membership changes considered
* ⬜ Global search authorization scope defined
* ⬜ Socket authorization tested

---

# 📊 Phase 5 Progress

```text
Phase 5 — Security & Production

├── Input Validation & Sanitization  ✅
├── Rate Limiting                    ✅
├── Authorization Hardening          🟡 Current
├── Centralized Error Handling       ⏳
├── Logging & Monitoring             ⏳
└── Redis / Distributed Infrastructure ⏳
```

The ordering reflects the current Phase 5 security progression.

---

# 🎯 Module Completion Criteria

The Authorization Hardening module will be considered complete when:

```text
Authorization
│
├── Organization isolation       ⬜
├── Project access control       ⬜
├── Workspace access control     ⬜
├── Conversation membership      ⬜
├── Message authorization        ⬜
├── Member permissions           ⬜
├── Reaction authorization       ⬜
├── Read receipt authorization   ⬜
├── Attachment authorization     ⬜
├── Search authorization         ⬜
├── Notification authorization  ⬜
├── Unread counter authorization ⬜
├── Preference authorization     ⬜
├── Socket authorization         ⬜
├── Room authorization           ⬜
├── Ownership rules              ⬜
├── Membership rules             ⬜
├── Hierarchical rules           ⬜
├── Permission model             ⬜
├── 401 / 403 handling           ⬜
├── Resource enumeration policy  ⬜
├── Cross-user testing           ⬜
├── Cross-organization testing   ⬜
└── Concurrent membership tests  ⬜
```

`⬜` represents an implementation item that is not yet completed.

Once implementation and testing are completed, each item can be changed to:

```text
✅
```

---

# 🏁 Summary

The **Authorization Hardening module** ensures that the chat platform is not only authenticated but also properly isolated, permission-aware, and resistant to unauthorized resource access.

The platform's authorization model is based on four complementary concepts:

```text
Ownership
    +
Membership
    +
Hierarchy
    +
Permissions
```

The general decision model is:

```text
Authenticated User
        │
        ▼
Determine Resource
        │
        ▼
Determine Access Model
        │
        ├── Ownership
        ├── Membership
        ├── Hierarchy
        └── Permission
        │
        ▼
Authorization Decision
        │
        ├── Authorized → Continue
        │
        └── Unauthorized → Reject
```

---

# 🧠 Key Architectural Principles

## 1. Authentication Does Not Mean Authorization

```text
JWT Valid
   ≠
Resource Access
```

A valid JWT only establishes identity.

---

## 2. Authorization Must Be Resource-Aware

For resource-based operations:

```text
Resource ID
    ↓
Load Resource
    ↓
Determine Access Context
    ↓
Authorization
```

Knowing an ID is never sufficient authorization.

---

## 3. Parent Access Does Not Automatically Grant Child Permissions

```text
Organization access
      ≠
Project management

Project access
      ≠
Workspace management

Conversation membership
      ≠
Conversation administration
```

Every sensitive operation must require the appropriate permission.

---

## 4. Ownership, Membership, Hierarchy, and Permissions Are Different

```text
User-owned
    → Notifications / Preferences

Membership-based
    → Conversations / Messages

Hierarchical
    → Organization / Project / Workspace

Permission-based
    → Management / Administrative operations
```

The application should select the correct authorization model for each resource.

---

## 5. Prefer Permissions Over Scattered Role Checks

Avoid:

```text
role === "admin"
```

throughout controllers.

Prefer:

```text
Role
 ↓
Permission
 ↓
Action
```

This keeps the system extensible.

---

## 6. Never Trust Client-Controlled Identity

Prefer:

```text
JWT
 ↓
req.user.id
```

over:

```text
req.body.userId
```

for operations concerning the current user.

---

## 7. Search Must Be Authorized Before Data Exposure

Never:

```text
Search everything
      ↓
Filter in frontend
```

Instead:

```text
Determine authorized scope
      ↓
Apply authorization to query
      ↓
Search
      ↓
Return authorized results
```

---

## 8. Socket.IO Requires Independent Authorization

A valid Socket.IO connection does not mean:

```text
Can join any room
Can send to any conversation
Can access any event
```

Every protected event must enforce its own resource and permission checks.

---

## 9. Authorization Decisions Must Respect Current State

Membership and permissions can change.

Therefore:

```text
Previously authorized
      ≠
Permanently authorized
```

Sensitive operations should avoid relying on stale membership or permission state.

---

## 10. Authorization Must Happen on the Backend

Frontend checks improve UX.

Backend authorization provides security.

```text
Frontend
   → UX protection

Backend
   → Security boundary
```

---

# 🚀 Next Module

The next module is:

```text
PHASE 5 — Module 4
Centralized Error Handling
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

This progression establishes the application's security controls incrementally while keeping the implementation:

```text
Centralized
Testable
Maintainable
Scalable
Realistic
Interview-ready
```

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
       Resource Lookup                    ▼
             │                       Resource Lookup
             ▼                             │
       Authorization                      ▼
             │                       Authorization
       ┌─────┼─────┐                 ┌────┼────┐
       │     │     │                 │    │    │
       ▼     

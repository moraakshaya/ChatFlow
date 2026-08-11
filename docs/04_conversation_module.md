# 📁 Conversation Module

## 📋 Module Information

| Property             | Value                                                 |
| -------------------- | ----------------------------------------------------- |
| Module               | Conversation Management                               |
| Version              | v1.1                                                  |
| Status               | 🟡 In Development                                     |
| Phase                | Phase 1                                               |
| Depends On           | Organization, Project, Workspace, User Authentication |
| Next Module          | Conversation Members                                  |
| Database             | MongoDB                                               |
| Conversation Types   | Private, Group, Channel                               |
| Membership           | Separate `conversationMembers` collection             |
| Deletion Strategy    | Soft Delete                                           |
| Pagination           | Supported                                             |
| Token Authentication | JWT Access Token                                      |
| Authorization        | Organization → Project → Workspace → Conversation     |

---

# 📌 Overview

The **Conversation module** is responsible for creating and managing communication spaces within the Chat Platform.

A conversation represents a communication space where users can exchange messages.

The platform supports three primary conversation types:

```text
Private Conversation
Group Conversation
Channel Conversation
```

The Conversation module manages the **conversation itself**.

Membership is intentionally separated into the:

```text
Conversation Members Module
```

and message content will be handled by the:

```text
Messages Module
```

This separation provides a scalable architecture for future real-time communication using technologies such as Socket.IO.

---

# 🎯 Objectives

The Conversation module is responsible for:

* Creating conversations
* Supporting private conversations
* Supporting group conversations
* Supporting channel conversations
* Associating conversations with Workspaces
* Maintaining Organization and Project context
* Managing conversation names
* Managing conversation descriptions
* Managing conversation icons
* Managing conversation status
* Tracking the latest message
* Tracking conversation activity
* Updating conversation information
* Archiving conversations
* Unarchiving conversations
* Soft deleting conversations
* Preventing duplicate active direct conversations
* Enforcing channel-name uniqueness within a Workspace
* Supporting pagination
* Maintaining tenant isolation
* Validating Workspace access
* Automatically establishing creator membership
* Preparing the system for real-time messaging

---

# 🏗️ Conversation Architecture

The conversation belongs to a Workspace.

The complete hierarchy is:

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
      ├───────────────┐
      ▼               ▼
Conversation       Messages
Members
```

Example:

```text
ABC Technologies
│
└── CRM
      │
      └── Sales Workspace
            │
            ├── General
            ├── Sales Team
            ├── Client Discussion
            └── Private Conversations
```

---

# 🧩 Conversation Context

Every conversation belongs to:

```text
Organization
      │
      └── Project
             │
             └── Workspace
                    │
                    └── Conversation
```

The Conversation document stores:

```text
organizationId
projectId
workspaceId
```

Although `organizationId` and `projectId` can be derived through the Workspace relationship, they are intentionally **denormalized**.

This supports:

* Tenant-scoped queries
* Authorization checks
* Query performance
* Efficient filtering
* Avoiding repeated hierarchy lookups

The application must validate that:

```text
Conversation.organizationId
        ↓
matches Workspace.organizationId

Conversation.projectId
        ↓
matches Workspace.projectId
```

before creating or updating a conversation.

Therefore, denormalization improves query efficiency without sacrificing hierarchy integrity.

---

# 💬 Conversation Types

The platform supports three primary conversation types:

```text
private
group
channel
```

---

# 1. Private Conversation

A private conversation represents direct communication between users.

Example:

```text
Akshaya
   │
   │
   ▼
Rahul
```

A private conversation normally contains exactly two active members.

The Conversation document does **not** store:

```text
user1
user2
```

Instead:

```text
Conversation
      │
      ▼
ConversationMembers
      │
      ├── User A
      └── User B
```

This keeps membership logic separate from conversation identity.

---

# 🔐 Preventing Duplicate Private Conversations

The system should prevent multiple active direct conversations between the same two users unless the product explicitly allows them.

For example, the following should normally not exist simultaneously:

```text
Conversation A
Akshaya + Rahul

Conversation B
Akshaya + Rahul
```

Instead, the existing active conversation should be returned.

A normalized direct-conversation key can be generated conceptually as:

```text
directKey =
    smallerUserId + ":" + largerUserId
```

Example:

```text
User A = 100
User B = 200

directKey = 100:200
```

The same pair always generates the same key regardless of who initiates the conversation.

The key should be associated only with private conversations.

A unique constraint should apply to active private conversations.

Because soft deletion is used, the uniqueness rule should ignore deleted conversations.

Conceptually:

```text
type = private
AND
isDeleted = false
```

This allows:

```text
Old private conversation
isDeleted = true
```

to coexist with a newly created active conversation between the same users.

### Important

The final uniqueness implementation depends on the Conversation Members architecture because the system must know the two participating users.

Therefore, the direct-conversation uniqueness mechanism should be finalized together with the **Conversation Members module**.

---

# 2. Group Conversation

A group conversation contains multiple users.

Example:

```text
Sales Team

Akshaya
Rahul
Priya
John
```

Group conversations:

* Must have a name
* Can contain multiple members
* Can have a description
* Can have an icon
* Can be renamed by authorized members
* Can be archived
* Can be soft deleted

---

# 3. Channel Conversation

A channel is a structured communication space usually associated with a team, department, or Workspace.

Example:

```text
Sales Workspace

#general
#announcements
#leads
#customer-support
```

Channels:

* Belong to a Workspace
* Normally have a name
* Should have a unique active name within a Workspace
* Can be used for team-wide communication
* Can later support public/private visibility
* Can later support channel-specific permissions

---

# 📂 Collection Name

```text
conversations
```

---

# 🗄️ Database Schema

## Conversation Schema

| Field            | Type     |    Required | Description                              |
| ---------------- | -------- | ----------: | ---------------------------------------- |
| `_id`            | ObjectId |         Yes | MongoDB generated ID                     |
| `workspaceId`    | ObjectId |         Yes | Reference to Workspace                   |
| `projectId`      | ObjectId |         Yes | Reference to Project                     |
| `organizationId` | ObjectId |         Yes | Reference to Organization                |
| `type`           | String   |         Yes | `private`, `group`, `channel`            |
| `name`           | String   | Conditional | Conversation name                        |
| `description`    | String   |          No | Conversation description                 |
| `icon`           | String   |          No | Conversation icon                        |
| `createdBy`      | ObjectId |         Yes | User who created conversation            |
| `directKey`      | String   | Conditional | Normalized key for private conversations |
| `lastMessageId`  | ObjectId |          No | Reference to latest message              |
| `lastMessageAt`  | Date     |          No | Latest message timestamp                 |
| `status`         | String   |         Yes | `active`, `archived`                     |
| `isDeleted`      | Boolean  |         Yes | Soft deletion flag                       |
| `createdAt`      | Date     |        Auto | Creation timestamp                       |
| `updatedAt`      | Date     |        Auto | Last update timestamp                    |

---

# 📄 Example Conversation Document

```json
{
    "_id": "68xxxxxxxxxxxx",

    "organizationId": "68xxxxxxxxxxxx",

    "projectId": "68xxxxxxxxxxxx",

    "workspaceId": "68xxxxxxxxxxxx",

    "type": "group",

    "name": "Sales Team",

    "description": "Sales team communication",

    "icon": "users",

    "createdBy": "68xxxxxxxxxxxx",

    "directKey": null,

    "lastMessageId": null,

    "lastMessageAt": null,

    "status": "active",

    "isDeleted": false,

    "createdAt": "2026-08-08T10:00:00Z",

    "updatedAt": "2026-08-08T10:00:00Z"
}
```

---

# 🔒 `createdBy` Security Rule

The `createdBy` field must never be trusted from the client.

The API must obtain it from:

```text
req.user.userId
```

For example:

```text
Authenticated User
        │
        ▼
req.user.userId
        │
        ▼
conversation.createdBy
```

A client must not be allowed to send:

```json
{
    "createdBy": "another-user-id"
}
```

The `createdBy` field is:

* Required
* Automatically assigned
* Immutable after creation

Any attempt to modify `createdBy` must be rejected or ignored.

---

# 🔗 Relationships

## Organization

Every conversation belongs to an Organization.

```text
Organization
     │
     │ 1
     │
     │ N
     ▼
Conversations
```

The `organizationId` provides tenant-level isolation.

---

# Project

Every conversation belongs to a Project.

```text
Project
     │
     │ 1
     │
     │ N
     ▼
Conversations
```

This prevents CRM conversations from mixing with HRM or ERP conversations.

---

# Workspace

Every conversation belongs to a Workspace.

```text
Workspace
     │
     │ 1
     │
     │ N
     ▼
Conversations
```

Example:

```text
CRM
 │
 └── Sales Workspace
       │
       ├── General
       ├── Sales Team
       └── Customer Discussion
```

---

# User

The conversation creator is referenced through:

```text
createdBy
```

However, conversation membership is not stored directly in the Conversation document.

Membership is managed through:

```text
conversationMembers
```

This allows:

```text
One User
   ↓
Many Conversations

One Conversation
   ↓
Many Users
```

---

# 👥 Creator Membership

When a user creates a conversation, the creator should automatically become a member.

Recommended flow:

```text
Create Conversation
       │
       ▼
Create Conversation
       │
       ▼
Create Creator Membership
       │
       ▼
Add Additional Members
```

For example:

```text
Akshaya creates "Sales Team"
          │
          ▼
Conversation created
          │
          ▼
Akshaya automatically added
as a conversation member
```

This prevents conversations from being created without a valid initial member.

The exact member-role implementation will be handled by the **Conversation Members module**.

---

# 📊 Relationship Diagram

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
      ├───────────────┐
      ▼               ▼
Conversation       Messages
Members
      │
      ▼
    Users
```

---

# 🌐 REST APIs

# 1. Create Conversation

### Endpoint

```http
POST /api/conversations
```

### Authentication

```text
Required
```

### Request

```json
{
    "projectId": "68xxxxxxxxxxxx",
    "workspaceId": "68xxxxxxxxxxxx",
    "type": "group",
    "name": "Sales Team",
    "description": "Sales team communication",
    "icon": "users"
}
```

`organizationId` should preferably be derived from the authenticated user's tenant context rather than blindly trusted from the request body.

### Processing

```text
Authenticated User
        │
        ▼
Validate Organization
        │
        ▼
Validate Project
        │
        ▼
Validate Workspace
        │
        ▼
Verify Workspace Membership
        │
        ▼
Validate Conversation Type
        │
        ▼
Validate Fields
        │
        ▼
Create Conversation
        │
        ▼
Create Creator Membership
```

### Success Response

```json
{
    "success": true,
    "message": "Conversation created successfully",
    "data": {
        "_id": "68xxxxxxxxxxxx",
        "type": "group",
        "name": "Sales Team",
        "status": "active"
    }
}
```

---

# 2. Get Conversations

### Endpoint

```http
GET /api/conversations
```

This endpoint returns conversations accessible to the authenticated user.

Access is determined through:

```text
ConversationMembers
```

not simply by Workspace membership.

This distinction is important for private conversations.

### Query Parameters

```text
workspaceId
projectId
type
status
page
limit
```

Example:

```http
GET /api/conversations?workspaceId=68xxxxxxxx&page=1&limit=20
```

### Processing

```text
Authenticated User
       │
       ▼
Find Conversation Memberships
       │
       ▼
Get Conversation IDs
       │
       ▼
Query Conversations
       │
       ▼
Filter Deleted Conversations
       │
       ▼
Filter Workspace/Project
       │
       ▼
Order by lastMessageAt
       │
       ▼
Paginate
       │
       ▼
Return Results
```

### Response

```json
{
    "success": true,
    "data": [
        {
            "_id": "68xxxx",
            "type": "channel",
            "name": "General",
            "lastMessageAt": "2026-08-08T12:30:00Z"
        },
        {
            "_id": "68xxxx",
            "type": "group",
            "name": "Sales Team",
            "lastMessageAt": "2026-08-08T12:20:00Z"
        },
        {
            "_id": "68xxxx",
            "type": "private",
            "name": null,
            "lastMessageAt": "2026-08-08T12:10:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 3,
        "totalPages": 1
    }
}
```

---

# 📄 Pagination

Conversation lists must not depend on returning every conversation.

Initial API pagination can use:

```text
page
limit
```

Example:

```http
GET /api/conversations?page=1&limit=20
```

Recommended maximum:

```text
limit = 100
```

The server should enforce a maximum limit even if the client requests a larger value.

For very large deployments, cursor-based pagination can later be introduced.

---

# 3. Get Conversation By ID

### Endpoint

```http
GET /api/conversations/:id
```

### Authentication

```text
Required
```

The API must verify that the authenticated user has access to the conversation through:

```text
conversationMembers
```

### Response

```json
{
    "success": true,
    "data": {
        "_id": "68xxxxxxxx",
        "organizationId": "68xxxxxxxx",
        "projectId": "68xxxxxxxx",
        "workspaceId": "68xxxxxxxx",
        "type": "group",
        "name": "Sales Team",
        "description": "Sales team communication",
        "status": "active"
    }
}
```

---

# 4. Get Conversations By Workspace

### Endpoint

```http
GET /api/conversations/workspace/:workspaceId
```

This is a convenience endpoint for Workspace-scoped conversation retrieval.

The authenticated user must:

```text
Belong to the Workspace
AND
Have access to returned conversations
```

Private conversations that the user is not a member of must not be returned.

### Response

```json
{
    "success": true,
    "data": [
        {
            "_id": "68xxxx",
            "name": "General",
            "type": "channel"
        },
        {
            "_id": "68xxxx",
            "name": "Sales Team",
            "type": "group"
        }
    ]
}
```

Pagination should also be supported:

```http
GET /api/conversations/workspace/:workspaceId?page=1&limit=20
```

---

# 5. Update Conversation

### Endpoint

```http
PATCH /api/conversations/:id
```

### Request

```json
{
    "name": "Sales Team",
    "description": "Updated sales communication",
    "icon": "users"
}
```

### Allowed Fields

```text
name
description
icon
```

The client cannot modify:

```text
organizationId
projectId
workspaceId
createdBy
isDeleted
```

through the normal update endpoint.

### Response

```json
{
    "success": true,
    "message": "Conversation updated successfully",
    "data": {}
}
```

---

# 6. Archive Conversation

### Endpoint

```http
PATCH /api/conversations/:id/archive
```

### Response

```json
{
    "success": true,
    "message": "Conversation archived successfully"
}
```

The conversation becomes:

```json
{
    "status": "archived"
}
```

---

# 7. Unarchive Conversation

### Endpoint

```http
PATCH /api/conversations/:id/unarchive
```

### Response

```json
{
    "success": true,
    "message": "Conversation unarchived successfully"
}
```

The conversation returns to:

```text
status = active
```

Authorization should determine who can unarchive the conversation.

---

# 8. Delete Conversation

### Endpoint

```http
DELETE /api/conversations/:id
```

The conversation is soft deleted.

```json
{
    "isDeleted": true
}
```

The document remains in MongoDB.

---

# 📌 Conversation Business Rules

# Conversation Type

Allowed values:

```text
private
group
channel
```

No other value should be accepted.

---

# Private Conversation Rules

A private conversation:

* Represents direct communication
* Normally has exactly two active members
* Does not require a conversation name
* Uses `directKey` to identify the user pair
* Should not have duplicate active conversations between the same users
* Must be accessible only to its members
* Should automatically add the creator as a member

---

# Group Conversation Rules

A group conversation:

* Must have a name
* Can contain multiple users
* Can have a description
* Can have an icon
* Can be renamed by authorized users
* Can be archived
* Can be soft deleted

---

# Channel Conversation Rules

A channel:

* Belongs to a Workspace
* Must have a name
* Has a unique active name within the Workspace
* Can later support visibility settings
* Can later support channel permissions
* Can be archived

---

# 🔐 Channel Name Uniqueness

Channel names should be unique among active channels within the same Workspace.

Example:

```text
Sales Workspace

#general
```

Only one active:

```text
#general
```

should exist in that Workspace.

However, because soft deletion is used:

```text
#general
isDeleted = true
```

should not prevent creation of:

```text
#general
isDeleted = false
```

Therefore, a **partial unique index** should be used.

Conceptually:

```text
{
    workspaceId: 1,
    type: 1,
    name: 1
}
```

with:

```text
unique: true
```

and uniqueness applied only where:

```text
type = channel
AND
isDeleted = false
```

The implementation may normalize channel names before indexing, for example:

```text
General
general
GENERAL
```

should normally be treated as the same channel name if the product requires case-insensitive uniqueness.

---

# 🔐 Authorization Rules

A user must not be allowed to create or modify arbitrary conversations.

Before creating a conversation:

```text
Authenticated User
        │
        ▼
Check Organization
        │
        ▼
Check Project
        │
        ▼
Check Workspace
        │
        ▼
Check Workspace Membership
        │
        ▼
Check Permission
        │
        ▼
Create Conversation
```

Example:

```text
User belongs to:

ABC Technologies
      │
      └── CRM
            │
            └── Sales
```

That user should not automatically be able to create a conversation inside:

```text
ABC Technologies
      │
      └── HRM
            │
            └── Payroll
```

unless they have explicit access.

---

# 🔒 Tenant Isolation

Every conversation operation must respect:

```text
organizationId
projectId
workspaceId
```

Never rely only on:

```text
conversationId
```

for authorization.

A secure operation conceptually verifies:

```text
conversationId
+
organizationId
+
projectId
+
workspace membership
+
conversation membership
```

depending on the operation.

This prevents users from accessing conversations belonging to another:

```text
Organization
Project
Workspace
Conversation
```

---

# 🧩 Authorization Levels

Different operations can require different access levels.

Example:

```text
View Conversation
       ↓
Conversation Membership

Send Message
       ↓
Conversation Membership
+
Active Conversation

Rename Conversation
       ↓
Conversation Role/Permission

Archive Conversation
       ↓
Conversation Role/Permission

Delete Conversation
       ↓
Conversation Role/Permission
```

The exact role definitions will be finalized in the Conversation Members and Authorization modules.

---

# 📌 Validation Rules

# Organization

The Organization must:

* Exist
* Be active
* Not be deleted

---

# Project

The Project must:

* Exist
* Belong to the Organization
* Be active
* Not be deleted

---

# Workspace

The Workspace must:

* Exist
* Belong to the Project
* Belong to the Organization
* Be active
* Not be deleted

---

# Conversation Name

For:

```text
group
channel
```

the name is:

```text
Required
Minimum: 2 characters
Maximum: 100 characters
Trimmed
```

For:

```text
private
```

the name is optional.

The frontend may generate the display name dynamically from members.

---

# Description

Optional.

Recommended:

```text
Maximum: 500 characters
```

---

# Icon

Optional.

The API should validate the accepted icon format according to the frontend/application design.

---

# ObjectId Validation

All incoming MongoDB identifiers must be validated before database queries.

Examples:

```text
projectId
workspaceId
conversationId
```

Invalid ObjectIds should return:

```text
400 Bad Request
```

rather than causing an unhandled MongoDB error.

---

# 🧹 Soft Delete

Conversations should not normally be permanently deleted.

Instead:

```json
{
    "isDeleted": true
}
```

Normal queries must use:

```text
isDeleted = false
```

Soft deletion preserves:

```text
Conversation history
Message relationships
Member relationships
Audit history
```

Deleted conversations should:

* Not appear in normal conversation lists
* Not accept new messages
* Not be returned through normal conversation lookup
* Not be available for normal membership operations

---

# 📈 Conversation Lifecycle

```text
Create
  │
  ▼
Active
  │
  ├───────────────┐
  │               │
  ▼               ▼
Updated         Archived
                  │
                  ├── Unarchive
                  │       │
                  │       ▼
                  │     Active
                  │
                  ▼
                Deleted
```

---

# 📦 Archive Rules

An archived conversation remains available for historical access.

| Operation                | Archived |
| ------------------------ | -------- |
| View conversation        | ✅        |
| Read existing messages   | ✅        |
| View members             | ✅        |
| Search existing messages | ✅        |
| Send new messages        | ❌        |
| Normal message creation  | ❌        |
| Add members              | ❌*       |
| Remove members           | ❌*       |
| Rename                   | ❌*       |
| Unarchive                | ✅        |
| Delete                   | ✅*       |

`*` Authorization rules can allow administrative actions where required.

The key rule is:

```text
Archived Conversation
        ↓
Read-only communication history
```

No normal new messages should be accepted until the conversation is active again.

---

# 🔄 Last Message Handling

The Conversation document contains:

```text
lastMessageId
lastMessageAt
```

Example:

```json
{
    "lastMessageId": "68xxxxxxxx",
    "lastMessageAt": "2026-08-08T12:30:00Z"
}
```

This allows the conversation list to display:

```text
Sales Team
Last message: Meeting at 4 PM
2 minutes ago
```

without loading the entire message history.

The actual message remains inside:

```text
messages
```

---

# ⚡ Last Message Concurrency

When multiple messages arrive at approximately the same time, the system must prevent an older message from overwriting a newer message reference.

Conceptually:

```text
Message A
timestamp: 12:30:00

Message B
timestamp: 12:30:02
```

The final Conversation state must be:

```text
lastMessage = Message B
```

not:

```text
lastMessage = Message A
```

The Messages module should therefore update:

```text
lastMessageId
lastMessageAt
```

using an atomic/ordered update strategy.

This becomes especially important when real-time messaging through Socket.IO is introduced.

---

# 📊 Indexing Strategy

The Conversation collection will frequently be queried using Workspace, Project, Organization, deletion state, status, and message activity.

---

## Workspace Index

Conceptually:

```text
{
    workspaceId: 1,
    isDeleted: 1
}
```

Useful for:

```text
Workspace → Conversations
```

---

## Project Index

```text
{
    projectId: 1,
    isDeleted: 1
}
```

Useful for Project-level filtering.

---

## Organization Index

```text
{
    organizationId: 1,
    isDeleted: 1
}
```

Useful for tenant-scoped queries.

---

## Conversation List Index

Because conversation lists are commonly ordered by recent activity, an additional index can support:

```text
workspaceId
status
isDeleted
lastMessageAt
```

Conceptually:

```text
{
    workspaceId: 1,
    status: 1,
    isDeleted: 1,
    lastMessageAt: -1
}
```

The exact final index set should be based on real query patterns and MongoDB query performance.

---

# 🔐 Channel Unique Index

For active channel names:

```text
{
    workspaceId: 1,
    type: 1,
    name: 1
}
```

should use partial uniqueness where:

```text
type = "channel"
AND
isDeleted = false
```

This prevents duplicate active channel names while allowing a deleted channel to be recreated.

---

# 🔑 Private Conversation Index

For private conversations, the normalized:

```text
directKey
```

can be used with:

```text
type
isDeleted
```

to prevent duplicate active direct conversations.

Conceptually:

```text
{
    type: 1,
    directKey: 1
}
```

with active/private uniqueness enforced through a partial unique index.

The exact index implementation should be finalized after the Conversation Members schema is established.

---

# 🔄 Conversation List Access Pattern

The primary user-facing conversation-list query will generally follow:

```text
ConversationMembers
       │
       ▼
conversationIds
       │
       ▼
Conversations
       │
       ▼
Filter:
workspaceId
status
isDeleted
       │
       ▼
Order by:
lastMessageAt DESC
       │
       ▼
Pagination
```

This is why both the Conversation and Conversation Members indexes must be designed around actual access patterns.

---

# 📁 Recommended Folder Structure

```text
src/
│
├── models/
│   └── Conversation.js
│
├── controllers/
│   └── conversation.controller.js
│
├── services/
│   └── conversation.service.js
│
├── routes/
│   └── conversation.routes.js
│
├── validators/
│   └── conversation.validator.js
│
└── middleware/
    ├── auth.middleware.js
    └── authorization.middleware.js
```

---

# 🧠 Service Layer Responsibilities

The controller should not contain all business logic.

Recommended flow:

```text
Route
  │
  ▼
Authentication Middleware
  │
  ▼
Authorization Middleware
  │
  ▼
Controller
  │
  ▼
Conversation Service
  │
  ├── Validate Organization
  ├── Validate Project
  ├── Validate Workspace
  ├── Validate User Access
  ├── Validate Conversation Type
  ├── Prevent Duplicate Private Conversation
  ├── Validate Channel Name
  ├── Create Conversation
  └── Create Creator Membership
          │
          ▼
       MongoDB
```

---

# 🧩 Transaction Consideration

Conversation creation and creator membership creation are logically related operations.

The desired result is:

```text
Conversation Created
        +
Creator Membership Created
```

not:

```text
Conversation Created
        +
Creator Membership Failed
```

For production deployments where MongoDB transactions are available, the creation process can use a transaction:

```text
Start Transaction
       │
       ▼
Create Conversation
       │
       ▼
Create Creator Membership
       │
       ▼
Commit
```

If any operation fails:

```text
Rollback
```

This keeps the conversation and its initial membership consistent.

---

# 🚫 What This Module Does NOT Handle

The Conversation module should **not** handle:

* Adding members directly
* Removing members directly
* Member roles
* Member permissions
* Sending messages
* Editing messages
* Deleting messages
* Typing indicators
* Online status
* Read receipts
* File uploads
* Notifications
* Message reactions
* Message search implementation

These belong to dedicated modules.

---

# 🧩 Module Responsibilities

## Conversation

```text
Create
Read
Update
Archive
Unarchive
Delete
```

## Conversation Members

```text
Add Member
Remove Member
Member Role
Member Permissions
Membership Status
Direct Conversation Identity
```

## Messages

```text
Send
Retrieve
Edit
Delete
Reply
React
```

This separation keeps each module focused and maintainable.

---

# 🧪 Postman Testing Plan

The Conversation module should be tested in the following order.

---

## 1. Login

```http
POST /api/auth/login
```

Save:

```text
accessToken
```

---

## 2. Create Group Conversation

```http
POST /api/conversations
```

Header:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

Verify:

* Conversation created
* `createdBy` comes from authenticated user
* Organization validated
* Project validated
* Workspace validated
* Creator membership created

---

## 3. Create Channel

```http
POST /api/conversations
```

Verify:

* Channel created
* Name validated
* Workspace validated

---

## 4. Duplicate Channel Test

Create:

```text
#general
```

twice inside the same Workspace.

Expected:

```text
First → Success
Second → Rejected
```

---

## 5. Deleted Channel Recreation

Delete:

```text
#general
```

Then recreate:

```text
#general
```

Expected:

```text
New active channel → Success
```

because the previous channel is soft deleted.

---

## 6. Create Private Conversation

Create:

```text
User A + User B
```

Verify:

```text
Conversation created
Creator membership created
```

---

## 7. Duplicate Private Conversation Test

Attempt:

```text
User A + User B
```

again.

Expected:

```text
Existing active private conversation returned
```

or an appropriate duplicate error, depending on API design.

---

## 8. Get Conversations

```http
GET /api/conversations?page=1&limit=20
```

Verify:

* Only accessible conversations returned
* Deleted conversations excluded
* Unauthorized private conversations excluded
* Pagination works
* Results ordered by recent activity

---

## 9. Get Workspace Conversations

```http
GET /api/conversations/workspace/:workspaceId?page=1&limit=20
```

Verify:

* Workspace access checked
* Only authorized conversations returned
* Private conversations restricted by membership

---

## 10. Get Conversation

```http
GET /api/conversations/:id
```

Verify:

* Valid member can access
* Non-member cannot access private conversation
* Deleted conversation is unavailable

---

## 11. Update Conversation

```http
PATCH /api/conversations/:id
```

Verify:

* Name can be updated
* Description can be updated
* Icon can be updated
* `createdBy` cannot be modified
* Organization cannot be changed
* Project cannot be changed
* Workspace cannot be changed

---

## 12. Archive Conversation

```http
PATCH /api/conversations/:id/archive
```

Verify:

```text
status = archived
```

---

## 13. Archived Conversation Message Test

Attempt to send a message to the archived conversation.

Expected:

```text
Request rejected
```

---

## 14. Unarchive Conversation

```http
PATCH /api/conversations/:id/unarchive
```

Verify:

```text
status = active
```

---

## 15. Delete Conversation

```http
DELETE /api/conversations/:id
```

Verify:

```text
isDeleted = true
```

---

## 16. Verify Soft Delete

Confirm the deleted conversation:

```text
Does not appear in normal lists
Cannot receive messages
Cannot be accessed normally
```

---

## 17. Unauthorized Workspace Test

Use a valid user token and attempt to create/access a conversation in a Workspace where the user has no membership.

Expected:

```text
403 Forbidden
```

or the application's chosen authorization response.

---

# 🔐 Security Checklist

Before marking this module complete:

### Authentication

* Authentication middleware is applied
* JWT is validated
* Authenticated user identity is used
* Client-provided `createdBy` is not trusted

### Tenant Security

* Organization access is verified
* Project ownership/context is verified
* Workspace ownership/context is verified
* Cross-organization access is prevented
* Cross-project access is prevented
* Unauthorized Workspace access is prevented

### Conversation Security

* Conversation membership is checked
* Private conversations are restricted
* Deleted conversations are excluded
* Archived conversations cannot receive normal messages
* `createdBy` is immutable
* Organization cannot be changed through normal updates
* Project cannot be changed through normal updates
* Workspace cannot be changed through normal updates

### Validation

* Conversation type is validated
* Names are validated
* Descriptions are validated
* ObjectIds are validated
* Invalid request bodies are rejected
* Duplicate channel names are prevented
* Duplicate private conversations are prevented

### Database

* Soft deletion is supported
* Appropriate indexes exist
* Partial unique indexes account for soft deletion
* Conversation/member consistency is maintained
* Last-message updates handle concurrent messages correctly

---

# 🚀 Future Enhancements

The Conversation module can later support:

* Conversation avatars
* Conversation themes
* Pinned conversations
* Muted conversations
* Favorite conversations
* Conversation search
* Conversation settings
* Public/private channels
* Slow mode
* Message retention policies
* Conversation permissions
* Announcement channels
* Read-only channels
* Bot conversations
* AI conversations
* Scheduled messages
* Conversation templates

---

# 📈 Complete Phase 1 Architecture

After the Conversation module:

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
User Authentication
      │
      ▼
Conversation
```

The next layer:

```text
Conversation
      │
      ▼
Conversation Members
      │
      ▼
Users
```

Then:

```text
Conversation Members
      │
      ▼
Messages
```

Eventually:

```text
Messages
      │
      ├── Attachments
      ├── Reactions
      ├── Replies
      └── Read Receipts
```

and:

```text
Real-Time Layer
      │
      ├── Socket.IO
      ├── Presence
      ├── Typing Indicators
      └── Notifications
```

---

# 🏗️ Complete Chat Architecture

```text
Organization
      │
      ▼
Project
      │
      ▼
Workspace
      │
      ├────────────────────────┐
      │                        │
      ▼                        ▼
Users                    Conversations
                              │
                              ▼
                     Conversation Members
                              │
                              ▼
                           Messages
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Attachments      Reactions       Replies
                              │
                              ▼
                        Notifications
                              │
                              ▼
                       Real-Time Layer
                              │
                              ▼
                          Socket.IO
```

---

# 🔄 Complete Conversation Creation Flow

```text
User
 │
 ▼
POST /api/conversations
 │
 ▼
Authentication
 │
 ▼
Authorization
 │
 ▼
Validate Organization
 │
 ▼
Validate Project
 │
 ▼
Validate Workspace
 │
 ▼
Validate Workspace Membership
 │
 ▼
Validate Conversation Type
 │
 ├───────────────┬───────────────┐
 ▼               ▼               ▼
Private         Group          Channel
 │               │               │
 ▼               ▼               ▼
Generate        Validate       Validate
directKey       Name           Name
 │               │               │
 ▼               ▼               ▼
Check duplicate ────────────────┘
 │
 ▼
Create Conversation
 │
 ▼
Create Creator Membership
 │
 ▼
Commit
 │
 ▼
Return Conversation
```

---

# 🔄 Complete Private Conversation Flow

```text
User A
  │
  ▼
Select User B
  │
  ▼
Generate Normalized directKey
  │
  ▼
Search Active Private Conversation
  │
  ├── Found
  │     │
  │     ▼
  │   Return Existing Conversation
  │
  └── Not Found
        │
        ▼
   Create Conversation
        │
        ▼
   Add User A
        │
        ▼
   Add User B
        │
        ▼
   Return Conversation
```

---

# 🔄 Complete Conversation List Flow

```text
Authenticated User
       │
       ▼
Conversation Members
       │
       ▼
Conversation IDs
       │
       ▼
Conversations
       │
       ▼
Organization Filter
       │
       ▼
Project Filter
       │
       ▼
Workspace Filter
       │
       ▼
isDeleted = false
       │
       ▼
status Filter
       │
       ▼
Order by lastMessageAt DESC
       │
       ▼
Pagination
       │
       ▼
Conversation List
```

---

# 🔄 Complete Message Integration Flow

When the Messages module is implemented:

```text
User
 │
 ▼
Conversation
 │
 ▼
Verify Membership
 │
 ▼
Verify Conversation Status
 │
 ├── Archived → Reject
 │
 └── Active
       │
       ▼
   Create Message
       │
       ▼
   Update lastMessageId
       │
       ▼
   Update lastMessageAt
       │
       ▼
   Emit Real-Time Event
       │
       ▼
   Socket.IO
       │
       ▼
   Conversation Members
```

---

# 📌 Summary

The **Conversation module** is the structural core of the Chat Platform.

It defines **where communication takes place** while keeping membership and messaging responsibilities separate.

The architecture is:

```text
Organization
      ↓
Project
      ↓
Workspace
      ↓
Conversation
      ↓
Conversation Members
      ↓
Messages
```

The Conversation module supports:

* Private conversations
* Group conversations
* Channel conversations
* Conversation creation
* Conversation retrieval
* Conversation updates
* Conversation archiving
* Conversation unarchiving
* Soft deletion
* Tenant isolation
* Workspace-based organization
* Membership-based access
* Pagination
* Last-message tracking
* Duplicate private-conversation prevention
* Channel-name uniqueness
* Creator membership
* Production-oriented indexing
* Concurrent last-message handling

The architecture intentionally separates:

```text
Conversation
      │
      ├── Identity and metadata
      │
      ├── Conversation Members
      │
      └── Messages
```

This prevents the Conversation model from becoming tightly coupled to users or messages.

It also creates a strong foundation for:

```text
Conversation Members
        ↓
Messages
        ↓
Attachments
        ↓
Reactions
        ↓
Read Receipts
        ↓
Notifications
        ↓
Socket.IO
        ↓
Real-Time Chat
```

---

# 🧭 Module Dependency

```text
Organization
      ↓
Project
      ↓
Workspace
      ↓
User Authentication
      ↓
Conversation
      ↓
Conversation Members
      ↓
Messages
      ↓
Attachments
      ↓
Notifications
      ↓
Real-Time Communication
```

---

# 📌 Design Decisions

## Why store `organizationId`, `projectId`, and `workspaceId`?

Although the hierarchy allows Organization and Project to be derived from Workspace, storing the IDs provides:

* Efficient tenant filtering
* Faster authorization checks
* Efficient queries
* Clear ownership context

The values must remain consistent with the Workspace hierarchy.

---

## Why separate Conversation from Conversation Members?

Because:

```text
One User → Many Conversations

One Conversation → Many Users
```

A many-to-many relationship belongs in a separate membership collection.

---

## Why not store users directly inside Conversation?

Avoid:

```json
{
    "members": [
        "user1",
        "user2",
        "user3"
    ]
}
```

as the primary membership architecture because membership needs its own:

```text
role
status
joinedAt
permissions
mutedAt
lastReadAt
```

and other metadata.

That belongs in:

```text
conversationMembers
```

---

## Why use `directKey`?

It provides a consistent identity for a private conversation between two users.

```text
User A + User B
      ↓
100:200
```

regardless of who initiates the conversation.

---

## Why automatically add the creator?

A conversation should have an initial member.

Therefore:

```text
Creator
   ↓
Conversation
   ↓
Creator Membership
```

prevents orphaned conversations.

---

## Why use soft deletion?

Conversations are referenced by:

```text
Messages
Members
Attachments
Audit Logs
```

Permanent deletion can break historical relationships.

Therefore:

```text
isDeleted = true
```

preserves historical integrity.

---

## Why use `lastMessageId` and `lastMessageAt`?

Conversation lists should not load every message just to display the latest activity.

Instead:

```text
Conversation
   │
   ├── lastMessageId
   └── lastMessageAt
```

allows efficient list rendering.

---

## Why use pagination?

A Workspace may eventually contain:

```text
10 conversations
100 conversations
1,000+ conversations
```

Returning every conversation in a single response does not scale.

Pagination keeps the API efficient.

---

## Why use membership-driven conversation retrieval?

Workspace membership alone does not guarantee access to every conversation.

For example:

```text
Workspace
   │
   ├── #general
   ├── #sales
   ├── Private A+B
   └── Private C+D
```

A user should only see the conversations they are authorized to access.

Therefore:

```text
ConversationMembers
        ↓
Authorized Conversation IDs
        ↓
Conversation List
```

---

# 📌 API Summary

| Method   | Endpoint                                    | Purpose                      | Authentication        |
| -------- | ------------------------------------------- | ---------------------------- | --------------------- |
| `POST`   | `/api/conversations`                        | Create conversation          | Required              |
| `GET`    | `/api/conversations`                        | Get accessible conversations | Required              |
| `GET`    | `/api/conversations/:id`                    | Get conversation             | Required              |
| `GET`    | `/api/conversations/workspace/:workspaceId` | Get Workspace conversations  | Required              |
| `PATCH`  | `/api/conversations/:id`                    | Update conversation          | Required + Authorized |
| `PATCH`  | `/api/conversations/:id/archive`            | Archive conversation         | Required + Authorized |
| `PATCH`  | `/api/conversations/:id/unarchive`          | Unarchive conversation       | Required + Authorized |
| `DELETE` | `/api/conversations/:id`                    | Soft delete conversation     | Required + Authorized |

---

# 🏆 Final Module Position

The Conversation module establishes the **communication-space layer** of the Chat Platform.

Its responsibility is intentionally limited to:

```text
Where does communication happen?
```

while the next modules answer:

```text
Who can participate?
        ↓
Conversation Members

What was said?
        ↓
Messages

What files were shared?
        ↓
Attachments

Who has read it?
        ↓
Read Receipts

How does it update in real time?
        ↓
Socket.IO
```

This separation provides a clean, scalable, multi-tenant architecture suitable for integrating the Chat Platform with:

```text
CRM
HRM
ERP
LMS
Inventory
Support Systems
Future Applications
```

**Module:** Conversation Management
**Version:** v1.1
**Status:** 🟡 In Development
**Phase:** Phase 1
**Database:** MongoDB
**Conversation Types:** Private, Group, Channel
**Membership:** Separate `conversationMembers` collection
**Deletion:** Soft Delete
**Pagination:** Supported
**Tenant Isolation:** Yes

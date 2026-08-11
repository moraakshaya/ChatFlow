# 📁 Message Reactions Module

## 📋 Module Information

| Property    | Value                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Module      | Message Reactions                                                                                   |
| Version     | v1.0                                                                                                |
| Status      | 🟡 In Development                                                                                   |
| Phase       | Phase 2 — Messaging Features                                                                        |
| Depends On  | Organization, Project, Workspace, User Authentication, Conversation, Conversation Members, Messages |
| Next Module | Read Receipts                                                                                       |
| Database    | MongoDB                                                                                             |

---

# 📌 Overview

The **Message Reactions module** allows users to react to messages using predefined reactions such as:

```text
👍
❤️
😂
😮
😢
🎉
```

Instead of storing reaction information directly inside the Message document, reactions are stored in a dedicated collection.

This allows the system to support:

* Multiple reactions per message
* Multiple users reacting to the same message
* One reaction per user per message
* Removing reactions
* Changing reactions
* Reaction counts
* User-specific reaction state
* Duplicate reaction prevention
* Future custom reactions
* Future real-time reaction updates

The module is designed as an independent messaging feature so that reaction logic does not need to be embedded inside the Messages module.

---

# 🎯 Objectives

The Message Reactions module is responsible for:

* Adding a reaction to a message
* Removing a reaction
* Changing a user's reaction
* Getting reactions for a message
* Counting reactions
* Checking whether the current user reacted
* Preventing duplicate reactions
* Validating reaction values
* Validating message state
* Validating conversation membership
* Maintaining organization isolation
* Supporting future custom reaction types
* Preparing reactions for future real-time delivery

---

# 🏗️ Architecture

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
Conversation Members
      │
      ▼
Messages
      │
      ▼
Message Reactions
```

The relationship is:

```text
Message
   │
   │ 1
   │
   │ N
   ▼
MessageReaction
   │
   ▼
User
```

---

# 🔗 Why a Separate Collection?

A common approach is to store reactions directly inside the Message document:

```json
{
    "content": "Hello",
    "reactions": {
        "👍": 5,
        "❤️": 3
    }
}
```

This approach does not tell us **which users reacted**.

For example:

```text
👍 → 5
```

We don't know:

```text
Who reacted?
Did Akshaya react?
Can Akshaya remove her reaction?
Can Akshaya change 👍 to ❤️?
```

Therefore, reactions should be represented individually:

```text
MessageReaction
│
├── messageId
├── userId
├── reaction
└── createdAt
```

This provides better flexibility and allows the system to enforce:

```text
One User
    +
One Message
    =
One Reaction
```

---

# 📂 Collection Name

```text
messageReactions
```

---

# 🗄️ Database Schema

| Field          | Type     | Required | Description               |
| -------------- | -------- | -------- | ------------------------- |
| organizationId | ObjectId | ✅        | Organization reference    |
| projectId      | ObjectId | ✅        | Project reference         |
| workspaceId    | ObjectId | ✅        | Workspace reference       |
| conversationId | ObjectId | ✅        | Conversation reference    |
| messageId      | ObjectId | ✅        | Message reference         |
| userId         | ObjectId | ✅        | User who reacted          |
| reaction       | String   | ✅        | Reaction identifier/value |
| createdAt      | Date     | Auto     | Reaction creation time    |
| updatedAt      | Date     | Auto     | Last update time          |

---

# 📄 Example Document

```json
{
    "_id": "68xxxxxxxxxxxx",

    "organizationId": "68xxxxxxxxxxxx",

    "projectId": "68xxxxxxxxxxxx",

    "workspaceId": "68xxxxxxxxxxxx",

    "conversationId": "68xxxxxxxxxxxx",

    "messageId": "68xxxxxxxxxxxx",

    "userId": "68xxxxxxxxxxxx",

    "reaction": "👍",

    "createdAt": "2026-08-08T15:30:00Z",

    "updatedAt": "2026-08-08T15:30:00Z"
}
```

---

# 🔗 Relationships

## Message → Message Reactions

One message can have many reactions.

```text
Message
   │
   │ 1
   │
   │ N
   ▼
MessageReaction
```

Example:

```text
Message
"Great work!"

        │
        ├── 👍 Akshaya
        ├── ❤️ Rahul
        ├── 👍 Priya
        └── 🎉 John
```

---

## 👤 User → Message Reactions

One user can react to many messages.

```text
User
 │
 │ 1
 │
 │ N
 ▼
MessageReaction
```

Example:

```text
Akshaya
   │
   ├── 👍 Message 1
   ├── ❤️ Message 4
   └── 😂 Message 8
```

---

# 📊 Complete Relationship

```text
User
  │
  │
  ▼
MessageReaction
  │
  │
  ▼
Message
  │
  ▼
Conversation
```

With the complete hierarchy:

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
      │
      ▼
MessageReaction
      │
      ▼
User
```

---

# 😊 Supported Reactions

For Phase 2, start with a controlled list:

```text
👍
❤️
😂
😮
😢
🎉
```

Recommended initial enum:

```javascript
[
    "👍",
    "❤️",
    "😂",
    "😮",
    "😢",
    "🎉"
]
```

The list should be centrally configured so that all APIs use the same validation rules.

---

# 📌 Reaction Design Decision

A user should initially be allowed to have **one reaction per message**.

Example:

```text
Akshaya → Message 1 → 👍
```

If Akshaya selects:

```text
❤️
```

the system should change:

```text
👍
```

to:

```text
❤️
```

instead of creating two reaction documents.

Therefore:

```text
Akshaya + Message 1
        │
        ▼
     One Reaction
```

This keeps reaction behavior simple and predictable.

---

# 🔐 Unique Constraint

The most important database constraint is:

```javascript
messageReactionSchema.index(
    {
        messageId: 1,
        userId: 1
    },
    {
        unique: true
    }
);
```

This guarantees:

```text
One user
    +
One message
    =
One reaction
```

Example:

```text
Akshaya + Message A → 👍
```

cannot create another reaction document:

```text
Akshaya + Message A → ❤️
```

Instead, the existing reaction must be updated:

```text
👍 → ❤️
```

The unique index is the final database-level protection against duplicate records.

---

# 🔄 Reaction Upsert Behavior

The primary reaction endpoint behaves as an **upsert**.

```text
Request
   │
   ▼
Find Message + User Reaction
   │
   ├── No existing reaction
   │        │
   │        ▼
   │      Create
   │
   └── Existing reaction
            │
            ▼
          Update
```

Examples:

### First reaction

```text
No reaction
    ↓
POST 👍
    ↓
Create 👍
```

### Same reaction again

```text
👍 exists
    ↓
POST 👍
    ↓
No additional document
    ↓
Reaction remains 👍
```

### Different reaction

```text
👍 exists
    ↓
POST ❤️
    ↓
Update existing document
    ↓
❤️
```

---

# ⚡ Concurrency Rules

Multiple requests may arrive at almost the same time.

Example:

```text
Current reaction:

👍
```

Two requests arrive:

```text
Request A → ❤️
Request B → 😂
```

The reaction service must perform the update atomically.

The rule is:

> Reaction updates are processed atomically. If multiple requests for the same `(messageId, userId)` arrive concurrently, the final successfully committed update becomes the user's current reaction.

Therefore:

```text
Request A → ❤️
Request B → 😂
```

may result in:

```text
Final reaction → 😂
```

if Request B is the last successfully committed update.

The system must never create:

```text
👍
❤️
😂
```

for the same:

```text
messageId + userId
```

pair.

The database unique index remains the final protection against duplicate reaction documents.

---

# 🌐 REST APIs

## 1. Add / Update Reaction

### Endpoint

```text
POST /api/message-reactions
```

### Request

```json
{
    "messageId": "68xxxxxxxxxxxx",
    "reaction": "👍"
}
```

The backend should determine:

```text
userId
organizationId
projectId
workspaceId
conversationId
```

from the authenticated user and verified message hierarchy.

---

# 🔄 Add / Update Reaction Flow

```text
Client
   │
   ▼
POST /message-reactions
   │
   ▼
Authenticate User
   │
   ▼
Validate messageId
   │
   ▼
Find Message
   │
   ▼
Validate Message State
   │
   ▼
Find Conversation
   │
   ▼
Check Membership
   │
   ▼
Validate Reaction
   │
   ▼
Find Existing User Reaction
   │
   ├── Exists → Update
   │
   └── Doesn't Exist → Create
   │
   ▼
Return Reaction
```

---

# 📄 Success Response — Created

```json
{
    "success": true,
    "message": "Reaction added successfully",
    "data": {
        "_id": "68xxxxxxxx",
        "messageId": "68xxxxxxxx",
        "userId": "68xxxxxxxx",
        "reaction": "👍"
    }
}
```

HTTP status:

```text
201 Created
```

---

# 📄 Success Response — Updated

```json
{
    "success": true,
    "message": "Reaction updated successfully",
    "data": {
        "_id": "68xxxxxxxx",
        "messageId": "68xxxxxxxx",
        "userId": "68xxxxxxxx",
        "reaction": "❤️"
    }
}
```

HTTP status:

```text
200 OK
```

---

# 📄 Same Reaction Submitted Again

If the user already has:

```text
👍
```

and sends:

```text
👍
```

again, the API must not create a duplicate reaction.

The service can simply return the existing reaction as successful.

Example:

```json
{
    "success": true,
    "message": "Reaction already applied",
    "data": {
        "_id": "68xxxxxxxx",
        "messageId": "68xxxxxxxx",
        "userId": "68xxxxxxxx",
        "reaction": "👍"
    }
}
```

HTTP status:

```text
200 OK
```

---

# 2. Get Message Reactions

### Endpoint

```text
GET /api/message-reactions/message/:messageId
```

### Recommended Response

```json
{
    "success": true,
    "data": {
        "reactions": [
            {
                "reaction": "👍",
                "count": 5,
                "reactedByMe": true
            },
            {
                "reaction": "❤️",
                "count": 3,
                "reactedByMe": false
            }
        ]
    }
}
```

This makes frontend rendering simple:

```text
👍 5
❤️ 3
```

and allows the frontend to know:

```text
👍 → You reacted
```

---

# 📌 Deleted Message Reaction Response

If the requested message is deleted:

```text
Message.isDeleted = true
```

existing reaction documents remain in the database.

However, normal reaction information should not be exposed through the regular chat UI.

The API should follow the deleted-message policy defined by the Messages module.

Recommended behavior:

```text
Deleted Message
      │
      ├── Existing reactions remain in DB
      │
      ├── New reactions rejected
      │
      └── Normal UI does not display reactions
```

The reaction endpoint should either:

```text
Option A
Reject access to reaction details
```

or:

```text
Option B
Return sanitized/empty reaction data
```

The implementation should use one consistent policy across the Messages and Message Reactions modules.

For the initial implementation, **sanitized/empty reaction data is recommended for clients that can still view the deleted message placeholder**.

---

# 3. Remove Reaction

### Endpoint

```text
DELETE /api/message-reactions/message/:messageId
```

The authenticated user's reaction should be removed.

The frontend should not need to send:

```text
userId
```

because the backend already knows the authenticated user.

---

# 📄 Response

```json
{
    "success": true,
    "message": "Reaction removed successfully"
}
```

HTTP status:

```text
200 OK
```

---

# 4. Change Reaction

A separate API is not required.

The same endpoint:

```text
POST /api/message-reactions
```

handles the update.

Example:

Current:

```text
👍
```

User selects:

```text
❤️
```

Backend:

```text
Find message + user reaction
        │
        ▼
Existing reaction found
        │
        ▼
Update reaction
        │
        ▼
👍 → ❤️
```

This keeps the API simple.

---

# 5. Get User Reaction

### Endpoint

```text
GET /api/message-reactions/message/:messageId/me
```

This endpoint is **optional**.

It is not required when:

```text
GET /api/message-reactions/message/:messageId
```

already returns:

```text
reactedByMe
```

It can be introduced later as a convenience endpoint if a client requires a dedicated current-user reaction query.

### Response

If the user reacted:

```json
{
    "success": true,
    "data": {
        "reaction": "👍"
    }
}
```

If the user has not reacted:

```json
{
    "success": true,
    "data": {
        "reaction": null
    }
}
```

---

# 🔐 Authorization

A user can react to a message only if:

```text
Authenticated
      │
      ▼
Message Exists
      │
      ▼
Conversation Exists
      │
      ▼
Conversation Active
      │
      ▼
User Is Active Member
      │
      ▼
Message Not Deleted
      │
      ▼
Reaction Allowed
```

---

# 🚫 Non-Member Access

A user who is not a member of the conversation must not be able to react.

Example:

```text
User A
   │
   └── Not a member
          │
          ▼
     Message Reaction
          │
          ▼
      ❌ Forbidden
```

Response:

```json
{
    "success": false,
    "message": "You are not a member of this conversation"
}
```

Status:

```text
403 Forbidden
```

---

# 🔒 Tenant Isolation

Reaction access must follow:

```text
Organization
      ↓
Project
      ↓
Workspace
      ↓
Conversation
      ↓
Message
      ↓
Message Reaction
```

A user from another organization must never be able to manipulate reactions simply by knowing a message ID.

The backend must validate the complete ownership and access chain.

---

# 📌 Important Backend Rule

Do not trust these values from the frontend:

```text
userId
organizationId
projectId
workspaceId
conversationId
```

The frontend should send only:

```json
{
    "messageId": "68xxxxxxxx",
    "reaction": "👍"
}
```

The backend should derive the remaining information from:

```text
JWT
+
Message
+
Conversation
+
Workspace hierarchy
```

---

# 🧠 Reaction Validation

Before creating or updating a reaction:

## Validate Message ID

```text
messageId must:
- be present
- be a valid ObjectId
```

---

## Validate Reaction

```text
reaction must:
- be present
- be a string
- match a configured allowed reaction
- remain within the configured maximum length
```

For the initial predefined emoji set:

```text
👍
❤️
😂
😮
😢
🎉
```

any other value should be rejected.

---

## Validate Membership

```text
user must be an active conversation member
```

Users with:

```text
left
removed
inactive
```

status must not be allowed to react.

---

## Validate Message State

If:

```text
isDeleted = true
```

then:

```text
POST /message-reactions
```

must be rejected.

---

# 📏 Reaction Size / Format Limits

Reaction input must have controlled validation.

Recommended rules:

```text
reaction:
    required
    string
    maximum length configurable
    must match allowed reaction configuration
```

For the initial system, because reactions are predefined, arbitrary long Unicode strings should never be accepted.

This prevents requests such as:

```text
reaction = extremely-large-unicode-string
```

from being stored.

---

# 🗑️ Deleted Messages

If:

```text
Message.isDeleted = true
```

then:

```text
POST /message-reactions
```

must return:

```json
{
    "success": false,
    "message": "Cannot react to a deleted message"
}
```

Status:

```text
400 Bad Request
```

Existing reactions should **remain in the database** when a message is deleted.

This preserves historical state and avoids unnecessarily destroying related data.

The UI can hide the reactions when displaying:

```text
This message was deleted
```

Therefore:

```text
Delete Message
      │
      ▼
Message.isDeleted = true
      │
      ├── Existing reactions remain in DB
      │
      ├── New reactions rejected
      │
      ├── Reaction changes rejected
      │
      └── UI hides reaction information
```

---

# 📌 Reaction Count Behavior

Do not store:

```text
reactionCount
```

inside the Message document initially.

Instead calculate:

```text
MessageReaction
      ↓
Group by reaction
      ↓
Count
```

Example:

```text
👍 → 5
❤️ → 3
😂 → 2
```

Later, if performance requires it, denormalized counters can be introduced.

---

# 📊 Aggregation Example

Conceptually:

```text
messageId
    ↓
Match reactions
    ↓
Group by reaction
    ↓
Count documents
```

Result:

```json
[
    {
        "_id": "👍",
        "count": 5
    },
    {
        "_id": "❤️",
        "count": 3
    }
]
```

---

# ⚡ Performance

The main query will be:

```text
Get reactions for message
```

Therefore create:

```javascript
messageReactionSchema.index({
    messageId: 1
});
```

For checking the current user's reaction:

```javascript
messageReactionSchema.index({
    messageId: 1,
    userId: 1
});
```

The second index is also the unique compound index.

Recommended indexes:

```javascript
messageReactionSchema.index(
    {
        messageId: 1,
        userId: 1
    },
    {
        unique: true
    }
);

messageReactionSchema.index({
    messageId: 1,
    reaction: 1
});
```

The unique compound index is the primary index for enforcing:

```text
One user
+
One message
=
One reaction
```

---

# 🔄 Atomic Reaction Update

Reaction creation and updates should be handled atomically.

Conceptually:

```text
Find:
messageId + userId
        │
        ▼
Existing reaction?
        │
   ┌────┴────┐
   │         │
  Yes        No
   │         │
   ▼         ▼
Update     Create
```

The service should avoid a vulnerable pattern where two requests independently perform:

```text
find()
   ↓
not found
   ↓
create()
```

because concurrent requests could race.

The unique index provides final database-level protection.

If a unique-index conflict occurs due to concurrent requests, the service may return:

```text
409 Conflict
```

This is a **concurrency/database conflict**, not a normal "duplicate reaction" response.

---

# 📁 Recommended Folder Structure

```text
src/
│
├── models/
│   └── MessageReaction.js
│
├── controllers/
│   └── messageReaction.controller.js
│
├── services/
│   └── messageReaction.service.js
│
├── routes/
│   └── messageReaction.routes.js
│
├── validators/
│   └── messageReaction.validator.js
│
└── middleware/
    ├── auth.middleware.js
    └── conversationAccess.middleware.js
```

---

# 🔄 Service Layer

Recommended architecture:

```text
Route
  │
  ▼
Authentication Middleware
  │
  ▼
Controller
  │
  ▼
Message Reaction Service
  │
  ├── Validate Message
  ├── Validate Message State
  ├── Validate Membership
  ├── Validate Reaction
  ├── Find Existing Reaction
  ├── Create / Update
  └── Remove
          │
          ▼
       MongoDB
```

---

# 🧩 Module Responsibilities

## Messages Module

Responsible for:

```text
Message
Message content
Sender
Replies
Editing
Deletion
```

## Message Reactions Module

Responsible for:

```text
Reaction
User reaction
Reaction counts
Adding
Removing
Changing
Reaction validation
```

Do not put reaction logic directly inside the Message controller.

---

# 🔄 Reaction Lifecycle

```text
No Reaction
     │
     ▼
   Add 👍
     │
     ▼
   👍 Active
     │
     ├─────────────┐
     │             │
     ▼             ▼
Change ❤️       Remove
     │             │
     ▼             ▼
   ❤️ Active    No Reaction
```

Same reaction:

```text
👍 Active
    │
    ▼
User selects 👍 again
    │
    ▼
No duplicate created
    │
    ▼
👍 remains active
```

---

# 📱 Example Chat UI

A message could appear as:

```text
┌───────────────────────────────────┐
│ Akshaya                           │
│                                   │
│ The client approved the design.  │
│                                   │
│ 👍 5   ❤️ 3   🎉 2                │
└───────────────────────────────────┘
```

If the current user reacted:

```text
👍 5
```

the frontend can visually highlight that reaction.

The backend provides:

```json
{
    "reaction": "👍",
    "count": 5,
    "reactedByMe": true
}
```

---

# 🔌 Future Socket.IO Integration

The Reaction module should eventually integrate with Socket.IO.

When User A reacts:

```text
User A
   │
   ▼
POST /message-reactions
   │
   ▼
MongoDB
   │
   ▼
Socket.IO
   │
   ▼
Conversation Room
   │
   ├── User B
   ├── User C
   └── User D
```

Future socket events:

```text
reaction:added
reaction:updated
reaction:removed
```

Example:

```json
{
    "messageId": "68xxxxxxxx",
    "userId": "68xxxxxxxx",
    "reaction": "❤️"
}
```

The REST API remains responsible for persistence.

Socket.IO is responsible for real-time updates.

The database remains the source of truth.

---

# 🔔 Future Notification Integration

Reactions can later trigger notifications.

Example:

```text
Akshaya reacts ❤️
        ↓
Notification Service
        ↓
Rahul receives notification
        ↓
"Akshaya reacted ❤️ to your message"
```

Notification logic should remain outside the core reaction service.

The Message Reaction service can publish an event that the notification layer consumes later.

---

# 🌐 API Summary

| Method | Endpoint                                       | Purpose                        | Status            |
| ------ | ---------------------------------------------- | ------------------------------ | ----------------- |
| POST   | `/api/message-reactions`                       | Add/update reaction            | Core              |
| GET    | `/api/message-reactions/message/:messageId`    | Get message reactions          | Core              |
| DELETE | `/api/message-reactions/message/:messageId`    | Remove current user's reaction | Core              |
| GET    | `/api/message-reactions/message/:messageId/me` | Get current user's reaction    | Optional / Future |

The core Phase 2 API therefore consists of:

```text
POST
GET
DELETE
```

The `/me` endpoint can be added only if a client requires it.

---

# 🚨 Error Handling

## Message Not Found

```json
{
    "success": false,
    "message": "Message not found"
}
```

Status:

```text
404 Not Found
```

---

## Not a Member

```json
{
    "success": false,
    "message": "You are not a member of this conversation"
}
```

Status:

```text
403 Forbidden
```

---

## Invalid Reaction

```json
{
    "success": false,
    "message": "Invalid reaction"
}
```

Status:

```text
400 Bad Request
```

---

## Deleted Message

```json
{
    "success": false,
    "message": "Cannot react to a deleted message"
}
```

Status:

```text
400 Bad Request
```

---

## Reaction Not Found

```json
{
    "success": false,
    "message": "Reaction not found"
}
```

Status:

```text
404 Not Found
```

---

## Concurrency / Database Conflict

If a unique-index conflict occurs during a concurrent operation:

```json
{
    "success": false,
    "message": "Reaction update conflict. Please retry."
}
```

Status:

```text
409 Conflict
```

This is not a normal duplicate-reaction response.

Normal repeated requests such as:

```text
👍 → 👍
```

must not return `409`.

---

# 📊 HTTP Status Codes

| Status | Usage                                       |
| ------ | ------------------------------------------- |
| 200    | Successful update, removal, or retrieval    |
| 201    | Reaction created                            |
| 400    | Invalid reaction/request or deleted message |
| 401    | Authentication required                     |
| 403    | User has no conversation access             |
| 404    | Message/reaction not found                  |
| 409    | Concurrent database/unique-index conflict   |
| 500    | Server error                                |

---

# 🧪 Postman Testing Plan

## 1. Login

```text
POST /api/auth/login
```

Obtain the JWT.

---

## 2. Create/Get Conversation

Use an existing conversation.

---

## 3. Verify Membership

Make sure the authenticated user is an active member.

---

## 4. Add Reaction

```text
POST /api/message-reactions
```

Request:

```json
{
    "messageId": "68xxxxxxxx",
    "reaction": "👍"
}
```

Expected:

```text
201 Created
```

---

## 5. Get Reactions

```text
GET /api/message-reactions/message/:messageId
```

Expected:

```text
👍 → 1
```

---

## 6. Second User Reacts

Login as another member.

Add:

```text
👍
```

Expected:

```text
👍 → 2
```

---

## 7. Change Reaction

Change:

```text
👍
```

to:

```text
❤️
```

Expected:

```text
👍 → 1
❤️ → 1
```

---

## 8. Same Reaction Test

Send:

```text
👍
```

again from the same user.

Expected:

```text
No duplicate document
👍 count remains unchanged
```

---

## 9. Remove Reaction

```text
DELETE /api/message-reactions/message/:messageId
```

Expected:

```text
Reaction removed
```

---

## 10. Duplicate Database Test

Attempt to manually create two reaction documents with:

```text
same messageId
+
same userId
```

Expected:

```text
Unique index prevents duplicate
```

---

## 11. Invalid Reaction Test

Send:

```json
{
    "messageId": "68xxxxxxxx",
    "reaction": "invalid"
}
```

Expected:

```text
400 Bad Request
```

---

## 12. Deleted Message Test

Delete a message.

Then attempt:

```text
POST /api/message-reactions
```

Expected:

```text
400 Bad Request
```

Existing reactions should remain in the database.

---

## 13. Non-Member Test

Login as a user who is not a conversation member.

Attempt to react.

Expected:

```text
403 Forbidden
```

---

## 14. Concurrent Reaction Test

Simulate two requests from the same user:

```text
Request A → ❤️
Request B → 😂
```

Verify:

```text
Only one reaction document exists
```

and:

```text
Final reaction = last successfully committed update
```

No duplicate reaction documents should exist.

---

# 🔐 Security Checklist

Before marking this module complete:

* Authentication middleware is applied.
* Message existence is verified.
* Conversation existence is verified.
* Conversation membership is verified.
* Organization isolation is enforced.
* Project isolation is enforced.
* Workspace isolation is enforced.
* User ID comes from authenticated JWT.
* Client cannot impersonate another user.
* Reaction values are validated.
* Reaction size/format limits are enforced.
* Deleted messages reject new reactions.
* Existing reactions remain associated with deleted messages.
* Duplicate reactions are prevented.
* Compound unique index is created.
* Reaction updates are atomic.
* Concurrent reaction updates are handled safely.
* Users can remove only their own reactions.
* Users cannot modify another user's reaction.
* Proper HTTP status codes are returned.
* Normal repeated reactions do not return duplicate errors.
* Unique-index conflicts are handled appropriately.
* Message queries use indexes.
* Reaction queries use indexes.
* Sensitive data is not exposed.

---

# 🚀 Future Enhancements

## More Reactions

```text
🔥
👏
🙏
💯
🚀
😍
🤔
```

---

# 🎨 Custom Workspace Reactions

Future versions may allow organizations or workspaces to define custom reactions.

Example:

```text
Workspace
   │
   └── Custom Reactions
```

Examples:

```text
🚀 Launch
💯 Approved
🎯 Important
```

For the current Phase 2 implementation, reactions are stored directly as predefined emoji values.

A future custom-reaction system may introduce a separate reaction definition model:

```text
ReactionDefinition
│
├── workspaceId
├── code
├── displayValue
├── name
└── isActive
```

Example:

```text
code: thumbs_up
displayValue: 👍
name: Thumbs Up
```

The current implementation does **not** require this additional collection.

---

# 🧩 Future Reaction Code Migration

The current implementation uses:

```text
reaction: "👍"
```

This is intentionally simple for Phase 2.

As custom reactions are introduced, the system may migrate toward:

```text
reaction: "thumbs_up"
```

with a separate mapping:

```text
thumbs_up → 👍
heart     → ❤️
laugh     → 😂
```

This would allow:

* Workspace-specific reactions
* Reaction names
* Custom icons
* Reaction activation/deactivation
* Localization
* Consistent identifiers

This migration should only be introduced when custom reactions become an actual requirement.

---

# 📊 Reaction Analytics

Later the system could track:

```text
Most used reaction
Most reacted messages
User reaction statistics
Workspace reaction statistics
```

Analytics should preferably be implemented in a separate analytics/reporting layer rather than adding unnecessary fields to the core MessageReaction document.

---

# 🔔 Notifications

Future architecture:

```text
Reaction
   ↓
Reaction Event
   ↓
Notification Service
   ↓
User
```

Example:

```text
Akshaya reacts ❤️
        ↓
Rahul receives notification
```

---

# ⚡ Real-Time Updates

Future architecture:

```text
Reaction
   ↓
MongoDB
   ↓
Socket.IO
   ↓
Conversation Room
```

Future events:

```text
reaction:added
reaction:updated
reaction:removed
```

---

# 📈 Phase 2 Progress

After completing this module:

```text
Phase 2 — Messaging Features

├── Message Reactions      ← 🟡 Current
├── Read Receipts          ← NEXT
├── Attachments
└── Message Search
```

---

# 📊 Overall Project Progress

```text
Phase 1 — Core Backend

Organization           ✅
Project                ✅
Workspace              ✅
Authentication         ✅
Conversation           ✅
Conversation Members   ✅
Messages               ✅


Phase 2 — Messaging Features

Message Reactions      🟡
Read Receipts          ⏳
Attachments             ⏳
Message Search         ⏳
```

The Message Reactions module should be changed to:

```text
🟢 Completed
```

only after the implementation, API testing, security checks, indexes, and concurrency tests have passed.

---

# 📌 Module Completion Criteria

The Message Reactions module can be marked **Completed** when:

```text
Database
    ↓
Schema implemented
    ↓
Indexes implemented
    ↓
Unique constraint verified
    ↓
APIs implemented
    ↓
Authorization verified
    ↓
Validation verified
    ↓
Deleted-message behavior verified
    ↓
Concurrency behavior verified
    ↓
Postman tests passed
    ↓
Security checklist passed
    ↓
Status → 🟢 Completed
```

---

# 📌 Summary

The **Message Reactions module** adds lightweight user interaction to the Chat Platform without making the Message document unnecessarily complex.

The architecture uses a dedicated:

```text
messageReactions
```

collection where each document represents:

```text
One User
    +
One Message
    +
One Reaction
```

The key database rule is:

```text
messageId + userId = UNIQUE
```

This allows each user to have one reaction per message while still supporting unlimited users reacting to the same message.

The primary reaction endpoint uses an upsert-style behavior:

```text
No existing reaction
        ↓
Create

Existing reaction
        ↓
Update
```

Repeated reactions such as:

```text
👍 → 👍
```

do not create duplicates and do not normally return a conflict.

Concurrent requests are handled atomically, with the final successfully committed update becoming the user's current reaction.

Deleted messages follow a defined lifecycle:

```text
Message deleted
      ↓
Existing reactions remain in DB
      ↓
New reactions rejected
      ↓
UI hides reaction information
```

The module is also designed to work with the future architecture:

```text
Message Reactions
      │
      ├── REST API
      │
      ├── MongoDB
      │
      ├── Socket.IO
      │
      └── Notifications
```

The REST API remains responsible for persistence, while Socket.IO will later provide real-time reaction updates.

The current Phase 2 implementation uses predefined emoji values:

```text
👍
❤️
😂
😮
😢
🎉
```

Future versions can introduce reaction codes and workspace-specific custom reactions without changing the fundamental MessageReaction architecture.

After this module is implemented and tested, the next Phase 2 module should be:

```text
Message Reactions
       ↓
Read Receipts ← NEXT
       ↓
Attachments
       ↓
Message Search
```

The goal is to keep the reaction system **simple for Phase 2, secure for multi-tenant use, consistent under concurrency, and extensible for future real-time and custom-reaction features.**

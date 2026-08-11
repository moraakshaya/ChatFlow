# ❤️ Real-Time Message Reactions Module

## 📋 Module Information

| Property        | Value                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Module          | Real-Time Message Reactions                                                                                                  |
| Version         | v1.1                                                                                                                         |
| Status          | 🟡 In Development                                                                                                            |
| Phase           | Phase 3 — Real-Time Communication                                                                                            |
| Previous Module | Real-Time Read Receipts                                                                                                      |
| Next Phase      | Phase 4 — Notifications & Advanced Features                                                                                  |
| Depends On      | Authentication, Organization, Project, Workspace, Conversation, Conversation Members, Messages, Message Reactions, Socket.IO |
| Database        | MongoDB                                                                                                                      |
| Real-Time Layer | Socket.IO                                                                                                                    |

---

# 📌 Overview

The **Real-Time Message Reactions module** connects the existing persistent Message Reactions functionality from Phase 2 with Socket.IO.

Phase 2 already handles:

```text
User
  │
  ▼
Add Reaction
  │
  ▼
MongoDB
```

However, without real-time communication, another user may need to refresh the conversation to see the reaction.

Phase 3 changes this:

```text
User A
   │
   │ Reacts ❤️
   ▼
Reaction Service
   │
   ├───────────────┐
   ▼               ▼
MongoDB         Socket.IO
                   │
                   ▼
             Conversation
                   │
                   ▼
                User B
                   │
                   ▼
             ❤️ appears instantly
```

The module is responsible for:

* Persisting reactions in MongoDB.
* Broadcasting reaction changes through Socket.IO.
* Validating authenticated users.
* Validating conversation membership.
* Validating message ownership by conversation.
* Preventing unauthorized reactions.
* Preventing duplicate reactions.
* Supporting multiple supported reaction types.
* Synchronizing reactions across multiple devices.
* Synchronizing reaction state after reconnection.
* Reusing Phase 2 reaction business logic.
* Keeping REST and Socket.IO responsibilities separated.

---

# 🎯 Objectives

The Real-Time Reactions module is responsible for:

* Adding reactions in real time.
* Removing reactions in real time.
* Broadcasting reaction changes.
* Supporting supported Unicode emoji reactions.
* Supporting multiple users.
* Supporting multiple devices.
* Persisting reactions in MongoDB.
* Reusing Phase 2 reaction business logic.
* Validating conversation membership.
* Validating message ownership by conversation.
* Preventing unauthorized reactions.
* Preventing duplicate reactions.
* Handling invalid reaction requests.
* Handling database failures safely.
* Synchronizing reactions after reconnect.
* Maintaining MongoDB as the source of truth.
* Keeping REST and Socket.IO responsibilities separated.

---

# 🧠 Core Principle

Message reactions have two responsibilities:

```text
Persistent State
      │
      ▼
MongoDB
```

and:

```text
Real-Time State Change
      │
      ▼
Socket.IO
```

Therefore:

```text
Reaction
   │
   ├── Persist → MongoDB
   │
   └── Notify → Socket.IO
```

The fundamental rule is:

> **MongoDB stores the reaction; Socket.IO communicates the reaction change instantly.**

Socket.IO is not the source of truth.

MongoDB remains the authoritative source for the current reaction state.

---

# 🏗️ Architecture

```text
                    User A
                      │
                      │ Reacts to message
                      ▼
                Socket.IO Server
                      │
                      ▼
                Authentication
                      │
                      ▼
                Payload Validation
                      │
                      ▼
                Reaction Service
                      │
                      ▼
                Business Validation
                      │
                      ▼
                  Authorization
                      │
                      ▼
                    MongoDB
                      │
                      ▼
               Reaction Persisted
                      │
                      ▼
                Realtime Service
                      │
                      ▼
              Conversation Room
                      │
                      ▼
                    Users
                      │
                      ▼
                 UI Updated
```

The Socket.IO handler remains thin and delegates reusable business logic to the existing Reaction Service.

```text
Socket Handler
      │
      ▼
Payload Validation
      │
      ▼
Reaction Service
      │
      ├── Business Validation
      ├── Authorization
      ├── Duplicate Detection
      └── Database Operation
              │
              ▼
           MongoDB
              │
              ▼
      Realtime Service
              │
              ▼
          Socket.IO
```

---

# 🔄 Add Reaction Flow

Example:

User A reacts to:

```text
"Great work!"
```

with:

```text
❤️
```

Flow:

```text
User A
  │
  ▼
reaction:add
  │
  ▼
Socket.IO
  │
  ▼
Authenticate User
  │
  ▼
Validate Payload
  │
  ▼
Reaction Service
  │
  ▼
Validate Conversation
  │
  ▼
Validate Membership
  │
  ▼
Validate Message
  │
  ▼
Validate Reaction
  │
  ▼
MongoDB
  │
  ▼
Reaction Saved
  │
  ▼
Realtime Service
  │
  ▼
reaction:added
  │
  ▼
Conversation Members
  │
  ▼
UI Updates
```

---

# 🔄 Remove Reaction Flow

```text
User A
  │
  ▼
reaction:remove
  │
  ▼
Authentication
  │
  ▼
Payload Validation
  │
  ▼
Reaction Service
  │
  ▼
Authorization
  │
  ▼
MongoDB
  │
  ▼
Reaction Removed
  │
  ▼
Realtime Service
  │
  ▼
reaction:removed
  │
  ▼
Conversation Members
  │
  ▼
UI Updates
```

---

# ❤️ Reaction Type Contract

The reaction value follows a strict server-defined contract.

## Supported Format

Reactions are represented as Unicode emoji strings.

Example:

```json
{
  "reaction": "❤️"
}
```

Initial supported reactions:

```text
❤️
👍
😂
🔥
🎉
😢
😡
👏
```

The server maintains the canonical supported reaction list.

Example:

```js
const SUPPORTED_REACTIONS = [
  "❤️",
  "👍",
  "😂",
  "🔥",
  "🎉",
  "😢",
  "😡",
  "👏"
];
```

---

# 📏 Reaction Validation Rules

The server must validate that:

* `reaction` is present.
* `reaction` is a string.
* `reaction` is not empty.
* `reaction` exactly matches one of `SUPPORTED_REACTIONS`.
* Unsupported reaction values are rejected.
* Custom reactions are not supported in v1.1.
* Client-provided reaction values are never trusted.

The contract is:

```text
Reaction:
- String
- Must match one of SUPPORTED_REACTIONS
- Maximum length enforced at schema level
- Custom reactions are not supported in v1.1
```

The supported-reaction whitelist is the primary validation mechanism.

---

# 🔤 Canonical Reaction Representation

The supported reaction list contains the **canonical representation** of every supported reaction.

For example:

```text
Client → ❤️
        ↓
Supported set?
        ↓
      Yes
        ↓
Store canonical value
```

Incoming values that do not exactly match a supported canonical value are rejected.

Example:

```text
Client → unsupported Unicode representation
        ↓
Supported set?
        ↓
       No
        ↓
reaction:error
```

The server does **not** attempt to convert arbitrary Unicode emoji into supported reactions in v1.1.

This keeps the reaction contract predictable and avoids storing logically equivalent but differently represented values.

---

# 🚫 Custom Reactions

Custom reactions are not supported in v1.1.

The initial implementation supports only:

```text
Server-defined Unicode emoji
```

Custom reaction support can be introduced later if required.

---

# 🧠 Reaction Uniqueness

The system follows the rule:

```text
One User
+
One Message
+
One Reaction
=
One Reaction Record
```

Therefore:

```text
User A → Message 1 → ❤️
```

must not create multiple records when the user repeatedly sends:

```text
reaction:add ❤️
reaction:add ❤️
reaction:add ❤️
```

The database must enforce uniqueness using a compound unique index:

```text
userId
+
messageId
+
reaction
```

---

# 👥 Multiple Reactions Per User

The initial implementation allows a user to have **multiple different reaction types on the same message**.

Example:

```text
User A → ❤️
User A → 👍
User A → 😂
```

These are valid because each reaction has a different:

```text
reaction
```

value.

Therefore:

```text
User A + Message 1 + ❤️   → valid
User A + Message 1 + 👍   → valid
User A + Message 1 + 😂   → valid
User A + Message 1 + ❤️   → duplicate
```

The uniqueness boundary is:

```text
userId + messageId + reaction
```

---

# 🔄 Toggle Reaction

The frontend may implement toggle behavior for each reaction independently.

```text
Click ❤️
    │
    ├── Not reacted → reaction:add
    │
    └── Already reacted → reaction:remove
```

Flow:

```text
❤️ not selected
      │
      ▼
Click
      │
      ▼
reaction:add
      │
      ▼
❤️ selected
```

Click again:

```text
❤️ selected
      │
      ▼
Click
      │
      ▼
reaction:remove
      │
      ▼
❤️ removed
```

The server must still validate the actual database state.

The server must never assume that:

```text
Frontend says "remove"
```

means the reaction currently exists.

---

# 📡 Socket Events

## Client → Server

```text
reaction:add
reaction:remove
```

## Server → Client

```text
reaction:added
reaction:removed
reaction:error
```

---

# 📊 Reaction Event Contract

| Event              | Direction       | Authentication             | Persistence | Broadcast                   |
| ------------------ | --------------- | -------------------------- | ----------- | --------------------------- |
| `reaction:add`     | Client → Server | Required                   | Yes         | Produces `reaction:added`   |
| `reaction:remove`  | Client → Server | Required                   | Yes         | Produces `reaction:removed` |
| `reaction:added`   | Server → Client | Authenticated room members | N/A         | Yes                         |
| `reaction:removed` | Server → Client | Authenticated room members | N/A         | Yes                         |
| `reaction:error`   | Server → Client | Request socket             | No          | No                          |

### Event Semantics

```text
reaction:add
    │
    └── Requests creation of a reaction

reaction:added
    │
    └── Confirms a reaction was successfully persisted

reaction:remove
    │
    └── Requests removal of the authenticated user's reaction

reaction:removed
    │
    └── Confirms a reaction was successfully removed

reaction:error
    │
    └── Indicates the requested operation failed
```

The server broadcasts `reaction:added` or `reaction:removed` **only after the database operation succeeds**.

---

# 📤 reaction:add

Payload:

```json
{
  "eventId": "evt_123",
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "reaction": "❤️"
}
```

The server obtains the acting user from:

```text
socket.user.userId
```

The client must not provide or control the acting user's ID.

---

# 📥 reaction:added

After successfully saving the reaction:

```json
{
  "eventId": "evt_123",
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "userId": "68user456",
  "reaction": "❤️",
  "createdAt": "2026-08-10T06:40:00.000Z"
}
```

The server generates:

```text
userId
createdAt
```

The client cannot override these values.

---

# 📤 reaction:remove

Payload:

```json
{
  "eventId": "evt_124",
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "reaction": "❤️"
}
```

The server identifies the reaction using:

```text
socket.user.userId
+
messageId
+
reaction
```

The client cannot remove another user's reaction.

---

# 📥 reaction:removed

Example:

```json
{
  "eventId": "evt_124",
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "userId": "68user456",
  "reaction": "❤️"
}
```

The `userId` is derived from the authenticated socket.

---

# ❌ reaction:error

When a reaction operation fails, the server sends:

```text
reaction:error
```

Example:

```json
{
  "eventId": "evt_123",
  "code": "REACTION_NOT_ALLOWED",
  "message": "You cannot react to this message."
}
```

Recommended error codes:

```text
AUTH_REQUIRED
CONVERSATION_NOT_FOUND
NOT_CONVERSATION_MEMBER
MESSAGE_NOT_FOUND
MESSAGE_CONVERSATION_MISMATCH
INVALID_REACTION
REACTION_ALREADY_EXISTS
REACTION_NOT_FOUND
REACTION_FORBIDDEN
DUPLICATE_EVENT
INTERNAL_ERROR
```

The frontend should use `code` for programmatic handling.

The `message` is intended for user-facing or development feedback.

---

# 🧠 Why Separate Add and Remove Events?

This makes the event contract explicit:

```text
reaction:add
      ↓
"Add this reaction"
```

and:

```text
reaction:remove
      ↓
"Remove this reaction"
```

The server then broadcasts:

```text
reaction:added
reaction:removed
```

This makes frontend state updates predictable.

---

# 🔐 Authentication

Every reaction event must come from an authenticated Socket.IO connection.

Use:

```text
socket.user
```

as the source of identity.

Do not trust:

```json
{
  "userId": "some-user"
}
```

from the client.

Correct:

```text
JWT
 │
 ▼
Socket Authentication
 │
 ▼
socket.user.userId
```

---

# 🛡️ Authorization and Business Validation

Authorization and reusable business rules belong primarily in the **Reaction Service**, not inside the Socket.IO handler.

Recommended flow:

```text
Socket Handler
      │
      ▼
Payload Validation
      │
      ▼
Reaction Service
      │
      ├── Conversation Validation
      ├── Membership Validation
      ├── Message Validation
      ├── Authorization
      ├── Reaction Validation
      └── Duplicate Detection
              │
              ▼
           MongoDB
```

The Socket.IO handler should not contain reusable:

```text
Authorization rules
Database queries
Business rules
Duplicate detection
Reaction ownership rules
```

This ensures REST and Socket.IO interfaces use the same business behavior.

---

# 🛡️ Authorization Flow

Before adding or removing a reaction:

```text
Authenticated?
      │
      ▼
Conversation exists?
      │
      ▼
User is member?
      │
      ▼
Message exists?
      │
      ▼
Message belongs to conversation?
      │
      ▼
Reaction allowed?
      │
      ▼
Proceed
```

If any validation fails:

```text
Reject Event
      │
      ▼
No Database Mutation
      │
      ▼
No Broadcast
      │
      ▼
reaction:error
```

---

# 🚫 Unauthorized Reaction Example

User A is not a member of:

```text
Conversation B
```

User A sends:

```text
reaction:add
```

Expected:

```text
Authorization
      │
      ▼
Not a member
      │
      ▼
Reject
      │
      ├── No reaction created
      ├── No broadcast
      └── reaction:error
```

---

# 🧩 Reuse Phase 2 Reaction Service

Do not create a second reaction implementation for Socket.IO.

Recommended architecture:

```text
                Reaction Service
                      ▲
                      │
            ┌─────────┴─────────┐
            │                   │
         REST API           Socket.IO
```

Both interfaces use the same:

```text
Business Validation
Authorization
Reaction Rules
Duplicate Detection
Database Logic
```

The interfaces are different, but the underlying business behavior remains shared.

This prevents logic duplication and keeps the system maintainable.

---

# 🏗️ REST + Socket.IO Responsibility

## REST

Responsible for persistent operations:

```text
Add reaction
Remove reaction
Get reactions
```

## Socket.IO

Responsible for:

```text
Instant notification
Real-time synchronization
```

Therefore:

```text
REST
 │
 └── Persistent Operations

Socket.IO
 │
 └── Real-Time Events
```

REST remains available as a fallback for clients that cannot use Socket.IO.

---

# 🏠 Conversation Rooms

Use the existing conversation room:

```text
conversation:{conversationId}
```

Example:

```text
conversation:68conversation123
```

Every authenticated member of a conversation should join the appropriate room.

---

# 📡 Broadcasting Policy

The authoritative reaction events use:

```js
io.to(conversationRoom)
```

This means the event is delivered to:

```text
Conversation Room
      │
      ├── User A current socket
      ├── User A other devices
      ├── User B
      ├── User C
      └── Other conversation members
```

The acting user's current socket also receives the server-confirmed event.

This provides authoritative confirmation for optimistic UI updates.

---

# 📱 Multiple Devices

One user may be connected through:

```text
Chrome
Mobile
Tablet
```

Example:

```text
User A
 ├── Socket A
 ├── Socket B
 └── Socket C
```

User A adds:

```text
🔥
```

from Mobile.

Because all active devices are connected to the conversation room:

```text
Mobile
  │
  ▼
reaction:add
  │
  ▼
Server
  │
  ▼
reaction:added
  │
  ├── Chrome
  ├── Mobile
  └── Tablet
```

All active clients can synchronize with the authoritative server state.

---

# ❤️ Reaction Example

Initial message:

```text
Ravi:
"Good job!"
```

No reaction:

```text
Good job!
```

Akshaya adds:

```text
❤️
```

The server persists the reaction and broadcasts:

```text
reaction:added
```

The UI immediately becomes:

```text
Good job! ❤️ 1
```

Ravi does not need to refresh the page.

---

# 👥 Multiple Users Reacting

Example:

```text
"Great work!"

❤️ Akshaya
🔥 Ravi
😂 Priya
👍 Kiran
```

The server may emit:

```text
reaction:added
reaction:added
reaction:added
reaction:added
```

Each event identifies:

```text
conversationId
messageId
userId
reaction
```

The frontend updates only the affected message.

---

# 📊 Reaction Aggregation

The UI may display:

```text
❤️ 3   👍 2   😂 1
```

while the database stores individual reactions:

```text
User A → ❤️
User B → ❤️
User C → ❤️
User D → 👍
User E → 👍
User F → 😂
```

This distinction is important:

```text
Database
   │
   └── Individual user reactions

UI
   │
   └── Aggregated reaction counts
```

The frontend may additionally determine:

```text
currentUserReacted = true
```

for each reaction type.

---

# 🧠 Reaction State

A message can expose aggregated reaction state:

```json
{
  "messageId": "68message123",
  "reactions": [
    {
      "reaction": "❤️",
      "count": 3
    },
    {
      "reaction": "👍",
      "count": 2
    }
  ]
}
```

The frontend can additionally track:

```text
currentUserReacted = true
```

for the current user.

---

# ⏱️ Reaction Timestamp

The server generates timestamps.

For example:

```text
createdAt
updatedAt
```

where applicable.

Do not trust client-provided timestamps.

Correct:

```text
Client
  │
  ▼
reaction:add
  │
  ▼
Server
  │
  ▼
Generate timestamp
  │
  ▼
MongoDB
```

---

# 🔁 Idempotency

The module distinguishes between **database idempotency** and **event-level idempotency**.

## Database Idempotency — Required

Database idempotency is required for v1.1.

The compound unique index:

```text
userId
+
messageId
+
reaction
```

prevents duplicate persistent reaction records.

Example:

```text
reaction:add ❤️
reaction:add ❤️
```

Result:

```text
Only one reaction record
```

---

## Event-Level Idempotency — Optional in v1.1

The client may include:

```json
{
  "eventId": "evt_123"
}
```

The event ID can be used for detecting repeated network retries.

However, **event-level idempotency tracking is optional for v1.1**.

A separate event tracking collection/table is not required for the initial implementation.

If event-level idempotency is introduced later:

```text
eventId
   │
   ▼
Already processed?
   │
 ┌─┴───┐
Yes    No
 │      │
 ▼      ▼
Ignore Process
```

The required v1.1 protection remains the database unique index.

---

# 💾 Persistence Before Broadcast

Correct order:

```text
reaction:add
      │
      ▼
Validate
      │
      ▼
Save MongoDB
      │
      ▼
Success
      │
      ▼
reaction:added
```

Avoid:

```text
reaction:add
      │
      ▼
Broadcast
      │
      ▼
MongoDB fails
```

because clients would display a reaction that does not actually exist.

---

# ⚠️ Database Failure

If MongoDB fails:

```text
reaction:add
      │
      ▼
Database Error
      │
      ▼
No reaction:added
      │
      ▼
reaction:error
```

Example:

```json
{
  "eventId": "evt_123",
  "code": "INTERNAL_ERROR",
  "message": "Unable to save reaction."
}
```

The client should:

* Keep the previous authoritative state.
* Roll back an optimistic UI change.
* Display appropriate feedback if required.

---

# ⚡ Optimistic UI

For a fast chat experience, the frontend may use optimistic updates.

Flow:

```text
User taps ❤️
      │
      ▼
UI immediately shows ❤️
      │
      ▼
reaction:add
      │
      ▼
Server validates
      │
      ▼
MongoDB saves
      │
      ▼
reaction:added
      │
      ▼
UI confirms authoritative state
```

If the server rejects the operation:

```text
UI optimistic update
      │
      ▼
Server rejects
      │
      ▼
reaction:error
      │
      ▼
Rollback UI
      │
      ▼
Show error if required
```

Optimistic UI must never replace server-side validation.

---

# 🔄 Offline User

Suppose:

```text
User A = Offline
User B = Online
```

User B adds:

```text
🔥
```

MongoDB stores it.

User A does not receive the Socket.IO event because they are offline.

When User A reconnects:

```text
Socket Connect
      │
      ▼
Authenticate
      │
      ▼
Join Conversation
      │
      ▼
Fetch Current Message/Reactions
      │
      ▼
Synchronize UI
```

This is why MongoDB remains the source of truth.

---

# 🔌 Reconnection

After reconnect:

```text
Socket connected
      │
      ▼
Authenticate
      │
      ▼
Join conversation rooms
      │
      ▼
Synchronize conversation state
      │
      ▼
Current reaction state restored
```

The client must not assume it received every reaction event while disconnected.

Instead:

```text
Socket.IO
    │
    └── Temporary event delivery

MongoDB / REST
    │
    └── Current authoritative state
```

---

# 🧩 Real-Time Service

Recommended methods:

```text
emitReactionAdded()
emitReactionRemoved()
emitReactionError()
emitToConversation()
emitToUser()
```

Example:

```text
realtimeService.emitReactionAdded(
    conversationId,
    payload
);
```

This keeps Socket.IO logic centralized.

---

# 📂 Recommended Folder Structure

```text
src/
│
├── socket/
│   ├── index.js
│   │
│   ├── middleware/
│   │   └── socketAuth.js
│   │
│   ├── handlers/
│   │   ├── connection.handler.js
│   │   ├── conversation.handler.js
│   │   ├── message.handler.js
│   │   ├── presence.handler.js
│   │   ├── readReceipt.handler.js
│   │   └── reaction.handler.js
│   │
│   └── events/
│       └── reaction.events.js
│
├── services/
│   ├── message.service.js
│   ├── reaction.service.js
│   ├── readReceipt.service.js
│   ├── realtime.service.js
│   └── presence.service.js
│
├── controllers/
│   └── reaction.controller.js
│
├── models/
│   ├── Message.js
│   └── MessageReaction.js
│
└── routes/
    └── reaction.routes.js
```

---

# 🧠 Handler Responsibility

The handler should remain thin.

```text
reaction.handler
      │
      ▼
Validate payload
      │
      ▼
Reaction Service
      │
      ▼
Realtime Service
```

Avoid placing:

```text
MongoDB queries
Authorization rules
Duplicate detection
Reaction business logic
Broadcasting logic
```

directly inside the Socket.IO event handler.

The service layer should own reusable business and authorization rules.

---

# 🔄 Complete Add Reaction Lifecycle

```text
                    User A
                       │
                       ▼
                  reaction:add
                       │
                       ▼
                 Socket.IO Server
                       │
                       ▼
                  Authentication
                       │
                       ▼
                  Payload Validation
                       │
                       ▼
                 Reaction Service
                       │
              ┌────────┴────────┐
              ▼                 ▼
       Business Validation   Authorization
              │
              ▼
            MongoDB
              │
              ▼
         Reaction Saved
              │
              ▼
        Realtime Service
              │
              ▼
         reaction:added
              │
              ▼
       Conversation Room
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
     User A User B User C
       │      │      │
       ▼      ▼      ▼
      UI     UI     UI
```

---

# 🔄 Complete Remove Reaction Lifecycle

```text
User A
   │
   ▼
reaction:remove
   │
   ▼
Authentication
   │
   ▼
Payload Validation
   │
   ▼
Reaction Service
   │
   ▼
Authorization
   │
   ▼
MongoDB
   │
   ▼
Reaction Removed
   │
   ▼
Realtime Service
   │
   ▼
reaction:removed
   │
   ▼
Conversation Room
   │
   ▼
All Active Members
   │
   ▼
UI Updated
```

---

# 🔗 Relationship With Previous Modules

## Message Delivery

```text
message:new
```

creates and delivers the message.

## Read Receipts

```text
read:message
message:read
```

updates and broadcasts read state.

## Reactions

```text
reaction:add
reaction:added

reaction:remove
reaction:removed
```

updates and broadcasts reaction state.

## Presence

```text
presence:online
presence:offline
```

updates user availability.

## Typing

```text
typing:start
typing:stop
```

updates temporary typing state.

Together:

```text
Real-Time Communication
│
├── Message Delivery
├── Typing Indicators
├── Presence
├── Read Receipts
└── Reactions
```

---

# 📊 Real-Time Event Matrix

| Event              | Direction       | Purpose                 |
| ------------------ | --------------- | ----------------------- |
| `message:new`      | Server → Client | New message             |
| `typing:start`     | Client → Server | Start typing            |
| `typing:stop`      | Client → Server | Stop typing             |
| `presence:online`  | Server → Client | User online             |
| `presence:offline` | Server → Client | User offline            |
| `read:message`     | Client → Server | Mark message read       |
| `message:read`     | Server → Client | Notify read state       |
| `reaction:add`     | Client → Server | Add reaction            |
| `reaction:added`   | Server → Client | Notify added reaction   |
| `reaction:remove`  | Client → Server | Remove reaction         |
| `reaction:removed` | Server → Client | Notify removed reaction |
| `reaction:error`   | Server → Client | Notify reaction failure |

---

# 🧪 Testing Plan

## 1. Connect Two Users

```text
User A
User B
```

Both must belong to the same conversation.

---

## 2. Send Message

User A sends:

```text
"Great work!"
```

User B receives:

```text
message:new
```

---

## 3. Add Reaction

User B sends:

```text
reaction:add
```

Payload:

```json
{
  "eventId": "evt_123",
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "reaction": "❤️"
}
```

Expected:

```text
reaction:added
```

User A should see:

```text
❤️
```

without refreshing.

---

## 4. Remove Reaction

User B sends:

```text
reaction:remove
```

Expected:

```text
reaction:removed
```

User A should immediately see the reaction disappear.

---

## 5. Duplicate Reaction

Send:

```text
reaction:add ❤️
reaction:add ❤️
```

Expected:

```text
Only one ❤️ reaction
```

The second operation must be handled safely.

---

## 6. Multiple Reactions

Test:

```text
❤️
😂
🔥
👍
🎉
```

Verify each supported reaction is:

* Validated.
* Persisted.
* Broadcast.
* Rendered correctly.

---

## 7. Multiple Reactions From One User

Test:

```text
User A → ❤️
User A → 👍
User A → 😂
```

Expected:

```text
All three are valid
```

provided they are different reaction types.

Repeated:

```text
User A → ❤️
```

must remain a duplicate.

---

## 8. Multiple Users

Conversation:

```text
User A
User B
User C
```

Actions:

```text
A → ❤️
B → 🔥
C → 😂
```

Verify all users receive the appropriate updates.

---

## 9. Unauthorized User

User outside the conversation attempts:

```text
reaction:add
```

Expected:

```text
Rejected
```

No database record.

No broadcast.

Expected error:

```text
reaction:error
```

---

## 10. Wrong Message / Conversation

Send:

```text
conversationId = A
messageId = message from B
```

Expected:

```text
Rejected
```

No database mutation.

No broadcast.

---

## 11. Invalid Reaction

Send:

```text
reaction = "INVALID_VALUE"
```

Expected:

```text
reaction:error
```

with:

```text
INVALID_REACTION
```

No database record.

---

## 12. Unsupported Unicode Representation

Send an unsupported or non-canonical representation.

Expected:

```text
reaction:error
      │
      ▼
INVALID_REACTION
```

The value must not be normalized into a different supported reaction.

---

## 13. Remove Another User's Reaction

User A attempts to remove User B's reaction.

Expected:

```text
Rejected
```

The server must use:

```text
socket.user.userId
```

to identify the owner.

---

## 14. Offline User

Disconnect User A.

User B adds:

```text
❤️
```

Expected:

```text
MongoDB → reaction stored
```

Reconnect User A.

Expected:

```text
Current reaction state loaded
```

---

## 15. Multiple Devices

Connect User B:

```text
Chrome
Mobile
```

Add reaction from Mobile.

Expected:

```text
Chrome → reaction synchronized
Mobile → reaction synchronized
```

---

## 16. Optimistic UI Failure

Simulate:

```text
UI shows ❤️
      ↓
reaction:add
      ↓
Server rejects
```

Expected:

```text
reaction:error
      ↓
UI rollback
```

---

## 17. Database Failure

Simulate MongoDB failure.

Expected:

```text
reaction:add
      │
      ▼
Database failure
      │
      ▼
No reaction:added
      │
      ▼
reaction:error
```

---

## 18. Duplicate Event ID

For v1.1, event-level idempotency is optional.

If event-level tracking is not implemented:

```text
Same eventId
      │
      ▼
Database uniqueness remains the protection
```

If event-level idempotency is implemented later:

```text
First event → Process
Second event → Safely ignored or treated as duplicate
```

---

## 19. Reconnection

Test:

```text
Connected
   ↓
Disconnect
   ↓
Reconnect
```

Verify:

```text
Authentication
Room joining
Reaction synchronization
Current reaction state
```

all work correctly.

---

# 📈 Performance Considerations

Avoid sending the entire message object for every reaction.

Instead of:

```json
{
  "message": {
    "...": "large message object"
  }
}
```

prefer:

```json
{
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "userId": "68user456",
  "reaction": "❤️"
}
```

The frontend can update only the affected message.

---

# ⚡ Efficient UI Updates

When:

```text
reaction:added
```

arrives:

```text
Find message
      │
      ▼
Find reaction type
      │
      ▼
Increment reaction count
      │
      ▼
Update current user's reaction state
```

When:

```text
reaction:removed
```

arrives:

```text
Find message
      │
      ▼
Find reaction type
      │
      ▼
Decrement reaction count
      │
      ▼
Update current user's reaction state
```

Do not reload:

```text
Entire conversation
```

for every reaction.

---

# 🚀 Scaling Considerations

For one Socket.IO server:

```text
Node.js
   │
   ├── Socket.IO
   └── In-memory connections
```

For multiple servers:

```text
                 Load Balancer
                       │
              ┌────────┴────────┐
              ▼                 ▼
          Server A           Server B
              │                 │
              └────────┬────────┘
                       ▼
                     Redis
```

A Socket.IO adapter such as Redis can synchronize events between servers.

This is a future scaling concern and is **not required for the initial implementation**.

---

# 🧠 Source of Truth

For reactions:

```text
MongoDB
   │
   ▼
Persistent reaction state
```

For real-time notification:

```text
Socket.IO
   │
   ▼
Temporary event delivery
```

Therefore:

```text
Socket.IO ≠ Database
```

Socket.IO tells clients:

> Something changed.

MongoDB tells clients:

> What the current state is.

---

# 📊 Feature Comparison

| Feature      | Persistent Layer  | Real-Time Layer                 |
| ------------ | ----------------- | ------------------------------- |
| Message      | MongoDB           | Socket.IO                       |
| Reaction     | MongoDB           | Socket.IO                       |
| Read Receipt | MongoDB           | Socket.IO                       |
| Presence     | No                | Socket.IO                       |
| Typing       | No                | Socket.IO                       |
| Search       | MongoDB           | REST                            |
| Attachments  | File Storage + DB | Socket notification if required |

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Socket authentication required.
* [ ] User identity comes from authenticated socket.
* [ ] Client cannot impersonate another user.
* [ ] Conversation membership validated.
* [ ] Message existence validated.
* [ ] Message belongs to conversation.
* [ ] Reaction type validated.
* [ ] Unsupported reactions rejected.
* [ ] Maximum reaction length enforced at schema level.
* [ ] Duplicate reactions handled.
* [ ] Database uniqueness enforced.
* [ ] User can only remove their own reaction.
* [ ] MongoDB update occurs before broadcast.
* [ ] Failed database operation does not broadcast.
* [ ] Unauthorized requests emit `reaction:error`.
* [ ] Offline users can synchronize state after reconnect.
* [ ] Multiple devices are supported.
* [ ] Conversation rooms are used.
* [ ] Real-time events are documented.
* [ ] Existing Phase 2 business logic is reused.
* [ ] REST fallback remains available.
* [ ] Event-level idempotency is explicitly treated as optional for v1.1.

---

# 🛠️ Implementation Checklist

Before marking the module as fully implemented:

* [ ] `reaction:add` handler implemented.
* [ ] `reaction:remove` handler implemented.
* [ ] `reaction.service` integration completed.
* [ ] Payload validation implemented in the Socket.IO boundary.
* [ ] Conversation membership validation implemented in the service layer.
* [ ] Message ownership validation implemented.
* [ ] Message/conversation relationship validation implemented.
* [ ] Reaction whitelist validation implemented.
* [ ] Duplicate protection implemented.
* [ ] Compound unique database index implemented.
* [ ] `reaction:added` event implemented.
* [ ] `reaction:removed` event implemented.
* [ ] `reaction:error` event implemented.
* [ ] Conversation room broadcasting implemented.
* [ ] Sender synchronization implemented.
* [ ] Multiple-device synchronization implemented.
* [ ] Reconnect synchronization implemented.
* [ ] Optimistic UI handling implemented.
* [ ] Optimistic UI rollback implemented.
* [ ] Database idempotency implemented.
* [ ] Event-level idempotency considered as optional future enhancement.
* [ ] REST fallback verified.
* [ ] Integration tests completed.
* [ ] Socket.IO tests completed.
* [ ] Error scenarios tested.
* [ ] Database failure tested.
* [ ] Unauthorized access tested.
* [ ] Documentation updated.

---

# 📈 Phase 3 Completion

After successfully implementing and testing this module:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  ✅
├── Typing Indicators           ✅
├── Online / Offline Presence   ✅
├── Real-Time Read Receipts     ✅
└── Real-Time Reactions         ✅
```

After successful implementation and testing of this module, **Phase 3 — Real-Time Communication is considered complete.**

Writing the README alone does not mark the module as complete.

---

# 🎯 Overall Project Progress

## Phase 1 — Core Backend

```text
Organization           ✅
Project                ✅
Workspace              ✅
Authentication         ✅
Conversation           ✅
Conversation Members   ✅
Messages               ✅
```

## Phase 2 — Messaging Features

```text
Message Reactions      ✅
Read Receipts          ✅
Attachments            ✅
Message Search         ✅
```

## Phase 3 — Real-Time Communication

```text
Socket.IO Setup             ✅
Real-Time Message Delivery  ✅
Typing Indicators           ✅
Online / Offline Presence   ✅
Real-Time Read Receipts     ✅
Real-Time Reactions         🟡
```

---

# 🏁 Phase 3 Milestone

Once Real-Time Reactions are successfully implemented and tested, the backend will have a complete first-generation real-time communication layer:

```text
                    CHAT PLATFORM
                         │
                         ▼
              Real-Time Communication
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
    Messages          Presence           Typing
       │                 │                 │
       ▼                 ▼                 ▼
   message:new    online/offline      start/stop
       │
       ├──────────────────────┐
       ▼                      ▼
 Read Receipts             Reactions
       │                      │
       ▼                      ▼
 message:read       reaction:added/removed
```

At this stage, the backend has moved beyond a basic CRUD messaging API and has become a reusable **real-time communication platform**.

---

# 🚀 Next Phase — Phase 4

The next phase should focus on:

```text
Phase 4 — Notifications & Advanced Features
```

Potential modules:

```text
├── In-App Notifications
├── Notification Preferences
├── Message Mentions
├── Unread Counters
├── Conversation Notifications
└── Notification Delivery
```

These features can build on the real-time foundation established during Phase 3.

---

# 🔗 Relationship Between Phase 3 and Phase 4

Phase 3 provides the real-time infrastructure:

```text
Socket.IO
   │
   ├── Messages
   ├── Typing
   ├── Presence
   ├── Read Receipts
   └── Reactions
```

Phase 4 can consume that infrastructure:

```text
Real-Time Communication
          │
          ▼
      Notifications
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
 Mentions Unread Preferences
```

This allows the system to evolve from a real-time chat backend into a broader communication platform suitable for:

```text
CRM
HRM
ERP
Project Management
Customer Support
Team Collaboration
Business Communication
```

---

# 📌 Summary

The **Real-Time Reactions module** completes the real-time synchronization of the Phase 2 Message Reactions functionality.

The key architecture is:

```text
                User Action
                    │
                    ▼
              Socket.IO
                    │
                    ▼
             Reaction Service
                    │
             ┌──────┴──────┐
             ▼             ▼
          MongoDB       Validation
             │
             ▼
        Reaction Saved
             │
             ▼
       Realtime Service
             │
             ▼
       Socket.IO Event
             │
             ▼
     Conversation Members
             │
             ▼
          UI Update
```

The core principles are:

```text
MongoDB
   │
   └── Source of truth

Socket.IO
   │
   └── Real-time event delivery

Reaction Service
   │
   └── Shared business and authorization logic

REST
   │
   └── Persistent operations

Socket.IO
   │
   └── Real-time synchronization
```

The idempotency model is explicitly:

```text
Database Idempotency
        │
        └── Required in v1.1
            Compound unique index

Event-Level Idempotency
        │
        └── Optional in v1.1
            Future enhancement
```

The reaction contract is explicitly:

```text
Server-defined supported emoji
        │
        ▼
Exact canonical match
        │
        ▼
Persist canonical value
```

The most important rule remains:

> **MongoDB stores the reaction; Socket.IO communicates the reaction change instantly.**

With this module successfully implemented and tested, **Phase 3 — Real-Time Communication is complete**.

The project can then move to:

```text
Phase 4 — Notifications & Advanced Features
```

# 💬 Real-Time Message Delivery Module

## 📋 Module Information

| Property        | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Module          | Real-Time Message Delivery                                               |
| Version         | v1.1                                                                     |
| Status          | 🟡 In Development                                                        |
| Phase           | Phase 3 — Real-Time Communication                                        |
| Previous Module | Socket.IO Setup                                                          |
| Next Module     | Typing Indicators                                                        |
| Depends On      | Authentication, Conversations, Conversation Members, Messages, Socket.IO |
| Database        | MongoDB                                                                  |
| Real-Time Layer | Socket.IO                                                                |

---

# 📌 Overview

The **Real-Time Message Delivery module** connects the existing Messages module with the Socket.IO infrastructure.

Before this module, messages work through REST APIs:

```text
User A
   │
   │ POST /api/messages
   ▼
Express API
   │
   ▼
MongoDB
   │
   ▼
Response
```

The message is successfully stored, but other users do not automatically receive it.

This module adds:

```text
User A
   │
   │ Send Message
   ▼
REST API
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

Now the message appears instantly for all authorized connected members.

---

# 🎯 Objectives

The Real-Time Message Delivery module is responsible for:

* Sending messages through the existing Messages API
* Persisting messages in MongoDB
* Emitting newly created messages through Socket.IO
* Delivering messages to authorized conversation members
* Supporting conversation rooms
* Preventing unauthorized message delivery
* Handling sender and receiver sockets correctly
* Supporting multiple connected users
* Supporting multiple devices per user
* Providing message delivery acknowledgements where applicable
* Handling disconnected users safely
* Recovering missed messages through REST APIs
* Maintaining message ordering
* Keeping REST and WebSocket responsibilities separated

---

# 🧠 Core Architecture

The recommended architecture is:

```text
                 User A
                   │
                   │ HTTP
                   ▼
              Message API
                   │
                   ▼
               Validate
                   │
                   ▼
                MongoDB
                   │
                   ▼
            Message Created
                   │
                   ▼
              Socket.IO
                   │
                   ▼
        conversation:{id}
             /      |      \
            ▼       ▼       ▼
         User B   User C   User D
```

The important principle is:

> **REST creates and persists the message. Socket.IO delivers the real-time event.**

Do not make Socket.IO the only mechanism responsible for message persistence.

---

# 🚨 Important Design Decision

Do not use:

```text
Socket.IO
   ↓
Create message
   ↓
MongoDB
```

as the primary message creation path.

Instead:

```text
Client
   │
   ▼
POST /messages
   │
   ▼
Validate
   │
   ▼
Save MongoDB
   │
   ▼
Emit Socket Event
```

This gives MongoDB a reliable role as the **source of truth**.

---

# 🗄️ Source of Truth

MongoDB is the authoritative source for message state.

```text
MongoDB
   │
   ├── Persistent Message
   ├── Message ID
   ├── Sender
   ├── Conversation
   ├── createdAt
   └── Message Metadata
```

Socket.IO is responsible for **real-time delivery**, not permanent message storage.

Therefore:

```text
MongoDB = Source of Truth
Socket.IO = Real-Time Delivery Layer
REST API = Persistent Data Access Layer
```

If a socket delivery fails, the message must still remain safely persisted in MongoDB.

---

# 🔄 Complete Message Flow

```text
User A
  │
  │ 1. Send message
  ▼
POST /api/messages
  │
  │ 2. Authentication
  ▼
Message Controller
  │
  │ 3. Authorization
  ▼
Message Service
  │
  │ 4. Create message
  ▼
MongoDB
  │
  │ 5. Message saved
  ▼
Realtime Service
  │
  │ 6. Emit event
  ▼
Socket.IO
  │
  ▼
Conversation Room
  │
  ├──────────────┐
  ▼              ▼
User B         User C
  │              │
  ▼              ▼
UI Update      UI Update
```

---

# 📡 Event Name

Recommended event:

```text
message:new
```

This event means:

> A new message has been successfully created and is available to authorized members of the conversation.

---

# 📑 Socket.IO Event Contract

The real-time layer uses clearly defined events between clients and the server.

## Client → Server Events

| Event                | Direction       | Purpose                                           |
| -------------------- | --------------- | ------------------------------------------------- |
| `conversation:join`  | Client → Server | Request access to an authorized conversation room |
| `conversation:leave` | Client → Server | Leave an authorized conversation room             |

## Server → Client Events

| Event         | Direction       | Purpose                                                            |
| ------------- | --------------- | ------------------------------------------------------------------ |
| `message:new` | Server → Client | Deliver a newly created message to authorized conversation members |

Future modules will extend this contract with events such as:

```text
typing:start
typing:stop
presence:update
message:read
message:reaction
message:updated
message:deleted
```

---

# 🔐 Event Authentication & Authorization

| Event                | Authentication   | Authorization                             |
| -------------------- | ---------------- | ----------------------------------------- |
| `conversation:join`  | Required         | Conversation membership                   |
| `conversation:leave` | Required         | Conversation membership                   |
| `message:new`        | Server-generated | Delivered only to authorized room members |

The client must never be able to arbitrarily subscribe to a conversation simply by providing a conversation ID.

---

# 📤 Event Direction

The final message event is server-controlled:

```text
Server
   │
   │ message:new
   ▼
Conversation Room
```

The client does not directly broadcast the final message to other users.

The server creates the canonical message and controls its delivery.

---

# 📦 Event Payload

Recommended payload:

```json
{
    "message": {
        "_id": "68message123",
        "conversationId": "68conversation123",
        "senderId": "68user123",
        "content": "Hello everyone!",
        "messageType": "text",
        "isDeleted": false,
        "createdAt": "2026-08-10T10:30:00Z"
    }
}
```

The payload should contain the same canonical message data returned by the API where practical.

---

# 🧠 Why the Server Should Broadcast the Saved Message

Do not immediately broadcast the client's raw payload:

```json
{
    "content": "Hello"
}
```

because the database may add:

```text
_id
createdAt
senderId
conversationId
messageType
```

The server should first create the actual message and then broadcast the saved representation.

```text
Client Payload
      │
      ▼
Validate
      │
      ▼
MongoDB
      │
      ▼
Canonical Message
      │
      ▼
Socket Event
```

This keeps all connected clients synchronized.

---

# 🔐 Authorization

Before creating a message:

```text
Authenticated User
       │
       ▼
Conversation Exists?
       │
       ▼
User Is Member?
       │
       ├── No → 403
       │
       ▼
Create Message
```

Before broadcasting:

```text
Message
   │
   ▼
Conversation
   │
   ▼
Authorized Conversation Room
```

Only members of the conversation should receive the event.

---

# 🏠 Conversation Room

The room naming convention from the Socket.IO Setup module is:

```text
conversation:{conversationId}
```

Example:

```text
conversation:68conversation123
```

Members:

```text
conversation:68conversation123
        │
        ├── User A
        ├── User B
        └── User C
```

---

# 🛡️ Conversation Room Authorization

A socket being connected does not automatically mean it has access to every conversation.

Before joining a room:

```text
Client
   │
   │ conversation:join
   ▼
Socket Server
   │
   ▼
Authenticate Socket
   │
   ▼
Conversation Exists?
   │
   ▼
Check Conversation Membership
   │
   ├── No → Reject Join
   │
   ▼
Join Room
```

The server must verify conversation membership before allowing a socket to join:

```text
conversation:{conversationId}
```

The client must not be trusted to provide an arbitrary conversation ID and automatically gain access to its events.

### Important Rule

> **Only authenticated users who are authorized members of a conversation may join that conversation's Socket.IO room.**

---

# 📤 Broadcasting

When the message is successfully saved:

```javascript
io.to(`conversation:${conversationId}`)
  .emit("message:new", {
      message
  });
```

All sockets currently joined to the authorized room receive the event.

---

# 👤 Should the Sender Receive the Event?

There are two possible approaches.

## Option A — Broadcast to Everyone

```javascript
io.to(room).emit(...);
```

Sender also receives:

```text
message:new
```

This is simple and recommended initially.

---

## Option B — Broadcast to Everyone Except Sender

```javascript
socket.to(room).emit(...);
```

The sender relies on the HTTP response to update their UI.

This can also work.

### Recommended for your project:

Use **Option A** initially.

Why?

Because every connected client receives the same canonical event.

```text
User A
   │
   ├── HTTP response
   │
   └── message:new
```

The frontend should deduplicate using the message `_id` when necessary.

---

# 🔄 REST Response + Socket Event

After:

```text
POST /api/messages
```

the sender receives:

```json
{
    "success": true,
    "data": {
        "message": {
            "_id": "68message123",
            "content": "Hello"
        }
    }
}
```

At approximately the same time, conversation members receive:

```text
message:new
```

containing the saved message.

---

# 🧠 Duplicate Message Prevention

Because the sender may receive:

```text
HTTP response
+
message:new
```

the frontend should use the message `_id` as the unique identifier.

Example:

```text
Existing message ID:
68message123
```

If the same ID is received again:

```text
Do not add duplicate message.
```

---

# 🆔 Message ID as the Source of Identity

Never identify messages using:

```text
content
timestamp
sender
```

Use:

```text
message._id
```

as the unique identifier.

---

# 📡 Event Lifecycle

```text
POST /messages
      │
      ▼
Validate Request
      │
      ▼
Authorize Conversation
      │
      ▼
Message Created
      │
      ▼
Message ID Generated
      │
      ▼
Message Persisted
      │
      ▼
Realtime Service
      │
      ▼
message:new
      │
      ▼
Conversation Members
```

---

# 🔄 Failed Message Creation

If MongoDB fails:

```text
Client
   │
   ▼
POST /messages
   │
   ▼
MongoDB Error
   │
   ▼
500 Response
```

Do **not** emit:

```text
message:new
```

because no valid persistent message exists.

---

# 🚨 Important Persistence Rule

Only emit:

```text
message:new
```

after successful persistence.

```text
MongoDB Save
     │
     ├── Failed → No Socket Event
     │
     ▼
   Success
     │
     ▼
 Socket Event
```

This prevents clients from receiving messages that do not actually exist in the database.

---

# 🔄 Socket Delivery Failure & Recovery

Socket.IO delivery happens after the message has been persisted.

Therefore:

```text
MongoDB Save
      │
      ▼
Socket.IO Emit
```

If MongoDB succeeds but real-time delivery is temporarily unavailable:

```text
MongoDB
   │
   └── Message safely persisted
              │
              ▼
       Socket Delivery
              │
              ├── Success → Client receives event
              │
              └── Failure → Client may miss event
```

The message must **not** be deleted or rolled back simply because a real-time delivery attempt fails.

The recovery mechanism is:

```text
MongoDB = Source of Truth
        ↓
REST Message Fetch
        ↓
Client Synchronization
```

When the user reconnects or opens the conversation:

```text
GET /api/conversations/:conversationId/messages
```

the client can retrieve messages that were missed while disconnected.

### Reliability Principle

> **Socket.IO provides real-time delivery, while REST + MongoDB provide reliable message recovery.**

---

# 📎 Attachments

This module should work with the completed Attachments module.

Example:

```text
User sends:
proposal.pdf
```

Flow:

```text
Upload Attachment
      │
      ▼
Attachment Created
      │
      ▼
Create Message
      │
      ▼
MongoDB
      │
      ▼
message:new
```

Event:

```json
{
    "message": {
        "_id": "68message123",
        "messageType": "file",
        "content": "Here is the proposal.",
        "attachments": [
            {
                "_id": "68attachment123",
                "fileName": "proposal.pdf",
                "mimeType": "application/pdf"
            }
        ]
    }
}
```

---

# 🖼️ Image Messages

Example:

```json
{
    "message": {
        "_id": "68message123",
        "messageType": "image",
        "attachments": [
            {
                "_id": "68attachment123",
                "fileName": "design.png",
                "mimeType": "image/png"
            }
        ]
    }
}
```

The Socket.IO layer does not need separate image logic.

It simply delivers the message event.

---

# 🧩 Message Types

The system can support:

```text
text
image
file
audio
video
system
```

All can use:

```text
message:new
```

The frontend decides how to render the message based on:

```text
messageType
```

---

# 🔐 Multi-Tenant Security

Your chat platform supports:

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
```

The real-time event must respect this hierarchy.

Example:

```text
Organization A
   │
   └── Conversation A
          │
          └── Message A
```

must never be emitted into:

```text
Organization B
```

Room authorization and conversation membership must therefore be validated before socket room access is granted.

---

# 👥 Multiple Users

Example:

```text
Conversation A

User A
User B
User C
User D
```

User A sends:

```text
"Hello everyone"
```

Server:

```text
message:new
```

Recipients:

```text
User A → receives
User B → receives
User C → receives
User D → receives
```

---

# 📱 Multiple Devices

A single user can have multiple sockets.

Example:

```text
User A
  │
  ├── Chrome
  │     └── Socket A
  │
  └── Mobile
        └── Socket B
```

Both should receive:

```text
message:new
```

because both sockets are members of the same conversation room.

This is one reason you should use Socket.IO rooms rather than manually tracking only one socket per user.

---

# 🌐 Offline Users

If a user is disconnected:

```text
User B
   │
   └── Offline
```

they will not receive the real-time socket event.

However, the message is already stored in:

```text
MongoDB
```

When the user reconnects or opens the conversation:

```text
GET /api/conversations/:conversationId/messages
```

they can retrieve the missed messages.

This is why:

> **MongoDB remains the source of truth.**

---

# 🔄 Offline Message Flow

```text
User A
   │
   ▼
Send Message
   │
   ▼
MongoDB
   │
   ├──────────────► User B Online
   │                     │
   │                     ▼
   │                message:new
   │
   └──────────────► User C Offline
                         │
                         ▼
                    No Socket Event
                         │
                         ▼
                    Reconnect
                         │
                         ▼
                  Fetch Messages
                         │
                         ▼
                  Recover Message
```

---

# 🧠 Message Ordering

Messages should initially be rendered using the server-generated:

```text
createdAt
```

Example:

```text
Message A → 10:30:01
Message B → 10:30:03
Message C → 10:30:05
```

The client can sort messages:

```text
createdAt: 1
```

for oldest-to-newest display.

---

# ⚠️ Important Ordering Limitation

`createdAt` is suitable for normal chronological rendering, but it is **not a strict distributed ordering guarantee**.

For example, under high concurrency, multiple messages may have very close timestamps.

The initial implementation can safely use:

```text
createdAt
```

for normal chat rendering.

If stronger deterministic ordering becomes necessary later, the system can introduce a server-generated conversation sequence:

```text
conversationSequence
```

Example:

```text
Message A → sequence 101
Message B → sequence 102
Message C → sequence 103
```

This can provide stronger deterministic ordering within a conversation.

### Current Decision

For this module:

```text
createdAt → Initial message ordering
```

Future scalability improvement:

```text
conversationSequence → Strong deterministic ordering
```

No sequence mechanism is required at this stage.

---

# ⚠️ Client Timestamp

Do not trust the client's timestamp for message ordering.

Avoid:

```json
{
    "createdAt": "client-provided-date"
}
```

The backend should generate:

```text
createdAt
```

This prevents clients from manipulating message timestamps.

---

# 🔄 Event Ordering

Example:

```text
Message A
Message B
Message C
```

The normal expected delivery sequence is:

```text
message:new → A
message:new → B
message:new → C
```

However, real-time delivery should not be treated as a permanent persistence guarantee.

If a client detects a missing or inconsistent message sequence, it can recover the authoritative conversation state through the REST API.

```text
Socket Event
     │
     ▼
Client Message List
     │
     ├── Consistent → Continue
     │
     └── Missing/Inconsistent
              │
              ▼
       Fetch Messages
              │
              ▼
       Synchronize State
```

---

# 🧩 Service Architecture

The message creation service should remain independent from Socket.IO.

Recommended:

```text
Message Controller
        │
        ▼
Message Service
        │
        ├── Validate
        ├── Authorize
        └── Save Message
                │
                ▼
             MongoDB
```

Then:

```text
Message Service
        │
        ▼
Realtime Event Service
        │
        ▼
Socket.IO
```

This separation prevents your database logic from becoming tightly coupled to Socket.IO.

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
│   │   └── message.handler.js
│   │
│   └── events/
│       └── message.events.js
│
├── controllers/
│   └── message.controller.js
│
├── services/
│   ├── message.service.js
│   └── realtime.service.js
│
├── models/
│   └── Message.js
│
└── routes/
    └── message.routes.js
```

---

# 🧠 Real-Time Service

A dedicated service can expose:

```text
emitNewMessage()
emitMessageUpdated()
emitMessageDeleted()
```

Example conceptual API:

```javascript
realtimeService.emitNewMessage(
    conversationId,
    message
);
```

The Message Service does not need to know how Socket.IO rooms work internally.

---

# 📡 Event Service

Recommended responsibility:

```text
Realtime Service
       │
       ├── emitToConversation()
       ├── emitToUser()
       └── emitToWorkspace()
```

Future modules can reuse it.

For example:

```text
Typing Indicators
       ↓
Realtime Service

Read Receipts
       ↓
Realtime Service

Reactions
       ↓
Realtime Service

Presence
       ↓
Realtime Service
```

---

# 🔔 Future Events

This module establishes:

```text
message:new
```

Later:

```text
message:updated
message:deleted
typing:start
typing:stop
presence:update
message:read
message:reaction
```

---

# 📤 Message Acknowledgement

Socket.IO acknowledgements can be used for events that require confirmation.

Example:

```text
Client
   │
   │ conversation:join
   ▼
Server
   │
   ▼
Authorization
   │
   ▼
Join Room
   │
   ▼
Acknowledgement
```

For example, a successful room join may return:

```json
{
    "success": true,
    "conversationId": "68conversation123"
}
```

A rejected request may return:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

However, for the current architecture, **message creation should remain through the REST API**.

Socket acknowledgements become more useful for future real-time actions.

---

# 🧪 Postman / Client Testing Plan

## 1. Login

```text
POST /api/auth/login
```

Get JWT.

---

## 2. Connect Socket

Use the authenticated token.

Expected:

```text
Socket connected
```

---

## 3. Join Conversation

Send:

```text
conversation:join
```

with the conversation ID.

Expected:

```text
Successfully joined conversation
```

The server must verify that the authenticated user is a member before joining the room.

---

## 4. Create Message

Use:

```text
POST /api/messages
```

Example:

```json
{
    "conversationId": "68conversation123",
    "content": "Hello everyone!",
    "messageType": "text"
}
```

---

## 5. Verify MongoDB

Verify:

```text
Message exists
```

and contains server-generated values such as:

```text
_id
senderId
conversationId
createdAt
```

---

## 6. Verify Socket Event

Other connected members should receive:

```text
message:new
```

---

## 7. Test Multiple Users

Open:

```text
Browser A
Browser B
Browser C
```

Login as different conversation members.

Send from Browser A.

Expected:

```text
Browser A → receives
Browser B → receives
Browser C → receives
```

---

## 8. Unauthorized User

Connect a user who is not a conversation member.

Attempt:

```text
conversation:join
```

Expected:

```text
Join rejected
```

That user must not receive:

```text
message:new
```

---

## 9. Offline User

Disconnect Browser B.

Send a message from Browser A.

Browser B should not receive a socket event while disconnected.

Reconnect Browser B.

Fetch messages.

Verify the missed message exists.

---

## 10. Attachment Message

Upload:

```text
proposal.pdf
```

Create a message referencing the attachment.

Expected:

```text
message:new
```

with attachment metadata.

---

## 11. Multiple Messages

Send:

```text
Message 1
Message 2
Message 3
```

Verify all clients receive them and the UI maintains the correct chronological order.

---

## 12. Socket Delivery Recovery

Simulate or reproduce a temporary socket disconnection.

Create a message while a client is disconnected.

Expected:

```text
Message remains in MongoDB
       ↓
Client reconnects
       ↓
Fetch messages
       ↓
Missed message recovered
```

---

# 🚨 Error Handling

## Conversation Not Found

```json
{
    "success": false,
    "message": "Conversation not found"
}
```

---

## Unauthorized Conversation

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

---

## Invalid Message

```json
{
    "success": false,
    "message": "Message content is required"
}
```

---

## Database Failure

```json
{
    "success": false,
    "message": "Unable to create message"
}
```

No:

```text
message:new
```

event should be emitted.

---

## Unauthorized Room Join

If the user is not a member:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

The socket must not join the room.

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Message creation requires authentication.
* [ ] Conversation membership is validated.
* [ ] Conversation room membership is authorized by the server.
* [ ] Clients cannot arbitrarily join conversation rooms.
* [ ] Message is persisted before broadcasting.
* [ ] Only authorized conversation members receive events.
* [ ] Conversation rooms are used.
* [ ] Sender identity comes from the authenticated user.
* [ ] Client cannot impersonate another sender.
* [ ] Server generates message ID.
* [ ] Server generates `createdAt`.
* [ ] Deleted messages are not broadcast as new messages.
* [ ] Failed database operations do not emit events.
* [ ] Attachment ownership is validated.
* [ ] Multiple sockets per user are supported.
* [ ] Multiple devices per user are supported.
* [ ] Offline users can retrieve missed messages through REST.
* [ ] Socket delivery failures do not invalidate persisted messages.
* [ ] Message duplication is handled by message ID.
* [ ] Message ordering uses server-generated data.
* [ ] Socket events use documented names.
* [ ] REST and Socket responsibilities remain separated.
* [ ] MongoDB remains the source of truth.

---

# 📊 Phase 3 Progress

After completing this module:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  🟡 Current
├── Typing Indicators           ⏳
├── Online / Offline Presence   ⏳
├── Real-Time Read Receipts     ⏳
└── Real-Time Reactions         ⏳
```

---

# 🎯 Overall Project Progress

```text
Phase 1 — Core Backend

Organization           ✅
Project                ✅
Workspace              ✅
Authentication         ✅
Conversation            ✅
Conversation Members   ✅
Messages               ✅


Phase 2 — Messaging Features

Message Reactions      ✅
Read Receipts          ✅
Attachments            ✅
Message Search         ✅


Phase 3 — Real-Time Communication

Socket.IO Setup             ✅
Real-Time Message Delivery  🟡
Typing Indicators            ⏳
Online / Offline Presence    ⏳
Real-Time Read Receipts     ⏳
Real-Time Reactions         ⏳
```

---

# 📌 Summary

The **Real-Time Message Delivery module** transforms the existing message system from a traditional REST-based messaging API into a real-time communication system.

The final architecture is:

```text
                       Client
                         │
              ┌──────────┴──────────┐
              │                     │
             HTTP               Socket.IO
              │                     │
              ▼                     ▼
        Message API           Real-Time Layer
              │                     │
              ▼                     ▼
           MongoDB             Conversation Room
              │                     │
              └──────────┬──────────┘
                         ▼
                  Connected Users
```

The key principle is:

```text
REST API
   │
   ├── Authenticate
   ├── Validate
   ├── Authorize
   └── Persist
          │
          ▼
       MongoDB
          │
          │ Source of Truth
          ▼
      Realtime Service
          │
          ▼
       Socket.IO
          │
          ▼
    message:new
          │
          ▼
   Authorized Conversation
        Members
```

For room access:

```text
Authenticated Socket
        │
        ▼
conversation:join
        │
        ▼
Verify Conversation
        │
        ▼
Verify Membership
        │
        ├── Unauthorized → Reject
        │
        ▼
    Join Room
        │
        ▼
Receive Real-Time Events
```

For reliability:

```text
Message Request
      │
      ▼
   MongoDB
      │
      ├── Failed
      │     └── No message:new
      │
      ▼
   Persisted
      │
      ▼
 Socket.IO Emit
      │
      ├── Delivered → Real-Time UI Update
      │
      └── Missed → Recover through REST
```

The system therefore separates responsibilities clearly:

```text
MongoDB
   ↓
Persistent Source of Truth

REST API
   ↓
Create / Retrieve Persistent Data

Socket.IO
   ↓
Real-Time Event Delivery
```

This provides the foundation for the real-time experience expected from modern chat applications.

---

# 🚀 Next Module

The next module is:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  🟡
└── Typing Indicators           ← NEXT
```

The **Typing Indicators** module will build on this real-time infrastructure and introduce events such as:

```text
typing:start
typing:stop
```

so users can see when another participant is currently typing.

The same authenticated Socket.IO connection and conversation-room authorization established in this module will be reused for typing events.

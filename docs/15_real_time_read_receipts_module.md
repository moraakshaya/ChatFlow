# 👁️ Real-Time Read Receipts Module

## 📋 Module Information

| Property            | Value                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| Module              | Real-Time Read Receipts                                                                 |
| Version             | v1.2                                                                                    |
| Status              | 🟡 In Development                                                                       |
| Phase               | Phase 3 — Real-Time Communication                                                       |
| Previous Module     | Online / Offline Presence                                                               |
| Next Module         | Real-Time Reactions                                                                     |
| Depends On          | Authentication, Conversations, Conversation Members, Messages, Read Receipts, Socket.IO |
| Database            | MongoDB                                                                                 |
| Real-Time Layer     | Socket.IO                                                                               |
| Persistent State    | MongoDB                                                                                 |
| Real-Time Transport | Socket.IO                                                                               |

---

# 📌 Overview

The **Real-Time Read Receipts module** connects the existing persistent Read Receipts functionality from Phase 2 with Socket.IO.

Phase 2 already allows the application to store:

```text
Message
   │
   ▼
Read Receipt
   │
   ▼
MongoDB
```

However, without real-time communication, another user may need to refresh the conversation before seeing that their message was read.

Phase 3 changes this:

```text
User B
   │
   │ Reads message
   ▼
Socket.IO
   │
   ▼
read:message
   │
   ▼
Read Receipt Service
   │
   ├── Validate
   ├── Authorize
   └── Persist
          │
          ▼
       MongoDB
          │
          ▼
Successful Persistence
          │
          ▼
   Realtime Service
          │
          ▼
     message:read
          │
          ▼
       User A
          │
          ▼
Message becomes "Read" instantly
```

The key principle is:

> **MongoDB stores the authoritative read state, while Socket.IO communicates successful read-state changes in real time.**

---

# 🎯 Objectives

The Real-Time Read Receipts module is responsible for:

* Detecting when a user reads a message
* Validating the read operation
* Persisting the read state
* Broadcasting successful read events through Socket.IO
* Updating the sender's UI instantly
* Supporting conversation rooms
* Supporting multiple messages
* Supporting multiple users
* Supporting multiple devices
* Preventing unauthorized read events
* Preventing users from marking messages in unauthorized conversations
* Keeping REST and Socket.IO responsibilities separated
* Maintaining MongoDB as the persistent source of truth
* Supporting Socket.IO acknowledgements
* Handling duplicate read requests safely
* Avoiding unnecessary duplicate real-time events
* Supporting offline recovery
* Supporting future cursor-based read optimization

---

# 🧠 Core Principle

Read receipts have two responsibilities:

```text
Persistent State
       │
       ▼
MongoDB
```

and:

```text
Real-Time Notification
       │
       ▼
Socket.IO
```

Therefore:

```text
Read Receipt
      │
      ├── Persist → MongoDB
      │
      └── Notify → Socket.IO
```

The architectural responsibility is:

```text
MongoDB
   ↓
Persistent Source of Truth

Socket.IO
   ↓
Real-Time Transport

Read Receipt Service
   ↓
Business Logic

Realtime Service
   ↓
Real-Time Event Delivery
```

---

# 🏗️ Architecture

The real-time read operation follows this flow:

```text
User reads message
       │
       ▼
Socket.IO
       │
       ▼
read:message
       │
       ▼
Read Receipt Handler
       │
       ▼
Read Receipt Service
       │
       ├── Authentication
       ├── Authorization
       ├── Payload Validation
       ├── Message Validation
       ├── Idempotency Check
       └── Persistence
              │
              ▼
           MongoDB
              │
              ▼
      Successful Persistence
              │
              ▼
       Realtime Service
              │
              ▼
        message:read
              │
              ▼
Authorized Conversation Members
              │
              ▼
          UI Updates
```

REST remains available for persistent state retrieval and recovery:

```text
REST API
   │
   ├── Fetch Read Receipts
   ├── Fetch Current Read State
   └── Recover State After Reconnection
```

---

# 🔄 Complete Read Flow

Example:

User A sends:

```text
"Hello!"
```

User B opens the conversation.

```text
User B
   │
   ▼
Message becomes readable
   │
   ▼
Frontend determines read condition
   │
   ▼
read:message
   │
   ▼
Socket.IO Server
   │
   ▼
Authentication
   │
   ▼
Authorization
   │
   ▼
Read Receipt Service
   │
   ▼
MongoDB
   │
   ▼
Receipt persisted
   │
   ▼
Realtime Service
   │
   ▼
message:read
   │
   ▼
User A
   │
   ▼
"Read" appears instantly
```

---

# 📖 Definition of "Read"

The Real-Time Read Receipts module must **not redefine what "read" means**.

The meaning of a read receipt is determined by the Phase 2 Read Receipts business rules.

For example, if the Phase 2 rule is:

> A message is considered read when it becomes visible to the recipient.

then the real-time flow is:

```text
Message becomes visible
        │
        ▼
Frontend determines read condition
        │
        ▼
read:message
        │
        ▼
Server validates request
        │
        ▼
Read Receipt Service
        │
        ▼
Persist receipt
        │
        ▼
message:read
```

Socket.IO only transports the read operation and resulting state change.

It must not independently decide:

```text
"User is looking at the message"
```

or:

```text
"User is reading the conversation"
```

unless that behavior is explicitly defined by the Phase 2 business rules.

---

# 📡 Event Names

The module uses:

```text
read:message
message:read
```

A future optimized event may be:

```text
read:conversation
```

For the initial implementation, the primary event is:

```text
read:message
```

---

# 📊 Canonical Event Contract

| Event               | Direction       | Purpose                                                   | Acknowledgement |
| ------------------- | --------------- | --------------------------------------------------------- | --------------- |
| `read:message`      | Client → Server | Mark one message as read                                  | Yes             |
| `message:read`      | Server → Client | Notify authorized members of successful read-state change | No              |
| `read:conversation` | Client → Server | Future bulk/cursor read operation                         | Yes             |
| `message:read`      | Server → Client | Resulting read notification                               | No              |

The distinction is:

```text
read:message
       ↓
Request / command

message:read
       ↓
Successful persisted state change notification
```

---

# 📤 `read:message`

The client sends this event when the application determines that a message has been read according to the Phase 2 read rules.

### Direction

```text
Client → Server
```

### Payload

```json
{
  "conversationId": "68conversation123",
  "messageId": "68message123"
}
```

The client must not provide:

```text
userId
readAt
```

The server determines both from authenticated context and server time.

---

# 📥 `read:message` Acknowledgement

`read:message` uses a Socket.IO acknowledgement.

Example:

```javascript
socket.emit(
    "read:message",
    {
        conversationId,
        messageId
    },
    (response) => {
        console.log(response);
    }
);
```

The acknowledgement confirms whether the server accepted and processed the read operation.

It is returned only to the requesting socket.

It is **not broadcast** to other users.

---

## 🔄 First Read vs Repeated Read

The acknowledgement behavior must be deterministic.

There are two possible successful cases:

### First-Time Read

When no read receipt exists for the authenticated user and message:

```text
First read
    ↓
Validate request
    ↓
No existing receipt
    ↓
Create read receipt
    ↓
Persist to MongoDB
    ↓
Return success acknowledgement
    ↓
Emit message:read
```

### Repeated Read

When a read receipt already exists:

```text
Repeated read
    ↓
Validate request
    ↓
Receipt already exists
    ↓
No database change
    ↓
Return success acknowledgement
    ↓
Do NOT emit message:read
```

Therefore:

```text
First read
    ↓
success: true
    ↓
message:read emitted

Repeated read
    ↓
success: true
    ↓
NO message:read emitted
```

The repeated request is still considered successful because the requested read state already exists.

This makes the operation **idempotent**.

---

## 🕒 `readAt` Behavior

The `readAt` value represents the **original time at which the read receipt was created**.

The server generates this timestamp during the first successful read.

### First Read

```text
First read
    ↓
Create receipt
    ↓
readAt = current server timestamp
```

Example:

```json
{
  "success": true,
  "messageId": "68message123",
  "readAt": "2026-08-10T06:30:00.000Z"
}
```

### Repeated Read

If the read receipt already exists:

```text
Repeated read
    ↓
Find existing receipt
    ↓
No new receipt
    ↓
No new timestamp
    ↓
Return existing readAt
```

Example:

```json
{
  "success": true,
  "messageId": "68message123",
  "readAt": "2026-08-10T06:30:00.000Z"
}
```

The timestamp remains:

```text
Original readAt
      ↑
      │
Never regenerated
```

Therefore:

> **Repeated `read:message` requests must return the original persisted `readAt`, not a newly generated timestamp.**

This ensures that `readAt` remains a reliable record of when the message was actually first read.

---

## ✅ Successful Acknowledgement

Example:

```json
{
  "success": true,
  "messageId": "68message123",
  "readAt": "2026-08-10T06:30:00.000Z"
}
```

The successful acknowledgement means:

```text
Request accepted
      ↓
Validation passed
      ↓
Read state persisted or already exists
```

More precisely:

```text
New read
   ↓
Read state persisted
   ↓
success: true

Existing read
   ↓
Existing read state returned
   ↓
success: true
```

The acknowledgement does not replace:

```text
message:read
```

The `message:read` event is responsible for synchronizing other authorized connected clients **only when a new read-state transition occurs**.

---

## ❌ Failed Acknowledgement

Example:

```json
{
  "success": false,
  "message": "You do not have access to this conversation"
}
```

Other examples may include:

```json
{
  "success": false,
  "message": "Message not found"
}
```

or:

```json
{
  "success": false,
  "message": "Message does not belong to this conversation"
}
```

No `message:read` event should be broadcast when validation or persistence fails.

---

# 🧠 Acknowledgement vs Broadcast

These two mechanisms have different responsibilities.

### Acknowledgement

```text
read:message
      │
      ▼
Server
      │
      ▼
Acknowledgement
      │
      ▼
Requesting Socket
```

Purpose:

> Tell the requesting client whether the operation was accepted.

### Broadcast

```text
Successful First-Time Read
      │
      ▼
message:read
      │
      ▼
Authorized Connected Clients
```

Purpose:

> Inform other clients that a new persisted read-state transition occurred.

Therefore:

```text
Acknowledgement
    ≠
Real-Time Broadcast
```

---

# 📤 `message:read`

This event represents a **successfully persisted first-time read-state transition**.

### Direction

```text
Server → Client
```

### Payload

```json
{
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "userId": "68user456",
  "readAt": "2026-08-10T06:30:00.000Z"
}
```

The server generates:

```text
userId
readAt
```

The client does not control these values.

---

# 👥 `message:read` Delivery Rule

The canonical delivery rule is:

> **After a successful first-time read transition, `message:read` is emitted to all authorized connected sockets in the conversation, except the socket that initiated the read operation.**

Example:

```text
Conversation
├── User A
├── User B ← reads message
└── User C
```

The event is delivered to:

```text
User A → message:read
User C → message:read
```

The initiating socket of User B does not need to receive its own event because it already knows that it initiated the operation.

### Repeated Read

If User B sends `read:message` again:

```text
Existing receipt
      ↓
success: true
      ↓
No message:read
```

Therefore:

```text
First-time read
      ↓
Persist
      ↓
message:read

Repeated read
      ↓
Existing state
      ↓
No broadcast
```

---

# 📱 Multi-Device Read Delivery

A user may have multiple connected devices.

Example:

```text
User B
   │
   ├── Mobile Socket
   └── Desktop Socket
```

User B reads a message from Mobile.

The Mobile socket initiates:

```text
read:message
```

The server persists the state and broadcasts:

```text
message:read
```

to:

```text
User A
User C
User B's Desktop Socket
```

The initiating:

```text
User B's Mobile Socket
```

does not need the broadcast.

Therefore:

```text
Initiating socket
        ↓
No message:read required

Other sockets of same user
        ↓
Receive message:read

Other authorized conversation members
        ↓
Receive message:read
```

This keeps the user's other devices synchronized.

---

# 🧠 Why Different Event Names?

Client request:

```text
read:message
```

means:

> "I am telling the server that I read this message."

Server notification:

```text
message:read
```

means:

> "This message has successfully been marked as read by this user."

This makes the event direction and responsibility clear.

---

# 🔐 User Identity

The client must not provide:

```json
{
  "userId": "another-user"
}
```

Instead, the server obtains the authenticated user from:

```text
socket.user.userId
```

Therefore:

```text
Client
   │
   ├── conversationId
   └── messageId

Server
   │
   └── userId from authenticated socket
```

This prevents:

```text
User A
   ↓
Pretend to be User B
   ↓
Mark message as read as User B
```

---

# ⏱️ Server-Generated Read Timestamp

The server generates:

```text
readAt
```

using server time.

Correct:

```text
Server
   │
   ▼
new Date()
```

Avoid:

```json
{
  "readAt": "client-provided-value"
}
```

The client must not control the authoritative read timestamp.

For repeated reads, the server must return the **existing persisted `readAt`** rather than generating a new timestamp.

---

# 🛡️ Authorization Flow

Before processing:

```text
read:message
```

the server must validate:

```text
Authenticated?
     │
     ▼
Conversation exists?
     │
     ▼
User is conversation member?
     │
     ▼
Message exists?
     │
     ▼
Message belongs to conversation?
     │
     ▼
Read operation allowed?
     │
     ▼
Process read receipt
```

If any validation fails:

```text
Reject
```

No read receipt should be created.

No:

```text
message:read
```

event should be emitted.

---

# 🏠 Conversation Room Authorization

Conversation rooms must never be treated as an authorization mechanism by themselves.

Before a socket joins:

```text
conversation:{conversationId}
```

the server must verify both authentication and conversation membership.

The canonical flow is:

```text
Join conversation room
        │
        ▼
Verify authenticated user
        │
        ▼
Verify conversation exists
        │
        ▼
Verify user is a conversation member
        │
        ▼
Join conversation room
```

Only after successful validation:

```text
socket.join(`conversation:${conversationId}`)
```

is allowed.

Therefore:

```text
Unauthenticated
      ↓
Cannot join room

Authenticated but not a member
      ↓
Cannot join room

Authenticated conversation member
      ↓
Allowed to join room
```

This is important because `message:read` delivery relies on the conversation room being trustworthy.

The room should therefore contain only:

```text
Authorized conversation members
```

The server must not allow a client to arbitrarily choose a conversation room and join it without membership verification.

---

# 🚫 Unauthorized Example

User A is not a member of:

```text
Conversation B
```

User A attempts:

```text
read:message
```

Expected:

```text
Membership validation
       │
       ▼
Rejected
       │
       ▼
success: false
```

No:

```text
MongoDB write
```

and no:

```text
message:read
```

event should occur.

---

# 🔐 Cross-Conversation Protection

The server must verify:

```text
message.conversationId
        ===
requested conversationId
```

Example invalid request:

```json
{
  "conversationId": "conversation-A",
  "messageId": "message-from-conversation-B"
}
```

Expected:

```text
Rejected
```

This prevents users from manipulating read state across conversations.

---

# 💾 Persistence

The existing Phase 2 Read Receipts module already handles persistent read state.

The Phase 3 module must reuse that business logic instead of creating a second read-receipt implementation.

Recommended architecture:

```text
             Read Receipt Service
                     ▲
                     │
          ┌──────────┴──────────┐
          │                     │
      REST API              Socket.IO
```

The service owns:

```text
Validation
Authorization
Persistence
Idempotency
Read-state rules
```

The transport layer owns:

```text
Socket.IO events
Acknowledgements
Event delivery
```

---

# 🧩 Service Reuse

Do not duplicate:

```text
Read Receipt validation
Read Receipt database logic
Authorization logic
Duplicate handling
Read-state rules
```

between REST and Socket.IO.

Instead:

```text
                  Read Receipt Service
                          ▲
                          │
               ┌──────────┴──────────┐
               │                     │
           REST API              Socket.IO
```

Both interfaces use the same business logic.

---

# 🔄 REST vs Socket.IO

## REST API

REST handles persistent state operations such as:

```text
Fetch Read Receipts
Fetch Current Read State
Recover State
Non-real-time Read Receipt Operations
```

Example:

```text
GET /api/messages/:messageId/read-receipts
```

or whatever endpoint is defined by the Phase 2 module.

## Socket.IO

Socket.IO handles:

```text
read:message
message:read
```

The responsibilities remain:

```text
REST
 ↓
Persistent Data Access / Recovery

Socket.IO
 ↓
Real-Time Command + Notification
```

---

# 📌 Recommended Architecture

```text
User reads message
       │
       ▼
Socket.IO
       │
       ▼
read:message
       │
       ▼
Read Receipt Service
       │
       ├── Authentication
       ├── Authorization
       ├── Validation
       ├── Idempotency
       └── Persistence
              │
              ▼
           MongoDB
              │
              ▼
      Successful Persistence
              │
              ▼
       Realtime Service
              │
              ▼
        message:read
              │
              ▼
Authorized Conversation Members
```

REST remains available for recovery:

```text
REST API
   │
   ▼
Current Persistent Read State
   │
   ▼
Client Synchronization
```

---

# 🏠 Conversation Room

Use the existing conversation room convention:

```text
conversation:{conversationId}
```

Example:

```text
conversation:68conversation123
```

Before joining this room, the server must perform:

```text
Socket connection
       │
       ▼
Authentication
       │
       ▼
Verify conversation exists
       │
       ▼
Verify conversation membership
       │
       ▼
Join room
```

Only authorized members can occupy the room.

After the read receipt is successfully persisted:

```javascript
socket
  .to(`conversation:${conversationId}`)
  .emit("message:read", {
      conversationId,
      messageId,
      userId,
      readAt
  });
```

The room must never be considered a substitute for authorization.

The server must still validate the user's membership when processing:

```text
read:message
```

---

# 👤 Who Receives the Event?

The canonical rule is:

```text
Successful first-time read
        │
        ▼
Conversation room
        │
        ├── Initiating socket
        │       └── Excluded
        │
        ├── Other sockets of reader
        │       └── Included
        │
        └── Other authorized members
                └── Included
```

Example:

```text
Conversation A
├── User A
├── User B
└── User C
```

User B reads a message.

Result:

```text
User A → message:read
User C → message:read
User B Desktop → message:read
User B Mobile → initiating socket → excluded
```

This ensures:

* Sender receives the update
* Other conversation members remain synchronized
* Reader's other devices remain synchronized
* Initiating socket does not receive a redundant event

---

# 👁️ Read Receipt Example

User A sends:

```text
"Hello!"
```

Initially:

```text
✓ Sent
```

User B receives it:

```text
✓✓ Delivered
```

User B opens the message according to the application's read rules:

```text
✓✓ Read
```

The transition is:

```text
Sent
 │
 ▼
Delivered
 │
 ▼
Read
```

The backend provides the authoritative read state and real-time event.

---

# 📊 Read State

A message can conceptually have:

```text
sent
delivered
read
```

However, do not automatically treat:

```text
Socket connected
```

as:

```text
message read
```

Likewise:

```text
Message received
```

does not automatically mean:

```text
Message read
```

The message becomes read only when the application processes the read action according to the Phase 2 read-receipt rules.

---

# 📱 Multiple Devices

A user can have:

```text
Chrome
Mobile
Tablet
```

Each may have a separate socket.

Example:

```text
User B
 ├── Socket A
 ├── Socket B
 └── Socket C
```

If User B reads a message from Mobile:

```text
Mobile
   │
   ▼
read:message
   │
   ▼
Read Receipt Service
   │
   ▼
MongoDB
   │
   ▼
message:read
```

Other connected devices can receive the updated state.

---

# 🔄 Multiple Messages

Suppose User B opens a conversation containing:

```text
Message 1
Message 2
Message 3
Message 4
```

The application may mark multiple messages as read.

Possible initial implementation:

```text
read:message
```

for each message.

Example:

```text
Message 1 → read
Message 2 → read
Message 3 → read
Message 4 → read
```

For high-volume conversations, a future optimization can support:

```text
read:conversation
```

or a last-read message cursor.

---

# 📌 Optional Conversation-Level Read Event

A future event can use:

```text
read:conversation
```

Payload:

```json
{
  "conversationId": "68conversation123",
  "lastReadMessageId": "68message456"
}
```

This can be more efficient than sending hundreds of individual read events.

For the first implementation, continue using:

```text
read:message
```

if that matches the Phase 2 design.

---

# 🧠 Last-Read Cursor

A scalable future architecture can represent:

```text
User B
   │
   ▼
Conversation A
   │
   ▼
Last Read Message
```

Example:

```text
lastReadMessageId = 68message456
```

Then all messages before that point can be considered read according to the application's ordering rules.

This is especially useful for large conversations.

This optimization is outside the initial implementation.

---

# 🧠 Idempotency

A user may generate multiple read events for the same message.

Example:

```text
read:message
read:message
read:message
```

The backend must handle this safely.

The logical read identity is:

```text
userId + messageId
```

The first read:

```text
First read
   │
   ▼
No existing receipt
   │
   ▼
Create receipt
   │
   ▼
Generate readAt
   │
   ▼
Persist receipt
   │
   ▼
Emit message:read
```

A repeated read:

```text
Repeated read
   │
   ▼
Receipt already exists
   │
   ▼
No database change
   │
   ▼
Return existing readAt
   │
   ▼
No message:read broadcast
```

This prevents:

```text
Receipt 1
Receipt 2
Receipt 3
```

for the same logical read state.

It also prevents unnecessary Socket.IO traffic.

---

# 🔄 Duplicate Read Behavior

The canonical rule is:

```text
First read
    ↓
Persist state
    ↓
Generate original readAt
    ↓
Return success acknowledgement
    ↓
Emit message:read

Repeated read
    ↓
Detect existing state
    ↓
Return success acknowledgement
    ↓
Return existing original readAt
    ↓
Do NOT emit message:read again
```

Therefore:

```text
First read
    ↓
success: true
readAt = original timestamp
message:read emitted

Repeated read
    ↓
success: true
readAt = same original timestamp
NO message:read
```

The read operation remains idempotent and deterministic.

---

# 📡 Message Read Event Payload

Recommended:

```json
{
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "userId": "68user456",
  "readAt": "2026-08-10T06:30:00.000Z"
}
```

The `readAt` value in `message:read` is the same original timestamp stored in MongoDB.

Optional future fields:

```json
{
  "messageId": "68message123",
  "userId": "68user456",
  "readAt": "2026-08-10T06:30:00.000Z",
  "deviceId": "mobile-device"
}
```

Do not add device-specific information unless the application actually needs it.

---

# 📡 Event Lifecycle

```text
User opens message
       │
       ▼
Frontend determines read condition
       │
       ▼
read:message
       │
       ▼
Socket.IO Server
       │
       ▼
Authentication
       │
       ▼
Authorization
       │
       ▼
Payload Validation
       │
       ▼
Read Receipt Service
       │
       ▼
Idempotency Check
       │
       ├── Already Read
       │      │
       │      ▼
       │   No DB change
       │      │
       │      ▼
       │   Return existing readAt
       │      │
       │      ▼
       │   No broadcast
       │
       └── New Read
              │
              ▼
        Generate readAt
              │
              ▼
           MongoDB
              │
              ▼
        Receipt Saved
              │
              ▼
        Realtime Service
              │
              ▼
         message:read
              │
              ▼
    Authorized Connected Members
              │
              ▼
           UI Updated
```

---

# ⚠️ Failed Persistence

If MongoDB fails:

```text
read:message
       │
       ▼
Read Receipt Service
       │
       ▼
Database Error
       │
       ▼
No message:read event
```

The acknowledgement should indicate failure:

```json
{
  "success": false,
  "message": "Unable to process read receipt"
}
```

Do not broadcast a read state that was not successfully persisted.

---

# 🔄 Offline Sender

Suppose:

```text
User A = Offline
User B = Online
```

User B reads the message.

The read receipt is persisted:

```text
User B
   │
   ▼
MongoDB
```

But User A is offline and cannot receive:

```text
message:read
```

When User A reconnects:

```text
Socket Connect
      │
      ▼
Authenticate
      │
      ▼
Join relevant rooms
      │
      ▼
Fetch current read state
      │
      ▼
UI synchronized
```

This demonstrates why MongoDB remains the source of truth.

---

# 📱 Offline Recovery

```text
User B reads message
       │
       ▼
Read Receipt Service
       │
       ▼
MongoDB
       │
       ├──────────► User A online
       │                 │
       │                 ▼
       │            message:read
       │
       └──────────► User A offline
                         │
                         ▼
                    No event
                         │
                         ▼
                      Reconnect
                         │
                         ▼
                   Fetch state
                         │
                         ▼
                   Synchronize UI
```

---

# 🧠 Reconnection Strategy

After reconnecting:

```text
Socket connected
      │
      ▼
Authenticate
      │
      ▼
Join relevant rooms
      │
      ▼
Synchronize current read state
```

The client must not assume that it received every real-time event that occurred while disconnected.

The authoritative state must be recovered from persistent data.

---

# 🧩 REST Fallback

The existing REST APIs remain available.

For example:

```text
GET /api/messages/:messageId/read-receipts
```

or whatever endpoint is defined by the Phase 2 module.

REST allows the client to:

```text
Fetch current read state
Recover missed state
Synchronize after reconnection
```

Therefore:

```text
Real-Time Event
      ↓
Fast synchronization

REST / MongoDB
      ↓
Authoritative recovery
```

---

# 🔄 Real-Time + Persistence Pattern

This module establishes a reusable architecture:

```text
                  Action
                    │
                    ▼
              Business Service
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      Persistence         Real-Time
          │                   │
          ▼                   ▼
       MongoDB             Socket.IO
          │                   │
          ▼                   ▼
    Source of Truth      Instant Update
```

The same pattern can later be used for:

```text
Reactions
Message Updates
Message Deletion
Notifications
Other Real-Time Features
```

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
│   │   └── readReceipt.handler.js
│   │
│   └── events/
│       └── readReceipt.events.js
│
├── services/
│   ├── message.service.js
│   ├── readReceipt.service.js
│   ├── realtime.service.js
│   └── presence.service.js
│
├── controllers/
│   └── readReceipt.controller.js
│
├── models/
│   ├── Message.js
│   └── ReadReceipt.js
│
└── routes/
    └── readReceipt.routes.js
```

---

# 🧠 Handler Responsibility

The Socket.IO handler should remain thin.

Conceptual flow:

```text
readReceipt.handler
        │
        ▼
Validate Socket
        │
        ▼
Validate Payload
        │
        ▼
Read Receipt Service
        │
        ▼
Realtime Service
```

Avoid putting all database logic directly inside:

```text
socket.on(...)
```

The handler should coordinate the request rather than own the business logic.

---

# 📡 Realtime Service

The existing `realtime.service.js` can expose operations such as:

```text
emitToConversation()
emitToUser()
emitMessageRead()
```

Example:

```javascript
realtimeService.emitMessageRead(
    conversationId,
    payload,
    socket.id
);
```

The service can handle:

```text
Conversation room targeting
Initiating socket exclusion
Authorized event delivery
Socket.IO implementation details
```

This keeps real-time implementation centralized.

---

# 🔔 Current Real-Time Events

After this module, your real-time events become:

```text
message:new
typing:start
typing:stop
presence:online
presence:offline
message:read
```

The next module adds:

```text
reaction:added
reaction:removed
```

---

# 🧪 Testing Plan

## 1. Connect Two Users

```text
User A
User B
```

Both must be members of the same conversation.

---

## 2. Verify Conversation Room Authorization

Test:

```text
Authenticated conversation member
```

Expected:

```text
Authentication passes
       ↓
Membership verified
       ↓
Socket joins conversation room
```

Test:

```text
Authenticated non-member
```

Expected:

```text
Membership verification fails
       ↓
Socket does not join room
```

Test:

```text
Unauthenticated socket
```

Expected:

```text
Rejected
```

---

## 3. Send Message

User A sends:

```text
Hello!
```

Expected:

```text
message:new
```

---

## 4. User B Reads Message

User B triggers:

```text
read:message
```

Payload:

```json
{
  "conversationId": "68conversation123",
  "messageId": "68message123"
}
```

---

## 5. Verify Authentication

Attempt the request using:

```text
Unauthenticated Socket
```

Expected:

```text
Rejected
```

No database record should be created.

---

## 6. Verify Database

Confirm that the read receipt is stored correctly.

Verify:

```text
messageId
userId
readAt
```

---

## 7. Verify First-Read Acknowledgement

User B should receive:

```json
{
  "success": true,
  "messageId": "68message123",
  "readAt": "2026-08-10T06:30:00.000Z"
}
```

---

## 8. Verify Real-Time Event

User A should immediately receive:

```text
message:read
```

Example:

```json
{
  "conversationId": "68conversation123",
  "messageId": "68message123",
  "userId": "68user456",
  "readAt": "2026-08-10T06:30:00.000Z"
}
```

---

## 9. Verify Initiating Socket

The socket that sent:

```text
read:message
```

should not receive a redundant:

```text
message:read
```

event.

---

## 10. Verify Repeated Read

Trigger:

```text
read:message
```

again for the same user and message.

Expected:

```text
Existing receipt detected
        ↓
success: true
        ↓
Same original readAt returned
        ↓
No new database record
        ↓
No message:read event
```

Verify that:

```text
First readAt
     ===
Repeated readAt
```

The timestamp must not change.

---

## 11. Verify Other Device

Connect User B through:

```text
Chrome
Mobile
```

Read the message from Mobile.

Expected:

```text
Mobile
   ↓
read:message
   ↓
MongoDB
   ↓
message:read
   ↓
Desktop
```

The initiating Mobile socket does not need the broadcast.

---

## 12. Verify UI

User A should see:

```text
✓✓ Read
```

without refreshing.

---

## 13. Duplicate Read

Trigger:

```text
read:message
```

multiple times.

Expected:

```text
First request
    ↓
Persist
    ↓
message:read

Repeated requests
    ↓
No duplicate receipt
    ↓
Same original readAt
    ↓
No duplicate message:read
```

---

## 14. Unauthorized User

Use a user who is not a member.

Expected:

```text
read:message
       │
       ▼
Rejected
```

No database record should be created.

---

## 15. Wrong Conversation

Use:

```text
conversationId = A
messageId = message from B
```

Expected:

```text
Rejected
```

---

## 16. Invalid Message

Use a nonexistent:

```text
messageId
```

Expected:

```text
Rejected
```

No broadcast should occur.

---

## 17. Offline Sender

Disconnect User A.

User B reads a message.

Expected:

```text
MongoDB
   │
   ▼
Read receipt saved
```

No real-time event can be delivered to User A while offline.

Reconnect User A.

Expected:

```text
Current read state
   │
   ▼
UI synchronized
```

---

## 18. Multiple Users

Conversation:

```text
User A
User B
User C
```

User B reads the message.

Verify that:

```text
User A → message:read
User C → message:read
```

and the initiating socket of User B does not receive a redundant event.

---

## 19. Multiple Devices

Connect User B through:

```text
Chrome
Mobile
Tablet
```

Read the message from Mobile.

Expected:

```text
Mobile → initiating socket
          no broadcast

Chrome → message:read
Tablet → message:read
```

All connected devices should eventually reflect the same persistent read state.

---

## 20. Database Failure

Simulate MongoDB failure.

Expected:

```text
read:message
       │
       ▼
Database failure
       │
       ▼
success: false
       │
       ▼
No message:read
```

---

## 21. Reconnection

Disconnect the recipient or sender.

While disconnected, another user reads a message.

Reconnect.

Expected:

```text
Socket reconnect
      │
      ▼
Authenticate
      │
      ▼
Join rooms
      │
      ▼
Fetch current read state
      │
      ▼
UI synchronized
```

---

# 📊 Performance Considerations

Do not emit excessive read events.

For example, avoid:

```text
Scrolling through 100 messages
        │
        ▼
100 unnecessary socket events
```

The frontend should mark messages as read according to the application's read rules.

For example:

```text
Message becomes visible
        │
        ▼
Mark as read
```

rather than:

```text
Every pixel of scrolling
        │
        ▼
Socket event
```

---

# ⚡ Performance Rules

The implementation should follow these rules:

```text
1. Persist only genuine read-state transitions.
2. Use idempotent read receipt operations.
3. Do not broadcast repeated read events.
4. Broadcast only after successful persistence.
5. Exclude the initiating socket from redundant notification.
6. Synchronize other devices of the same user.
7. Use authorized conversation rooms for targeted delivery.
8. Avoid global Socket.IO broadcasts.
9. Keep MongoDB as the source of truth.
10. Use REST for recovery after missed real-time events.
11. Do not regenerate readAt for repeated reads.
12. Return the original persisted readAt for repeated reads.
```

---

# 🚀 Future Optimization

For large conversations, a cursor-based approach can reduce traffic:

```text
lastReadMessageId
```

Example:

```json
{
  "conversationId": "68conversation123",
  "lastReadMessageId": "68message456"
}
```

Then the server can infer that earlier messages have been read according to the application's ordering rules.

This is an optimization for a later version.

---

# 🔮 Future `read:conversation`

A future implementation may support:

```text
read:conversation
```

Payload:

```json
{
  "conversationId": "68conversation123",
  "lastReadMessageId": "68message456"
}
```

Possible flow:

```text
User reads several messages
       │
       ▼
read:conversation
       │
       ▼
Update last-read cursor
       │
       ▼
MongoDB
       │
       ▼
Realtime notification
```

This can significantly reduce event traffic in long conversations.

It is outside the scope of the initial implementation.

---

# 🔐 Security Rules

The server must enforce:

```text
1. Socket authentication is required.
2. User identity comes from socket.user.
3. Client cannot impersonate another user.
4. Client cannot provide userId.
5. Client cannot provide authoritative readAt.
6. Conversation membership must be verified before room joining.
7. Only authorized conversation members may occupy conversation rooms.
8. Conversation membership must be verified when processing read:message.
9. Message existence must be verified.
10. Message must belong to the specified conversation.
11. Read receipt rules must come from the shared service.
12. Unauthorized read operations must be rejected.
13. Unauthorized users must not receive read events.
14. Failed persistence must never produce message:read.
15. Duplicate read operations must be handled idempotently.
16. Global read-event broadcasting must be avoided.
17. Repeated reads must return the original persisted readAt.
```

---

# 🧠 Source of Truth

The architecture separates sources of truth by responsibility.

### Users

```text
MongoDB
   ↓
Persistent User Data
```

### Conversations

```text
MongoDB
   ↓
Persistent Conversation Data
```

### Messages

```text
MongoDB
   ↓
Persistent Message Data
```

### Read Receipts

```text
MongoDB
   ↓
Persistent Read State
```

### Real-Time Read Events

```text
Socket.IO
   ↓
Temporary Event Transport
```

Therefore:

```text
MongoDB
   ↓
Source of Truth

Socket.IO
   ↓
Real-Time Delivery
```

---

# 📊 State Comparison

| Feature              | Persistent? | Storage / Runtime Source     |
| -------------------- | ----------- | ---------------------------- |
| User                 | Yes         | MongoDB                      |
| Organization         | Yes         | MongoDB                      |
| Project              | Yes         | MongoDB                      |
| Workspace            | Yes         | MongoDB                      |
| Conversation         | Yes         | MongoDB                      |
| Conversation Member  | Yes         | MongoDB                      |
| Message              | Yes         | MongoDB                      |
| Attachment Metadata  | Yes         | MongoDB                      |
| Attachment File      | Yes         | File/Object Storage          |
| Typing State         | No          | Socket.IO / In-Memory State  |
| Online Status        | No          | Socket.IO / Presence Service |
| Read Receipt         | Yes         | MongoDB                      |
| Real-Time Read Event | No          | Socket.IO                    |
| Reaction             | Yes         | MongoDB                      |

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Socket authentication is required.
* [ ] User identity comes from authenticated socket context.
* [ ] Client cannot impersonate another user.
* [ ] Client cannot provide `userId`.
* [ ] Client cannot provide authoritative `readAt`.
* [ ] Conversation membership is verified before joining rooms.
* [ ] Only authorized members can occupy conversation rooms.
* [ ] Conversation membership is verified while processing `read:message`.
* [ ] Message existence is verified.
* [ ] Message belongs to the specified conversation.
* [ ] Read receipt uses existing Phase 2 business logic.
* [ ] `read:message` acknowledgement is implemented.
* [ ] Success acknowledgement is documented.
* [ ] Failure acknowledgement is documented.
* [ ] First-time and repeated-read acknowledgement behavior is documented.
* [ ] Duplicate read receipts are handled.
* [ ] Duplicate reads do not create duplicate database records.
* [ ] Duplicate reads do not emit duplicate `message:read` events.
* [ ] Server generates `readAt`.
* [ ] Repeated reads return the original persisted `readAt`.
* [ ] `readAt` is not regenerated on repeated requests.
* [ ] Read state is persisted before broadcasting.
* [ ] Failed persistence does not emit events.
* [ ] `message:read` recipients are explicitly defined.
* [ ] Initiating socket is excluded from redundant notification.
* [ ] Other devices of the reader are synchronized.
* [ ] Unauthorized users cannot receive read events.
* [ ] Offline users can recover state.
* [ ] Conversation rooms are used.
* [ ] REST fallback remains available.
* [ ] Excessive read events are avoided.
* [ ] Real-time state and persistent state responsibilities are separated.
* [ ] Cursor-based optimization is documented as future work.

---

# 📊 Phase 3 Progress

After completing this module:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  ✅
├── Typing Indicators           ✅
├── Online / Offline Presence   ✅
├── Real-Time Read Receipts     🟡 Current
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
Conversation           ✅
Conversation Members   ✅
Messages               ✅


Phase 2 — Messaging Features

Message Reactions      ✅
Read Receipts          ✅
Attachments            ✅
Message Search         ✅


Phase 3 — Real-Time Communication

Socket.IO Setup             ✅
Real-Time Message Delivery  ✅
Typing Indicators           ✅
Online / Offline Presence   ✅
Real-Time Read Receipts     🟡
Real-Time Reactions         ⏳
```

---

# 📌 Summary

The **Real-Time Read Receipts module** connects the persistent Phase 2 read-receipt system with Socket.IO.

The final architecture is:

```text
                    User B
                      │
                      │ Message becomes readable
                      ▼
                   Socket.IO
                      │
                      ▼
                read:message
                      │
                      ▼
             Read Receipt Service
                      │
          ┌───────────┴───────────┐
          │                       │
     Authorization           Idempotency
          │                       │
          └───────────┬───────────┘
                      ▼
                   MongoDB
                      │
                      ▼
             Successful Persistence
                      │

```

# 🟢 Online / Offline Presence Module

## 📋 Module Information

| Property        | Value                                                                           |
| --------------- | ------------------------------------------------------------------------------- |
| Module          | Online / Offline Presence                                                       |
| Version         | v1.1                                                                            |
| Status          | 🟡 In Development                                                               |
| Phase           | Phase 3 — Real-Time Communication                                               |
| Previous Module | Typing Indicators                                                               |
| Next Module     | Real-Time Read Receipts                                                         |
| Depends On      | Authentication, User, Organization, Project, Workspace, Socket.IO, Conversation |
| Database        | MongoDB                                                                         |
| Real-Time Layer | Socket.IO                                                                       |
| Runtime State   | In-Memory Presence Service                                                      |

---

# 📌 Overview

The **Online / Offline Presence module** introduces real-time user presence to the Chat Platform.

It allows the application to determine whether a user currently has at least one active authenticated Socket.IO connection and communicate that state to other authorized users.

Example:

```text
Conversation
────────────────────────

Akshaya        🟢 Online
Ravi           🟢 Online
Priya          ⚪ Offline
```

Presence is **temporary runtime state**, not permanent business data.

Therefore, the system should use:

```text
Socket.IO Connection
        ↓
Presence Service
        ↓
In-Memory Presence State
```

instead of continuously storing:

```text
User
  ↓
MongoDB
  ↓
isOnline: true
```

MongoDB remains the source of truth for persistent user information, while the Presence Service maintains the user's current connection state.

---

# 🎯 Objectives

The Online / Offline Presence module is responsible for:

* Detecting when a user connects
* Detecting when a user disconnects
* Maintaining active socket state
* Supporting multiple sockets per user
* Supporting multiple devices
* Broadcasting online status
* Broadcasting offline status
* Providing an initial presence snapshot
* Providing explicit presence acknowledgements
* Preventing unauthorized presence access
* Handling temporary network failures
* Handling browser and tab closure
* Preventing incorrect offline status when one of several sockets disconnects
* Preventing client-controlled presence spoofing
* Restricting presence visibility to authorized users
* Providing a foundation for future presence features
* Supporting future multi-server scaling

---

# 🧠 Core Principle

Presence is **ephemeral runtime state**.

Therefore:

```text
Socket.IO Connection
        ↓
Presence Service
        ↓
In-Memory Registry
        ↓
Current Presence State
```

It should not be treated as persistent application data:

```text
User
   ↓
MongoDB
   ↓
isOnline: true
```

The architectural separation is:

```text
MongoDB
   ↓
Persistent application data

Socket.IO
   ↓
Real-time connection transport

Presence Service
   ↓
Temporary runtime presence state
```

---

# 🔐 Server-Authoritative Presence

Presence state must **never be trusted from the client**.

The client must not be able to send:

```json
{
    "userId": "68another-user",
    "status": "online"
}
```

or:

```text
"I am online."
```

Instead, the server derives presence exclusively from the authenticated Socket.IO connection lifecycle.

```text
Client
   ❌
"I am online"

        ↓

Server
   ✅
"Your authenticated socket connected."
```

The authoritative identity comes from:

```text
socket.user.userId
```

The server determines:

```text
Socket connected
      ↓
Authenticated user identified
      ↓
Register socket
      ↓
Determine presence
```

This prevents users from impersonating another user's presence.

---

# 🏗️ Architecture

```text
                         User
                           │
                           ▼
                     Socket.IO
                           │
                           ▼
                    Authentication
                           │
                           ▼
                   Presence Service
                           │
                  ┌────────┴────────┐
                  │                 │
             Register Socket    Remove Socket
                  │                 │
                  ▼                 ▼
              ONLINE?           OFFLINE?
                  │                 │
                  └────────┬────────┘
                           ▼
                  Authorized Users
```

The server acts as the trusted real-time presence gateway.

---

# 👤 User vs Socket

A critical architectural concept is:

```text
User ≠ Socket
```

One user may have multiple active connections.

Example:

```text
Akshaya
   │
   ├── Chrome
   │      └── Socket A
   │
   ├── Mobile
   │      └── Socket B
   │
   └── Tablet
          └── Socket C
```

Therefore:

```text
Socket A disconnects
```

does **not** automatically mean:

```text
Akshaya = OFFLINE
```

The user becomes offline only when:

```text
No active authenticated sockets remain
```

---

# 🔄 Presence Lifecycle

## User Becomes Online

```text
Socket Connect
      │
      ▼
Authenticate
      │
      ▼
Register Socket
      │
      ▼
Was User Previously Offline?
      │
      ├── Yes
      │     │
      │     ▼
      │  Mark ONLINE
      │     │
      │     ▼
      │ presence:online
      │
      └── No
            │
            ▼
        Already ONLINE
            │
            ▼
        No Presence Event
```

Only the transition:

```text
0 active sockets
        ↓
1 active socket
```

should trigger:

```text
presence:online
```

---

# ⚪ User Becomes Offline

```text
Socket Disconnect
      │
      ▼
Remove Socket
      │
      ▼
Any Active Sockets Remaining?
      │
      ├── Yes
      │     │
      │     ▼
      │  Remain ONLINE
      │
      └── No
            │
            ▼
        Mark OFFLINE
            │
            ▼
        presence:offline
```

Only the transition:

```text
1 active socket
        ↓
0 active sockets
```

should trigger:

```text
presence:offline
```

---

# 🔄 Canonical Presence State Lifecycle

The complete presence lifecycle is:

```text
Socket connect
      │
      ▼
Authenticate
      │
      ▼
Register socket
      │
      ▼
Check previous socket count
      │
      ├── 0 → User was offline
      │          │
      │          ▼
      │       Mark online
      │          │
      │          ▼
      │    Broadcast presence:online
      │
      └── >0 → User already online
                 │
                 ▼
             No presence event
```

When disconnecting:

```text
Socket disconnect
      │
      ▼
Remove socket
      │
      ▼
Check remaining sockets
      │
      ├── >0 → User remains ONLINE
      │
      └── 0 → User becomes OFFLINE
                 │
                 ▼
          Broadcast presence:offline
```

This lifecycle is the authoritative rule for presence state.

---

# 📡 Presence Event Contract

The module uses three presence events:

| Event              | Direction       | Purpose                           | Persistent? |
| ------------------ | --------------- | --------------------------------- | ----------- |
| `presence:online`  | Server → Client | Notify an online transition       | No          |
| `presence:offline` | Server → Client | Notify an offline transition      | No          |
| `presence:state`   | Server → Client | Deliver current presence snapshot | No          |

For requesting a current snapshot, the client uses:

```text
presence:get
```

Therefore:

```text
presence:get
    ↓
Request current state

presence:state
    ↓
Return current snapshot

presence:online
    ↓
Future offline → online transition

presence:offline
    ↓
Future online → offline transition
```

---

# 📡 Event Direction Summary

```text
Client → Server

presence:get
```

```text
Server → Client

presence:online
presence:offline
presence:state
```

The client does **not** send:

```text
presence:online
presence:offline
```

because the server determines those events from socket lifecycle changes.

---

# 📤 `presence:online`

This event represents:

```text
User transitioned from OFFLINE → ONLINE
```

### Direction

```text
Server → Client
```

### Payload

```json
{
    "userId": "68user123"
}
```

### Trigger

The event is generated when:

```text
Previous active socket count = 0
Current active socket count = 1
```

Example:

```text
User A

Before:
0 sockets

Connect:
1 socket

Result:
presence:online
```

---

# 📥 `presence:offline`

This event represents:

```text
User transitioned from ONLINE → OFFLINE
```

### Direction

```text
Server → Client
```

### Payload

```json
{
    "userId": "68user123"
}
```

### Trigger

The event is generated when:

```text
Previous active socket count = 1
Current active socket count = 0
```

Example:

```text
User A

Before:
1 socket

Disconnect:
0 sockets

Result:
presence:offline
```

---

# 📸 `presence:state`

`presence:state` provides the **current presence snapshot**.

It is not a transition event.

Its purpose is to allow a newly connected or newly opened conversation client to immediately obtain the current presence state.

### Direction

```text
Server → Client
```

### Example Payload

```json
{
    "conversationId": "68conversation123",
    "users": [
        {
            "userId": "68user1",
            "status": "online"
        },
        {
            "userId": "68user2",
            "status": "offline"
        }
    ]
}
```

---

# 📥 `presence:get`

The client can request the current presence state for an authorized conversation.

### Direction

```text
Client → Server
```

### Client Payload

```json
{
    "conversationId": "68conversation123"
}
```

The server must authenticate the socket and verify that the user has access to the requested conversation.

---

# 📤 `presence:get` Acknowledgement

A Socket.IO acknowledgement is used to confirm whether the request was accepted.

### Client

```javascript
socket.emit(
    "presence:get",
    {
        conversationId
    },
    (response) => {
        console.log(response);
    }
);
```

### Successful acknowledgement

```json
{
    "success": true
}
```

The actual presence snapshot is delivered through:

```text
presence:state
```

### Failed acknowledgement

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

The acknowledgement is returned only to the requesting socket.

It is not broadcast to other users.

---

# 📡 Complete Presence Snapshot Flow

```text
Conversation Opened
       │
       ▼
Client joins conversation room
       │
       ▼
Client sends presence:get
       │
       ▼
Server Authentication
       │
       ▼
Conversation Authorization
       │
       ▼
Presence Service
       │
       ▼
Get Current Member Presence
       │
       ▼
presence:state
       │
       ▼
Client Updates UI
```

---

# 🔄 Snapshot vs Live Events

The responsibilities of the events are intentionally different.

```text
presence:state
       ↓
Initial/current snapshot
```

```text
presence:online
       ↓
Future OFFLINE → ONLINE transition
```

```text
presence:offline
       ↓
Future ONLINE → OFFLINE transition
```

Example:

```text
Conversation opened
       │
       ▼
presence:get
       │
       ▼
presence:state
       │
       ▼
Ravi = ONLINE
Priya = OFFLINE
```

Later Ravi connects from another device:

```text
Ravi
 ↓
First active socket
 ↓
presence:online
 ↓
Update UI
```

Later Ravi disconnects completely:

```text
Last active socket
 ↓
Disconnect
 ↓
presence:offline
 ↓
Update UI
```

This allows the frontend to distinguish between:

```text
Initial state
```

and:

```text
Live state changes
```

---

# 🏠 Presence Scope

The application is multi-tenant:

```text
Organization
   │
   └── Project
        │
        └── Workspace
             │
             └── Conversation
                  │
                  └── Members
```

Presence must not automatically be exposed to every user in the platform.

The initial implementation uses **conversation membership as the presence visibility scope**.

Therefore:

```text
User A becomes online
        │
        ▼
Find conversations relevant to User A
        │
        ▼
Find authorized connected participants
        │
        ▼
Send presence:online only to those users
```

---

# 🎯 Presence Delivery Rule

For the initial implementation:

> **Presence events are delivered only to authorized users who share a relevant conversation with the user whose presence changed.**

The server determines the relevant delivery scope from:

```text
Authenticated User
       │
       ▼
Conversation Membership
       │
       ▼
Relevant Conversation Rooms
       │
       ▼
Authorized Connected Members
```

The client does not determine the recipient list.

---

# 🏠 Conversation Room Delivery

The existing room convention is:

```text
conversation:{conversationId}
```

Example:

```text
conversation:68conversation123
```

If User A becomes online:

```text
User A
   │
   ▼
Presence Service
   │
   ▼
Relevant Conversations
   │
   ▼
Authorized Conversation Members
   │
   ▼
presence:online
```

The event should not be globally broadcast using:

```javascript
io.emit("presence:online", ...)
```

---

# 🚫 Avoid Global Presence Broadcasting

Do not implement:

```javascript
io.emit("presence:online", {
    userId
});
```

This causes:

* Unnecessary network traffic
* Privacy concerns
* Unnecessary client processing
* Poor scalability
* Presence exposure outside authorized scopes

Instead:

```text
User A becomes online
       │
       ▼
Determine relevant users
       │
       ▼
Send only to authorized users
```

---

# 👥 Conversation Presence

Example:

```text
Conversation A

Members:
├── Akshaya
├── Ravi
├── Priya
└── Kiran
```

Current state:

```text
Akshaya   🟢 Online
Ravi      🟢 Online
Priya     ⚪ Offline
Kiran     ⚪ Offline
```

The frontend can display this information beside participants.

The backend only provides the authoritative state.

---

# 🔐 Presence Authorization

Before returning presence information:

```text
Client
   │
   ▼
presence:get
   │
   ▼
Authenticate Socket
   │
   ▼
Validate conversationId
   │
   ▼
Verify Conversation Exists
   │
   ▼
Verify User Membership
   │
   ▼
Verify Room Access
   │
   ├── No → Reject
   │
   ▼
Retrieve Presence
   │
   ▼
presence:state
```

Unauthorized users must not receive presence information for conversations they cannot access.

---

# 🔐 Server-Side Identity

The client should never provide:

```json
{
    "userId": "68another-user"
}
```

The server derives identity from:

```text
socket.user.userId
```

Therefore:

```text
Socket
   │
   ▼
Authenticated User
   │
   ▼
socket.user.userId
```

This prevents:

```text
User A
   ↓
Pretend to be User B
   ↓
Set User B as online
```

---

# 👤 User Presence State

The server should conceptually maintain:

```text
User A
   │
   ├── socket1
   ├── socket2
   └── socket3

User B
   │
   └── socket4
```

Presence is calculated from active socket count.

```text
activeSockets(userId).size > 0
        ↓
ONLINE
```

```text
activeSockets(userId).size === 0
        ↓
OFFLINE
```

---

# 📊 Active Socket Registry

For the initial single-server implementation:

```text
activeSockets = {
    userA: Set {
        socket1,
        socket2
    },

    userB: Set {
        socket3
    }
}
```

A `Map` and `Set` can be used for efficient in-memory tracking.

Conceptually:

```text
Map<userId, Set<socketId>>
```

---

# 🧠 Why Use a Set?

A user may have several socket connections.

Example:

```text
User A
   │
   └── Set
       ├── socket1
       ├── socket2
       └── socket3
```

When:

```text
socket2
```

disconnects:

```text
socket1
socket3
```

remain active.

Therefore:

```text
User A = ONLINE
```

Only when:

```text
socket1
socket3
```

also disconnect does the user become:

```text
User A = OFFLINE
```

---

# 📱 Multiple Device Example

```text
                  User A
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    Chrome        Mobile       Tablet
       │            │            │
   Socket A      Socket B     Socket C
```

Disconnect mobile:

```text
Socket B ❌
```

Remaining:

```text
Socket A ✅
Socket C ✅
```

Result:

```text
User A = ONLINE
```

Disconnect Chrome and tablet:

```text
Socket A ❌
Socket C ❌
```

Result:

```text
User A = OFFLINE
```

---

# 🔄 Multiple Tabs

The same rule applies to multiple browser tabs.

Example:

```text
User A
 ├── Chrome Tab 1 → Socket A
 └── Chrome Tab 2 → Socket B
```

If Tab 1 closes:

```text
Socket A ❌
Socket B ✅
```

Result:

```text
User A = ONLINE
```

Only after Tab 2 also disconnects:

```text
Socket B ❌
```

does the user become:

```text
OFFLINE
```

---

# 🌐 Network Failure

A browser may suddenly lose network connectivity.

Example:

```text
User A
   │
   ▼
Internet Lost
   │
   ▼
Socket Connection Lost
   │
   ▼
disconnect
   │
   ▼
Presence Service
   │
   ▼
Remove Socket
```

The system should not require the user to manually click:

```text
"Go Offline"
```

Socket.IO connection lifecycle handling determines the state.

---

# 💓 Heartbeat / Connection Health

Socket.IO manages connection health using its underlying connection and heartbeat mechanisms.

This helps detect:

```text
Dead connection
Network failure
Unreachable client
```

When the connection is considered unavailable:

```text
disconnect
```

is triggered and the Presence Service can update the user's state.

---

# ⏱️ Presence Accuracy

Presence should represent:

> **The user currently has at least one active authenticated Socket.IO connection.**

It should not claim:

> **The user is physically using the application right now.**

Therefore:

```text
ONLINE
```

means:

```text
Active authenticated connection exists
```

It does not necessarily mean:

```text
User is actively looking at the screen
```

---

# 🟢 Online vs Active

Do not confuse:

```text
Online
```

with:

```text
Active
```

For example:

```text
User has application open
but has not touched it for 20 minutes.
```

The user may still be:

```text
ONLINE
```

A future activity-based presence system could introduce:

```text
away
```

but that is outside the scope of the current module.

---

# 🔮 Future Presence States

The initial implementation supports:

```text
online
offline
```

Future versions may introduce:

```text
online
away
busy
do-not-disturb
invisible
```

These should not be implemented in the initial module unless specifically required.

---

# 📡 Presence Event Broadcasting

## User Becomes Online

```text
First Socket Connects
       │
       ▼
Presence Service
       │
       ▼
User transitions OFFLINE → ONLINE
       │
       ▼
Find relevant conversations
       │
       ▼
Find authorized connected members
       │
       ▼
presence:online
```

## User Becomes Offline

```text
Last Socket Disconnects
       │
       ▼
Presence Service
       │
       ▼
User transitions ONLINE → OFFLINE
       │
       ▼
Find relevant conversations
       │
       ▼
Find authorized connected members
       │
       ▼
presence:offline
```

---

# 🔄 Presence on Conversation Open

When a user opens a conversation:

```text
Client
   │
   ▼
Conversation Opened
   │
   ▼
Join Conversation Room
   │
   ▼
presence:get
   │
   ▼
Server Authorization
   │
   ▼
Presence Service
   │
   ▼
presence:state
   │
   ▼
Update Participant Presence
```

Example:

```json
{
    "conversationId": "68conversation123",
    "users": [
        {
            "userId": "68user1",
            "status": "online"
        },
        {
            "userId": "68user2",
            "status": "offline"
        }
    ]
}
```

---

# 🔄 Presence + Live Updates

Once the initial snapshot has been received:

```text
presence:state
```

provides the initial state.

After that:

```text
presence:online
```

and:

```text
presence:offline
```

keep the UI synchronized.

Complete flow:

```text
Conversation Open
       │
       ▼
presence:get
       │
       ▼
presence:state
       │
       ▼
Initial UI State
       │
       ├───────────────┐
       │               │
       ▼               ▼
presence:online   presence:offline
       │               │
       ▼               ▼
Update UI          Update UI
```

---

# 🔄 Presence + Typing

The previous module implemented:

```text
Typing Indicators
```

Presence is a separate real-time state.

Example:

```text
Ravi
🟢 Online
⌨️ Typing...
```

The states are independent:

```text
Presence
   ├── Online
   └── Offline

Typing
   ├── Start
   └── Stop
```

A user can be:

```text
ONLINE + NOT TYPING
```

or:

```text
ONLINE + TYPING
```

Typing should not determine presence.

---

# 🔄 Presence + Messages

The message flow remains:

```text
POST /messages
      │
      ▼
MongoDB
      │
      ▼
message:new
```

Presence does not change message persistence.

It only informs the UI:

```text
Who currently has an active connection?
```

---

# 🔄 Presence + Read Receipts

The upcoming Read Receipts module will operate independently from presence.

For example:

```text
User B = OFFLINE
```

does not necessarily mean:

```text
Message cannot be read
```

Read receipts represent message-read state and are separate from connection presence.

---

# 🧩 Presence Service

Presence logic should be separated from Socket.IO event handlers.

Recommended:

```text
Socket Handler
      │
      ▼
Presence Service
      │
      ├── registerSocket()
      ├── removeSocket()
      ├── isOnline()
      ├── getUserPresence()
      ├── getUsersPresence()
      └── getActiveSockets()
```

This separation makes the system:

* Easier to test
* Easier to maintain
* Easier to reuse
* Easier to scale
* Less coupled to Socket.IO handlers

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
│   │   └── presence.handler.js
│   │
│   └── events/
│       └── presence.events.js
│
├── services/
│   ├── message.service.js
│   ├── realtime.service.js
│   └── presence.service.js
│
└── models/
```

---

# 🧩 Presence Service Responsibilities

The service should provide operations such as:

```text
registerSocket(userId, socketId)

removeSocket(userId, socketId)

isOnline(userId)

getUserPresence(userId)

getUsersPresence(userIds)

getActiveSockets(userId)
```

The service should be the authoritative runtime source for current presence.

---

# 🔐 Security Rules

The server must enforce:

```text
1. Socket authentication is required.
2. User identity comes from socket.user.
3. Client cannot manually set another user's presence.
4. Client cannot manually set its own presence state.
5. Conversation membership must be verified.
6. Presence requests must be authorized.
7. Presence events must only reach authorized users.
8. Global presence broadcasting must be avoided.
```

---

# 🚫 Incorrect Implementation

Avoid:

```javascript
socket.on("presence:online", ({ userId }) => {
    io.emit("presence:online", {
        userId
    });
});
```

Problems:

```text
Client controls identity
        ↓
Identity spoofing possible

Global broadcast
        ↓
Unnecessary data exposure

No authorization
        ↓
Unauthorized presence visibility

No multi-device handling
        ↓
Incorrect offline state
```

---

# ✅ Recommended Implementation

```text
Socket Connection
      │
      ▼
JWT Authentication
      │
      ▼
socket.user
      │
      ▼
Presence Service
      │
      ▼
Register Socket
      │
      ▼
Check Previous Socket Count
      │
      ├── 0 → User becomes ONLINE
      │          │
      │          ▼
      │    Notify authorized users
      │
      └── >0 → User already ONLINE
                 │
                 ▼
             No presence event
```

On disconnect:

```text
Socket Disconnect
      │
      ▼
Remove Socket
      │
      ▼
Check Remaining Sockets
      │
      ├── >0 → Stay ONLINE
      │
      └── 0 → Become OFFLINE
                 │
                 ▼
          Notify authorized users
```

---

# 🧪 Testing Plan

## 1. Connect User A

Expected:

```text
User A = ONLINE
```

If this is the first active socket:

```text
presence:online
```

should be generated for authorized observers.

---

## 2. Connect User B

Both users are members of the same conversation.

Expected:

```text
User B sees User A online
```

---

## 3. Disconnect User A

If User A has no other active sockets:

```text
presence:offline
```

should be delivered to authorized observers.

---

## 4. Multiple Socket Test

Connect User A from:

```text
Chrome
Mobile
```

Expected:

```text
User A = ONLINE
```

Disconnect Chrome:

```text
User A = still ONLINE
```

Disconnect Mobile:

```text
User A = OFFLINE
```

---

## 5. Unauthorized Presence Request

User A attempts:

```text
presence:get
```

for a conversation they are not a member of.

Expected:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

No presence snapshot should be returned.

---

## 6. Existing Online User

User A connects first.

Later User B opens the same conversation.

Expected:

```text
User B
   │
   ▼
presence:get
   │
   ▼
presence:state
   │
   ▼
User A = ONLINE
```

User B should not have to wait for User A to reconnect.

---

## 7. Network Failure

Disconnect the network temporarily.

Expected:

```text
Socket disconnect
      │
      ▼
Presence Service
      │
      ▼
Remove Socket
```

If no other socket exists:

```text
presence:offline
```

When the connection is restored:

```text
Socket reconnect
      │
      ▼
Authenticate
      │
      ▼
Register Socket
      │
      ▼
presence:online
```

if this is the user's first active socket.

---

## 8. Rapid Connect / Disconnect

Test:

```text
connect
disconnect
connect
disconnect
```

Verify:

```text
Presence does not become incorrectly stuck
```

and:

```text
Active socket registry remains accurate
```

---

## 9. Multiple Users

Test:

```text
User A → online
User B → online
User C → offline
User D → online
```

Verify each status independently.

---

## 10. Multiple Devices

Connect the same user from:

```text
Chrome
Mobile
Tablet
```

Expected:

```text
3 active sockets
↓
ONLINE
```

Disconnect one:

```text
2 active sockets
↓
ONLINE
```

Disconnect another:

```text
1 active socket
↓
ONLINE
```

Disconnect final socket:

```text
0 active sockets
↓
OFFLINE
```

---

## 11. Presence Snapshot

Open a conversation containing:

```text
User A → online
User B → offline
User C → online
```

Client requests:

```text
presence:get
```

Expected:

```text
presence:state
```

containing the current states.

---

## 12. Live Presence Transition

Initial:

```text
User A → offline
```

User A connects.

Expected:

```text
presence:online
```

Then User A disconnects completely.

Expected:

```text
presence:offline
```

---

## 13. Unauthorized Live Event Delivery

Verify that a user outside the authorized conversation scope does not receive:

```text
presence:online
presence:offline
```

for users they are not permitted to observe.

---

## 14. Client Spoofing Attempt

Attempt to send:

```json
{
    "userId": "another-user",
    "status": "online"
}
```

Expected:

```text
Rejected / Ignored
```

The server must continue using:

```text
socket.user.userId
```

as the authoritative identity.

---

# 📊 Performance Considerations

Presence can become expensive if every connection change triggers a global broadcast.

Avoid:

```text
100,000 users
      │
      ▼
Every user receives every presence update
```

Prefer:

```text
User A changes presence
      │
      ▼
Determine relevant conversations
      │
      ▼
Determine authorized observers
      │
      ▼
Send only required events
```

---

# ⚡ Performance Rules

The implementation should follow these rules:

```text
1. Track sockets in memory.
2. Use Map and Set for efficient socket tracking.
3. Do not write online/offline state to MongoDB on every connection.
4. Broadcast only on actual presence transitions.
5. Do not broadcast when a second socket connects.
6. Do not broadcast offline when one of multiple sockets disconnects.
7. Send presence snapshots only for authorized scopes.
8. Avoid global presence broadcasting.
9. Remove disconnected sockets immediately.
10. Keep presence state separate from persistent user data.
```

---

# 🚀 Scaling Considerations

The initial implementation can use:

```text
Node.js
+
Socket.IO
+
Presence Service
+
In-Memory Socket Registry
```

Example:

```text
Socket.IO Server
       │
       ▼
Presence Service
       │
       ▼
In-Memory Map
```

This is appropriate for the initial single-server implementation.

---

# 🌐 Multi-Server Scaling

When the platform grows:

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

A future architecture can use:

```text
Redis
   │
   ├── Shared presence state
   │
   └── Socket.IO synchronization
```

along with the Socket.IO Redis Adapter.

The purpose is to synchronize:

```text
Presence state
+
Real-time events
```

between multiple Socket.IO servers.

Redis is therefore a **future scalability enhancement** and is not required for the initial implementation.

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

### Typing

```text
Socket.IO
   ↓
Presence/Typing Runtime State
```

### Online Status

```text
Socket.IO Connection
        ↓
Presence Service
        ↓
In-Memory Registry
```

---

# 📊 State Comparison

| Feature             | Persistent? | Runtime / Storage Source     |
| ------------------- | ----------- | ---------------------------- |
| User                | Yes         | MongoDB                      |
| Organization        | Yes         | MongoDB                      |
| Project             | Yes         | MongoDB                      |
| Workspace           | Yes         | MongoDB                      |
| Conversation        | Yes         | MongoDB                      |
| Conversation Member | Yes         | MongoDB                      |
| Message             | Yes         | MongoDB                      |
| Attachment Metadata | Yes         | MongoDB                      |
| Attachment File     | Yes         | File/Object Storage          |
| Typing State        | No          | Socket.IO / In-Memory State  |
| Online Status       | No          | Socket.IO / Presence Service |
| Read Receipt        | Yes         | MongoDB                      |
| Reaction            | Yes         | MongoDB                      |

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Socket authentication is required.
* [ ] User identity comes from authenticated socket context.
* [ ] Client cannot impersonate another user.
* [ ] Client cannot manually set its own online/offline state.
* [ ] Active sockets are tracked per user.
* [ ] Multiple devices are supported.
* [ ] Multiple browser tabs are supported.
* [ ] User becomes online when the first socket connects.
* [ ] User remains online while at least one socket remains.
* [ ] User becomes offline only when the last socket disconnects.
* [ ] Disconnect handling is implemented.
* [ ] Network failure is handled.
* [ ] Socket.IO connection health is relied upon for connection lifecycle.
* [ ] Presence scope is explicitly authorized.
* [ ] Conversation membership is verified.
* [ ] Global presence broadcasting is avoided.
* [ ] `presence:get` is implemented.
* [ ] `presence:get` acknowledgement is documented.
* [ ] `presence:state` snapshot is implemented.
* [ ] `presence:online` transition event is implemented.
* [ ] `presence:offline` transition event is implemented.
* [ ] Snapshot and live-event responsibilities are clearly separated.
* [ ] Presence events are delivered only to authorized observers.
* [ ] Presence state is not unnecessarily stored in MongoDB.
* [ ] Presence Service owns runtime presence state.
* [ ] Stale socket state is cleaned up.
* [ ] Multi-server scaling considerations are documented.
* [ ] Redis is reserved for future multi-server scaling.

---

# 📊 Phase 3 Progress

After completing this module:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  ✅
├── Typing Indicators           ✅
├── Online / Offline Presence   🟡 Current
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
Real-Time Message Delivery  ✅
Typing Indicators           ✅
Online / Offline Presence   🟡
Real-Time Read Receipts     ⏳
Real-Time Reactions         ⏳
```

---

# 📌 Summary

The **Online / Offline Presence module** introduces real-time user availability to the Chat Platform.

The core architectural model is:

```text
Socket.IO Connection
        ↓
Authenticated User
        ↓
Presence Service
        ↓
In-Memory Socket Registry
        ↓
Current Presence State
```

The most important rule is:

> **A user is offline only when their last active authenticated socket disconnects.**

Therefore:

```text
User
 │
 ├── Socket A
 ├── Socket B
 └── Socket C

At least one active socket
        ↓
     ONLINE

Zero active sockets
        ↓
     OFFLINE
```

This correctly supports:

```text
Multiple Devices
Multiple Browser Tabs
Network Failures
Socket Reconnection
```

The presence event model is:

```text
presence:get
     ↓
Client requests current state
```

```text
presence:state
     ↓
Initial/current presence snapshot
```

```text
presence:online
     ↓
OFFLINE → ONLINE transition
```

```text
presence:offline
     ↓
ONLINE → OFFLINE transition
```

The complete lifecycle is:

```text
Socket Connect
      │
      ▼
Authenticate
      │
      ▼
Register Socket
      │
      ▼
Previous Socket Count = 0?
      │
      ├── Yes → ONLINE
      │          ↓
      │    presence:online
      │
      └── No → Already ONLINE
```

And:

```text
Socket Disconnect
      │
      ▼
Remove Socket
      │
      ▼
Remaining Sockets?
      │
      ├── Yes → Remain ONLINE
      │
      └── No → OFFLINE
                 ↓
          presence:offline
```

Presence visibility is also authorization-aware:

```text
User Presence Changes
        │
        ▼
Determine Relevant Conversations
        │
        ▼
Determine Authorized Participants
        │
        ▼
Targeted Presence Event
```

The system therefore avoids:

```text
io.emit(...)
```

for global presence broadcasting.

Instead, presence is delivered only to users who are authorized to observe it.

The architectural responsibility is:

```text
MongoDB
   ↓
Persistent Source of Truth

REST API
   ↓
Persistent Data Operations

Socket.IO
   ↓
Real-Time Connection Transport

Presence Service
   ↓
Temporary Runtime Presence State

Online / Offline Presence
   ↓
No MongoDB Persistence
```

For scalability:

```text
Initial

Single Socket.IO Server
        ↓
Presence Service
        ↓
In-Memory Registry
```

Future:

```text
Multiple Socket.IO Servers
        ↓
Redis
        ↓
Shared Presence State
+
Socket.IO Event Synchronization
```

This keeps the initial implementation simple while leaving a clear path toward horizontal scaling.

---

# 🚀 Next Module

The next module is:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  ✅
├── Typing Indicators           ✅
├── Online / Offline Presence   🟡
└── Real-Time Read Receipts     ← NEXT
```

The **Real-Time Read Receipts** module will connect the already-completed persistent Read Receipts functionality with Socket.IO.

The architectural flow will become:

```text
User Reads Message
       │
       ▼
REST / Persistent Read Operation
       │
       ▼
MongoDB
       │
       ▼
Real-Time Read Event
       │
       ▼
Socket.IO
       │
       ▼
Authorized Conversation Members
       │
       ▼
UI Updates Instantly
```

This will allow read-status changes to appear immediately without requiring the user to refresh the conversation.

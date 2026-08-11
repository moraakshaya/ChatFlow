# ⚡ Socket.IO Setup

## 📋 Module Information

| Property        | Value                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Module          | Socket.IO Setup                                                                                             |
| Version         | v1.1                                                                                                        |
| Status          | 🟡 In Development                                                                                           |
| Phase           | Phase 3 — Real-Time Communication                                                                           |
| Depends On      | Authentication, Workspace, Conversation, Messages, Conversation Members                                     |
| Previous Module | Message Search (End of Phase 2)                                                                             |
| Next Module     | Real-Time Message Delivery                                                                                  |
| Database        | Redis (Socket.IO Adapter / Presence)                                                                        |
| Technology      | Socket.IO, WebSockets                                                                                       |

---

# 📌 Overview

The **Socket.IO Setup** module establishes the foundation for Phase 3 — Real-Time Communication.

While Phase 1 and Phase 2 built the RESTful backend architecture, Phase 3 introduces **bi-directional, event-driven communication** using WebSockets via Socket.IO.

This setup allows the platform to support:

```text
Real-Time Message Delivery
Typing Indicators
Online / Offline Presence
Real-Time Read Receipts
Real-Time Reactions
Real-Time Attachment Messages
```

This module focuses purely on the **connection, authentication, authorization, and room architecture** required to securely route real-time events to the correct users.

---

# 🎯 Objectives

The Socket.IO Setup is responsible for:

* Establishing a secure WebSocket server
* Authenticating Socket connections using JWT
* Handling connection and disconnection events
* Tracking user presence (Online/Offline status)
* Managing Socket.IO Rooms for Conversations and Workspaces
* Handling multi-device connectivity for a single user
* Ensuring strict authorization for joining rooms
* Providing an event-broadcasting architecture for other modules
* Supporting horizontal scaling with Redis Adapter

---

# 🧠 Core Architecture Principle

The most important rule of the Real-Time Communication phase is:

> **Socket connections must be authenticated, and room subscriptions must be strictly authorized.**

A client must never be able to silently listen to a conversation or workspace they do not have access to.

Architecture:

```text
Client Connection
        │
        ▼
Middleware (Authentication)
        │
        ├── Invalid Token → Disconnect
        │
        ▼
Socket Connected
        │
        ▼
Client Requests to Join Room (e.g., Conversation X)
        │
        ▼
Authorization Check (Database)
        │
        ├── Unauthorized → Reject / Disconnect
        │
        ▼
Socket Joins Room
        │
        ▼
Receives Real-Time Events
```

---

# 🔐 Socket Authentication

Socket connections cannot rely on standard HTTP middleware. Authentication must happen during the Socket.IO connection handshake.

### Middleware Implementation

Use a Socket.IO middleware function to verify the user's JWT before allowing the connection.

```javascript
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    // Verify JWT
    // If valid:
    // socket.user = decodedUser;
    // next();
    
    // If invalid:
    // next(new Error("Authentication error"));
});
```

This ensures that every connected socket belongs to a verified user.

---

# 🚪 Room Architecture

Socket.IO Rooms are the primary mechanism for routing events to specific groups of users.

In this platform, we utilize three main types of rooms:

## 1️⃣ User Rooms

Every authenticated user automatically joins a room identified by their `userId`.

```text
Room: `user_${userId}`
```

Purpose:
* Sending direct notifications to a specific user (e.g., "You have been added to a workspace").
* Reaching all active devices for a single user.

## 2️⃣ Conversation Rooms

Users join rooms corresponding to the conversations they are actively viewing or are a member of.

```text
Room: `conversation_${conversationId}`
```

Purpose:
* Broadcasting new messages.
* Broadcasting typing indicators.
* Broadcasting read receipts and reactions within that conversation.

## 3️⃣ Workspace Rooms (Optional)

Users may join rooms corresponding to the workspaces they are a part of.

```text
Room: `workspace_${workspaceId}`
```

Purpose:
* Broadcasting workspace-level events (e.g., new channel created, member joined workspace).

---

# 🔐 Room Authorization Rules

Users must explicitly request to join a conversation or workspace room. The server **must verify their access** before adding their socket to the room.

```text
Client: "Join conversation_68conversation"
       │
       ▼
Server: "Is socket.user.id a member of 68conversation?"
       │
       ├── Yes → socket.join("conversation_68conversation")
       │
       └── No → Ignore request / Send error
```

Never blindly accept a client's request to join a room.

---

# 🟢 Presence & Multi-Device Support

A single user can be logged in from multiple devices (e.g., Web App, Mobile App).

Each device gets a unique `socket.id`.

```text
User A
  ├── Phone (socket.id = x1)
  └── Laptop (socket.id = y2)
```

Both sockets must join:
```text
Room: `user_${userA_id}`
```

### Tracking Online Status

To accurately track if a user is "Online":

1. Maintain a Redis store or memory structure mapping `userId` to a count of active sockets.
2. Upon connection: Increment count. If count goes from 0 to 1, broadcast "User A is Online".
3. Upon disconnection: Decrement count. If count reaches 0, broadcast "User A is Offline".

---

# 🚀 Horizontal Scaling (Redis Adapter)

While the initial development can use in-memory Socket.IO state, a production environment will likely have multiple Node.js server instances.

```text
Instance 1 (User A connected here)
Instance 2 (User B connected here)
```

If User A sends a message in a conversation that User B is in, Instance 1 must tell Instance 2 to emit the event to User B.

Solution: **Socket.IO Redis Adapter**

```text
Instance 1 ────> Redis ────> Instance 2
                              │
                              ▼
                           User B
```

The architecture should be prepared to integrate the `@socket.io/redis-adapter` for production scaling.

---

# 📁 Recommended Folder Structure

```text
src/
│
├── socket/
│   ├── index.js              # Socket.IO Initialization
│   ├── middleware/
│   │   └── auth.socket.js    # JWT verification
│   ├── handlers/
│   │   ├── connection.handler.js # Connection & Disconnection
│   │   ├── room.handler.js       # Join/Leave rooms with auth
│   │   └── presence.handler.js   # Online/Offline status
│   └── events.js             # Event constants
│
└── app.js                    # Attach Socket.IO to HTTP server
```

---

# 🔌 Event Constants

Centralize all event names to prevent typos across the client and server.

```javascript
// src/socket/events.js
module.exports = {
    // Client to Server
    JOIN_CONVERSATION: 'join_conversation',
    LEAVE_CONVERSATION: 'leave_conversation',
    TYPING_START: 'typing_start',
    TYPING_STOP: 'typing_stop',
    
    // Server to Client
    NEW_MESSAGE: 'new_message',
    MESSAGE_REACTION: 'message_reaction',
    MESSAGE_READ: 'message_read',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
    ERROR: 'socket_error'
};
```

---

# 🚨 Error Handling

Socket events don't have HTTP status codes. The server needs a standard way to communicate errors back to the client.

Emit an error event to the specific socket:

```javascript
socket.emit('socket_error', {
    message: 'Unauthorized to join conversation',
    code: 'FORBIDDEN'
});
```

---

# 🧪 Testing Strategy

Testing WebSockets requires different tools than REST APIs.

* **Postman:** Postman now supports WebSocket testing. You can establish a connection, send handshake auth, and emit/listen to events.
* **Socket.IO Client Test Script:** Write a simple Node.js script using `socket.io-client` to simulate user behavior.
* **Console Logging:** Extensive logging of connections, disconnections, and room joins is crucial during development.

### Test Scenarios:

1. **Authentication:**
    * Connect without token → Rejected.
    * Connect with invalid token → Rejected.
    * Connect with valid token → Accepted.
2. **Room Authorization:**
    * Request to join unauthorized conversation → Error emitted, not joined.
    * Request to join authorized conversation → Successfully joined.
3. **Multi-Device Presence:**
    * Open two tabs. Status remains online. Close one tab. Status remains online. Close both tabs. Status goes offline.

---

# 🔐 Security Checklist

Before moving to specific real-time features:

* Socket connection requires a valid JWT.
* The authenticated `user` object is attached to the `socket`.
* Client cannot join arbitrary rooms.
* Room joins check database authorization rules.
* Sockets automatically leave conversation rooms when access is revoked.
* Event payload validation is implemented.
* CORS is properly configured for the Socket.IO server.
* Error messages do not leak sensitive information.
* Architecture allows for Redis Adapter integration.

---

# 🎯 Overall Project Progress

```text
Phase 1 — Core Backend (REST) ✅

Phase 2 — Messaging Features (REST) ✅

Phase 3 — Real-Time Communication

Socket.IO Setup            🟡
Real-Time Messages         ⏳
Typing Indicators          ⏳
Presence                   ⏳
Real-Time Reactions        ⏳
Real-Time Read Receipts    ⏳
```

---

# 📌 Summary

The **Socket.IO Setup module** replaces passive HTTP architecture with an active, event-driven real-time system.

By establishing strict authentication during the handshake and rigorous authorization during room joining, the system guarantees that real-time data remains secure and isolated by tenant and conversation.

With this foundation built, the platform is ready to implement real-time messaging, typing indicators, and presence tracking in subsequent modules.

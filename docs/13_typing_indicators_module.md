# ⌨️ Typing Indicators Module

## 📋 Module Information

| Property        | Value                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| Module          | Typing Indicators                                                                 |
| Version         | v1.1                                                                              |
| Status          | 🟡 In Development                                                                 |
| Phase           | Phase 3 — Real-Time Communication                                                 |
| Previous Module | Real-Time Message Delivery                                                        |
| Next Module     | Online / Offline Presence                                                         |
| Depends On      | Authentication, Conversation, Conversation Members, Socket.IO, Conversation Rooms |
| Database        | MongoDB                                                                           |
| Real-Time Layer | Socket.IO                                                                         |

---

# 📌 Overview

The **Typing Indicators module** introduces temporary real-time typing status to the Chat Platform.

It allows users inside a conversation to see when another participant is currently typing.

Example:

```text
Akshaya
────────────────────────

Ravi:
Hey, how are you?

Akshaya:
Typing...
```

Typing indicators represent **temporary real-time state**.

They do not need to be stored permanently in MongoDB because typing status changes frequently and has a very short lifetime.

The architectural model is:

```text
Messages
   ↓
Persistent State
   ↓
MongoDB


Typing Status
   ↓
Ephemeral State
   ↓
Socket.IO
```

---

# 🎯 Objectives

The Typing Indicators module is responsible for:

* Detecting when a user starts typing
* Detecting when a user stops typing
* Broadcasting typing events to conversation members
* Using existing Socket.IO conversation rooms
* Preventing unauthorized users from sending typing events
* Preventing users from seeing typing events from unauthorized conversations
* Automatically clearing stale typing indicators
* Supporting multiple users typing simultaneously
* Supporting multiple devices per user
* Preventing unnecessary Socket.IO traffic
* Avoiding unnecessary database writes
* Keeping typing state separate from persistent message data
* Providing explicit event acknowledgements where applicable
* Handling socket disconnections safely
* Maintaining temporary server-side typing state
* Preventing users from seeing their own typing indicator unnecessarily

---

# 🧠 Core Principle

Typing status is **ephemeral real-time state**.

Therefore:

```text
Typing Status
      │
      ▼
Socket.IO
      │
      ▼
Connected Conversation Members
```

It should **not** normally be stored in:

```text
MongoDB
```

because typing information:

* changes frequently
* has a short lifetime
* does not need permanent persistence
* can be recreated immediately from active socket state

Therefore:

```text
MongoDB
   ↓
Persistent application data

Socket.IO
   ↓
Temporary real-time state
```

---

# 🏗️ Architecture

```text
                         Client
                           │
                           │ Socket.IO
                           ▼
                    Socket.IO Server
                           │
                    ┌──────┴──────┐
                    │             │
              Authentication   Authorization
                    │             │
                    └──────┬──────┘
                           ▼
                    Conversation Room
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           User A        User B        User C
```

The server acts as the trusted real-time gateway.

The client can request:

```text
typing:start
typing:stop
```

but the server decides whether the request is authorized and which users should receive the resulting event.

---

# 🔄 Typing Flow

When User A starts typing:

```text
User A
   │
   │ typing:start
   ▼
Socket.IO Server
   │
   ├── Authenticate
   │
   ├── Validate Conversation
   │
   ├── Verify Membership
   │
   └── Verify Room Access
          │
          ▼
    Conversation Room
          │
          ├──────────► User B
          │
          └──────────► User C
```

When User A stops typing:

```text
User A
   │
   │ typing:stop
   ▼
Socket.IO Server
   │
   ▼
Conversation Room
   │
   ├──────────► User B
   │
   └──────────► User C
```

---

# 📡 Event Contract Overview

The module introduces two primary real-time events.

| Event          | Direction       | Purpose                     | Persistent? |
| -------------- | --------------- | --------------------------- | ----------- |
| `typing:start` | Client → Server | User started typing         | No          |
| `typing:stop`  | Client → Server | User stopped typing         | No          |
| `typing:start` | Server → Client | Notify conversation members | No          |
| `typing:stop`  | Server → Client | Remove typing indicator     | No          |

The server controls authorization and broadcasting.

Future modules can extend this contract with:

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

All typing events require an authenticated Socket.IO connection.

| Event                 | Authentication   | Authorization           |
| --------------------- | ---------------- | ----------------------- |
| `typing:start`        | Required         | Conversation membership |
| `typing:stop`         | Required         | Conversation membership |
| Server `typing:start` | Server-generated | Authorized room members |
| Server `typing:stop`  | Server-generated | Authorized room members |

The client must never be able to arbitrarily broadcast typing events into a conversation.

---

# 🔐 Server-Side Identity

The client should only provide the conversation identifier.

Example:

```json
{
    "conversationId": "68conversation123"
}
```

The client should **not** provide:

```text
userId
senderId
organizationId
```

The server already knows the authenticated user through:

```text
socket.user
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

The server determines who is typing.

---

# 🚫 Prevent Client Identity Spoofing

The following should never be trusted:

```json
{
    "conversationId": "68conversation123",
    "userId": "another-user"
}
```

Instead:

```text
Client
   │
   ▼
conversationId
   │
   ▼
Authenticated Socket
   │
   ▼
socket.user.userId
```

This prevents one user from pretending that another user is typing.

---

# 🏠 Conversation Room

The module uses the existing Socket.IO room convention:

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

Typing events are broadcast only through the appropriate conversation room.

---

# 🔐 Conversation Authorization

Before accepting:

```text
typing:start
```

or:

```text
typing:stop
```

the server must verify:

```text
Authenticated Socket
       │
       ▼
Conversation Exists?
       │
       ▼
User Is Member?
       │
       ▼
User Has Room Access?
       │
       ├── No → Reject
       │
       ▼
Process Typing Event
```

A connected socket does not automatically have access to every conversation.

---

# 🚫 Unauthorized Conversation Example

User A is not a member of Conversation B.

User A attempts:

```json
{
    "conversationId": "conversation-B"
}
```

Expected:

```text
typing:start
      │
      ▼
Authentication
      │
      ▼
Membership Check
      │
      ▼
Rejected
```

No other participant should receive:

```text
typing:start
```

for that unauthorized conversation.

---

# 📤 `typing:start`

When a user begins typing:

```javascript
socket.emit("typing:start", {
    conversationId
});
```

The server validates the request and broadcasts the event to authorized conversation members.

---

# 📥 `typing:start` Client Payload

The client sends:

```json
{
    "conversationId": "68conversation123"
}
```

The client should not send:

```json
{
    "conversationId": "68conversation123",
    "userId": "68user123"
}
```

because the server determines the user from the authenticated socket.

---

# 📡 `typing:start` Server Broadcast

After successful validation:

```javascript
socket.to(`conversation:${conversationId}`)
    .emit("typing:start", {
        conversationId,
        userId: socket.user.userId
    });
```

The sender does not receive their own typing event.

---

# 👤 Why Exclude the Sender?

The sender already knows:

```text
"I am typing."
```

The purpose of the event is to inform other participants.

Therefore:

```text
User A starts typing

User A → does not need event
User B → receives event
User C → receives event
```

---

# 📤 `typing:stop`

When the user stops typing:

```javascript
socket.emit("typing:stop", {
    conversationId
});
```

The server validates the request and broadcasts:

```javascript
socket.to(`conversation:${conversationId}`)
    .emit("typing:stop", {
        conversationId,
        userId: socket.user.userId
    });
```

---

# 🧠 Why `typing:stop` Is Important

Without a stop event:

```text
User A
   │
   ▼
typing:start
   │
   ▼
User B sees:
"User A is typing..."
```

If User A stops typing, User B needs to know.

Therefore:

```text
typing:start
      │
      ▼
Typing Indicator ON
      │
      ▼
typing:stop
      │
      ▼
Typing Indicator OFF
```

---

# 📤 Socket.IO Acknowledgements

Typing events do not require the server to broadcast an acknowledgement to every participant.

However, the client-to-server request can use a Socket.IO acknowledgement to confirm whether the request was accepted.

Example:

```javascript
socket.emit(
    "typing:start",
    {
        conversationId
    },
    (response) => {
        console.log(response);
    }
);
```

Successful acknowledgement:

```json
{
    "success": true
}
```

Failed acknowledgement:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

The acknowledgement is intended for the requesting socket only.

It is **not** the typing notification itself.

---

# 📡 Acknowledgement Contract

## `typing:start`

### Client → Server

```json
{
    "conversationId": "68conversation123"
}
```

### Server → Requesting Client

Success:

```json
{
    "success": true
}
```

Failure:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

### Server → Other Conversation Members

```json
{
    "conversationId": "68conversation123",
    "userId": "68user123"
}
```

---

# 📡 `typing:stop` Acknowledgement

### Client → Server

```json
{
    "conversationId": "68conversation123"
}
```

### Server → Requesting Client

Success:

```json
{
    "success": true
}
```

Failure:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

### Server → Other Conversation Members

```json
{
    "conversationId": "68conversation123",
    "userId": "68user123"
}
```

---

# ⏱️ Automatic Timeout

Clients should not depend exclusively on:

```text
typing:stop
```

because network problems can occur.

Example:

```text
User A
   │
   ▼
typing:start
   │
   X
Network disconnected
```

The server may never receive:

```text
typing:stop
```

User B could incorrectly see:

```text
User A is typing...
```

forever.

Therefore, the system uses **two different timeout responsibilities**.

---

# ⏱️ Frontend Typing Timer

The frontend timer controls normal typing behavior.

Its purpose is:

```text
User presses key
      │
      ▼
typing:start
      │
      ▼
User continues typing
      │
      ▼
Reset local timer
      │
      ▼
No typing activity
      │
      ▼
typing:stop
```

The frontend should normally send only:

```text
typing:start
```

when typing begins and:

```text
typing:stop
```

when typing activity ends.

---

# 🛡️ Server Typing Timeout

The server maintains a timeout as a **safety mechanism**.

Its purpose is to handle cases where:

```text
typing:stop
```

never arrives.

Example:

```text
typing:start
      │
      ▼
Server marks user as typing
      │
      ▼
Start expiry timer
      │
      ├── typing:start again
      │       ↓
      │   Reset timer
      │
      └── timeout expires
              │
              ▼
        Clear typing state
              │
              ▼
      Broadcast typing:stop
```

### Recommended initial timeout

```text
5 seconds
```

This means:

> If the server receives no further typing activity from a user for 5 seconds, it automatically considers that user no longer typing.

---

# 🧠 Timeout Ownership

The responsibilities are therefore:

```text
Frontend Timer
     ↓
Normal typing lifecycle
     ↓
Sends typing:stop
```

while:

```text
Server Timer
     ↓
Safety mechanism
     ↓
Prevents stale indicators
```

### Important Rule

> **The frontend timer controls normal typing behavior, while the server timeout acts as a safety mechanism against missed `typing:stop` events.**

---

# 🔄 Server Typing-State Lifecycle

The server may maintain temporary in-memory typing state.

Conceptually:

```javascript
typingUsers = {
    conversationA: {
        userA: true,
        userB: true
    }
};
```

The complete lifecycle is:

```text
typing:start
      │
      ▼
Validate request
      │
      ▼
Add user to active typing state
      │
      ▼
Start / reset expiry timer
      │
      ▼
Broadcast typing:start
```

When the user explicitly stops:

```text
typing:stop
      │
      ▼
Remove user from active typing state
      │
      ▼
Clear expiry timer
      │
      ▼
Broadcast typing:stop
```

When the server timeout expires:

```text
Timeout
   │
   ▼
Remove user from active typing state
   │
   ▼
Clear timer
   │
   ▼
Broadcast typing:stop
```

When the socket disconnects:

```text
Socket disconnect
       │
       ▼
Find active typing states
       │
       ▼
Remove user
       │
       ▼
Clear timers
       │
       ▼
Broadcast typing:stop
```

---

# 🧩 Typing State Lifecycle Example

```text
User A starts typing
        │
        ▼
typing:start
        │
        ▼
User A added to typing state
        │
        ▼
Expiry timer started
        │
        ├── User continues typing
        │       │
        │       ▼
        │   Reset timer
        │
        ├── User sends typing:stop
        │       │
        │       ▼
        │   Remove user
        │
        ├── Timer expires
        │       │
        │       ▼
        │   Remove user
        │
        └── Socket disconnects
                │
                ▼
            Remove user
```

---

# 🔄 Debouncing Typing Events

Do not send:

```text
typing:start
typing:start
typing:start
typing:start
```

for every keystroke.

Instead:

```text
First keystroke
     │
     ▼
typing:start
```

Then maintain local typing state.

When typing stops:

```text
No keystrokes
     │
     ▼
typing:stop
```

---

# 🧠 Client-Side Typing Logic

Conceptually:

```text
User presses key
      │
      ▼
Already typing?
      │
      ├── No
      │    │
      │    ▼
      │ typing:start
      │
      └── Yes
           │
           ▼
       Reset local timer
```

Then:

```text
Local timer expires
      │
      ▼
typing:stop
```

---

# 🧩 Example

User types:

```text
H
He
Hel
Hell
Hello
```

Do not send:

```text
typing:start
typing:start
typing:start
typing:start
typing:start
```

Instead:

```text
typing:start
```

Then when the user pauses:

```text
typing:stop
```

---

# 👥 Multiple Users Typing

Multiple users can type simultaneously.

Example:

```text
Conversation A

User A → typing
User B → typing
User C → not typing
```

The UI can display:

```text
User A and User B are typing...
```

For three:

```text
User A, User B and User C are typing...
```

The server must not assume that only one user can type at a time.

---

# 📊 Typing State Model

Typing state is conceptually maintained per conversation:

```text
Conversation
     │
     ├── User A → typing
     ├── User B → typing
     └── User C → not typing
```

The server may maintain this state temporarily in memory.

---

# 🧠 Server-Side State

For a simple single-server implementation:

```text
typingUsers = {
    conversationA: {
        userA: true,
        userB: true
    }
}
```

The actual implementation may additionally maintain expiry timers:

```text
typingUsers
     │
     ├── conversationA
     │      ├── userA
     │      └── userB
     │
     └── conversationB
            └── userC
```

This state should remain temporary.

Do not persist it as a normal MongoDB document.

---

# ⚠️ Important Scaling Consideration

In a multi-server environment:

```text
                Load Balancer
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     Socket Server A       Socket Server B
```

User A may connect to Server A while User B connects to Server B.

In that case, local in-memory typing state alone is not sufficient for cross-server coordination.

Later, Phase 4 can introduce:

```text
Redis
   │
   ▼
Socket.IO Redis Adapter
```

This allows real-time events to synchronize between multiple Socket.IO servers.

### Current Decision

For the current implementation:

```text
Single Socket.IO Server
        ↓
In-memory typing state
```

Future scaling:

```text
Multiple Socket.IO Servers
        ↓
Redis Adapter
        ↓
Shared real-time event propagation
```

Redis is therefore a future scalability enhancement and is not required for the initial implementation.

---

# 🔐 Conversation Authorization

Before accepting:

```text
typing:start
```

the server verifies:

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
User has room access?
       │
       ▼
Allow event
```

The same authorization applies to:

```text
typing:stop
```

Unauthorized users must not be able to broadcast typing events into a conversation.

---

# 🏠 Room-Based Broadcasting

Use the existing room:

```text
conversation:{conversationId}
```

Example:

```text
conversation:68conversation123
```

Then:

```javascript
socket.to(room).emit(...)
```

Only other sockets currently inside the authorized conversation room receive the typing notification.

---

# 🔄 Conversation Switching

Suppose the user changes from:

```text
Conversation A
```

to:

```text
Conversation B
```

The client should:

```text
Leave A
   │
   ▼
Clear local typing indicators for A
   │
   ▼
Join B
```

The client should not continue displaying typing state from Conversation A after switching to Conversation B.

If the user was actively typing in Conversation A, the client should send:

```text
typing:stop
```

before leaving when appropriate.

---

# 📱 Multiple Devices

A user may have:

```text
Chrome
Mobile
Tablet
```

Each device may have a separate socket:

```text
User A
 ├── Socket 1
 ├── Socket 2
 └── Socket 3
```

The system supports multiple sockets for the same user.

Example:

```text
User A - Chrome → typing:start
          │
          ▼
Other conversation members receive event
```

---

# 👤 Multi-Device Self-Typing Rule

A user may receive their own typing event on another device if that device is also connected to the conversation room.

Example:

```text
User A - Chrome
      │
      │ typing
      ▼
Socket.IO
      │
      ▼
User A - Mobile
```

The frontend should normally ignore typing events where:

```text
event.userId === currentUser.id
```

unless cross-device self-typing behavior is intentionally desired.

Therefore:

> **Clients should ignore typing events generated by the currently authenticated user to prevent displaying their own typing indicator on their other devices.**

This keeps the normal UI behavior consistent across devices.

---

# 🔌 Disconnect Handling

If a user disconnects while typing:

```text
User A
   │
   ▼
typing:start
   │
   ▼
Socket disconnect
```

The server should:

```text
Find active typing states
       │
       ▼
Remove user
       │
       ▼
Clear expiry timers
       │
       ▼
Notify relevant conversation members
       │
       ▼
typing:stop
```

This prevents stale typing indicators.

---

# 🔄 Disconnect Flow

```text
Socket disconnect
       │
       ▼
Find conversations where user is typing
       │
       ▼
Remove user from typing state
       │
       ▼
Clear timers
       │
       ▼
Broadcast typing:stop
```

The server should only broadcast `typing:stop` to conversations where the user was actually considered typing.

---

# 🔔 Typing Indicator UI

The frontend may display:

```text
Ravi is typing...
```

For multiple users:

```text
Ravi and Priya are typing...
```

For more users:

```text
Ravi, Priya and 2 others are typing...
```

The formatting is a frontend responsibility.

The backend only sends:

```json
{
    "conversationId": "68conversation123",
    "userId": "68user123"
}
```

---

# 🧠 Backend vs Frontend Responsibility

## Backend

Responsible for:

```text
Socket Authentication
Conversation Authorization
Conversation Membership
Room Authorization
Event Validation
Event Broadcasting
Temporary Typing State
Server Timeout Cleanup
Disconnect Cleanup
Socket Acknowledgements
```

## Frontend

Responsible for:

```text
Detecting Keyboard Activity
Local Typing State
Debouncing Events
Local Typing Timer
Displaying Typing Indicator
Hiding Typing Indicator
Ignoring Own Typing Events
Formatting User Names
Clearing Indicators on Conversation Switch
```

---

# 📡 Detailed Event Contract

## `typing:start`

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

### Server Validation

```text
Authenticate socket
       ↓
Validate conversationId
       ↓
Verify conversation exists
       ↓
Verify user membership
       ↓
Verify room access
```

### Server Acknowledgement

Success:

```json
{
    "success": true
}
```

Failure:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

### Server → Other Clients

```json
{
    "conversationId": "68conversation123",
    "userId": "68user123"
}
```

---

# 📡 `typing:stop`

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

### Server Validation

```text
Authenticate socket
       ↓
Validate conversationId
       ↓
Verify conversation exists
       ↓
Verify user membership
       ↓
Verify room access
```

### Server Acknowledgement

Success:

```json
{
    "success": true
}
```

Failure:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

### Server → Other Clients

```json
{
    "conversationId": "68conversation123",
    "userId": "68user123"
}
```

---

# 🔄 Typing Event Lifecycle

Complete lifecycle:

```text
User starts typing
       │
       ▼
Client detects first typing activity
       │
       ▼
typing:start
       │
       ▼
Server authentication
       │
       ▼
Conversation authorization
       │
       ▼
Add user to typing state
       │
       ▼
Start / reset server expiry timer
       │
       ▼
Broadcast typing:start
       │
       ▼
Other participants display indicator
```

When typing normally stops:

```text
No keyboard activity
       │
       ▼
Frontend timer expires
       │
       ▼
typing:stop
       │
       ▼
Server removes typing state
       │
       ▼
Clear server timer
       │
       ▼
Broadcast typing:stop
       │
       ▼
Other participants hide indicator
```

If `typing:stop` is missed:

```text
Server expiry timer
       │
       ▼
Timeout
       │
       ▼
Remove typing state
       │
       ▼
Broadcast typing:stop
       │
       ▼
Other participants hide indicator
```

If the socket disconnects:

```text
Socket disconnect
       │
       ▼
Find active typing states
       │
       ▼
Remove user
       │
       ▼
Clear timers
       │
       ▼
Broadcast typing:stop
```

---

# 🚨 Error Handling

## Invalid Conversation ID

```text
typing:start
      │
      ▼
Invalid conversation
      │
      ▼
Reject
```

Acknowledgement:

```json
{
    "success": false,
    "message": "Invalid conversation"
}
```

---

## Conversation Not Found

```json
{
    "success": false,
    "message": "Conversation not found"
}
```

The typing event must not be broadcast.

---

## Unauthorized Conversation

```text
typing:start
      │
      ▼
Membership check
      │
      ▼
Rejected
```

Acknowledgement:

```json
{
    "success": false,
    "message": "You do not have access to this conversation"
}
```

The socket must not broadcast the typing event.

---

## Unauthenticated Socket

```text
Unauthenticated Socket
      │
      ▼
typing:start
      │
      ▼
Reject
```

The socket should not be permitted to process the event.

---

# 🧪 Testing Plan

## 1. Connect User A

Expected:

```text
Socket connected
```

---

## 2. Connect User B

Both users should be members of the same conversation.

```text
Conversation A
 ├── User A
 └── User B
```

---

## 3. User A Starts Typing

Emit:

```text
typing:start
```

Expected User B:

```text
User A is typing...
```

Expected User A:

```text
No own typing indicator
```

---

## 4. Verify Acknowledgement

Successful request should return:

```json
{
    "success": true
}
```

---

## 5. User A Stops Typing

Emit:

```text
typing:stop
```

Expected:

```text
Typing indicator disappears
```

---

## 6. Automatic Server Timeout

Send:

```text
typing:start
```

Do not send:

```text
typing:stop
```

Wait for the server timeout.

Expected:

```text
Typing indicator disappears automatically
```

The server should clean the stale typing state.

---

## 7. Frontend Timer

Start typing and stop generating keyboard activity.

Expected:

```text
Frontend timer
      ↓
typing:stop
```

The server should remove the user from active typing state.

---

## 8. Multiple Users

Connect:

```text
User A
User B
User C
```

User A and B start typing.

Expected User C:

```text
User A and User B are typing...
```

The server must maintain both users independently.

---

## 9. Unauthorized User

Connect User C who is not a member.

Attempt:

```text
typing:start
```

Expected:

```text
Rejected
```

No authorized participant should receive the event.

---

## 10. Disconnect While Typing

User A:

```text
typing:start
```

Then disconnect.

Expected:

```text
typing:stop
```

is effectively communicated to remaining users.

The server should also clear the user's typing state and associated timer.

---

## 11. Switch Conversation

User A:

```text
Conversation A
      ↓
Conversation B
```

Verify:

```text
Typing state from A is cleared locally
Typing events from A are not displayed in B
```

---

## 12. Rapid Typing

Type:

```text
Hello everyone!
```

quickly.

Verify that the system does not generate:

```text
typing:start
typing:start
typing:start
typing:start
```

for every character.

Expected:

```text
typing:start
      ↓
Continue typing
      ↓
typing:stop
```

---

## 13. Multiple Devices

Connect the same user from:

```text
Chrome
Mobile
```

Start typing from Chrome.

Expected:

```text
Other users → receive typing:start
Mobile → normally ignores own typing event
```

---

## 14. Duplicate Stop Event

Send:

```text
typing:stop
typing:stop
```

Expected:

```text
No duplicate typing-stop side effects
No errors
Typing state remains cleared
```

---

## 15. Invalid Conversation

Send:

```json
{
    "conversationId": "invalid-id"
}
```

Expected:

```text
Request rejected
No broadcast
```

---

## 16. Socket Delivery Recovery

Disconnect a user while another participant is typing.

Expected:

```text
Disconnected user's typing state
        ↓
Cleared by server
        ↓
Remaining participants
        ↓
typing:stop
```

Typing status does not need to be recovered from MongoDB because it is ephemeral.

---

# 📊 Performance Considerations

Typing indicators can generate a high number of events.

Avoid:

```text
Every keystroke
     ↓
Socket event
     ↓
Server
     ↓
All users
```

Instead:

```text
Typing begins
     ↓
typing:start
     ↓
Local timer
     ↓
Typing continues
     ↓
Reset timer
     ↓
Typing stops
     ↓
typing:stop
```

This significantly reduces unnecessary network traffic.

---

# ⚡ Performance Rules

The implementation should follow these rules:

```text
1. Do not emit typing:start for every keystroke.
2. Maintain local typing state on the client.
3. Use a frontend inactivity timer.
4. Use a server safety timeout.
5. Do not persist typing state in MongoDB.
6. Broadcast only to the relevant conversation room.
7. Do not send typing events to the sender unnecessarily.
8. Clear state on disconnect.
9. Clear state when a user leaves the conversation.
10. Support multiple simultaneous typers.
```

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Socket authentication is required.
* [ ] User identity comes from the authenticated socket.
* [ ] Client cannot specify another user's ID.
* [ ] Conversation membership is verified.
* [ ] Conversation room access is authorized.
* [ ] Unauthorized typing events are rejected.
* [ ] `typing:start` is implemented.
* [ ] `typing:stop` is implemented.
* [ ] Sender does not receive unnecessary self-events.
* [ ] Socket.IO acknowledgements are defined.
* [ ] Invalid requests return appropriate acknowledgement errors.
* [ ] Frontend typing timer is implemented.
* [ ] Server typing timeout is implemented.
* [ ] Server timeout acts as a stale-state safety mechanism.
* [ ] Disconnect cleanup is implemented.
* [ ] Active typing state is cleared on disconnect.
* [ ] Multiple simultaneous typers are supported.
* [ ] Multiple sockets per user are supported.
* [ ] Own typing events are ignored on other devices by default.
* [ ] Conversation switching clears obsolete local typing state.
* [ ] Typing state is not persisted unnecessarily.
* [ ] Rapid typing is debounced.
* [ ] Event payloads are documented.
* [ ] Offline/disconnected users are handled safely.
* [ ] No sensitive information is included in typing events.
* [ ] Redis is reserved for future multi-server scaling.
* [ ] MongoDB is not used as the source of typing state.

---

# 📊 Phase 3 Progress

After completing this module:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  ✅
├── Typing Indicators           🟡 Current
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
Typing Indicators            🟡
Online / Offline Presence    ⏳
Real-Time Read Receipts      ⏳
Real-Time Reactions          ⏳
```

---

# 📌 Summary

The **Typing Indicators module** introduces temporary real-time typing state into the Chat Platform.

The architecture separates normal typing behavior from server-side safety mechanisms.

The normal flow is:

```text
User A
   │
   │ typing:start
   ▼
Socket.IO Server
   │
   ├── Authenticate
   ├── Validate
   ├── Authorize
   └── Update Typing State
           │
           ▼
    Conversation Room
           │
           ├──────────► User B
           └──────────► User C
```

When typing normally stops:

```text
Frontend Timer
      │
      ▼
typing:stop
      │
      ▼
Socket.IO Server
      │
      ▼
Remove Typing State
      │
      ▼
Broadcast typing:stop
```

If the client fails to send `typing:stop`:

```text
Server Safety Timer
       │
       ▼
Timeout
       │
       ▼
Clear Typing State
       │
       ▼
Broadcast typing:stop
```

If the socket disconnects:

```text
Socket Disconnect
       │
       ▼
Find Active Typing States
       │
       ▼
Clear User State
       │
       ▼
Clear Timers
       │
       ▼
Broadcast typing:stop
```

The key architectural principle is:

```text
Messages
   ↓
Persistent
   ↓
MongoDB


Typing
   ↓
Temporary
   ↓
Socket.IO
```

The frontend and backend have clearly separated responsibilities:

```text
Frontend
   │
   ├── Detect typing
   ├── Debounce
   ├── Local timer
   └── Display indicator

Backend
   │
   ├── Authenticate
   ├── Authorize
   ├── Maintain temporary state
   ├── Safety timeout
   ├── Disconnect cleanup
   └── Broadcast events
```

For multiple devices:

```text
User A
 ├── Chrome
 ├── Mobile
 └── Tablet

        ↓

Multiple Socket.IO connections
        ↓
Same conversation room
```

Clients normally ignore events where:

```text
event.userId === currentUser.id
```

to prevent displaying their own typing indicator.

For scalability:

```text
Single Server
     ↓
In-memory typing state
```

is sufficient for the initial implementation.

Later:

```text
Multiple Servers
       ↓
Redis
       ↓
Socket.IO Redis Adapter
```

can provide cross-server real-time event propagation.

The complete responsibility model is:

```text
MongoDB
   ↓
Persistent Source of Truth

REST API
   ↓
Persistent Data Operations

Socket.IO
   ↓
Ephemeral Real-Time State

Typing Indicators
   ↓
Temporary
   ↓
No MongoDB Persistence
```

This provides a lightweight, secure, scalable foundation for typing indicators while reusing the authenticated Socket.IO connection and conversation-room authorization established by the previous modules.

---

# 🚀 Next Module

The next module is:

```text
Phase 3 — Real-Time Communication

├── Socket.IO Setup             ✅
├── Real-Time Message Delivery  ✅
├── Typing Indicators           🟡
└── Online / Offline Presence   ← NEXT
```

The **Online / Offline Presence** module will introduce real-time user presence and allow the platform to determine and broadcast whether users are currently:

```text
Online
Offline
Disconnected
```

It will build on the same:

```text
Authenticated Socket
        ↓
Conversation / User Rooms
        ↓
Socket.IO Events
```

architecture established in the previous modules.

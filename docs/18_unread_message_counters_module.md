# 🔢 Unread Message Counters Module

## 📋 Module Information

| Property            | Value                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Module**          | Unread Message Counters                                                                        |
| **Version**         | v1.2                                                                                           |
| **Status**          | 🟡 In Development                                                                              |
| **Phase**           | Phase 4 — Notifications & Unread System                                                        |
| **Previous Module** | Notification Core                                                                              |
| **Next Module**     | Notification Preferences                                                                       |
| **Depends On**      | Authentication, Users, Conversations, Conversation Members, Messages, Read Receipts, Socket.IO |
| **Database**        | MongoDB                                                                                        |
| **Real-Time Layer** | Socket.IO                                                                                      |

---

# 📌 Overview

The **Unread Message Counters module** manages unread message state for each authenticated user within each conversation.

It allows the chat application to display:

```text
General              3
Development          8
Project Discussion   0
Support              12
```

The module determines unread counts using the existing **conversation membership and read position** rather than maintaining a separate unread-counter collection.

The core model is:

```text
ConversationMember.lastReadMessage
                +
             Messages
                ↓
         Derived Unread Count
```

The system keeps unread state synchronized when:

* A new message is created
* A user opens a conversation
* A conversation is marked as read
* Multiple devices are connected
* A user goes offline and returns
* Messages are deleted
* A user leaves or is removed from a conversation

The unread counter is **derived state**, not an independent source of truth.

---

# 🎯 Objectives

The module should:

* Track unread messages per conversation and user
* Determine unread messages from the user's read position
* Exclude the authenticated user's own messages
* Reset unread state when a conversation is marked as read
* Retrieve unread counts for conversations
* Retrieve the total unread count
* Synchronize unread state through Socket.IO
* Support multiple connected devices
* Work correctly for offline users
* Respect conversation membership
* Prevent users from accessing another user's unread state
* Reuse the existing `ConversationMember` read state
* Avoid unnecessary duplicate unread-counter storage
* Provide conversation-level unread badges
* Keep unread business logic centralized

---

# 🧠 Core Principle

The unread counter answers:

> **"How many messages in this conversation have I not read yet?"**

For example:

```text
Conversation
     │
     ├── Message 1 ✅ Read
     ├── Message 2 ❌ Unread
     ├── Message 3 ❌ Unread
     ├── Message 4 ❌ Unread
     └── Message 5 ❌ Unread

Unread Count = 4
```

However, a user's own messages should not increase their unread count.

Therefore, the definitive rule is:

> **Unread count = messages created after the authenticated user's last-read position, excluding messages authored by the authenticated user.**

Conceptually:

```text
Conversation Messages
        │
        ▼
Messages after lastReadMessage
        │
        ▼
Exclude authenticated user's messages
        │
        ▼
Unread Count
```

---

# 🔄 Source of Truth

The unread system intentionally does **not** store:

```text
unreadCount
```

as an independent database value.

Instead:

```text
Stored State
     │
     └── ConversationMember.lastReadMessage

Derived State
     │
     ├── unreadCount
     └── totalUnread
```

Therefore:

```text
Messages
    +
ConversationMember.lastReadMessage
    ↓
Unread Count
```

MongoDB stores:

* Actual messages
* Conversation membership
* User read position

The unread service derives:

* `unreadCount`
* `totalUnread`

### Core Rule

> **`lastReadMessage` is stored state.**

> **`unreadCount` and `totalUnread` are derived values.**

This prevents multiple independent sources of truth from becoming inconsistent.

---

# 🏗️ Architecture

```text
                    New Message
                         │
                         ▼
                  Message Service
                         │
                         ▼
               Trigger Unread Processing
                         │
                         ▼
                  Unread Service
                         │
                  ┌──────┴──────┐
                  ▼             ▼
              MongoDB       Socket.IO
                  │             │
                  │             ▼
                  │       unread:update
                  │             │
                  ▼             ▼
             Read Position   Chat UI
                  │
                  ▼
            Derived Count
```

The architecture separates:

```text
Persistent Read State
        │
        ▼
ConversationMember
```

from:

```text
Derived Unread State
        │
        ▼
Unread Service
```

and:

```text
Real-Time Delivery
        │
        ▼
Socket.IO
```

---

# 🧠 Stored vs Derived State

The database model remains intentionally minimal.

## Stored

```text
ConversationMember
        │
        └── lastReadMessage
```

## Derived

```text
Unread Service
        │
        ├── unreadCount
        └── totalUnread
```

The system should **not** persist:

```text
unreadCount
```

as a separate value for every user/conversation.

This avoids inconsistencies such as:

```text
Actual unread messages = 5
Stored unreadCount     = 7
```

Instead, the count is calculated from the actual message state and the user's read position.

---

# 🔄 Message Flow

When User A sends a message to User B:

```text
User A
  │
  ▼
Send Message
  │
  ▼
Message Service
  │
  ├── Save Message
  │
  └── Trigger Unread Processing
             │
             ▼
      Read Position Checked
             │
             ▼
      Derived Unread Count
             │
             ▼
          Socket.IO
             │
             ▼
           User B
```

The unread count does **not** get permanently incremented.

Instead:

```text
New Message
     ↓
User's lastReadMessage remains unchanged
     ↓
There is now one more candidate unread message
     ↓
Derived unread count increases
```

Therefore, the system does not perform:

```text
unreadCount = unreadCount + 1
```

as persistent state.

---

# 📊 Example

Before a new message:

```text
Conversation: Project Discussion

Message 1
Message 2
Message 3

User B:
lastReadMessage = Message 3

Unread = 0
```

User A sends:

```text
Message 4
```

User B's read position remains:

```text
lastReadMessage = Message 3
```

Therefore:

```text
Messages after lastReadMessage
        │
        └── Message 4

Unread Count = 1
```

If User A sends:

```text
Message 5
Message 6
```

then:

```text
lastReadMessage = Message 3

Unread Messages:
Message 4
Message 5
Message 6

Unread Count = 3
```

---

# 👤 Own Messages

A user's own messages must not increase their unread count.

Example:

```text
Message 1 → User A
Message 2 → User B
Message 3 → User A
Message 4 → User A
Message 5 → User B
```

Suppose:

```text
User B.lastReadMessage = Message 1
```

Messages after the read position are:

```text
Message 2
Message 3
Message 4
Message 5
```

User B's own messages are excluded:

```text
Message 2 → User B       excluded
Message 3 → User A       unread
Message 4 → User A       unread
Message 5 → User B       excluded
```

Therefore:

```text
Unread Count = 2
```

The rule is:

```text
conversation = currentConversation
AND message is after lastReadMessage
AND sender != authenticatedUser
```

---

# 🧮 Unread Count Formula

Conceptually:

```text
Unread Count =
Messages in Conversation
after user's lastReadMessage
AND sender != authenticatedUser
```

For example:

```text
Total Messages = 25

lastReadMessage = Message 20
```

Potential unread messages:

```text
21
22
23
24
25
```

If Message 23 was authored by the current user:

```text
21 → Other User
22 → Other User
23 → Current User
24 → Other User
25 → Other User
```

Then:

```text
Unread Count = 4
```

not:

```text
Unread Count = 5
```

---

# 🧠 Why Use `lastReadMessage`?

Consider:

```text
Message 1
Message 2
Message 3
Message 4
Message 5
```

If:

```text
lastReadMessage = Message 2
```

then the unread range begins after Message 2:

```text
Message 3
Message 4
Message 5
```

The service then excludes messages authored by the authenticated user.

Therefore:

```text
Read Position
      │
      ▼
Messages After Position
      │
      ▼
Exclude Own Messages
      │
      ▼
Unread Count
```

This provides a simple and explainable model for the portfolio project.

---

# 🗃️ Conversation Member Structure

The existing `ConversationMember` document should contain the user's read position.

Example:

```javascript
{
    "_id": "68member123",
    "conversation": "68conversation123",
    "user": "68user456",
    "lastReadMessage": "68message789",
    "createdAt": "2026-08-10T08:00:00.000Z",
    "updatedAt": "2026-08-10T08:30:00.000Z"
}
```

The important field is:

```text
lastReadMessage
```

which represents the latest message the user has marked as read.

For a newly created conversation member:

```text
lastReadMessage = null
```

The unread service then considers messages from the beginning of the conversation, while still excluding the authenticated user's own messages.

---

# 🔗 Relationships

```text
Conversation
      │
      ├──────────────► Messages
      │
      └──────────────► Conversation Members
                              │
                              ▼
                       Last Read Message
```

Then:

```text
Last Read Message
        │
        ▼
Messages After It
        │
        ▼
Exclude Own Messages
        │
        ▼
Unread Count
```

---

# 🧭 Message Ordering

Unread calculation depends on consistent message ordering.

The portfolio implementation should use:

```text
createdAt
```

as the primary chronological field.

Because multiple messages can theoretically share the same timestamp, a deterministic secondary ordering should also be used:

```text
createdAt + _id
```

Conceptually:

```text
Primary Order:
createdAt ASC

Secondary Order:
_id ASC
```

The important rule is:

> **The read position and unread query must use the same deterministic message ordering strategy.**

This ensures that messages are consistently identified as being before or after the user's read position.

A dedicated per-conversation message sequence can be introduced in a future high-scale implementation, but it is not required for the current portfolio scope.

---

# 🗑️ Deleted Messages

The unread system must define what happens when a message referenced by `lastReadMessage` is deleted.

For the portfolio implementation, messages should preferably use **soft deletion**.

Example:

```javascript
{
    "_id": "68message789",
    "conversation": "68conversation123",
    "sender": "68user456",
    "content": "Hello",
    "deletedAt": "2026-08-10T10:30:00.000Z"
}
```

The message remains in the database while its content is treated as deleted.

Therefore:

```text
ConversationMember.lastReadMessage
              │
              ▼
        Existing Message
              │
              ▼
         deletedAt exists
```

The reference remains valid.

The UI can display:

```text
Message no longer available
```

while the backend continues to maintain the read position correctly.

---

# 📌 Hard Deletion Policy

If the application later introduces permanent message deletion, the unread system must ensure that deleting a message referenced by:

```text
ConversationMember.lastReadMessage
```

does not break the user's read position.

For the current portfolio implementation:

> **Soft deletion is preferred so the read-position reference remains stable.**

A complex read-position repair mechanism is not required.

---

# 📡 REST API

The module exposes a small set of APIs.

## Get All Unread Counts

```http
GET /api/conversations/unread
```

Returns unread counts for conversations accessible to the authenticated user.

Example:

```json
{
    "success": true,
    "data": [
        {
            "conversationId": "68conversation123",
            "unreadCount": 3
        },
        {
            "conversationId": "68conversation456",
            "unreadCount": 8
        }
    ]
}
```

---

# 🔢 Get Total Unread Count

```http
GET /api/conversations/unread/total
```

Example:

```json
{
    "success": true,
    "data": {
        "totalUnread": 11
    }
}
```

This can be used for:

```text
Messages 🔴 11
```

The total is derived from conversation-level unread counts.

It is not stored separately.

---

# 🔍 Get Conversation Unread Count

```http
GET /api/conversations/:conversationId/unread
```

Example:

```json
{
    "success": true,
    "data": {
        "conversationId": "68conversation123",
        "unreadCount": 3
    }
}
```

---

# ✅ Mark Conversation as Read

```http
PATCH /api/conversations/:conversationId/read
```

This updates the authenticated user's read position.

The intended behavior is:

> **Marking a conversation as read advances the authenticated user's read position to the latest message currently available in that conversation.**

Conceptually:

```text
User opens conversation
        │
        ▼
Find latest message
        │
        ▼
lastReadMessage = latestMessage
        │
        ▼
Unread Count = 0
```

Example:

```text
Before:

lastReadMessage = Message 20

Unread:
21
22
23

Unread Count = 3
```

After marking as read:

```text
lastReadMessage = Message 23

Unread Count = 0
```

---

# 📤 Mark as Read Response

```json
{
    "success": true,
    "message": "Conversation marked as read",
    "data": {
        "conversationId": "68conversation123",
        "unreadCount": 0
    }
}
```

---

# ⚠️ Read Position and Pagination

The current portfolio implementation keeps the read API intentionally simple.

When the user marks a conversation as read:

```text
lastReadMessage = latest message
```

This means:

> The user is considered to have read the conversation up to the latest available message.

This is appropriate for a typical chat UI where opening and actively viewing a conversation represents reading the current conversation.

A more advanced implementation could support:

```text
PATCH /conversations/:id/read
{
    "messageId": "..."
}
```

for partial read positions.

However, this is **not required for the current portfolio scope**.

---

# 📡 Real-Time Events

Unread counters must update without requiring a page refresh.

Use:

```text
unread:update
```

Direction:

```text
Server → Client
```

Example payload:

```json
{
    "conversationId": "68conversation123",
    "unreadCount": 4,
    "totalUnread": 7
}
```

The payload contains:

```text
conversationId
unreadCount
totalUnread
```

so the frontend can update both:

```text
Conversation Badge
```

and:

```text
Global Messages Badge
```

without making another request.

---

# 👤 User-Specific Socket Room

Unread state is **user-specific**, not conversation-specific.

Therefore unread updates should be delivered through:

```text
user:{userId}
```

Example:

```text
user:68user456
```

When the user connects:

```text
Socket
  │
  ▼
Authenticate
  │
  ▼
Join user room
  │
  ▼
user:68user456
```

The server can emit:

```javascript
io.to(`user:${userId}`).emit("unread:update", payload);
```

This ensures that all connected devices belonging to the user receive the update.

Unread events should not be broadcast to a general conversation room because:

```text
Unread state
     ↓
belongs to a specific user
```

while:

```text
Conversation messages
     ↓
belong to a conversation
```

---

# 🔄 Real-Time Unread Flow

When a new message arrives:

```text
New Message
     │
     ▼
Message Service
     │
     ▼
Trigger Unread Processing
     │
     ▼
Unread Service
     │
     ▼
Calculate Derived Count
     │
     ▼
Socket.IO
     │
     ▼
user:{userId}
     │
     ▼
unread:update
     │
     ▼
Chat UI
```

The frontend can immediately update:

```text
Project Discussion     4
```

without refreshing.

---

# 📡 Read Synchronization

When a user opens a conversation:

```text
User opens conversation
        │
        ▼
PATCH /conversations/:id/read
        │
        ▼
Verify Membership
        │
        ▼
Find Latest Message
        │
        ▼
Update lastReadMessage
        │
        ▼
Derived Unread Count = 0
        │
        ▼
Socket.IO
        │
        ▼
user:{userId}
        │
        ▼
unread:update
```

All connected devices belonging to the same user receive the updated state.

---

# 👥 Multiple Devices

The same user may have:

```text
Chrome
Mobile
Tablet
```

connected simultaneously.

All devices join:

```text
user:{userId}
```

Example:

```text
                   User B
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Chrome      Mobile      Tablet
          │          │          │
          └──────────┼──────────┘
                     │
                user:68user456
```

If the user reads a conversation on Mobile:

```text
Mobile
  │
  ▼
Mark Conversation Read
  │
  ▼
Server
  │
  ▼
Update lastReadMessage
  │
  ▼
Calculate unread = 0
  │
  ├──► Chrome
  └──► Tablet
```

This keeps all devices synchronized.

---

# 📴 Offline Users

If the user is offline:

```text
User Offline
     │
     ▼
New Message
     │
     ▼
Message Stored
     │
     ▼
Read Position Unchanged
```

There is no active Socket.IO connection.

When the user reconnects:

```text
User Reconnects
      │
      ▼
GET /api/conversations/unread
      │
      ▼
Calculate from MongoDB
      │
      ▼
Display Correct Counts
```

Therefore unread state is not lost because of temporary disconnection.

The persisted read position remains the source of truth.

---

# 🧠 Relationship With Read Receipts

Unread counters and read receipts have different responsibilities.

## Read Receipts

Answer:

> **"Has the recipient read my message?"**

Example:

```text
Message 25
    │
    ▼
Read by User B
```

## Unread Counter

Answers:

> **"How many messages does User B still need to read?"**

Example:

```text
User B
   │
   ▼
Conversation
   │
   ▼
Unread = 4
```

Conceptually:

```text
Read Receipt
     │
     ▼
Message-level read information

Unread Counter
     │
     ▼
User-level conversation read position
```

They can share underlying read-state concepts while remaining separate responsibilities.

---

# 🧩 Recommended Service

Create:

```text
unread.service.js
```

Responsibilities:

```text
calculateUnreadCount()
getConversationUnreadCount()
getAllUnreadCounts()
getTotalUnreadCount()
markConversationAsRead()
emitUnreadUpdate()
```

Conceptually:

```text
Unread Service
│
├── calculateUnreadCount()
├── getConversationUnreadCount()
├── getAllUnreadCounts()
├── getTotalUnreadCount()
├── markConversationAsRead()
└── emitUnreadUpdate()
```

---

# 🧠 Service Architecture

Unread business logic should not be placed directly inside controllers.

Use:

```text
Message Service
       │
       ▼
Unread Service
       │
       ├── MongoDB
       │
       └── Socket.IO
```

This keeps:

```text
HTTP Layer
Business Logic
Persistence
Real-Time Delivery
```

separated.

The controller should handle:

```text
Request
Validation
Authentication Context
Response
```

while the service handles:

```text
Unread Business Logic
Read Position
Unread Calculation
Socket Synchronization
```

---

# 🔄 Integration With Message Module

When a message is created:

```text
Message Service
       │
       ├── Save Message
       │
       └── Trigger Unread Processing
                    │
                    ▼
              Unread Service
                    │
                    ▼
             Derived Count
                    │
                    ▼
                Socket.IO
```

The Message Controller should not manually calculate:

```text
unreadCount
```

The unread service owns that responsibility.

---

# 🔄 Integration With Conversation Module

When a user opens a conversation:

```text
Conversation
      │
      ▼
Mark as Read
      │
      ▼
Unread Service
      │
      ▼
Update ConversationMember
      │
      ▼
lastReadMessage
```

The `ConversationMember` document remains the source of the user's read position.

---

# 🔐 Authorization

Users can only retrieve unread counts for conversations where they are members.

Before returning unread data:

```text
Authenticated User
        │
        ▼
Conversation Membership
        │
        ├── Member → Continue
        │
        └── Not Member → Deny
```

The backend obtains the user from the authentication context.

It must not trust a client-provided user ID.

---

# 🚫 Unauthorized Access

User A attempts:

```http
GET /api/conversations/user-B-conversation/unread
```

If User A is not a member:

```text
Access denied
```

The API can return:

```text
403 Forbidden
```

or:

```text
404 Not Found
```

depending on the application's API security convention.

For sensitive resource lookups, `404 Not Found` may be preferred because it avoids revealing whether the conversation exists.

---

# 🛡️ Security Rules

The backend must:

* Authenticate every request
* Verify conversation membership
* Determine the user from the JWT/authentication context
* Never trust `userId` from the request body
* Validate conversation IDs
* Prevent cross-user unread access
* Prevent unauthorized read-state updates
* Ensure Socket.IO updates target the correct user room
* Ensure the authenticated user owns the read state being modified
* Prevent removed members from receiving unread updates
* Ensure unread data is never calculated using another user's read position

---

# 📊 Database Query Strategy

For:

```http
GET /api/conversations/:conversationId/unread
```

the backend should conceptually:

```text
1. Authenticate user
2. Validate conversation ID
3. Verify conversation membership
4. Find user's ConversationMember record
5. Read lastReadMessage
6. Determine the read-position ordering
7. Find messages after that position
8. Exclude messages authored by the authenticated user
9. Return derived unread count
```

Conceptually:

```text
conversation = target conversation
AND message > lastReadMessage
AND sender != authenticatedUser
```

If:

```text
lastReadMessage = null
```

then unread calculation starts from the beginning of the conversation.

---

# ⚡ Performance Considerations

Unread counts can be requested frequently, especially when:

```text
Conversation List
Global Message Badge
Real-Time Updates
```

are rendered.

Therefore the database must have indexes supporting the actual query patterns.

## Messages

Recommended index:

```javascript
{
    conversation: 1,
    createdAt: 1
}
```

This supports:

```text
Find messages in a conversation
after a specific chronological position
```

If the implementation uses deterministic ordering with `_id`, the query logic should consistently apply:

```text
createdAt + _id
```

when comparing message positions.

## Conversation Members

Recommended index:

```javascript
{
    conversation: 1,
    user: 1
}
```

This should normally be unique:

```text
conversation + user = UNIQUE
```

because one user should have one membership record per conversation.

This allows efficient lookup of:

```text
conversation + authenticatedUser
```

to retrieve:

```text
lastReadMessage
```

---

# 📱 Frontend Usage

The frontend can display:

```text
Conversations

General              3
Development          8
Design               0
Support              12
```

and:

```text
Messages 🔴 23
```

The frontend should **not calculate unread counts from the message list**.

Instead:

```text
Backend
   │
   ▼
Unread Service
   │
   ▼
Derived Unread Count
   │
   ▼
Socket.IO / REST
   │
   ▼
Frontend
```

The frontend is responsible for displaying server-provided state.

---

# 🔄 Complete Unread Flow

```text
                 New Message
                      │
                      ▼
                Message Service
                      │
                      ▼
             Trigger Unread Processing
                      │
                      ▼
                 Unread Service
                      │
             ┌────────┴────────┐
             ▼                 ▼
      Read Position       Calculate Count
             │                 │
             └────────┬────────┘
                      ▼
                   MongoDB
                      │
                      ▼
                 Socket.IO
                      │
                      ▼
             user:{userId}
                      │
                      ▼
                unread:update
                      │
                      ▼
                   Chat UI
```

When the user reads:

```text
User opens conversation
          │
          ▼
Mark Conversation Read
          │
          ▼
Verify Membership
          │
          ▼
Find Latest Message
          │
          ▼
Update lastReadMessage
          │
          ▼
Derived Unread Count = 0
          │
          ▼
Socket.IO
          │
          ▼
user:{userId}
          │
          ▼
Other Connected Devices
```

---

# 🗂️ Recommended Folder Structure

For the minimal portfolio implementation:

```text
src/
│
├── controllers/
│   └── unread.controller.js
│
├── services/
│   └── unread.service.js
│
├── routes/
│   └── unread.routes.js
│
└── socket/
    └── events/
        └── unread.events.js
```

No separate:

```text
unread.utils.js
```

is required unless genuinely reusable utility logic emerges.

The important requirement is:

> **Unread business logic remains centralized and is not duplicated across controllers.**

---

# 🧪 Testing Plan

## 1. New Message

User A sends a message to User B.

Verify:

```text
User B unread count increases by 1
```

through derived state.

---

## 2. Sender

User A sends a message.

Verify:

```text
User A unread count does not increase
```

---

## 3. Multiple Messages

Send:

```text
Message 1
Message 2
Message 3
```

without reading the conversation.

Verify:

```text
Unread Count = 3
```

assuming all three messages were authored by another user.

---

## 4. Mixed Sender Messages

Example:

```text
Message 1 → User A
Message 2 → User B
Message 3 → User A
Message 4 → User A
Message 5 → User B
```

If User B's read position is before Message 1:

```text
Unread messages for User B:

Message 1
Message 3
Message 4
```

Verify:

```text
Unread Count = 3
```

and User B's own messages are excluded.

---

## 5. Open Conversation

Open the conversation.

Verify:

```text
lastReadMessage = latest message
```

and:

```text
Unread Count = 0
```

---

## 6. New Message After Reading

After:

```text
Unread = 0
```

another user sends a new message.

Verify:

```text
Unread Count = 1
```

without modifying any stored `unreadCount` field.

---

## 7. Real-Time Update

Keep User B online.

Send a new message.

Verify:

```text
unread:update
```

is received without refreshing.

---

## 8. Offline User

Disconnect User B.

Send messages.

Reconnect User B.

Verify:

```http
GET /api/conversations/unread
```

returns the correct derived unread counts.

---

## 9. Multiple Devices

Connect User B on:

```text
Chrome
Mobile
```

Read the conversation on Mobile.

Verify Chrome receives:

```text
unread:update
```

with:

```text
unreadCount = 0
```

---

## 10. Unauthorized Conversation

Attempt to retrieve unread count for a conversation where the user is not a member.

Expected:

```text
Access denied
```

---

## 11. Total Unread

Example:

```text
Conversation A = 2
Conversation B = 5
Conversation C = 3
```

Expected:

```text
Total = 10
```

---

## 12. No Unread Messages

Verify:

```text
unreadCount = 0
```

is returned rather than an error.

---

## 13. Deleted Message

Soft-delete a message referenced by the user's read position.

Verify:

```text
lastReadMessage remains valid
```

and unread calculations continue to work correctly.

---

## 14. Deleted Conversation

Delete or archive a conversation.

Verify the user's unread data is no longer exposed for inaccessible conversations.

---

## 15. User Removed From Conversation

Remove a user from a conversation.

Verify the user can no longer:

```text
retrieve unread count
mark conversation as read
receive unread updates
```

for that conversation.

---

## 16. Invalid Conversation ID

Send an invalid conversation ID.

Verify the API returns an appropriate validation error.

---

## 17. Missing Read Position

Create a new conversation member with:

```text
lastReadMessage = null
```

Verify unread calculation:

```text
starts from beginning
AND
excludes authenticated user's own messages
```

---

## 18. Message Ordering

Create multiple messages with identical or very close timestamps.

Verify the unread calculation follows the same deterministic ordering:

```text
createdAt + _id
```

used by the application's message ordering.

---

# ⚠️ Edge Cases

The module should handle:

* Conversation with no messages
* User with no unread messages
* User's own messages
* Multiple messages arriving quickly
* Mixed sender messages
* Deleted messages
* Soft-deleted messages
* Deleted conversations
* Archived conversations
* User removed from conversation
* Multiple connected devices
* Offline users
* Invalid conversation IDs
* Unauthorized conversations
* Already-read conversations
* New messages after marking a conversation as read
* Missing `lastReadMessage`
* Conversation membership without previous read state
* Multiple messages sharing the same timestamp
* Read position pointing to a soft-deleted message

For a newly created conversation member:

```text
lastReadMessage = null
```

the unread service should calculate unread messages from the beginning of the conversation while still excluding the authenticated user's own messages.

---

# 📊 API Summary

| Method | Endpoint                                    | Purpose                       |
| ------ | ------------------------------------------- | ----------------------------- |
| GET    | `/api/conversations/unread`                 | Get unread counts             |
| GET    | `/api/conversations/unread/total`           | Get total unread count        |
| GET    | `/api/conversations/:conversationId/unread` | Get conversation unread count |
| PATCH  | `/api/conversations/:conversationId/read`   | Mark conversation as read     |

There is intentionally no endpoint such as:

```text
POST /api/unread
```

or:

```text
PATCH /api/unread/count
```

because unread counts are derived from:

```text
Messages
+
lastReadMessage
```

---

# 📡 Socket.IO Summary

| Event           | Direction       | Purpose                    |
| --------------- | --------------- | -------------------------- |
| `unread:update` | Server → Client | Update user's unread state |

The event should be emitted to:

```text
user:{userId}
```

rather than a conversation-wide room.

Example:

```javascript
io.to(`user:${userId}`)
    .emit("unread:update", {
        conversationId,
        unreadCount,
        totalUnread
    });
```

---

# 🔐 Security Checklist

Before marking the module complete:

* [ ] Authentication required
* [ ] Conversation membership verified
* [ ] User identity taken from JWT/authentication context
* [ ] No client-controlled user ID
* [ ] Conversation ID validated
* [ ] Unauthorized conversations rejected
* [ ] Read state belongs to authenticated user
* [ ] User can modify only their own `lastReadMessage`
* [ ] Socket updates sent to the correct user room
* [ ] Multiple devices synchronized
* [ ] Proper database indexes added
* [ ] Own messages excluded from unread count
* [ ] Deleted-message behavior defined
* [ ] Removed users lose access to unread state
* [ ] Edge cases handled
* [ ] No independent persistent `unreadCount`
* [ ] Frontend does not calculate unread state
* [ ] Unread count remains derived from source data
* [ ] Deterministic message ordering implemented

---

# 📊 Phase 4 Progress

```text
Phase 4 — Notifications & Unread System

├── Notification Core           ✅ Completed
├── Unread Message Counters     🟡 Current
└── Notification Preferences    ⏳
```

---

# 🎯 Module Completion Criteria

The module is complete when:

```text
Unread Message Counters
│
├── Source of truth defined          ✅
├── Read position implemented        ✅
├── Unread calculation implemented  ✅
├── Own messages excluded            ✅
├── Deterministic ordering           ✅
├── Conversation unread API          ✅
├── Total unread API                 ✅
├── Mark conversation read           ✅
├── Real-time updates                ✅
├── User-specific socket room        ✅
├── Multi-device synchronization     ✅
├── Offline support                  ✅
├── Authorization                    ✅
├── Database indexes                 ✅
├── Deleted-message behavior         ✅
└── Tests                            ✅
```

The complete flow should work:

```text
New Message
     │
     ▼
Message Service
     │
     ▼
Trigger Unread Processing
     │
     ▼
Unread Service
     │
     ▼
Read Position + Messages
     │
     ▼
Derived Unread Count
     │
     ├──────────────► MongoDB Source Data
     │
     └──────────────► Socket.IO
                            │
                            ▼
                      user:{userId}
                            │
                            ▼
                       unread:update
                            │
                            ▼
                         Chat UI
```

---

# 🏁 Summary

The **Unread Message Counters module** provides the conversation-level unread system required by a modern chat application.

The implementation intentionally uses the existing:

```text
ConversationMember.lastReadMessage
```

and actual:

```text
Messages
```

instead of introducing a separate unread-counter collection.

The core principle is:

> **The user's last-read position determines which messages are candidates for being unread.**

The final unread calculation is:

```text
Messages after lastReadMessage
            │
            ▼
Exclude messages authored by current user
            │
            ▼
        Unread Count
```

The architecture separates stored state from derived state:

```text
Stored
  │
  └── lastReadMessage

Derived
  │
  ├── unreadCount
  └── totalUnread
```

Therefore:

```text
ConversationMember
        │
        ▼
lastReadMessage
        │
        ▼
Messages
        │
        ▼
Unread Service
        │
        ├── unreadCount
        │
        └── totalUnread
```

The system supports:

```text
New Messages
Read State
Unread Counts
Multiple Devices
Offline Users
Real-Time Updates
Conversation Membership
Deleted Messages
```

through:

```text
Messages
    │
    ▼
Unread Service
    │
    ├── MongoDB
    │
    └── Socket.IO
```

The key architectural principles are:

> **`lastReadMessage` is the stored read-position source of truth.**

> **`unreadCount` and `totalUnread` are derived values and are not maintained as independent persistent state.**

> **Unread messages are messages after the user's last-read position, excluding messages authored by the authenticated user.**

> **A new message does not increment a stored counter; it increases the derived unread count because the user's read position remains unchanged.**

> **Marking a conversation as read advances the authenticated user's read position to the latest message currently available in that conversation.**

> **Message ordering uses a deterministic `createdAt + _id` strategy so read positions and unread queries remain consistent.**

> **Unread state is user-specific, so real-time updates are delivered through `user:{userId}` rooms.**

> **Multiple connected devices receive the same user's unread-state updates.**

> **Offline users do not lose unread state because it is derived from persisted MongoDB data when they reconnect or fetch unread counts.**

> **Soft deletion is preferred for messages so `lastReadMessage` references remain stable.**

> **Read receipts and unread counters have different responsibilities: read receipts represent message-level read information, while unread counters represent a user's conversation-level unread state.**

> **Conversation membership is required for accessing or modifying unread state.**

> **The frontend displays server-provided unread state rather than calculating it independently.**

> **No Redis, Kafka, RabbitMQ, or separate unread-counter collection is required for the current portfolio scope.**

After successful implementation and testing:

```text
Phase 4 — Module 2
Unread Message Counters
        │
        ▼
      Complete
```

The next and final module is:

```text
Phase 4 — Module 3
Notification Preferences
```

The **Notification Preferences** module will allow users to control notification behavior while keeping the implementation lightweight and appropriate for the portfolio project.

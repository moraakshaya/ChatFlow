# 📁 Read Receipts Module

## 📋 Module Information

| Property    | Value                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Module      | Read Receipts                                                                                                  |
| Version     | v1.0                                                                                                           |
| Status      | 🟡 In Development                                                                                              |
| Phase       | Phase 2 — Messaging Features                                                                                   |
| Depends On  | Organization, Project, Workspace, User Authentication, Conversation, Conversation Members, Messages            |
| Next Module | Attachments                                                                                                    |
| Database    | MongoDB                                                                                                        |
| Collection  | `readReceipts`                                                                                                 |

---

# 📌 Overview

The **Read Receipts module** manages message delivery and read statuses for individual users. It allows the platform to display indicators such as "Delivered" and "Seen", and accurately calculate unread message counts for each user in a conversation.

Instead of storing receipt data in the Message document, a separate collection is used to track each user's receipt state per message. This module depends directly on the canonical message ordering established by the **Messages Module**.

---

# 🎯 Objectives

The Read Receipts module is responsible for:
- Tracking when a message is delivered to a user.
- Tracking when a message is read by a user.
- Establishing precise delivery semantics.
- Calculating unread counts for conversations.
- Determining the user's "last read" message to place new message separators.
- Preventing the creation of receipts for a sender's own messages.
- Supporting bulk receipt updates securely.
- Maintaining idempotency and atomic state transitions.
- Safely handling deleted messages.

---

# 🏗️ Architecture

```text
Message
   │
   │ 1
   │
   │ N
   ▼
ReadReceipt
   │
   ▼
User (Recipient)
```

**Rule:** A delivery or read receipt is **never** created for the sender of the message. The system tracks receipts only for the recipients.

---

# 📂 Collection Name

```text
readReceipts
```

---

# 🗄️ Database Schema

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | ✅ | MongoDB generated ID |
| `conversationId` | ObjectId | ✅ | Reference to Conversation |
| `messageId` | ObjectId | ✅ | Reference to Message |
| `userId` | ObjectId | ✅ | The recipient user |
| `status` | String | ✅ | `delivered` or `read` |
| `deliveredAt` | Date | ❌ | Timestamp of delivery acknowledgment |
| `readAt` | Date | ❌ | Timestamp when read |
| `createdAt` | Date | Auto | Record creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

---

# 🚚 Delivery & Read Semantics

Delivery and read events must have precise definitions:

- **Delivered:** Recorded when the recipient's client explicitly acknowledges successful receipt of the message (e.g., via a Socket.IO `receipt:delivered` event or REST API call). It does *not* mean the backend merely sent a push notification.
- **Read:** Recorded when the message becomes visible to the recipient according to the frontend's read policy.

---

# 🔄 Concurrency & State Transitions

Receipt state transitions must be atomic. 

Concurrent requests (e.g., Request A for `deliveredAt` and Request B for `readAt` arriving simultaneously) must be handled safely:
- A read operation must ensure `deliveredAt` is populated before (or while) setting `readAt`.
- Concurrent requests **must not** move receipt timestamps backwards. 
- The endpoint is **idempotent**. Repeated requests to mark a message as read should succeed silently and not return a `409 Duplicate receipt conflict` error. (A unique-index conflict may be handled internally as a concurrency race).

---

# 🔢 Message Ordering Dependency

Read Receipts rely heavily on the message ordering rules defined in the **Messages Module**.

Calculations such as `last-read` must use the canonical message ordering defined by the Messages module and must **not** rely solely on receipt creation timestamps.

---

# 📊 Unread Counts & Last-Read

## Last-Read Message
The `last-read` status represents the **latest message in conversation message order** that has been marked as read by the **authenticated user** within the specified conversation. It is not the globally latest read message by anyone in the channel.

## Unread Count
Unread count is derived by querying the number of messages in the canonical message order that appear *after* the authenticated user's `last-read` message, excluding the user's own messages.

---

# 🗑️ Deleted Messages

The module handles deleted messages with consistent rules matching the Message Reactions module:

```text
Deleted Message
      ↓
Existing receipts remain in DB (historical consistency)
      ↓
New receipt creation rejected
      ↓
Receipt retrieval sanitized
```

Normal receipt APIs should **not** expose receipt details for deleted messages unless the application's deleted-message access policy explicitly permits it.

---

# 🌐 REST APIs

## 1. Mark Messages as Read (Bulk)

### Endpoint
```http
POST /api/read-receipts/read
```

### Request
```json
{
    "conversationId": "68xxxxxxxxxxxx",
    "messageIds": ["68xxxx1", "68xxxx2"]
}
```

### Validation & Rules
- **Maximum Limit:** The number of `messageIds` per request must be limited (configurable, e.g., max 100).
- **Atomic Validation:** All message IDs in the request must belong to the same accessible `conversationId`. If **any** message fails validation (e.g., belongs to a different conversation or does not exist), the **entire request is rejected** and no receipt updates are committed.
- **Self-Receipt:** Ignore any IDs where the sender is the authenticated user.

## 2. Get Last-Read Message

### Endpoint
```http
GET /api/read-receipts/conversation/:conversationId/last-read
```

### Processing
Returns the latest message (in canonical message order) read by the **authenticated user** within the specified conversation.

## 3. Get Unread Count

### Endpoint
```http
GET /api/read-receipts/conversation/:conversationId/unread-count
```

### Processing
Returns the count of messages sent after the user's last-read message, excluding the user's own messages.

---

# 📊 Indexing Strategy

```javascript
// Enforce one receipt document per user per message
readReceiptsSchema.index(
    { messageId: 1, userId: 1 },
    { unique: true }
);

// Optimize querying receipts for a conversation per user (used for unread counts)
readReceiptsSchema.index(
    { conversationId: 1, userId: 1, status: 1 }
);
```

---

# 🔐 Security Checklist

- [ ] Users can only mark messages as read/delivered in conversations where they are active members.
- [ ] Users cannot mark messages as read on behalf of other users.
- [ ] No delivery/read receipt is created for the sender's own message.
- [ ] Bulk read requests enforce a maximum `messageIds` limit.
- [ ] Bulk read requests are fully atomic; if one message fails validation, the entire request is rejected.
- [ ] Deleted messages reject new receipt creation.
- [ ] Receipt transitions (delivered -> read) cannot move timestamps backwards.
- [ ] APIs are idempotent; repeated requests succeed silently without 409 errors.
- [ ] `last-read` correctly queries by canonical message order, not just receipt timestamp.

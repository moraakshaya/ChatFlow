# 📁 Messages Module

## 📋 Module Information

| Property    | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Module      | Messages                                                                      |
| Version     | v1.0                                                                          |
| Status      | 🟡 In Development                                                             |
| Phase       | Phase 1 Core                                                                  |
| Depends On  | Organization, Project, Workspace, User Authentication, Conversation, Members |
| Next Module | Real-Time (Socket.IO)                                                         |
| Database    | MongoDB                                                                       |
| Collection  | `messages`                                                                    |

---

# 📌 Overview

The **Messages Module** manages the core communication data within the Chat Platform. It is responsible for sending, retrieving, editing, deleting, and replying to messages within a specific conversation.

This module relies on the **Conversation Members Module** for authorization. A user can only interact with messages in a conversation where they possess an `active` membership.

Phase 1 Core functionality includes:
- Send
- Retrieve
- Edit
- Delete
- Reply

Phase 2 will introduce advanced capabilities such as Search and robust Message Reactions.

---

# 🎯 Objectives

The Messages module is responsible for:
- Securely storing message content and metadata.
- Validating message payloads and attachment constraints.
- Maintaining deterministic message ordering and concurrency rules.
- Providing idempotency during message sending (handling retries gracefully).
- Handling edit history and soft-deletion rules.
- Ensuring only authorized, active members can send or read messages.
- Safely handling attachment lifecycles.
- Updating conversation `lastMessageId` and `lastMessageAt` accurately.

---

# 🏗️ Architecture

```text
Organization
      │
      ▼
Workspace
      │
      ▼
Conversation
      │
      ▼
Conversation Members (Authorization)
      │
      ▼
Messages
```

Messages are strictly bound to a `conversationId` and authenticated via the user's `senderId`.

---

# 📂 Collection Name

```text
messages
```

---

# 🗄️ Database Schema

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `_id` | ObjectId | ✅ | MongoDB generated ID |
| `conversationId` | ObjectId | ✅ | Reference to Conversation |
| `senderId` | ObjectId | ✅ | Reference to the User sending the message |
| `clientMessageId` | String | ✅ | Unique client-generated ID for idempotency |
| `type` | String | ✅ | `text`, `attachment`, `system` |
| `content` | String | ❌ | Message text content (Required if type=`text`) |
| `attachments` | Array | ❌ | Array of attachment metadata objects |
| `replyTo` | ObjectId | ❌ | Reference to another message ID being replied to |
| `metadata` | Object | ❌ | Integration-specific contextual info |
| `isEdited` | Boolean | ✅ | Edit flag, defaults to false |
| `editedAt` | Date | ❌ | Timestamp of last edit |
| `isDeleted` | Boolean | ✅ | Soft deletion flag, defaults to false |
| `deletedAt` | Date | ❌ | Timestamp of soft deletion |
| `createdAt` | Date | Auto | Message creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

---

# 📏 Limits & Constraints

To ensure production stability, the following limits must be enforced during validation:

- **Text message:** Maximum characters → (Configurable, e.g., 4000 chars)
- **Attachment:** Maximum file size → (Configurable, e.g., 25MB)
- **Attachments per message:** Maximum count → (Configurable, e.g., 10 files)

---

# 🔄 Concurrency & Idempotency Rules

Since real-time communication involves network unreliability, duplicate send requests are realistic:

```text
Client 
  ↓ (Send)
Network Timeout
  ↓ (Retry)
Duplicate Send
```

To solve this, the schema includes `clientMessageId` as a first-class field.

For authenticated clients that provide `clientMessageId`, the combination of `(senderId, clientMessageId)` must not create multiple messages. 
If a duplicate request is received, the API should return a `409 Conflict` (or successfully return the already-created message).

### Unique Index for Idempotency
```javascript
messagesSchema.index(
    { senderId: 1, clientMessageId: 1 },
    { unique: true, partialFilterExpression: { clientMessageId: { $exists: true, $ne: null } } }
);
```

---

# 🔢 Message Ordering & Conversation Updates

Message ordering must be deterministic. While `createdAt` is used for ordering, simultaneous messages can have very close or identical timestamps.
For example:
```text
Message A createdAt = 10:00:01
Message B createdAt = 10:00:01
```
The system uses the combination of `createdAt` and `_id` to ensure a deterministic fallback order.

### `lastMessageId` and `lastMessageAt` Updates

The `lastMessageId` and `lastMessageAt` on the Conversation document represent the **latest non-deleted message** according to the server's message ordering rules.

**Rule:** Updates to these fields must strictly avoid allowing an older message to overwrite a newer one.

When a message is sent:
```text
Create Message
      ↓
Check Conversation.lastMessageAt
      ↓
Update Conversation ONLY if New Message > Current lastMessage
```

---

# ✏️ Edit & Delete Rules

## Edit History
Phase 1 stores **only the latest message content** and `editedAt`. Historical versions of edits are **not retained**. An edit-history collection can be introduced in a future phase if required.

## Soft-Deleted Message Behavior
Messages are soft-deleted (`isDeleted = true`, `deletedAt = timestamp`). The UI may display a tombstone, e.g., *"This message was deleted"*.

The system enforces the following explicit rules for deleted messages:

| Action | Allowed | Notes |
| :--- | :---: | :--- |
| **Edit** deleted message | ❌ | Cannot edit a deleted message. |
| **Delete** again | ❌ | Action is ignored or returns an error. |
| **Search** deleted content | ❌ | Omitted from search indexes/results. |
| **Reply** to deleted message | ✅ | Permitted, referencing the original ID. |
| **Return** deleted message | ✅ | Returned in API responses but heavily **sanitized** (content stripped, attachments removed, `isDeleted=true`). |

### Deleting the "Latest" Message
If the message being deleted is the Conversation's `lastMessageId`:
```text
Message 1
Message 2 ← latest (lastMessageId)
Message 3 (Deleted)
```
If Message 2 is deleted, the system must query for the next most recent non-deleted message (Message 1) and update the Conversation's `lastMessageId` and `lastMessageAt` accordingly.

---

# 📎 Attachment Lifecycle

Attachments must never store raw file data in MongoDB. Users must not be allowed to submit arbitrary external URLs as attachments to prevent SSRF and security risks.

The correct attachment flow:

```text
Client
   ↓
Upload Service (presigned URL / API)
   ↓
Cloud Storage (S3 / blob)
   ↓
Validate Upload (Server confirms file exists and meets limits)
   ↓
Create Message
   ↓
Store Attachment Metadata in MongoDB
```

---

# 🧩 Metadata Restrictions

The `metadata` object is useful for integration-specific, non-critical contextual information (e.g., CRM integration data). 

**Rule:** Core message fields must **never** be stored inside `metadata`. Unrestricted metadata can become a dumping ground.

- **Good:** `metadata.source = "crm"`, `metadata.externalTicketId = "12345"`
- **Bad:** `metadata.senderId`, `metadata.conversationId`, `metadata.organizationId`

---

# 🌐 REST APIs

## 1. Send Message

### Endpoint
```http
POST /api/messages
```

### Request
```json
{
    "conversationId": "68xxxxxxxxxxxx",
    "clientMessageId": "uuid-1234-5678",
    "type": "text",
    "content": "Hello team!",
    "replyTo": null
}
```

### Processing
1. Authenticate user.
2. Verify user has `active` membership in `conversationId`.
3. Validate payload size limits.
4. Check Idempotency (`senderId` + `clientMessageId`).
5. Save Message.
6. Conditionally update Conversation `lastMessageId` / `lastMessageAt`.

---

## 2. Retrieve Messages

### Endpoint
```http
GET /api/messages/:conversationId?cursor=XYZ&limit=50
```
*(Pagination should ideally be cursor-based using `createdAt` / `_id` to prevent offset shifting during active chats).*

### Processing
1. Verify user `active` membership.
2. Query messages.
3. Sanitize any messages where `isDeleted == true`.

---

## 3. Edit Message

### Endpoint
```http
PATCH /api/messages/:messageId
```

### Request
```json
{
    "content": "Updated content here."
}
```

### Processing
1. Verify user is the `senderId`.
2. Verify message is not `isDeleted`.
3. Update `content`, set `isEdited = true`, `editedAt = now()`.

---

## 4. Delete Message

### Endpoint
```http
DELETE /api/messages/:messageId
```

### Processing
1. Verify user is the `senderId` (or an Admin/Owner based on permissions).
2. Set `isDeleted = true`, `deletedAt = now()`.
3. Clear `content` and `attachments`.
4. If this was the `lastMessageId`, find the previous message and update Conversation.

---

# 📊 Indexing Strategy

To support fast retrieval and idempotency, the following indexes are recommended:

### 1. Conversation Retrieval & Pagination
```javascript
messagesSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
```
Purpose: Optimize the primary query fetching chat history in reverse chronological order.

### 2. Idempotency Check
```javascript
messagesSchema.index(
    { senderId: 1, clientMessageId: 1 },
    { unique: true, partialFilterExpression: { clientMessageId: { $type: "string" } } }
);
```
Purpose: Prevent duplicate message insertion from retries.

---

# 🔐 Security Checklist

- [ ] Users can only read/write messages in conversations where they have an `active` membership.
- [ ] Users cannot edit or delete messages sent by others (unless granted explicit Admin/Owner permissions).
- [ ] Soft-deleted messages are strictly sanitized before being returned to clients.
- [ ] Clients cannot spoof `senderId` (must be extracted from JWT).
- [ ] `metadata` fields do not override core schema properties.
- [ ] Attachment sizes and message lengths are hard-capped.
- [ ] Arbitrary external attachment URLs are rejected.
- [ ] `lastMessageId` concurrency race conditions are mitigated.

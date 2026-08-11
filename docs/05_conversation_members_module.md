# 📁 Conversation Members Module

## 📋 Module Information

| Property    | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| Module      | Conversation Members                                                |
| Version     | v1.0                                                                |
| Status      | 🟡 In Development                                                   |
| Phase       | Phase 1                                                             |
| Depends On  | Organization, Project, Workspace, User Authentication, Conversation |
| Next Module | Messages                                                            |
| Database    | MongoDB                                                             |
| Collection  | `conversationMembers`                                               |

---

# 📌 Overview

The **Conversation Members** module manages the relationship between **Users** and **Conversations**.

A user can participate in multiple conversations, while a conversation can contain multiple users.

This creates a **many-to-many relationship**:

```text
User
  ↕
Many-to-Many
  ↕
Conversation
```

Instead of storing users directly inside the Conversation document, a separate `conversationMembers` collection is used.

This provides a scalable structure for:

* Private conversations
* Group conversations
* Channels
* Member roles
* Join and leave operations
* Member removal
* Membership history
* Mute state
* Pin state
* Read state
* Future permissions
* Real-time Socket.IO authorization

---

# 🎯 Objectives

The Conversation Members module is responsible for:

* Adding users to conversations
* Removing users from conversations
* Allowing users to leave conversations
* Listing conversation members
* Listing the authenticated user's conversations
* Checking membership
* Managing member roles
* Managing conversation ownership
* Tracking when a user joined
* Tracking who added a member
* Managing mute status
* Managing pin status
* Tracking read state
* Preventing duplicate memberships
* Reactivating previous memberships
* Enforcing conversation-level authorization
* Supporting real-time membership validation

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
ConversationMembers
      │
      ▼
Users
```

Example:

```text
Sales Team Conversation

        │
        ▼
ConversationMembers

        │
        ├── Akshaya
        ├── Rahul
        ├── Priya
        └── John
```

---

# 🔗 Why a Separate Collection?

A beginner implementation might store members directly inside a Conversation:

```json
{
    "conversationId": "...",
    "members": [
        "user1",
        "user2",
        "user3"
    ]
}
```

Although this can work for small applications, it becomes difficult when each member requires additional information.

For example:

```text
User
├── role
├── joinedAt
├── addedBy
├── isMuted
├── isPinned
├── lastReadMessageId
├── lastReadAt
└── status
```

Therefore, membership is stored separately:

```text
conversations
      │
      ▼
conversationMembers
      │
      ▼
users
```

This also allows each user's state to be different for the same conversation.

Example:

```text
Sales Team

Akshaya → pinned = true
Rahul   → pinned = false
Priya   → pinned = true
```

Therefore, `isPinned` and `isMuted` belong to the **membership record**, not the Conversation document.

---

# 📂 Collection Name

```text
conversationMembers
```

---

# 🗄️ Database Schema

| Field             | Type     | Required | Description                                      |
| ----------------- | -------- | -------: | ------------------------------------------------ |
| conversationId    | ObjectId |        ✅ | Reference to Conversation                        |
| userId            | ObjectId |        ✅ | Reference to User                                |
| role              | String   |        ✅ | `owner` / `admin` / `member`                     |
| joinedAt          | Date     |     Auto | Date the user became an active member            |
| addedBy           | ObjectId |        ❌ | User who added the member                        |
| isMuted           | Boolean  |        ✅ | Whether notifications are muted for this user    |
| isPinned          | Boolean  |        ✅ | Whether the conversation is pinned for this user |
| lastReadMessageId | ObjectId |        ❌ | Last message read by the user                    |
| lastReadAt        | Date     |        ❌ | Timestamp of last read state                     |
| status            | String   |        ✅ | `active` / `left` / `removed`                    |
| leftAt            | Date     |        ❌ | Timestamp when user left                         |
| removedAt         | Date     |        ❌ | Timestamp when user was removed                  |
| createdAt         | Date     |     Auto | Membership document creation time                |
| updatedAt         | Date     |     Auto | Last update time                                 |

---

# 📄 Example Document

```json
{
    "_id": "68xxxxxxxxxxxx",

    "conversationId": "68xxxxxxxxxxxx",

    "userId": "68xxxxxxxxxxxx",

    "role": "member",

    "joinedAt": "2026-08-08T12:00:00Z",

    "addedBy": "68xxxxxxxxxxxx",

    "isMuted": false,

    "isPinned": false,

    "lastReadMessageId": null,

    "lastReadAt": null,

    "status": "active",

    "leftAt": null,

    "removedAt": null,

    "createdAt": "2026-08-08T12:00:00Z",

    "updatedAt": "2026-08-08T12:00:00Z"
}
```

---

# 🔗 Relationships

## Conversation

One Conversation can have many membership records.

```text
Conversation
     │
     │ 1
     │
     │ N
     ▼
ConversationMembers
```

---

## User

One User can belong to many Conversations.

```text
User
 │
 │ 1
 │
 │ N
 ▼
ConversationMembers
```

Therefore:

```text
User
   ↕
Many-to-Many
   ↕
Conversation
```

---

# 📊 Relationship Diagram

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
                      │ 1
                      │
                      │ N
                      ▼
             ConversationMember
                 │          │
                 │          │
                 ▼          ▼
              User        User
```

---

# 👑 Member Roles

The module supports three initial roles:

```text
owner
admin
member
```

---

## 1. Owner

The owner is the user who created the conversation.

The owner can initially:

* Add members
* Remove members
* Update conversation information
* Change member roles
* Transfer ownership
* Archive the conversation
* Manage conversation membership

There must be **exactly one owner** per conversation.

The owner cannot leave the conversation without first transferring ownership.

---

## 2. Admin

An administrator manages members and conversation operations.

Initial permissions may include:

* Add members
* Remove members
* Manage members
* Manage conversation settings

Admins cannot:

* Transfer ownership
* Assign themselves as owner
* Remove the owner
* Change another member to owner

unless future permissions explicitly allow it.

---

## 3. Member

A regular member can:

* View the conversation
* Send messages
* Leave the conversation
* Mute the conversation
* Pin the conversation
* Maintain their own read state

A member cannot:

* Add other members
* Remove members
* Change roles
* Transfer ownership

unless future permissions allow it.

---

# 📌 Role Values

```text
owner
admin
member
```

---

# 🔄 Membership Status

Allowed values:

```text
active
left
removed
```

---

## Active

The user currently belongs to the conversation.

```text
status = active
```

The user can:

* Access the conversation
* Read messages
* Send messages
* Receive notifications
* Join the Socket.IO conversation room

---

## Left

The user voluntarily left the conversation.

```text
status = left
leftAt = Date
```

The user cannot normally:

* Read the conversation
* Send messages
* Receive conversation notifications
* Join the Socket.IO room

The user can become active again only through an authorized add/invite operation.

---

## Removed

The user was removed by an authorized owner/admin.

```text
status = removed
removedAt = Date
```

A removed user cannot:

* Read the conversation
* Send messages
* Receive notifications
* Join the Socket.IO room
* Rejoin independently

An owner/admin must add the user again.

The membership can then transition:

```text
removed
   ↓
active
```

---

# ♻️ Membership Reactivation

A conversation-user pair can have **only one membership document**.

The following unique index is therefore used:

```text
conversationId + userId
```

If a user leaves or is removed and later joins again, the existing membership document is reactivated.

Example:

```text
active
  ↓
left
  ↓
active
```

or:

```text
active
  ↓
removed
  ↓
active
```

The system should **not create a second membership document** for the same conversation-user pair.

When reactivating:

```text
status = active
joinedAt = new join time
leftAt = null
removedAt = null
addedBy = authenticated user who re-added them
```

This preserves the one-document-per-conversation-user relationship.

---

# 👤 Creator Membership

Every newly created Conversation must automatically create an active membership for its creator.

The creation flow is:

```text
Create Conversation
        │
        ▼
Create Owner Membership
        │
        ▼
userId = conversation.createdBy
role = owner
status = active
```

This prevents an invalid state such as:

```text
Conversation
    │
    └── createdBy = Akshaya

ConversationMembers
    │
    └── Akshaya does not exist
```

The creator must always have:

```text
role = owner
status = active
```

---

# 👤 `addedBy`

The `addedBy` field identifies who added a member.

Example:

```json
{
    "userId": "Rahul",
    "addedBy": "Akshaya"
}
```

This allows the system to represent:

```text
Akshaya added Rahul to Sales Team
```

`addedBy` is:

* Optional for system-generated membership
* Required when one user adds another user
* Taken from authenticated user identity
* Never trusted from an arbitrary frontend value

---

# 🔐 Created Membership vs Added Membership

## Conversation Creator

```text
createdBy = authenticated user
```

Automatically creates:

```text
role = owner
status = active
addedBy = null or system
```

## Member Added By Another User

```text
userId = target user
addedBy = authenticated user
role = member
status = active
```

---

# 🔐 Duplicate Membership Prevention

A user must not have multiple membership documents for the same conversation.

Example:

```text
Conversation: Sales Team
User: Akshaya
```

Only one document may exist:

```text
conversationId + userId
```

Attempting to add the same active member again should return:

```json
{
    "success": false,
    "message": "User is already a member of this conversation",
    "data": null
}
```

HTTP status:

```text
409 Conflict
```

---

# 🗄️ Membership Unique Index

Recommended MongoDB index:

```javascript
conversationMemberSchema.index(
    {
        conversationId: 1,
        userId: 1
    },
    {
        unique: true
    }
);
```

This guarantees database-level protection against duplicate membership records.

Because previous `left` or `removed` memberships are reactivated instead of creating new records, this unique index remains valid.

---

# 💬 Private Conversation Rules

Private conversations normally contain exactly:

```text
2 active members
```

Example:

```text
Conversation
    │
    ├── Akshaya
    └── Rahul
```

The system should prevent duplicate direct conversations between the same two users.

For example, the following should normally resolve to the same private conversation:

```text
Akshaya ↔ Rahul
```

rather than creating:

```text
Conversation A
Akshaya ↔ Rahul

Conversation B
Akshaya ↔ Rahul
```

---

# 🔑 Private Conversation `directKey`

A deterministic key can be generated from the two user IDs.

Conceptually:

```text
smallerUserId:largerUserId
```

Example:

```text
userA:userB
```

The key can be stored on the Conversation document:

```json
{
    "type": "private",
    "directKey": "userA:userB"
}
```

The two users must always be sorted before generating the key so that:

```text
Akshaya:Rahul
```

and:

```text
Rahul:Akshaya
```

produce the same key.

The Conversation creation service and Conversation Members module should cooperate to guarantee one active private conversation per user pair.

The member collection should still remain responsible for the actual membership relationship.

---

# 👥 Group Conversation Rules

A group conversation can contain:

```text
2+
```

members.

Example:

```text
Sales Team

Owner
Admin
Member
Member
```

Groups support:

* Multiple members
* Multiple admins
* One owner
* Member invitations
* Member removal
* Member leaving
* Role management

There is no fixed large member limit in Phase 1.

Future Project or Workspace plans may introduce member limits.

---

# 📢 Channel Rules

Channels belong to a Workspace and are intended for structured team communication.

Example:

```text
#general

Owner
Admin
Member
Member
Member
...
```

Channels can contain many members.

Initial channel permissions can include:

* Owner management
* Admin management
* Member participation

Future versions can support:

* Public channels
* Private channels
* Read-only channels
* Announcement channels
* Restricted channels

---

# 📊 Conversation Type Rules

| Rule                 | Private    | Group       | Channel     |
| -------------------- | ---------- | ----------- | ----------- |
| Members              | Exactly 2  | 2+          | 1+          |
| Owner                | Yes        | Yes         | Yes         |
| Multiple Admins      | Optional   | Yes         | Yes         |
| Member can leave     | Yes        | Yes         | Yes*        |
| Add members          | Restricted | Owner/Admin | Owner/Admin |
| Remove members       | Restricted | Owner/Admin | Owner/Admin |
| Duplicate membership | ❌          | ❌           | ❌           |
| Ownership transfer   | Yes        | Yes         | Yes         |

`*` The owner cannot leave without transferring ownership.

---

# 🌐 REST APIs

## 1. Add Member

### Endpoint

```http
POST /api/conversation-members
```

### Request

```json
{
    "conversationId": "68xxxxxxxxxxxx",
    "userId": "68xxxxxxxxxxxx",
    "role": "member"
}
```

The authenticated user is taken from:

```text
req.user.userId
```

The frontend must not be trusted to determine:

```text
addedBy
```

### Success Response

```json
{
    "success": true,
    "message": "Member added successfully",
    "data": {
        "_id": "68xxxxxxxxxxxx",
        "conversationId": "68xxxxxxxxxxxx",
        "userId": "68xxxxxxxxxxxx",
        "role": "member",
        "status": "active"
    }
}
```

If the user previously left or was removed, the existing membership is reactivated.

---

# 2. Get Conversation Members

### Endpoint

```http
GET /api/conversation-members/conversation/:conversationId?page=1&limit=50
```

### Response

```json
{
    "success": true,
    "message": "Conversation members retrieved successfully",
    "data": [],
    "pagination": {
        "page": 1,
        "limit": 50,
        "total": 4,
        "totalPages": 1
    }
}
```

Only authorized users should be able to access the member list.

---

# 3. Get Current User's Conversations

### Endpoint

```http
GET /api/conversation-members/me?page=1&limit=20
```

The authenticated user is determined from:

```text
req.user.userId
```

The frontend does not provide the user ID.

This prevents a user from requesting another user's conversation list.

### Example

```text
Akshaya

├── Sales Team
├── Marketing
├── Project Discussion
└── Rahul
```

### Response

```json
{
    "success": true,
    "message": "User conversations retrieved successfully",
    "data": [],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 4,
        "totalPages": 1
    }
}
```

---

# 4. Get Specific Membership

### Endpoint

```http
GET /api/conversation-members/:id
```

Returns a specific membership record.

The requester must have permission to access the membership information.

---

# 5. Check Membership

### Endpoint

```http
GET /api/conversation-members/check/:conversationId/:userId
```

### Response

```json
{
    "success": true,
    "message": "Membership checked successfully",
    "data": {
        "isMember": true,
        "role": "member",
        "status": "active"
    }
}
```

This endpoint is primarily useful for authorization and application logic.

---

# 6. Update Member Role

### Endpoint

```http
PATCH /api/conversation-members/:id/role
```

### Request

```json
{
    "role": "admin"
}
```

### Response

```json
{
    "success": true,
    "message": "Member role updated successfully",
    "data": {
        "role": "admin"
    }
}
```

Only the owner can initially change roles.

---

# 7. Transfer Ownership

### Endpoint

```http
PATCH /api/conversations/:conversationId/transfer-ownership
```

### Request

```json
{
    "newOwnerId": "68xxxxxxxxxxxx"
}
```

The target user must be an active member.

The operation must atomically:

```text
Current Owner
      ↓
admin/member

New Owner
      ↓
owner
```

There must always be exactly one owner.

### Response

```json
{
    "success": true,
    "message": "Conversation ownership transferred successfully",
    "data": {}
}
```

Only the current owner can transfer ownership.

---

# 8. Mute Conversation

### Endpoint

```http
PATCH /api/conversation-members/:id/mute
```

### Request

```json
{
    "isMuted": true
}
```

### Response

```json
{
    "success": true,
    "message": "Conversation mute status updated",
    "data": {
        "isMuted": true
    }
}
```

Mute state belongs to the individual membership.

---

# 9. Pin Conversation

### Endpoint

```http
PATCH /api/conversation-members/:id/pin
```

### Request

```json
{
    "isPinned": true
}
```

### Response

```json
{
    "success": true,
    "message": "Conversation pin status updated",
    "data": {
        "isPinned": true
    }
}
```

Pin state belongs to the individual membership.

---

# 10. Remove Member

### Endpoint

```http
DELETE /api/conversation-members/:id
```

This is a soft membership state change.

Instead of permanently deleting the document:

```json
{
    "status": "removed",
    "removedAt": "2026-08-08T12:00:00Z"
}
```

Only an owner/admin can remove another member.

---

# 11. Leave Conversation

### Endpoint

```http
PATCH /api/conversation-members/:id/leave
```

The authenticated user is determined from:

```text
req.user.userId
```

The frontend cannot specify another user to leave.

The membership becomes:

```json
{
    "status": "left",
    "leftAt": "2026-08-08T12:00:00Z"
}
```

The owner cannot leave without first transferring ownership.

---

# 12. Read State

The Messages module will later update:

```text
lastReadMessageId
lastReadAt
```

These values belong to the individual membership.

Before updating `lastReadMessageId`, the system must verify that the message belongs to the same conversation.

A user must never be able to set:

```text
lastReadMessageId
```

to a message belonging to another conversation.

---

# 🔐 Authorization Rules

Membership management must be protected.

---

## Add Member

Only:

```text
Owner
Admin
```

can add members to group/channel conversations.

For private conversations, member changes must follow the private conversation rules.

---

## Remove Member

Only:

```text
Owner
Admin
```

can remove another member.

A regular member cannot remove another user.

The owner cannot be removed through the normal remove-member operation.

---

## Change Role

Only:

```text
Owner
```

can initially change member roles.

---

## Transfer Ownership

Only:

```text
Current Owner
```

can transfer ownership.

---

## Leave Conversation

A normal member can leave.

The owner must transfer ownership before leaving.

---

# 📊 Role Permission Matrix

| Action                | Owner | Admin | Member |
| --------------------- | ----: | ----: | -----: |
| View conversation     |     ✅ |     ✅ |      ✅ |
| Send messages         |     ✅ |     ✅ |      ✅ |
| Add members           |     ✅ |     ✅ |      ❌ |
| Remove members        |     ✅ |     ✅ |      ❌ |
| Change roles          |     ✅ |     ❌ |      ❌ |
| Transfer ownership    |     ✅ |     ❌ |      ❌ |
| Leave conversation    |    ✅* |     ✅ |      ✅ |
| Mute own conversation |     ✅ |     ✅ |      ✅ |
| Pin own conversation  |     ✅ |     ✅ |      ✅ |

`*` Owner must transfer ownership before leaving.

---

# 🔐 Role Transition Rules

Initially:

| Role Transition |      Allowed |
| --------------- | -----------: |
| Owner → Admin   |            ✅ |
| Owner → Member  |            ✅ |
| Admin → Member  |            ❌ |
| Admin → Owner   |            ❌ |
| Member → Admin  |            ❌ |
| Member → Owner  |            ❌ |
| Admin → Admin   | Not required |
| Member → Member | Not required |

There must be exactly one owner.

Ownership changes must use the dedicated ownership-transfer operation.

---

# 🛡️ Membership Validation

Before adding a member:

```text
Authenticated User
        │
        ▼
Check Conversation
        │
        ▼
Check Organization
        │
        ▼
Check Project
        │
        ▼
Check Workspace
        │
        ▼
Check Requester's Membership/Permission
        │
        ▼
Check Target User
        │
        ▼
Check Target User Workspace Access
        │
        ▼
Check Existing Membership
        │
        ▼
Create or Reactivate Membership
```

---

# 🔒 Tenant Isolation

Every membership operation must respect:

```text
Organization
      ↓
Project
      ↓
Workspace
      ↓
Conversation
      ↓
ConversationMember
      ↓
User
```

A user from another organization must never be able to access or modify a conversation.

For example:

```text
Organization A
    │
    └── CRM
          └── Sales
                └── Conversation A
```

A user from:

```text
Organization B
```

must not be able to access:

```text
Conversation A
```

even if they know the Conversation ID.

Authorization should validate the complete hierarchy rather than trusting only:

```text
conversationId
```

---

# 🔐 Target User Validation

When adding a member, the target user must:

* Exist
* Be active
* Not be deleted
* Belong to the same Organization
* Have access to the required Project/Workspace
* Not already have an active membership

The system must not allow a user from an unrelated tenant to be added.

---

# 🚫 Duplicate Membership

A user should not be added to the same conversation twice.

Example:

```text
Conversation: Sales Team
User: Akshaya
```

Only one membership document exists.

If:

```text
status = active
```

return:

```text
409 Conflict
```

If:

```text
status = left
```

or:

```text
status = removed
```

reactivate the existing membership instead of creating another record.

---

# 🔄 Membership State Diagram

```text
                 Add
                  │
                  ▼
               Active
              /      \
             /        \
            ▼          ▼
          Left       Removed
            │           │
            │           │
            └─────┬─────┘
                  │
                  ▼
             Re-add/Invite
                  │
                  ▼
               Active
```

There is only one membership document for each:

```text
conversationId + userId
```

---

# 👑 Ownership Rules

Each conversation must always have:

```text
Exactly 1 owner
```

The owner is represented through:

```text
ConversationMember.role = owner
```

The Conversation's:

```text
createdBy
```

identifies the original creator.

The current owner may be different from the original creator after ownership transfer.

Example:

```text
createdBy = Akshaya

Current owner = Rahul
```

This is valid.

Therefore:

```text
createdBy
```

and:

```text
role = owner
```

serve different purposes.

---

# 🔄 Ownership Transfer

Ownership transfer must be atomic.

Before:

```text
Akshaya → owner
Rahul   → member
```

After:

```text
Akshaya → member/admin
Rahul   → owner
```

The system must never leave the conversation in a state with:

```text
0 owners
```

or:

```text
2 owners
```

The target user must be:

```text
status = active
```

before ownership transfer.

---

# 🧑💻 User-Specific Conversation State

The following fields are intentionally stored on ConversationMember:

```text
isMuted
isPinned
lastReadMessageId
lastReadAt
```

These represent the individual user's state.

Example:

```text
Conversation: Sales Team

Akshaya
    isPinned = true
    isMuted = false

Rahul
    isPinned = false
    isMuted = true
```

These values must **not** be stored on the Conversation document because they are user-specific.

---

# 🔔 Notification State

Initial member state:

```text
isMuted
```

Future notification settings may include:

```text
notificationPreference
mentionNotifications
messageNotifications
```

These should remain member-specific.

---

# 📖 Read State

The membership stores:

```text
lastReadMessageId
lastReadAt
```

Example:

```json
{
    "lastReadMessageId": "68xxxxxxxxxxxx",
    "lastReadAt": "2026-08-08T15:30:00Z"
}
```

The referenced message must belong to the same Conversation.

This state can later support:

* Read receipts
* Unread messages
* Synchronization
* Offline clients
* Message seen indicators

---

# 🔢 Unread Count

For Phase 1, an `unreadCount` field is not required.

Unread state can initially be derived from:

```text
lastReadMessageId
```

or:

```text
lastReadAt
```

A denormalized:

```text
unreadCount
```

may be introduced later if performance requires it.

If introduced, updates must be carefully synchronized with message creation and read operations.

---

# 📊 Member Count

For Phase 1, `memberCount` should not be stored in the Conversation document unless required for performance.

Initially, active member count can be derived from:

```text
ConversationMembers
where status = active
```

A denormalized:

```text
memberCount
```

can be introduced later if performance requires it.

---

# 📈 Conversation List Sorting

The authenticated user's conversation list should eventually support sorting by recent activity.

Recommended ordering:

```text
Pinned conversations
        ↓
Recent activity
        ↓
Older conversations
```

Recent activity can use:

```text
Conversation.lastMessageAt DESC
```

The Conversation Members module should retrieve the user's active membership records and join them with Conversations.

Conceptually:

```text
ConversationMembers
       ↓
conversationIds
       ↓
Conversations
       ↓
sort by lastMessageAt
```

---

# 📄 Pagination

Conversation member lists must support pagination.

Example:

```http
GET /api/conversation-members/conversation/:conversationId?page=1&limit=50
```

User conversation lists:

```http
GET /api/conversation-members/me?page=1&limit=20
```

Recommended initial limits:

```text
Member list: 50
Conversation list: 20
```

A cursor-based approach can be introduced later for very large datasets.

---

# 📁 Recommended Folder Structure

```text
src/
│
├── models/
│   └── ConversationMember.js
│
├── controllers/
│   └── conversationMember.controller.js
│
├── services/
│   └── conversationMember.service.js
│
├── routes/
│   └── conversationMember.routes.js
│
├── validators/
│   └── conversationMember.validator.js
│
└── middleware/
    ├── auth.middleware.js
    └── conversationPermission.middleware.js
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
Permission Middleware
  │
  ▼
Controller
  │
  ▼
ConversationMember Service
  │
  ├── Validate Conversation
  ├── Validate Organization
  ├── Validate Project
  ├── Validate Workspace
  ├── Validate Requester Permission
  ├── Validate Target User
  ├── Check Existing Membership
  ├── Validate Role
  ├── Create Membership
  └── Reactivate Membership
          │
          ▼
       MongoDB
```

---

# 🔐 Authentication

All membership APIs must require authentication.

The authenticated identity comes from:

```text
req.user
```

The server must never trust client-provided values for:

```text
createdBy
addedBy
currentUserId
owner identity
```

For example, a leave operation should use:

```text
req.user.userId
```

rather than:

```json
{
    "userId": "..."
}
```

from the frontend.

---

# 🔄 Conversation Creation Transaction

Conversation creation and initial owner membership creation should ideally be atomic.

The flow should be:

```text
Begin Transaction
       │
       ▼
Create Conversation
       │
       ▼
Create Owner Membership
       │
       ▼
Commit Transaction
```

If owner membership creation fails:

```text
Rollback Conversation
```

This prevents an orphaned Conversation without an owner membership.

MongoDB transactions should be used where supported by the deployment configuration.

---

# 🔄 Ownership Transfer Transaction

Ownership transfer must also be atomic.

```text
Begin Transaction
       │
       ▼
Validate Current Owner
       │
       ▼
Validate New Owner Membership
       │
       ▼
Change Current Owner Role
       │
       ▼
Change New Owner Role
       │
       ▼
Commit Transaction
```

If any step fails:

```text
Rollback
```

This prevents invalid states.

---

# 🧪 Postman Testing Plan

Test the module in this order.

---

## 1. Login

```http
POST /api/auth/login
```

Save the access token.

---

## 2. Create Conversation

Use an existing Workspace:

```http
POST /api/conversations
```

Verify that the creator automatically receives:

```text
role = owner
status = active
```

---

## 3. Add Member

```http
POST /api/conversation-members
```

Verify that the membership is created.

---

## 4. Add Same Member Again

Send the same request.

Expected:

```text
409 Conflict
```

---

## 5. Remove Member

Using an owner/admin:

```http
DELETE /api/conversation-members/:id
```

Verify:

```text
status = removed
removedAt = populated
```

---

## 6. Re-add Removed Member

Add the same user again.

Verify that the existing membership is reactivated:

```text
status = active
```

and a new membership document is **not** created.

---

## 7. Leave Conversation

```http
PATCH /api/conversation-members/:id/leave
```

Verify:

```text
status = left
leftAt = populated
```

---

## 8. Re-add User After Leaving

Add the same user again.

Verify:

```text
left → active
```

and confirm that the same membership document is reused.

---

## 9. Get Conversation Members

```http
GET /api/conversation-members/conversation/:conversationId?page=1&limit=50
```

Verify that active members are returned according to the API's defined visibility rules.

---

## 10. Check Membership

```http
GET /api/conversation-members/check/:conversationId/:userId
```

Expected:

```json
{
    "isMember": true,
    "status": "active"
}
```

---

## 11. Get Current User Conversations

```http
GET /api/conversation-members/me?page=1&limit=20
```

Verify that the authenticated user's active conversations are returned.

---

## 12. Verify User Isolation

Login as another user and attempt to request:

```text
User B's conversations
```

through:

```text
/user/UserB
```

This endpoint should not exist as a public user-controlled endpoint.

The system should use:

```text
/me
```

with:

```text
req.user.userId
```

---

## 13. Update Member Role

```http
PATCH /api/conversation-members/:id/role
```

Test:

```text
member → admin
```

using an owner account.

Verify that a normal member receives:

```text
403 Forbidden
```

---

## 14. Transfer Ownership

```http
PATCH /api/conversations/:conversationId/transfer-ownership
```

Verify:

```text
Current owner → member/admin
New owner → owner
```

---

## 15. Verify Owner Leave Protection

Attempt:

```http
PATCH /api/conversation-members/:id/leave
```

as the owner without transferring ownership.

Expected:

```text
403 Forbidden
```

---

## 16. Mute Conversation

```http
PATCH /api/conversation-members/:id/mute
```

Verify:

```text
isMuted = true
```

---

## 17. Pin Conversation

```http
PATCH /api/conversation-members/:id/pin
```

Verify:

```text
isPinned = true
```

---

## 18. Test Tenant Isolation

Use a user from another Organization and attempt to access the Conversation.

Expected:

```text
403 Forbidden
```

---

## 19. Test Invalid IDs

Send invalid:

```text
conversationId
userId
membershipId
```

Expected:

```text
400 Bad Request
```

---

## 20. Test Pagination

Verify:

```http
?page=1&limit=20
```

and:

```http
?page=2&limit=20
```

return the correct results.

---

# 🚨 Error Handling

## Conversation Not Found

```json
{
    "success": false,
    "message": "Conversation not found",
    "data": null
}
```

Status:

```text
404
```

---

## User Not Found

```json
{
    "success": false,
    "message": "User not found",
    "data": null
}
```

Status:

```text
404
```

---

## Membership Not Found

```json
{
    "success": false,
    "message": "Membership not found",
    "data": null
}
```

Status:

```text
404
```

---

## Already a Member

```json
{
    "success": false,
    "message": "User is already a member of this conversation",
    "data": null
}
```

Status:

```text
409
```

---

## Not Authorized

```json
{
    "success": false,
    "message": "You do not have permission to manage members",
    "data": null
}
```

Status:

```text
403
```

---

## Not a Member

```json
{
    "success": false,
    "message": "You are not a member of this conversation",
    "data": null
}
```

Status:

```text
403
```

---

## Owner Cannot Leave

```json
{
    "success": false,
    "message": "Owner must transfer ownership before leaving the conversation",
    "data": null
}
```

Status:

```text
403
```

---

## Invalid Request

```json
{
    "success": false,
    "message": "Invalid request",
    "data": null
}
```

Status:

```text
400
```

---

# 📊 HTTP Status Codes

| Status | Usage                                     |
| -----: | ----------------------------------------- |
|    200 | Successful operation                      |
|    201 | Membership created                        |
|    400 | Invalid request                           |
|    401 | Authentication required                   |
|    403 | Insufficient permission                   |
|    404 | Conversation/User/Membership not found    |
|    409 | Duplicate membership or conflicting state |
|    500 | Internal server error                     |

---

# 📊 Recommended Indexing Strategy

## 1. Unique Membership Index

```javascript
conversationMemberSchema.index(
    {
        conversationId: 1,
        userId: 1
    },
    {
        unique: true
    }
);
```

Purpose:

```text
Prevent duplicate membership records
```

---

## 2. Conversation Active Members

```javascript
conversationMemberSchema.index({
    conversationId: 1,
    status: 1
});
```

Purpose:

```text
Get active members of a conversation
```

---

## 3. User Active Conversations

```javascript
conversationMemberSchema.index({
    userId: 1,
    status: 1
});
```

Purpose:

```text
Get conversations belonging to the current user
```

---

## 4. User Conversation Sorting

Potential future index:

```javascript
conversationMemberSchema.index({
    userId: 1,
    status: 1,
    updatedAt: -1
});
```

This should only be added if it matches actual query patterns.

Conversation activity itself should generally be sorted using:

```text
Conversation.lastMessageAt
```

---

# 📈 Query Patterns

The most important membership queries are:

### Get active members

```text
conversationId
+
status = active
```

### Get user's conversations

```text
userId
+
status = active
```

### Check membership

```text
conversationId
+
userId
+
status
```

### Reactivate membership

```text
conversationId
+
userId
```

### Manage member

```text
conversationId
+
userId
+
role
+
status
```

---

# 📨 Message Access

Once this module is implemented, the Messages module can use membership as the main authorization boundary.

Before retrieving messages:

```text
Request
   │
   ▼
Authenticate User
   │
   ▼
Check Conversation Membership
   │
   ├── Not Active → 403
   │
   └── Active
        │
        ▼
     Get Messages
```

---

# 📡 Socket.IO Integration

The Conversation Members module will become critical when real-time messaging is introduced.

Future flow:

```text
User
 │
 ▼
Socket Connection
 │
 ▼
Authenticate JWT
 │
 ▼
Identify Conversation
 │
 ▼
Verify Active Membership
 │
 ├── Not Active → Reject
 │
 └── Active
       │
       ▼
Join Socket.IO Room
```

Example:

```text
Conversation ID:
conversation_123

Socket Room:
conversation:conversation_123
```

Only users with:

```text
status = active
```

should be allowed to join the room.

Users with:

```text
status = left
```

or:

```text
status = removed
```

must not be allowed to join.

---

# 🔒 Socket.IO Security

The server must never trust the frontend when it requests:

```text
join conversation room
```

Instead:

```text
Socket Request
      ↓
Authenticate JWT
      ↓
Get userId from JWT
      ↓
Check ConversationMember
      ↓
Verify status = active
      ↓
Join room
```

This prevents unauthorized users from receiving real-time messages.

---

# 🚫 What This Module Does NOT Handle

The Conversation Members module does not handle:

* Sending messages
* Editing messages
* Deleting messages
* Message replies
* Message reactions
* Typing indicators
* Online status
* File attachments
* Message delivery
* Message persistence

Those belong to the **Messages** and future real-time modules.

---

# 🧩 Module Responsibilities

## Conversation

```text
Conversation
│
├── Conversation identity
├── Type
├── Name
├── Description
├── Icon
├── Lifecycle
├── Archive
└── Soft delete
```

---

## Conversation Members

```text
Conversation Members
│
├── Membership
├── Roles
├── Ownership
├── Add / Remove
├── Join / Leave
├── Reactivation
├── Mute
├── Pin
├── Read state
└── Membership authorization
```

---

## Messages

```text
Messages
│
├── Send
├── Retrieve
├── Edit
├── Delete
├── Reply
└── Reactions
```

This separation keeps each module focused and maintainable.

---

# 📈 Complete Phase 1 Architecture

The current architecture becomes:

```text
Organization
      │
      ▼
Project
      │
      ▼
Workspace
      │
      ├───────────────┐
      │               │
      ▼               ▼
    Users        Conversations
                      │
                      ▼
             Conversation Members
                      │
                      ▼
                  Messages
```

Relationship:

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
ConversationMembers
      │
      ▼
Users
```

---

# 🚀 Future Enhancements

The Conversation Members module can later support:

* Custom member permissions
* Custom roles
* Workspace-level roles
* Notification preferences
* Mention notifications
* Read receipts
* Unread counts
* Member search
* Bulk member invitations
* Invite links
* Email invitations
* Member approval
* Banned members
* Temporary members
* Guest members
* Bot members
* Service accounts
* Member activity history
* Audit logs
* Member expiration
* Conversation-specific permissions

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Authentication middleware is applied.
* [ ] Conversation existence is verified.
* [ ] User existence is verified.
* [ ] Organization isolation is enforced.
* [ ] Project isolation is enforced.
* [ ] Workspace access is verified.
* [ ] Requester's conversation permission is verified.
* [ ] Target user's organization/workspace access is verified.
* [ ] Duplicate memberships are prevented.
* [ ] Compound unique index is created.
* [ ] Previous `left` memberships are reactivated.
* [ ] Previous `removed` memberships are reactivated.
* [ ] Only authorized users can add members.
* [ ] Only authorized users can remove members.
* [ ] Only the owner can change roles.
* [ ] Only the owner can transfer ownership.
* [ ] Exactly one owner exists per conversation.
* [ ] Owner cannot leave without transferring ownership.
* [ ] Membership removal uses a soft state.
* [ ] `leftAt` is recorded when a user leaves.
* [ ] `removedAt` is recorded when a user is removed.
* [ ] `addedBy` comes from authenticated identity.
* [ ] `createdBy` is never trusted from request body.
* [ ] User identity comes from authenticated JWT where applicable.
* [ ] Target user IDs are validated.
* [ ] Conversation IDs are validated.
* [ ] `lastReadMessageId` belongs to the same conversation.
* [ ] Unauthorized users cannot access member lists.
* [ ] `/me` is used for current-user conversation lists.
* [ ] Pagination is implemented.
* [ ] Consistent API responses are returned.
* [ ] Socket.IO room access checks active membership.
* [ ] Cross-tenant access is rejected.
* [ ] Conversation creation and owner membership creation are transactional where supported.
* [ ] Ownership transfer is transactional.
* [ ] Appropriate indexes are created.

---

# 🧪 Module Completion Criteria

The Conversation Members module can be considered complete when all of the following work correctly:

```text
Create Conversation
        │
        ▼
Automatic Owner Membership
        │
        ▼
Add Members
        │
        ▼
Prevent Duplicate Members
        │
        ▼
Remove Members
        │
        ▼
Reactivate Removed Members
        │
        ▼
Leave Conversation
        │
        ▼
Reactivate Previous Members
        │
        ▼
Role Management
        │
        ▼
Ownership Transfer
        │
        ▼
Mute / Pin
        │
        ▼
Read State
        │
        ▼
Membership Authorization
        │
        ▼
Tenant Isolation
        │
        ▼
Socket.IO Membership Validation
```

---

# 📌 Summary

The **Conversation Members module** provides the membership and authorization layer between Users and Conversations.

It solves the many-to-many relationship:

```text
Users
  ↕
Conversation Members
  ↕
Conversations
```

The module stores member-specific information such as:

* Role
* Membership status
* Join time
* Added-by user
* Mute state
* Pin state
* Last read message
* Last read timestamp
* Leave timestamp
* Removal timestamp

The architecture uses **one membership document per conversation-user pair**.

If a user leaves or is removed and later joins again, the existing membership is reactivated instead of creating a duplicate record.

The module also establishes important ownership rules:

```text
One Conversation
      ↓
Exactly One Owner
```

Ownership can be transferred atomically between active members.

Private conversations additionally require protection against duplicate direct chats through a deterministic participant key.

Security is enforced through:

```text
Authentication
      ↓
Organization
      ↓
Project
      ↓
Workspace
      ↓
Conversation
      ↓
Conversation Membership
      ↓
User Access
```

This prevents users from accessing conversations outside their authorized tenant, project, workspace, or membership scope.

The module also provides the authorization foundation for the upcoming **Messages** module and future **Socket.IO** integration.

The next major module is:

```text
Conversation Members
          │
          ▼
       Messages
```

The Messages module will use the active membership state to determine who can retrieve, send, edit, and delete messages.

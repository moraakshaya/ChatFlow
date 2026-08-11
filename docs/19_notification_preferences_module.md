# 🔔 Notification Preferences Module

## 📋 Module Information

| Property        | Value                                               |
| --------------- | --------------------------------------------------- |
| Module          | Notification Preferences                            |
| Version         | v1.1                                                |
| Status          | 🟡 In Development                                   |
| Phase           | Phase 4 — Notifications & Unread System             |
| Previous Module | Unread Message Counters                             |
| Next Phase      | Phase 5 — Security & Production                     |
| Depends On      | Authentication, Users, Notifications, Conversations |
| Database        | MongoDB                                             |
| Real-Time Layer | Socket.IO                                           |

---

# 📌 Overview

The **Notification Preferences module** allows authenticated users to control which types of notifications they receive from the chat platform.

The implementation is intentionally lightweight and portfolio-focused.

Example:

```text
Notification Preferences

New Messages        ON
Mentions            ON
Reactions           OFF
Conversation Alerts ON
```

Preferences are stored per user and evaluated by the backend **before a notification is created and delivered**.

The module does **not** control message delivery itself.

For example:

```text
messages = false
```

means:

```text
Message Delivery     → Enabled
Message Storage      → Enabled
Unread Counter       → Enabled
Read Receipt         → Enabled
Message Notification → Disabled
```

This separation keeps messaging, unread tracking, and notification behavior independent.

---

# 🎯 Objectives

The module should:

* Store notification preferences for each user
* Retrieve the authenticated user's preferences
* Update notification preferences
* Support message notifications
* Support mention notifications
* Support reaction notifications
* Support conversation-level notifications
* Apply preferences before notification creation
* Apply preferences before real-time notification delivery
* Provide sensible default preferences
* Support partial preference updates
* Validate preference fields and values
* Prevent users from modifying another user's preferences
* Integrate cleanly with Notification Core
* Remain independent from unread message counters

---

# 🧠 Core Principle

Notification preferences should be evaluated **before notification creation and delivery**.

```text
Chat Event
    │
    ▼
Notification Service
    │
    ▼
Check User Preferences
    │
    ├── Enabled ──────► Create Notification
    │                         │
    │                         ▼
    │                    Socket.IO
    │
    └── Disabled ─────► Skip Notification
```

The important rule is:

> **Notification Preferences decides whether a notification should exist.**

If the preference is disabled:

```text
Preference = false
        │
        ▼
No Notification Record
        │
        ▼
No Socket.IO Notification Event
```

The underlying chat event still occurs.

---

# 🏗️ Architecture

The module works alongside **Notification Core** rather than replacing it.

```text
                         Chat Event
                             │
                             ▼
                    Notification Service
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
          Preference Service    Notification Core
                    │                 │
                    ▼                 ▼
                Allowed?       Create Notification
                    │                 │
              ┌─────┴─────┐           │
              ▼           ▼           │
             YES          NO          │
              │            │          │
              └──────┐     │          │
                     ▼     ▼          │
              Notification  Skip      │
                     │                │
                     └───────┬────────┘
                             ▼
                         Socket.IO
                             │
                             ▼
                            User
```

### Responsibility separation

**Notification Preferences**

Determines:

```text
Should this notification be created?
```

**Notification Core**

Manages the notification after it is allowed:

```text
Create
Store
Retrieve
Deliver
```

**Socket.IO**

Handles:

```text
Real-time notification delivery
```

This keeps each module responsible for one concern.

---

# 📊 Supported Preferences

The initial implementation supports four notification categories.

| Preference           | Purpose                          |
| -------------------- | -------------------------------- |
| `messages`           | New message notifications        |
| `mentions`           | Mention notifications            |
| `reactions`          | Reaction notifications           |
| `conversationAlerts` | Conversation-level notifications |

---

# 🧠 Preference Definitions

## `messages`

Controls notifications generated when another user sends a message.

It does **not** control:

```text
Message delivery
Message storage
Unread count
Read receipts
Message history
```

---

## `mentions`

Controls notifications when the authenticated user is mentioned in a conversation.

Example:

```text
@John can you review this?
```

If:

```text
mentions = false
```

the mention still exists, but no mention notification is created.

---

## `reactions`

Controls notifications generated when another user reacts to one of the user's messages.

Example:

```text
User A
   │
   ▼
❤️ reacts to User B's message
   │
   ▼
Check User B preferences
   │
   ▼
reactions = false
   │
   ▼
Skip notification
```

The reaction itself still works.

---

## `conversationAlerts`

Controls notifications related to important conversation-level events.

For the portfolio implementation, this category covers events such as:

```text
Added to a conversation
Important conversation changes
```

The category is intentionally broad enough to support future conversation-level notification events without requiring a separate preference for every event.

The implementation does not need to support a large number of conversation events.

---

# 🗃️ User Notification Preferences

Preferences should be embedded directly inside the existing `User` document.

Recommended structure:

```text
User
 │
 └── notificationPreferences
        ├── messages
        ├── mentions
        ├── reactions
        └── conversationAlerts
```

Example:

```json
{
    "_id": "68user123",
    "name": "John",
    "email": "john@example.com",
    "notificationPreferences": {
        "messages": true,
        "mentions": true,
        "reactions": false,
        "conversationAlerts": true
    }
}
```

Embedding the preferences avoids creating a separate collection for a small amount of user-specific configuration.

---

# 🧠 Default Preferences

New users should receive sensible defaults.

Recommended:

```json
{
    "messages": true,
    "mentions": true,
    "reactions": true,
    "conversationAlerts": true
}
```

Therefore:

```text
New User
    │
    ▼
Default Preferences
    │
    ▼
All Notification Types Enabled
```

The user can then disable individual categories.

---

# 📡 REST API

The module requires two primary endpoints.

## Get Preferences

```http
GET /api/users/me/notification-preferences
```

Returns the authenticated user's current preferences.

Example:

```json
{
    "success": true,
    "data": {
        "messages": true,
        "mentions": true,
        "reactions": false,
        "conversationAlerts": true
    }
}
```

---

# ✏️ Update Preferences

```http
PATCH /api/users/me/notification-preferences
```

Example:

```json
{
    "messages": true,
    "mentions": true,
    "reactions": false,
    "conversationAlerts": true
}
```

Example response:

```json
{
    "success": true,
    "message": "Notification preferences updated",
    "data": {
        "messages": true,
        "mentions": true,
        "reactions": false,
        "conversationAlerts": true
    }
}
```

---

# 🧠 Partial Updates

The PATCH endpoint supports updating individual preferences.

Example:

```json
{
    "reactions": false
}
```

Before:

```text
messages = true
mentions = true
reactions = true
conversationAlerts = true
```

After:

```text
messages = true
mentions = true
reactions = false
conversationAlerts = true
```

Only the supplied field changes.

---

# ⚠️ Empty PATCH Requests

An empty update object should be rejected.

Request:

```json
{}
```

Expected:

```text
400 Bad Request
```

Reason:

```text
No notification preference was provided for update.
```

This prevents requests from returning a misleading success response without modifying anything.

---

# 🔐 Authentication

Both endpoints require authentication.

```http
Authorization: Bearer <token>
```

The backend determines the authenticated user from the authentication context:

```text
req.user.userId
```

The client must never provide a user ID to determine whose preferences are modified.

The backend should not trust:

```json
{
    "userId": "another-user"
}
```

---

# 🛡️ Authorization

The authorization model is intentionally simple:

```text
Authenticated User
        │
        ▼
Own Preferences Only
```

The preferred API is:

```text
/api/users/me/notification-preferences
```

rather than:

```text
/api/users/:userId/notification-preferences
```

This removes unnecessary user-ID handling from the client.

---

# 🧠 Preference Checking

The Notification Service maps notification types to preference fields.

```text
Notification Type
      │
      ├── MESSAGE ───────► messages
      │
      ├── MENTION ───────► mentions
      │
      ├── REACTION ──────► reactions
      │
      └── CONVERSATION ──► conversationAlerts
```

Conceptually:

```text
Notification Type
       │
       ▼
Find Preference
       │
       ▼
Enabled?
   │       │
  YES      NO
   │        │
   ▼        ▼
Create     Skip
```

---

# 🔄 Message Notification Flow

Example: User A sends a message to User B.

```text
User A sends Message
        │
        ▼
Message Service
        │
        ▼
Notification Service
        │
        ▼
Load User B Preferences
        │
        ▼
messages = ?
        │
     ┌──┴──┐
     ▼     ▼
    ON    OFF
     │      │
     ▼      ▼
Notification Skip
   Created
     │
     ▼
Socket.IO
```

If:

```text
messages = false
```

the message is still:

```text
Stored             ✅
Delivered          ✅
Unread Count       ✅
Read Receipt       ✅
Notification       ❌
```

---

# 🔄 Mention Flow

```text
User A mentions User B
        │
        ▼
Notification Service
        │
        ▼
Check User B Preferences
        │
        ▼
mentions = ?
        │
     ┌──┴──┐
     ▼     ▼
    YES    NO
     │      │
     ▼      ▼
 Create    Skip
```

The mention itself is not removed when notifications are disabled.

---

# 🔄 Reaction Flow

```text
User A reacts to User B's message
        │
        ▼
Notification Service
        │
        ▼
Check User B Preferences
        │
        ▼
reactions = ?
        │
     ┌──┴──┐
     ▼     ▼
    YES    NO
     │      │
     ▼      ▼
 Create    Skip
```

The reaction operation itself continues normally.

---

# 🔄 Conversation Alert Flow

For a conversation-level event:

```text
Conversation Event
        │
        ▼
Notification Service
        │
        ▼
Check conversationAlerts
        │
     ┌──┴──┐
     ▼     ▼
    YES    NO
     │      │
     ▼      ▼
 Create    Skip
```

Example:

```text
User added to conversation
        │
        ▼
conversationAlerts = true
        │
        ▼
Create notification
        │
        ▼
Socket.IO
```

---

# 🚫 Disabled Notifications

When a notification preference is disabled:

```text
Preference = false
        │
        ▼
Notification Event Rejected
        │
        ├── No Notification Record
        └── No Socket.IO Event
```

The backend should prevent the notification at the source rather than creating it and hiding it only on the frontend.

### Important distinction

The **preference is persisted**:

```json
{
    "messages": false
}
```

The **disabled notification event is not persisted**.

Therefore:

```text
User Preference
      │
      └── Persisted ✅

Disabled Notification
      │
      └── Record not created ✅
```

---

# ⚠️ Notification Preferences vs Message Delivery

Notification preferences must never block actual messaging.

For example:

```text
messages = false
```

does not mean:

```text
User cannot receive messages
```

It means:

```text
User receives the message
BUT
No message notification is generated
```

The complete relationship is:

```text
New Message
     │
     ├──────────────► Message Storage
     │
     ├──────────────► Unread Counter
     │
     └──────────────► Notification Service
                           │
                           ▼
                    Check Preference
                           │
                      ┌────┴────┐
                      ▼         ▼
                     ON        OFF
                      │         │
                      ▼         ▼
                 Notification  Skip
```

---

# 🔗 Relationship With Unread Counters

Notification preferences do **not** affect unread message counters.

Example:

```text
messages = false
```

A new message still produces:

```text
Message
   │
   ├──► Message Storage
   │
   ├──► Unread Counter
   │
   └──► Notification Service
             │
             ▼
        Check Preference
             │
             ▼
            OFF
             │
             ▼
            Skip
```

Therefore:

```text
Notification Preference
          ≠
Unread State
```

A user can have:

```text
Message Notification = OFF
Unread Count          = 5
```

This is expected behavior.

---

# 🔗 Integration With Notification Core

The relationship between the two modules is:

```text
                         Chat Event
                             │
                             ▼
                    Notification Service
                             │
                             ▼
                 Notification Preferences
                             │
                        Allowed?
                       /        \
                     YES         NO
                      │           │
                      ▼           ▼
             Notification Core   Skip
                      │
                      ▼
             Create Notification
                      │
                      ▼
                  Socket.IO
```

### Notification Preferences

Responsible for:

```text
Should notification creation continue?
```

### Notification Core

Responsible for:

```text
Create notification
Store notification
Retrieve notification
Deliver notification
```

This separation prevents notification preference logic from being duplicated throughout the application.

---

# 📡 Socket.IO Behavior

Preferences should be applied before emitting real-time notification events.

```text
Notification Service
        │
        ▼
Check Preference
        │
        ▼
Enabled
        │
        ▼
Notification Core
        │
        ▼
Socket.IO
        │
        ▼
user:{userId}
```

Example:

```javascript
io.to(`user:${userId}`)
    .emit("notification:new", notification);
```

If the preference is disabled:

```text
No notification record
        +
No notification:new event
```

The frontend does not need to perform additional preference filtering.

---

# 🧠 Real-Time Preference Updates

A dedicated Socket.IO event for preference changes is not required for the current portfolio implementation.

When a user updates preferences:

```text
PATCH /api/users/me/notification-preferences
        │
        ▼
Validate Request
        │
        ▼
Update User Document
        │
        ▼
MongoDB
        │
        ▼
Updated Preferences
```

The next notification automatically uses the latest stored preferences.

No application restart or socket reconnection is required.

---

# 🗂️ Recommended Folder Structure

```text
src/
│
├── controllers/
│   └── notificationPreference.controller.js
│
├── services/
│   └── notificationPreference.service.js
│
├── routes/
│   └── notificationPreference.routes.js
│
├── validators/
│   └── notificationPreference.validator.js
│
└── models/
    └── User.js
```

If the existing User module already contains profile or settings logic, the preference controller and service can be integrated there.

The important requirement is:

> **Preference business logic should remain centralized and should not be duplicated across controllers or notification handlers.**

---

# 🧠 Service Responsibilities

Recommended service methods:

```text
notificationPreference.service.js
│
├── getPreferences()
├── updatePreferences()
└── isNotificationEnabled()
```

## `getPreferences()`

Returns the authenticated user's current preferences.

---

## `updatePreferences()`

Validates and updates one or more notification preferences.

Responsibilities include:

```text
Validate fields
Validate boolean values
Reject unknown fields
Reject empty updates
Persist changes
Return updated preferences
```

---

## `isNotificationEnabled()`

Used internally by the Notification Service.

Conceptually:

```javascript
isNotificationEnabled(
    userId,
    notificationType
)
```

returns:

```text
true
```

or:

```text
false
```

This keeps preference evaluation centralized.

---

# 🧠 Validation Rules

The API should accept only the supported preference fields:

```text
messages
mentions
reactions
conversationAlerts
```

Each value must be:

```text
boolean
```

Valid:

```json
{
    "messages": false
}
```

Invalid:

```json
{
    "messages": "false"
}
```

Invalid:

```json
{
    "messages": "yes"
}
```

Unknown fields should be rejected.

Invalid:

```json
{
    "emailNotifications": true
}
```

Empty update objects should also be rejected.

Invalid:

```json
{}
```

Expected:

```text
400 Bad Request
```

---

# 🔐 Security Checklist

Before marking this module complete:

* Authentication required
* User determined from JWT
* No client-controlled user ID
* Only supported preference fields accepted
* Only boolean values accepted
* Unknown preference fields rejected
* Empty PATCH requests rejected
* Partial updates supported
* Default preferences configured
* Preferences persisted inside the User document
* Preference checking centralized
* Preferences checked before notification creation
* Disabled notification records are not created
* Disabled notification events are not emitted
* Message delivery remains unaffected
* Unread counters remain unaffected
* Users can modify only their own preferences

---

# 🧪 Testing Plan

## 1. Get Default Preferences

Create a new user.

Verify:

```text
messages = true
mentions = true
reactions = true
conversationAlerts = true
```

---

## 2. Update Preference

Send:

```json
{
    "reactions": false
}
```

Verify:

```text
reactions = false
```

and all other preferences remain unchanged.

---

## 3. Preference Persistence

Update:

```json
{
    "reactions": false
}
```

Then:

```text
Update Preference
      │
      ▼
MongoDB
      │
      ▼
Disconnect / Reconnect
      │
      ▼
GET /api/users/me/notification-preferences
```

Expected:

```text
reactions = false
```

This confirms that the preference is actually persisted in MongoDB.

---

## 4. Disable Message Notifications

Set:

```text
messages = false
```

Send a new message.

Verify:

```text
Message delivered      ✅
Message stored         ✅
Unread count updated   ✅
Read receipt works     ✅
Notification created   ❌
Socket notification    ❌
```

---

## 5. Disable Reaction Notifications

Set:

```text
reactions = false
```

React to a message.

Verify:

```text
Reaction applied       ✅
Notification created   ❌
Socket event emitted   ❌
```

---

## 6. Enable Notification Again

Set:

```text
reactions = true
```

React again.

Verify:

```text
Notification created   ✅
Socket event emitted    ✅
```

---

## 7. Mention Notification

Set:

```text
mentions = false
```

Mention the user.

Verify:

```text
Mention processed      ✅
Notification created   ❌
Socket event emitted   ❌
```

Enable it again and verify that the notification is created.

---

## 8. Conversation Alert

Set:

```text
conversationAlerts = false
```

Trigger a supported conversation-level notification event.

Verify:

```text
Conversation event     ✅
Notification created   ❌
Socket event emitted   ❌
```

---

## 9. Unauthorized Access

Attempt to modify another user's preferences.

Expected:

```text
Access denied
```

The API must never allow a user to modify another user's settings.

---

## 10. Invalid Boolean Value

Request:

```json
{
    "messages": "yes"
}
```

Expected:

```text
400 Bad Request
```

---

## 11. Unknown Preference

Request:

```json
{
    "emailNotifications": true
}
```

Expected:

```text
400 Bad Request
```

---

## 12. Empty PATCH Request

Request:

```json
{}
```

Expected:

```text
400 Bad Request
```

No preference should be modified.

---

## 13. Partial Update Preservation

Initial:

```text
messages = true
mentions = true
reactions = true
conversationAlerts = true
```

Update:

```json
{
    "reactions": false
}
```

Expected:

```text
messages = true
mentions = true
reactions = false
conversationAlerts = true
```

---

## 14. Unread Counter Independence

Set:

```text
messages = false
```

Send a new message.

Verify:

```text
Message delivered      ✅
Unread count updated   ✅
Notification skipped   ✅
```

This confirms notification preferences do not interfere with unread state.

---

# ⚠️ Edge Cases

The module should handle:

* New user with no preferences
* Partial preference updates
* Invalid boolean values
* Unknown preference fields
* Empty PATCH requests
* Unauthorized access
* Deleted users
* Notification type without a configured preference
* Preference disabled after a previous notification
* Preference re-enabled later
* Multiple devices using the same account
* Notification preference persistence after reconnect
* Notification events occurring immediately after preference changes

---

# 📊 API Summary

| Method | Endpoint                                 | Purpose                 |
| ------ | ---------------------------------------- | ----------------------- |
| GET    | `/api/users/me/notification-preferences` | Get current preferences |
| PATCH  | `/api/users/me/notification-preferences` | Update preferences      |

There is intentionally no endpoint such as:

```text
PATCH /api/users/:userId/notification-preferences
```

because users should only manage their own preferences.

---

# 📡 Socket.IO Summary

Notification preferences do not introduce a new Socket.IO event.

The existing notification delivery event is controlled by the preference service.

Example:

```text
Notification Service
       │
       ▼
Preference Check
       │
   ┌───┴───┐
   ▼       ▼
 Enabled Disabled
   │       │
   ▼       ▼
Create    Skip
   │
   ▼
Socket.IO
   │
   ▼
notification:new
```

---

# 🏗️ Complete Notification Architecture

After integrating Notification Core, Unread Counters, and Notification Preferences:

```text
                         Chat Event
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        Message Storage  Unread Service  Notification Service
                             │              │
                             ▼              ▼
                      Unread Count    Preference Service
                                            │
                                       ┌────┴────┐
                                       ▼         ▼
                                      ON        OFF
                                       │         │
                                       ▼         ▼
                              Notification Core  Skip
                                       │
                                       ▼
                                   MongoDB
                                       │
                                       ▼
                                   Socket.IO
                                       │
                                       ▼
                                      User
```

This provides clear separation between:

```text
Messaging
Unread State
Notification Preferences
Notification Storage
Real-Time Delivery
```

---

# 📊 Phase 4 Progress

```text
Phase 4 — Notifications & Unread System

├── Notification Core           ✅ Completed
├── Unread Message Counters     ✅ Completed
└── Notification Preferences    🟡 Current
```

---

# 🎯 Module Completion Criteria

The module is complete when:

```text
Notification Preferences
│
├── User preferences stored       ✅
├── Default values                ✅
├── Get preferences API           ✅
├── Update preferences API        ✅
├── Partial updates               ✅
├── Empty update validation       ✅
├── Field validation              ✅
├── Boolean validation            ✅
├── Authorization                 ✅
├── Preference persistence        ✅
├── Notification integration     ✅
├── Notification Core integration ✅
├── Disabled notification skip   ✅
├── Socket.IO integration        ✅
├── Unread independence          ✅
└── Tests                         ✅
```

The complete flow should work:

```text
                    Chat Event
                         │
                         ▼
               Notification Service
                         │
                         ▼
             Notification Preferences
                         │
                    Preference?
                    /          \
                  ON            OFF
                   │              │
                   ▼              ▼
          Notification Core      Skip
                   │
                   ▼
          Create Notification
                   │
                   ▼
               MongoDB
                   │
                   ▼
               Socket.IO
                   │
                   ▼
             notification:new
                   │
                   ▼
                  User
```

---

# 🏁 Phase 4 Completion

After completing this module:

```text
PHASE 4 — Notifications & Unread System

├── Notification Core           ✅
├── Unread Message Counters     ✅
└── Notification Preferences    ✅
```

## Phase 4 is officially complete.

The notification system now provides:

```text
Notifications
     +
Unread Counters
     +
User Preferences
     +
Real-Time Delivery
```

The architecture remains intentionally minimal while demonstrating the important backend concepts required for a portfolio-level chat application.

---

# 🧠 Phase 4 Architectural Principles

The completed phase follows these principles:

### 1. Notification preferences are user-specific

```text
User
 └── notificationPreferences
```

---

### 2. Preferences are persisted

The user's settings are stored in MongoDB.

```text
reactions = false
```

remains false after reconnecting or restarting the application.

---

### 3. Disabled notifications are not created

```text
Preference = false
        │
        ▼
No Notification Record
```

The preference itself remains persisted.

---

### 4. Notification preferences do not affect messaging

```text
messages = false
```

does not prevent:

```text
Message Delivery
Message Storage
Unread Counts
Read Receipts
```

---

### 5. Notification preferences do not affect unread state

```text
Notification Preference
        ≠
Unread Counter
```

Both systems operate independently.

---

### 6. Notification Core owns notification lifecycle

Once a notification is allowed:

```text
Notification Core
      │
      ├── Create
      ├── Store
      ├── Retrieve
      └── Deliver
```

---

### 7. Socket.IO owns real-time delivery

```text
Notification Core
       │
       ▼
Socket.IO
       │
       ▼
notification:new
```

---

### 8. REST owns preference management

```text
GET
PATCH
```

are used for:

```text
Retrieve Preferences
Update Preferences
```

REST is not treated as the notification delivery mechanism.

---

# 🚀 Next Phase

The next phase is:

```text
PHASE 5 — Security & Production
```

For the portfolio version, Phase 5 should remain focused and avoid unnecessary infrastructure.

Recommended modules:

```text
Phase 5 — Security & Production

├── Rate Limiting
├── Input Validation
├── Authorization Hardening
├── Centralized Error Handling
├── Logging
└── Redis Caching
```

These modules will demonstrate that the chat application is not only functional, but also designed with:

```text
Security
Reliability
Maintainability
Performance
Production Readiness
```

in mind.

---

# 🏁 Final Summary

The **Notification Preferences module** provides users with control over which notification categories they receive while keeping the messaging system itself unaffected.

The architecture is:

```text
Chat Event
    │
    ▼
Notification Service
    │
    ▼
Preference Check
    │
    ├── Enabled
    │      │
    │      ▼
    │ Notification Core
    │      │
    │      ▼
    │ MongoDB
    │      │
    │      ▼
    │ Socket.IO
    │
    └── Disabled
           │
           ▼
          Skip
```

The key architectural rule is:

> **Notification Preferences decides whether a notification should be created.**

The preference itself is persisted:

```text
User.notificationPreferences
```

while disabled notification events are not created:

```text
Preference = false
        │
        ▼
No Notification Record
        +
No Socket.IO Event
```

The module supports:

```text
Message Notifications
Mention Notifications
Reaction Notifications
Conversation Alerts
Partial Updates
Validation
Authorization
Persistence
Real-Time Delivery
```

while remaining independent from:

```text
Message Delivery
Unread Counters
Read Receipts
Message History
```

The final Phase 4 architecture is therefore:

```text
                 PHASE 4
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
 Notification    Unread     Preferences
    Core         Counters
        │           │           │
        └───────────┼───────────┘
                    ▼
              Chat Platform
                    │
                    ▼
              Real-Time UX
```

**Phase 4 — Notifications & Unread System is complete after successful implementation and testing of all three modules.**

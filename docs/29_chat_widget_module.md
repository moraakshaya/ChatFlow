# 💬 Chat Widget Module

## 📋 Module Information

| Property            | Value                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Module**          | Chat Widget                                                                             |
| **Version**         | v1.1                                                                                    |
| **Status**          | 🟡 In Development                                                                       |
| **Phase**           | Phase 6 — Integration Platform                                                          |
| **Previous Module** | Webhooks                                                                                |
| **Next Module**     | None                                                                                    |
| **Next Phase**      | Phase 6 Complete                                                                        |
| **Depends On**      | Public API, API Keys, Authentication, Authorization, Socket.IO, Conversations, Messages |
| **Frontend**        | React                                                                                   |
| **Backend**         | Node.js + Express                                                                       |
| **Real-Time**       | Socket.IO                                                                               |
| **Build**           | Vite                                                                                    |

---

# 📌 Overview

The **Chat Widget** is an embeddable chat interface that allows external applications to integrate the existing chat platform into their own application.

The goal is to allow applications such as:

```text
CRM
HRM
ERP
Helpdesk
SaaS Applications
```

to add real-time chat functionality without building their own chat backend.

Example:

```text
                    CRM APPLICATION
┌─────────────────────────────────────────┐
│                                         │
│  Dashboard                              │
│                                         │
│  Leads       Clients       Reports      │
│                                         │
│                               ┌────────┐│
│                               │   💬   ││
│                               └────────┘│
│                                    │    │
│                                    ▼    │
│                            ┌────────────┐
│                            │ Chat       │
│                            │            │
│                            │ John       │
│                            │ Hello!     │
│                            │            │
│                            │ You        │
│                            │ Hi John    │
│                            │            │
│                            │ [Message]  │
│                            └────────────┘
└─────────────────────────────────────────┘
```

The chat UI is embedded inside the external application, while:

```text
Chat Data
Authentication
Authorization
Messages
Conversations
Real-Time Communication
Persistence
```

remain managed by the central Chat Platform.

---

# 🎯 Objectives

The Chat Widget should:

* Provide an embeddable chat interface
* Connect to the existing chat platform
* Authenticate the integration securely
* Display conversations
* Display messages
* Send messages
* Receive real-time messages
* Display typing indicators
* Display online/offline presence
* Support unread counts
* Support read receipts
* Support reactions
* Support responsive behavior
* Support short-lived widget credentials
* Support external-user identity mapping
* Enforce project isolation
* Enforce conversation authorization
* Handle Socket.IO reconnection
* Handle loading and error states
* Prevent permanent API keys from being exposed in browsers
* Keep integration simple
* Avoid duplicating chat backend logic

For the portfolio version, keep the widget focused on the core chat experience.

---

# 🧠 Core Principle

The widget should be a **client of the existing chat platform**, not a second chat application.

Bad architecture:

```text
CRM
 │
 └── Separate Chat Backend
        │
        └── Separate Database
```

Recommended:

```text
CRM
 │
 └── Chat Widget
        │
        ▼
   Chat Platform
        │
        ├── REST API
        ├── Socket.IO
        └── MongoDB
```

The widget should contain presentation and client-side communication logic only.

Business rules should remain inside the Chat Platform.

---

# 🏗️ Widget Architecture

```text
                         EXTERNAL APPLICATION
                                │
                                ▼
                         Embedded Widget
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
                  ▼                           ▼
              REST API                   Socket.IO
                  │                           │
                  └─────────────┬─────────────┘
                                ▼
                         CHAT PLATFORM
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                 MongoDB                  Redis
```

The widget therefore acts as a frontend client of the existing platform.

---

# 📂 Recommended Project Structure

The widget can be maintained as a separate frontend package.

```text
chat-platform/
│
├── backend/
│
├── frontend/
│
└── widget/
    │
    ├── src/
    │   ├── components/
    │   │   ├── ChatButton.jsx
    │   │   ├── ChatWindow.jsx
    │   │   ├── ConversationList.jsx
    │   │   ├── MessageList.jsx
    │   │   ├── MessageInput.jsx
    │   │   └── TypingIndicator.jsx
    │   │
    │   ├── services/
    │   │   ├── api.js
    │   │   ├── socket.js
    │   │   └── widgetAuth.js
    │   │
    │   ├── hooks/
    │   │   └── useChat.js
    │   │
    │   ├── utils/
    │   │   └── messageDeduplication.js
    │   │
    │   └── ChatWidget.jsx
    │
    ├── package.json
    └── vite.config.js
```

Adapt this structure to the existing project architecture.

---

# 💡 Widget Components

Keep the first version focused.

```text
ChatWidget
│
├── ChatButton
│
└── ChatWindow
    │
    ├── Header
    ├── ConversationList
    ├── MessageList
    ├── TypingIndicator
    └── MessageInput
```

---

# 💬 Chat Button

The widget starts as a small floating button.

```text
┌─────────────────────────────┐
│                             │
│                             │
│                       ┌────┐│
│                       │ 💬 ││
│                       └────┘│
└─────────────────────────────┘
```

The button should:

* Open the chat window
* Display unread count
* Remain accessible
* Support desktop and mobile layouts

Clicking it opens the chat window.

---

# 🪟 Chat Window

When opened:

```text
┌───────────────────────────┐
│ Chat                 ×    │
├───────────────────────────┤
│                           │
│ John                      │
│ ───────────────────────   │
│                           │
│ Sarah                     │
│ ───────────────────────   │
│                           │
├───────────────────────────┤
│ Type a message...     ➤   │
└───────────────────────────┘
```

The chat window should provide:

```text
Conversation navigation
Message history
Message composition
Typing state
Connection state
Unread information
```

---

# 📋 Conversation List

The widget should fetch conversations from:

```text
GET /api/v1/conversations
```

Display basic information:

```text
Conversation name
Last message
Unread count
Last activity
```

Avoid exposing unnecessary backend fields.

The backend must ensure that only conversations accessible to the current widget user are returned.

---

# 💬 Message List

When a conversation is selected:

```text
GET /api/v1/conversations/:id/messages
```

Display:

```text
Sender
Message
Timestamp
```

Example:

```text
┌─────────────────────────────┐
│ John                        │
│ Hello, are you available?   │
│ 10:32 AM                    │
│                             │
│                     You     │
│                     Yes!    │
│                     10:33 AM│
└─────────────────────────────┘
```

The widget must never assume that possession of a conversation ID grants access.

The backend must verify conversation membership or other appropriate authorization rules.

---

# ✉️ Send Message

The widget sends:

```text
POST /api/v1/messages
```

Example:

```json
{
  "conversationId": "conversation_123",
  "content": "Hello!"
}
```

The backend:

```text
Validate Widget Token
        │
        ▼
Validate Project
        │
        ▼
Validate Conversation Access
        │
        ▼
Validate Message
        │
        ▼
Store Message
        │
        ▼
Emit Socket.IO Event
```

The widget should use the response to obtain the canonical message record.

---

# 🔄 Message Deduplication

A message can appear through both:

```text
POST /messages response
```

and:

```text
Socket.IO message:new
```

Without deduplication, the same message could appear twice.

Recommended flow:

```text
Send Message
     │
     ▼
POST /messages
     │
     ▼
messageId = msg_123
     │
     ▼
Render / Update Message
     │
     ▼
Socket.IO message:new
     │
     ▼
messageId already exists?
     │
 ┌───┴────┐
 ▼        ▼
 Yes      No
 │         │
Skip     Render
```

The widget should use the canonical:

```text
messageId
```

as the primary deduplication identifier.

If the message API later supports client-generated idempotency keys, those may also be used to prevent duplicate message creation.

---

# ⚡ Real-Time Connection

The widget should establish a Socket.IO connection.

```text
Widget
  │
  │ Socket.IO
  ▼
Chat Platform
```

The widget listens for the exact event names established by the Phase 3 implementation.

Examples:

```text
message:new
typing:start
typing:stop
presence:update
message:read
reaction:created
reaction:removed
```

Do not create a separate Socket.IO server for the widget.

---

# 💬 Real-Time Message Flow

```text
User A
  │
  ▼
Widget
  │
  ▼
POST /messages
  │
  ▼
Chat Platform
  │
  ├── Save MongoDB
  │
  └── Socket.IO
        │
        ▼
     User B Widget
```

The widget does not need to repeatedly poll the server.

---

# ⌨️ Typing Indicator

When a user types:

```text
Widget
  │
  ▼
Socket.IO
  │
  ▼
typing:start
```

Other users see:

```text
John is typing...
```

When typing stops:

```text
typing:stop
```

The indicator disappears.

The widget should reuse the existing Phase 3 typing infrastructure.

---

# 🟢 Presence

The widget can display:

```text
● Online
```

or:

```text
○ Offline
```

Presence should come from the existing Socket.IO presence system.

Do not build a second presence system specifically for the widget.

---

# 🔴 Unread Count

The widget can display:

```text
💬 3
```

Example:

```text
┌────┐
│ 💬 │
│  3 │
└────┘
```

Unread state should use the existing notification/read-receipt infrastructure.

The widget should not maintain a separate unread-count database.

---

# 🔐 Widget Authentication

The widget must not expose a permanent privileged API key directly in browser code.

Avoid:

```text
React Frontend
    │
    └── Hardcoded Production API Key ❌
```

Recommended:

```text
External Application Backend
          │
          │ API Key
          ▼
     Chat Platform
          │
          ├── Validate API Key
          ├── Validate Project
          ├── Validate External User
          │
          ▼
   Short-Lived Widget Token
          │
          ▼
      Browser Widget
```

The external application's backend is responsible for authenticating with the Chat Platform using its server-side API key.

The browser receives only the short-lived credential required for the current widget session.

---

# 🔑 API Key vs Widget Token

The distinction is important.

## API Key

Used by:

```text
CRM Backend
HRM Backend
ERP Backend
```

Example:

```text
CRM Server
   │
   └── API Key
```

API keys are server-side credentials and must not be embedded into browser JavaScript.

---

## Widget Token

Used by:

```text
Browser
   │
   └── Short-lived Widget Token
```

The widget token should:

* Be short-lived
* Be scoped to the correct project
* Identify the external user
* Contain or reference allowed scopes
* Expire automatically
* Never contain a permanent server credential

---

# 🔑 Widget Session API

The external application's backend should request a widget session from the Chat Platform.

Endpoint:

```text
POST /api/v1/widget/sessions
```

Authentication:

```text
API Key
```

Example request:

```json
{
  "projectId": "project_123",
  "externalUserId": "CRM-10023",
  "name": "John Doe",
  "email": "john@example.com"
}
```

The server validates:

```text
API Key
      │
      ▼
Project Ownership
      │
      ▼
External User Identity
      │
      ▼
Widget Permissions
      │
      ▼
Create Short-Lived Session
```

Example response:

```json
{
  "success": true,
  "data": {
    "token": "widget_xxxxxxxxx",
    "projectId": "project_123",
    "userId": "user_456",
    "expiresAt": "2026-08-10T11:30:00Z",
    "scopes": [
      "chat:read",
      "chat:write"
    ]
  }
}
```

The exact token implementation may use a signed token or a server-side session identifier.

JWT is not mandatory.

The important requirement is that the credential is:

```text
Short-lived
Project-scoped
User-scoped
Permission-scoped
```

---

# ⏱️ Widget Token Lifetime

Widget credentials should expire.

Example:

```text
Token Created
     │
     ▼
expiresAt
     │
     ▼
Token Valid
     │
     ▼
Expiration
     │
     ▼
Authentication Required Again
```

A portfolio implementation can use a short lifetime such as:

```text
15–60 minutes
```

The exact duration should be configurable according to the deployment requirements.

---

# 📦 Widget Token Properties

The widget session should contain or resolve:

```text
userId
projectId
expiresAt
scopes
```

Example:

```json
{
  "projectId": "project_123",
  "userId": "user_456",
  "scopes": [
    "chat:read",
    "chat:write"
  ],
  "expiresAt": "2026-08-10T11:30:00Z"
}
```

The browser must never be able to modify the project or user identity represented by the authenticated session.

---

# 🏢 Tenant Isolation

The widget must remain scoped to the correct project.

Example:

```text
CRM
 │
 ▼
CRM Project
 │
 ▼
Widget Session
 │
 ▼
CRM User
 │
 ▼
CRM Conversations
```

The widget must not be able to access:

```text
HRM Project
ERP Project
Another Organization
Another Project
```

The backend must derive the project context from the authenticated widget session rather than trusting a browser-supplied `projectId`.

---

# 👤 User Identity

The external application needs to identify the user.

Example:

```text
CRM User
   │
   ├── externalUserId
   ├── name
   └── email
```

The Chat Platform can map the external identity to its internal user.

Conceptually:

```text
CRM
customerId = CRM-10023
        │
        ▼
Chat Platform
externalUserId = CRM-10023
        │
        ▼
internalUserId
```

This allows the same chat platform to serve multiple external applications.

---

# 🔐 Widget Authorization Model

The widget token identifies:

```text
Project
+
User
+
Scopes
```

When accessing a conversation:

```text
Widget Token
      │
      ▼
projectId + userId
      │
      ▼
Conversation
      │
      ▼
Check Project Ownership
      │
      ▼
Check Conversation Membership
      │
 ┌────┴─────┐
 ▼          ▼
Member    Not Member
 │          │
 ▼          ▼
Allow      403
```

For example:

```text
GET /api/v1/conversations/:id/messages
```

must verify that:

```text
Authenticated Widget User
        │
        ▼
Belongs to the Conversation
```

The widget must never be allowed to access an arbitrary conversation merely because it knows the conversation ID.

The same authorization rules apply to:

```text
Read messages
Send messages
Read receipts
Reactions
Typing
Presence
```

where applicable.

---

# 🔗 Widget Initialization

The integration should remain simple.

Conceptually:

```javascript
ChatWidget.init({
  projectId: "project_123",
  token: "short_lived_token"
});
```

The widget should treat the token as the primary authentication credential.

The `projectId` may be used as initialization metadata, but the server must still validate the project represented by the authenticated token.

---

# ⚙️ Widget Configuration

The widget can support a small set of configuration options.

Example:

```javascript
ChatWidget.init({
  projectId: "project_123",
  token: "short_lived_token",
  position: "bottom-right",
  theme: "light",
  title: "Chat with us",
  primaryColor: "#00A88F"
});
```

Recommended configuration options:

```text
position
theme
title
primaryColor
```

Keep configuration intentionally limited.

The widget should not become a large UI customization framework for the portfolio implementation.

---

# 🔄 Widget Lifecycle

A reusable widget should provide basic lifecycle controls.

Recommended API:

```javascript
ChatWidget.init(config);

ChatWidget.open();

ChatWidget.close();

ChatWidget.destroy();
```

Conceptually:

```text
init()
  │
  ▼
Widget Ready
  │
  ├── open()
  │
  ├── close()
  │
  └── destroy()
```

### `init()`

Initializes the widget configuration and authentication state.

### `open()`

Displays the chat interface.

### `close()`

Hides the chat window while preserving the widget session.

### `destroy()`

Removes the widget and disconnects client-side resources.

---

# 📦 Embeddable Widget Delivery

The React widget should be compiled into a browser-consumable bundle.

Recommended architecture:

```text
React Source
     │
     ▼
Vite Build
     │
     ▼
widget.js
     │
     ▼
Static Hosting / CDN
     │
     ▼
External Website
```

Example integration:

```html
<script src="https://your-chat-platform.com/widget.js"></script>

<script>
  ChatWidget.init({
    projectId: "project_123",
    token: "short_lived_token"
  });
</script>
```

The external application does not need to understand:

```text
React internals
MongoDB
Mongoose
Socket.IO implementation
Conversation schemas
Message controllers
```

It only needs to initialize the widget with the appropriate configuration and session token.

---

# 🧩 Integration Example

A CRM could include:

```text
CRM Application
│
├── Dashboard
├── Leads
├── Clients
├── Reports
│
└── ChatWidget
```

The CRM backend handles widget-session creation:

```text
CRM Backend
      │
      │ API Key
      ▼
Chat Platform
      │
      ▼
Widget Session
      │
      ▼
CRM Browser
      │
      ▼
Chat Widget
```

This prevents the CRM browser from receiving the CRM's permanent API key.

---

# 🎨 Widget UI

Keep the design minimal.

Recommended:

```text
Width:
320–380px

Height:
500–600px

Position:
bottom-right
```

The widget should:

* Work on desktop
* Work on mobile
* Have a clear close button
* Have readable messages
* Have a message input
* Handle loading states
* Handle errors
* Show unread count
* Show connection status

---

# 📱 Responsive Behavior

Desktop:

```text
Floating Window
```

Mobile:

```text
Full-screen / near full-screen
```

Example:

```text
Desktop
┌──────────────┐
│    Chat      │
│              │
└──────────────┘
```

Mobile:

```text
┌────────────────────┐
│ Chat               │
├────────────────────┤
│                    │
│ Messages           │
│                    │
├────────────────────┤
│ Message        ➤   │
└────────────────────┘
```

---

# ⏳ Loading States

The widget should handle:

```text
Loading conversations...
Loading messages...
Sending message...
Connecting...
Reconnecting...
```

Example:

```text
Connecting to chat...
```

Loading states should prevent confusing blank screens.

---

# ❌ Error States

Example:

```text
Unable to connect to chat.

[Retry]
```

If message sending fails:

```text
Message failed to send

[Retry]
```

Authentication failure:

```text
Chat session expired.

Please refresh the page.
```

The widget should never leave the user with a blank interface when an API or Socket.IO operation fails.

---

# 🔄 Connection Recovery

If Socket.IO disconnects:

```text
Connected
   │
   ▼
Disconnected
   │
   ▼
Reconnecting
   │
   ▼
Connected
```

The widget should rely on Socket.IO's existing reconnection mechanism where appropriate.

The UI should reflect connection state:

```text
● Connected
○ Reconnecting
× Offline
```

The widget should not create a custom reconnection protocol when the existing Socket.IO infrastructure already provides the required functionality.

---

# 🔐 Security

The widget must:

* Avoid exposing server secrets
* Never expose permanent API keys
* Use short-lived credentials
* Validate project context
* Validate user identity
* Enforce token expiration
* Respect conversation authorization
* Respect message authorization
* Use HTTPS in production
* Avoid storing sensitive credentials unnecessarily
* Prevent unauthorized cross-project access
* Validate Socket.IO authentication
* Apply the same authorization rules to REST and Socket.IO operations

---

# 🚫 What the Widget Should NOT Do

The widget should not:

```text
Create its own database
Create its own authentication system
Create its own Socket.IO server
Duplicate message business logic
Duplicate conversation business logic
Store permanent API keys in frontend code
Bypass authorization
Create a second presence system
Create a second notification system
Create a second unread-count system
```

It is simply a client of the existing platform.

---

# 🧠 REST + Socket.IO Architecture

The widget combines both systems.

```text
                   CHAT WIDGET
                        │
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
         REST API              Socket.IO
             │                     │
             │                     │
      Persistent Data        Real-Time Data
             │                     │
             └──────────┬──────────┘
                        ▼
                  Chat Platform
```

## REST

Used for:

```text
Fetch conversations
Fetch messages
Send messages
Fetch notifications
Search
```

## Socket.IO

Used for:

```text
New messages
Typing
Presence
Read receipts
Reactions
Connection state
```

---

# 🧠 Existing Infrastructure Reuse

The widget should reuse the systems already implemented in previous phases.

```text
Phase 1–2
│
├── Authentication
├── Conversations
├── Conversation Members
└── Messages
        │
        ▼
Phase 3
│
├── Socket.IO
├── Typing Indicators
├── Presence
├── Read Receipts
└── Reactions
        │
        ▼
Phase 6
│
├── Public API
├── API Keys
├── Webhooks
└── Chat Widget
```

This avoids duplicated backend systems.

---

# 🔗 CRM Integration Example

A CRM wants to embed the Chat Widget.

### Step 1 — CRM Backend

The CRM backend authenticates with the Chat Platform:

```text
CRM Backend
     │
     │ API Key
     ▼
Chat Platform
```

### Step 2 — Create Widget Session

```text
POST /api/v1/widget/sessions
```

The Chat Platform returns:

```text
Short-Lived Widget Token
```

### Step 3 — Browser

The CRM sends the token to the widget:

```javascript
ChatWidget.init({
  projectId: "project_123",
  token: "widget_token"
});
```

### Step 4 — Widget

The widget connects:

```text
Widget
 ├── REST API
 └── Socket.IO
```

### Step 5 — Chat

The user can:

```text
View conversations
View messages
Send messages
Receive messages
See typing
See presence
Receive read receipts
Use reactions
```

---

# 🔗 Complete Widget Authentication Flow

```text
                     CRM
                      │
                      ▼
               CRM Backend
                      │
                      │ API Key
                      ▼
              Chat Platform
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     Validate API   Validate    Validate
        Key         Project    External User
          │           │           │
          └───────────┼───────────┘
                      ▼
             Create Widget Session
                      │
                      ▼
          Short-Lived Widget Token
                      │
                      ▼
                 CRM Browser
                      │
                      ▼
                Chat Widget
                      │
              ┌───────┴───────┐
              ▼               ▼
          REST API        Socket.IO
```

---

# 🔗 Complete Widget Data Flow

```text
External Application
        │
        ▼
   Chat Widget
        │
 ┌──────┴──────┐
 ▼             ▼
REST         Socket.IO
 │             │
 ▼             ▼
Chat API    Real-Time Gateway
 │             │
 └──────┬──────┘
        ▼
 Chat Services
        │
 ┌──────┼─────────┐
 ▼      ▼         ▼
Auth  Messages  Conversations
        │
        ▼
     MongoDB
```

---

# 🧪 Testing Strategy

## Test 1 — Widget Initialization

Initialize the widget with valid configuration.

Expected:

```text
Widget initializes successfully
Chat button appears
```

---

## Test 2 — Widget Lifecycle

Test:

```text
ChatWidget.init()
ChatWidget.open()
ChatWidget.close()
ChatWidget.destroy()
```

Expected:

```text
Widget initializes
Widget opens
Widget closes
Widget resources are cleaned up
```

---

## Test 3 — Widget Session Creation

Call:

```text
POST /api/v1/widget/sessions
```

with a valid API key.

Expected:

```text
Short-lived widget token returned
Project context correct
User identity correct
Expiration included
Scopes included
```

---

## Test 4 — Invalid Widget Session

Attempt to create a session with:

```text
Invalid API Key
Invalid Project
Invalid User
```

Expected:

```text
Authentication / authorization failure
No widget token issued
```

---

## Test 5 — Expired Token

Initialize the widget with an expired token.

Expected:

```text
Authentication failed
Protected data not returned
```

---

## Test 6 — Authentication

Initialize with an invalid token.

Expected:

```text
Authentication failed
```

The widget should not expose protected data.

---

## Test 7 — Conversations

Open widget.

Expected:

```text
Conversation list loads
Only authorized conversations are returned
```

---

## Test 8 — Messages

Select an authorized conversation.

Expected:

```text
Messages load correctly
```

---

## Test 9 — Unauthorized Conversation

Attempt to access a conversation the current user cannot access.

Expected:

```text
403 Forbidden
```

The widget must not display the conversation's messages.

---

## Test 10 — Send Message

Send:

```text
Hello from the widget
```

Expected:

```text
Message appears
Message is persisted
Canonical messageId is returned
```

---

## Test 11 — Message Deduplication

Send a message.

Receive:

```text
POST response
+
Socket.IO message:new
```

Expected:

```text
Message displayed exactly once
```

---

## Test 12 — Real-Time Message

Open the same conversation in another client.

Send a message.

Expected:

```text
Other widget
     │
     ▼
Message appears without refresh
```

---

## Test 13 — Typing

User A starts typing.

Expected:

```text
User B:
"User A is typing..."
```

---

## Test 14 — Presence

Connect two users.

Expected:

```text
Online
```

Disconnect one.

Expected:

```text
Offline
```

---

## Test 15 — Unread Count

Receive a message while the conversation is closed.

Expected:

```text
💬 1
```

---

## Test 16 — Read Receipts

Receive a message and mark it as read.

Expected:

```text
Read state updates correctly
```

---

## Test 17 — Reactions

Add a reaction.

Expected:

```text
Reaction appears in real time
```

---

## Test 18 — Mobile

Open the widget on a mobile viewport.

Expected:

```text
Responsive layout
No horizontal overflow
Message input usable
Chat window fits viewport
```

---

## Test 19 — Socket Reconnection

Disconnect the network temporarily.

Expected:

```text
Connected
     │
     ▼
Disconnected
     │
     ▼
Reconnecting
     │
     ▼
Connected
```

---

## Test 20 — Project Isolation

Attempt to use a widget token from:

```text
Project A
```

to access:

```text
Project B
```

Expected:

```text
403 Forbidden
```

---

## Test 21 — User Isolation

User A attempts to access a conversation available only to User B.

Expected:

```text
403 Forbidden
```

---

## Test 22 — Permanent API Key Protection

Inspect browser source, network requests, and frontend configuration.

Expected:

```text
Permanent API Key → Not exposed
Widget Token → Present only when required
```

---

## Test 23 — Token Expiration

Allow the widget token to expire.

Expected:

```text
Protected requests fail
Widget reports session expiration
User can establish a new session
```

---

## Test 24 — Widget Configuration

Test:

```text
position
theme
title
primaryColor
```

Expected:

```text
Configuration is applied correctly
```

---

# 📊 Widget Test Matrix

| Feature               | Expected    |
| --------------------- | ----------- |
| Initialization        | Works       |
| Widget lifecycle      | Works       |
| Widget session        | Works       |
| Short-lived token     | Supported   |
| Token expiration      | Handled     |
| Authentication        | Protected   |
| User identity         | Correct     |
| Project isolation     | Enforced    |
| Conversations         | Load        |
| Messages              | Load        |
| Send message          | Works       |
| Message deduplication | Implemented |
| Real-time messages    | Works       |
| Typing                | Works       |
| Presence              | Works       |
| Unread count          | Works       |
| Read receipts         | Works       |
| Reactions             | Works       |
| Mobile                | Responsive  |
| Reconnection          | Works       |
| Authorization         | Enforced    |
| Permanent API keys    | Protected   |
| Configuration         | Works       |
| Lifecycle methods     | Works       |
| Error handling        | Implemented |

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Widget initialization implemented
* [ ] Widget lifecycle implemented
* [ ] Widget session endpoint implemented
* [ ] Authentication flow implemented
* [ ] Short-lived widget credentials supported
* [ ] Widget token expiration implemented
* [ ] Widget token scoped to project
* [ ] Widget token scoped to user
* [ ] Widget scopes implemented
* [ ] Permanent API keys not exposed
* [ ] Project isolation enforced
* [ ] User identity mapping implemented
* [ ] Conversation authorization enforced
* [ ] Message authorization enforced
* [ ] REST API integrated
* [ ] Socket.IO integrated
* [ ] Real-time messages supported
* [ ] Message deduplication implemented
* [ ] Typing indicators supported
* [ ] Presence supported
* [ ] Unread counts supported
* [ ] Read receipts supported
* [ ] Reactions supported
* [ ] Loading states implemented
* [ ] Error states implemented
* [ ] Reconnection handled
* [ ] Responsive UI implemented
* [ ] Widget configuration implemented
* [ ] Security tested

---

# 📊 Phase 6 Progress

```text
Phase 6 — Integration Platform

├── Public API       ✅
├── API Keys         ✅
├── Webhooks         ✅
└── Chat Widget      🟡 Current
```

---

# 🎯 Module Completion Criteria

The Chat Widget is complete when:

```text
Chat Widget
│
├── Embeddable UI              ✅
├── Widget Build               ✅
├── Widget Delivery             ✅
├── Widget Initialization       ✅
├── Widget Lifecycle            ✅
├── Widget Session API          ✅
├── Short-Lived Authentication  ✅
├── User Identity               ✅
├── Project Isolation            ✅
├── Conversation Authorization  ✅
├── Conversations               ✅
├── Messages                    ✅
├── Message Deduplication       ✅
├── Real-Time Messages          ✅
├── Typing                      ✅
├── Presence                    ✅
├── Unread Count                ✅
├── Read Receipts               ✅
├── Reactions                   ✅
├── Responsive Design           ✅
├── Error Handling              ✅
├── Reconnection                ✅
├── Configuration               ✅
└── Security                    ✅
```

---

# 🏁 Final Integration Architecture

After completing this module, the entire platform can be represented as:

```text
                         CHAT PLATFORM
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
   Public API              Webhooks             Chat Widget
       │                      │                      │
       ▼                      ▼                      ▼
    Backend              External Systems        Frontend
       │                      │                      │
       │               ┌──────┼──────┐               │
       │               ▼      ▼      ▼               │
       │              CRM    HRM    ERP              │
       │                                               │
       └──────────────────────┬────────────────────────┘
                              │
                         Chat Services
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
              MongoDB      Redis       Socket.IO
```

---

# 🧩 Complete Integration Flow

The complete Phase 6 architecture becomes:

```text
                       EXTERNAL APPLICATION
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Public API        Webhooks       Chat Widget
             │                │                │
             ▼                │                │
          API Key             │                │
             │                │                │
             ▼                │                ▼
       Chat Platform          │          Widget Token
             │                │                │
             ▼                │                ▼
       Domain Operation       │          REST + Socket.IO
             │                │                │
             ▼                │                │
        Domain Event          │                │
             │                │                │
       ┌─────┴─────┐          │                │
       ▼           ▼          │                │
  Socket.IO   Webhook         │                │
       │       Dispatcher     │                │
       │           │          │                │
       ▼           ▼          │                │
 Connected      Redis         │                │
 Users          Queue         │                │
                   │          │                │
                   ▼          │                │
             Webhook Worker   │                │
                   │          │                │
                   ▼          │                │
              External CRM ───┘                │
                                              │
                                              ▼
                                      Chat Services
                                              │
                                              ▼
                                           MongoDB
```

---

# 🔄 Chat Widget Runtime Flow

The complete runtime flow is:

```text
External Application
        │
        ▼
External Backend
        │
        │ API Key
        ▼
POST /api/v1/widget/sessions
        │
        ▼
Validate API Key
        │
        ▼
Validate Project
        │
        ▼
Validate External User
        │
        ▼
Create Short-Lived Token
        │
        ▼
Browser
        │
        ▼
ChatWidget.init()
        │
        ├───────────────┐
        ▼               ▼
     REST API       Socket.IO
        │               │
        ▼               ▼
Conversations       Real-Time
Messages            Messages
Send Message        Typing
Read State          Presence
Reactions           Read Receipts
        │               │
        └───────┬───────┘
                ▼
          Chat Platform
                │
                ▼
             MongoDB
```

---

# 🔐 Complete Widget Security Model

```text
External Application
        │
        ▼
Server-Side API Key
        │
        ▼
Widget Session Request
        │
        ▼
API Key Validation
        │
        ▼
Project Validation
        │
        ▼
External User Validation
        │
        ▼
Short-Lived Widget Token
        │
        ▼
Browser
        │
        ▼
Widget
        │
        ▼
Authenticated Request
        │
        ▼
Project Context
        │
        ▼
User Context
        │
        ▼
Conversation Authorization
        │
        ▼
Message Authorization
        │
        ▼
REST / Socket.IO
        │
        ▼
Authorized Chat Data
```

This provides:

```text
Permanent Credential Protection
+
Short-Lived Authentication
+
Project Isolation
+
User Isolation
+
Conversation Authorization
+
Message Authorization
+
Secure Real-Time Communication
```

---

# 🏆 Portfolio Result

After completing the module, the project becomes more than:

```text
❌ "I built a chat application."
```

It becomes:

```text
✅ "I built a reusable, multi-tenant chat platform
   with REST APIs, API-key authentication, webhooks,
   real-time communication, and an embeddable chat widget."
```

A CRM can consume the platform:

```text
CRM
 │
 ├── REST API
 ├── API Key
 ├── Webhooks
 └── Chat Widget
        │
        ▼
   CHAT PLATFORM
```

An HRM can use the same platform:

```text
HRM
 │
 ├── REST API
 ├── API Key
 ├── Webhooks
 └── Chat Widget
        │
        ▼
   CHAT PLATFORM
```

An ERP can also use the same infrastructure:

```text
ERP
 │
 ├── REST API
 ├── API Key
 ├── Webhooks
 └── Chat Widget
        │
        ▼
   CHAT PLATFORM
```

The external applications do not need to create separate:

```text
Chat Backend
Message Database
Socket.IO Server
Presence System
Typing System
Read Receipt System
Reaction System
```

They consume the existing Chat Platform.

---

# 🎉 Phase 6 Completion

```text
PHASE 6 — INTEGRATION PLATFORM

├── Public API       ✅
├── API Keys         ✅
├── Webhooks         ✅
└── Chat Widget      🟡 Current
```

After implementation and testing:

```text
PHASE 6 — INTEGRATION PLATFORM

├── Public API       ✅
├── API Keys         ✅
├── Webhooks         ✅
└── Chat Widget      ✅
```

### Phase 6 is complete when the final Chat Widget implementation passes its completion criteria and security tests.

---

# 🚀 Final Platform Capability

The complete platform now demonstrates three important integration directions:

```text
                    CHAT PLATFORM
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   Public API         Webhooks        Chat Widget
       │                 │                 │
       ▼                 ▼                 ▼
  CALL PLATFORM     NOTIFY SYSTEMS    EMBED PLATFORM
```

Therefore:

```text
Public API
→ External applications can CALL the platform.

API Keys
→ External applications can AUTHENTICATE securely.

Webhooks
→ The platform can NOTIFY external applications asynchronously.

Chat Widget
→ External applications can EMBED the platform's chat experience.
```

Together, these capabilities transform the project from a conventional chat application into a:

> **Multi-tenant, real-time chat integration platform with REST APIs, secure API-key authentication, asynchronous webhooks, and an embeddable chat experience.**

This completes the architectural scope of **Phase 6 — Integration Platform**.

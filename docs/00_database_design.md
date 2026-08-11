Database Design

System Hierarchy

Organization
      │
      ├──────────────┐
      │              │
   Project        Project
      │              │
      │              │
 Workspace      Workspace
      │              │
      ├──────────────┐
      │              │
    Users      Conversations
      │              │
      └──────┬───────┘
             │
         Messages

---------------------------------------------------------------------------------------------------

Example Structure

Organization
--------------
ABC Technologies

Projects
--------------
CRM
HRM
ERP

CRM Workspaces
--------------
Sales
Marketing
Support

HRM Workspaces
--------------
Recruitment
Payroll

Users
--------------
Akshaya
Rahul
Priya

Conversations
--------------
Sales Team
Marketing Team
Private Chat

Messages
--------------
Hello
How are you?

---------------------------------------------------------------------------------------------------

Core Collections

| No | Collection          | Purpose                   |
| -- | ------------------- | ------------------------- |
| 1  | Organizations       | Tenant or company         |
| 2  | Projects            | CRM, HRM, ERP             |
| 3  | Workspaces          | Departments/Teams         |
| 4  | Users               | Application users         |
| 5  | Roles               | Permissions               |
| 6  | Conversations       | Chats                     |
| 7  | ConversationMembers | Conversation participants |
| 8  | Messages            | Chat messages             |
| 9  | Attachments         | Files                     |
| 10 | Notifications       | Unread alerts             |
| 11 | Sessions            | Logged-in devices         |
| 12 | ActivityLogs        | Audit trail               |
| 13 | Integrations        | External applications     |

---------------------------------------------------------------------------------------------------


Relationships

Organization
      │
      │ 1
      ▼
 Projects
      │
      │ 1
      ▼
 Workspaces
      │
      ├──────────────┐
      ▼              ▼
    Users      Conversations
                     │
                     ▼
          ConversationMembers
                     │
                     ▼
                Messages
                     │
                     ▼
               Attachments

---------------------------------------------------------------------------------------------------

Collection Details

1. Organizations

Represents a company using the platform.

Fields
_id
name
slug
logo
owner
status
plan
timezone
createdAt
updatedAt

Relationship

Organization
      │
      ├── Projects
      └── Users

---------------------------------------------------------------------------------------------------

2. Projects

Represents an application.

Examples

CRM
HRM
ERP
Inventory
Accounting

Fields

_id
organizationId
name
code
description
status
settings
createdBy
createdAt
updatedAt

Relationship

Organization
      │
      ▼
 Projects

---------------------------------------------------------------------------------------------------

 3. Workspaces

Departments inside a project.

Examples

Sales
Marketing
Support
Recruitment
Payroll

Fields

_id
projectId
name
description
color
icon
status
createdAt
updatedAt

---------------------------------------------------------------------------------------------------

4. Users

Fields

_id
organizationId
fullName
email
phone
password
avatar
status
lastSeen
isOnline
createdAt
updatedAt

---------------------------------------------------------------------------------------------------

5. Roles

Examples

Super Admin
Organization Admin
Project Admin
Manager
Employee
Guest

Fields

_id
organizationId
name
permissions
createdAt

---------------------------------------------------------------------------------------------------

6. Conversations

Types

Private
Group
Channel

Fields

_id
workspaceId
type
name
description
createdBy
lastMessage
lastActivity
createdAt

---------------------------------------------------------------------------------------------------

7. ConversationMembers

Fields

_id
conversationId
userId
role
joinedAt
isMuted
isPinned

---------------------------------------------------------------------------------------------------

8. Messages

Fields

_id
conversationId
senderId
type
text
replyTo
edited
deleted
createdAt

---------------------------------------------------------------------------------------------------

9. Attachments

Fields

_id
messageId
fileName
url
size
mimeType

---------------------------------------------------------------------------------------------------

10. Notifications

Fields

_id
userId
type
title
body
isRead
createdAt

---------------------------------------------------------------------------------------------------

11. Sessions

Fields

_id
userId
device
browser
ip
refreshToken
expiresAt

---------------------------------------------------------------------------------------------------

12. ActivityLogs

Fields

_id
userId
action
entity
entityId
metadata
createdAt

Examples

Akshaya created group
Rahul joined workspace
Priya deleted message

---------------------------------------------------------------------------------------------------

13. Integrations

Fields

_id
organizationId
projectId
apiKey
secretKey
allowedOrigins
status
createdAt

Examples

CRM
HRM
ERP
LMS

---------------------------------------------------------------------------------------------------

Complete ER Diagram

Organization
│
├── Projects
│     ├── Workspaces
│     │      ├── Conversations
│     │      │      ├── ConversationMembers
│     │      │      ├── Messages
│     │      │      │      ├── Attachments
│     │      │      │      └── ActivityLogs
│     │      │
│     │      └── Users
│     │
│     └── Integrations
│
├── Roles
│
├── Users
│     ├── Sessions
│     └── Notifications

---------------------------------------------------------------------------------------------------

One architectural improvement

For a reusable enterprise chat platform, I recommend one change:

Instead of:

Organization
   └── Users

use:

Organization
   └── Memberships
          ├── User
          ├── Role
          ├── Workspace

This allows:

A single user to belong to multiple organizations.
Different roles in different workspaces.
Easier support for SaaS multi-tenancy and enterprise scenarios.

This is the pattern used by many large collaboration platforms because it scales better than assigning a user directly to one organization.









backend/                    ← Folder
│
├── src/                    ← Folder
│   ├── config/             ← Folder
│   ├── controllers/        ← Folder
│   ├── middleware/         ← Folder
│   ├── models/             ← Folder
│   ├── routes/             ← Folder
│   ├── services/           ← Folder
│   ├── validators/         ← Folder
│   ├── utils/              ← Folder
│   ├── sockets/            ← Folder (empty for now)
│   ├── app.js              ← File
│   └── server.js           ← File
│
├── uploads/                ← Folder
├── .env                    ← File
├── package.json            ← File
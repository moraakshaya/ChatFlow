# 🔎 Message Search Module

## 📋 Module Information

| Property            | Value                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Module**          | Message Search                                                                                              |
| **Version**         | v1.1                                                                                                        |
| **Status**          | 🟡 In Development                                                                                           |
| **Phase**           | Phase 2 — Messaging Features                                                                                |
| **Depends On**      | Organization, Project, Workspace, Authentication, Conversation, Conversation Members, Messages, Attachments |
| **Previous Module** | Attachments                                                                                                 |
| **Next Module**     | —                                                                                                           |
| **Primary API**     | `GET /api/messages/search`                                                                                  |

---

# 1. 📖 Overview

The **Message Search Module** allows authenticated users to search messages across the conversations they are authorized to access.

The module supports:

* 🔎 Keyword-based message search
* 🏢 Organization-scoped global search
* 📁 Project-scoped search
* 🗂️ Workspace-scoped search
* 💬 Conversation-scoped search
* 👤 Sender filtering
* 📎 Attachment filtering
* 📅 Date-range filtering
* 📄 Message-type filtering
* 📑 Pagination
* 🔐 Multi-tenant authorization
* 🛡️ Regex-safe search
* 🚫 Private conversation protection
* 🔗 Search-result navigation back to the exact message

The search system is designed for a **multi-tenant chat platform**, where users must never be able to discover messages outside their authorized organization, project, workspace, or conversation scope.

---

# 2. 🎯 Module Objective

The primary objective is:

> Allow users to quickly find messages while guaranteeing that search results contain only messages from conversations the authenticated user is authorized to access.

The search module must therefore treat **authorization as part of the search query**, rather than searching messages first and filtering unauthorized results afterward.

---

# 3. 🏗️ High-Level Architecture

```text
Client
   ↓
Authentication
   ↓
Scope Resolution
   ↓
Authorization
   ↓
Search Query Builder
   ↓
Search Engine
   ↓
Result Sanitization
   ↓
Client
```

### Detailed Flow

```text
User
 │
 ▼
GET /api/messages/search
 │
 ▼
Authentication Middleware
 │
 ├── Validate JWT
 │
 └── Identify authenticated user
 │
 ▼
Scope Resolution
 │
 ├── Organization
 ├── Projects
 ├── Workspaces
 └── Conversations
 │
 ▼
Authorization
 │
 └── Determine accessible conversations
 │
 ▼
Search Query Builder
 │
 ├── Keyword
 ├── Sender
 ├── Message Type
 ├── Attachment
 └── Date Range
 │
 ▼
Search Engine
 │
 ├── MongoDB Regex Search (v1)
 │
 └── Atlas Search (future)
 │
 ▼
Result Sanitization
 │
 ▼
Paginated Search Results
```

---

# 4. 🔐 Authentication

All message-search requests require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```

The authentication middleware must:

1. Extract the JWT.
2. Validate the token.
3. Identify the authenticated user.
4. Attach the authenticated user to the request.
5. Reject unauthenticated requests.

### Unauthenticated Request

```http
GET /api/messages/search?q=project
```

Response:

```json
{
  "success": false,
  "message": "Authentication required"
}
```

HTTP Status:

```text
401 Unauthorized
```

---

# 5. 🛡️ Authorization Model

Authorization is the most important part of this module.

A search request must **never directly search the entire `messages` collection**.

The user's permissions must first determine which conversations are searchable.

---

# 6. 🌐 Global Search Definition

The term **Global Search** refers to searching across the authenticated user's accessible data **within their current organization**.

It does **not** mean:

```text
Entire messages collection
```

It means:

```text
Current Organization
       ↓
Accessible Projects
       ↓
Accessible Workspaces
       ↓
Accessible Conversations
       ↓
Searchable Messages
```

Therefore:

> A user's global message search is restricted to messages belonging to conversations that the user is authorized to access within the current organization.

---

# 7. 🏢 Multi-Tenant Search Scope

The search hierarchy is:

```text
Organization
    ↓
Project
    ↓
Workspace
    ↓
Conversation
    ↓
Message
```

Search authorization follows the same hierarchy.

```text
Authenticated User
       ↓
Organization Membership
       ↓
Project Access
       ↓
Workspace Access
       ↓
Conversation Access
       ↓
Message Access
```

This prevents cross-tenant message discovery.

---

# 8. 💬 Conversation-Level Authorization

Workspace membership alone does not automatically guarantee access to every conversation.

A user may belong to a workspace but not have permission to view a particular private conversation.

Therefore:

```text
Workspace Membership
        ↓
Accessible Conversations
        ↓
Searchable Messages
```

The search module must always verify conversation-level access.

### Example

```text
Workspace A
│
├── General Conversation
│     └── User has access ✅
│
├── Team Conversation
│     └── User has access ✅
│
└── Private Admin Conversation
      └── User has no access ❌
```

A workspace search must return messages from:

```text
General
Team
```

but never:

```text
Private Admin
```

---

# 9. 🔑 Scope Resolution

Before constructing the search query, the system resolves the user's searchable scope.

### Scope Resolution

```text
Authenticated User
       ↓
Current Organization
       ↓
Accessible Projects
       ↓
Accessible Workspaces
       ↓
Accessible Conversations
       ↓
Accessible Conversation IDs
```

The resulting conversation IDs become the authorization boundary for the message query.

Example:

```javascript
accessibleConversationIds = [
  "conversation_001",
  "conversation_002",
  "conversation_005"
];
```

The message query must then be restricted to these conversations.

---

# 10. 🔎 Search Endpoint

```http
GET /api/messages/search
```

### Purpose

Search messages that are accessible to the authenticated user.

---

# 11. 📌 Query Parameters

| Parameter        | Type         | Required | Description                              |
| ---------------- | ------------ | -------: | ---------------------------------------- |
| `q`              | String       |      No* | Search keyword                           |
| `conversationId` | String       |       No | Search within one conversation           |
| `workspaceId`    | String       |       No | Search within one workspace              |
| `projectId`      | String       |       No | Search within one project                |
| `senderId`       | String       |       No | Filter messages by sender                |
| `messageType`    | String       |       No | Filter by message type                   |
| `hasAttachment`  | Boolean      |       No | Filter messages with/without attachments |
| `from`           | ISO DateTime |       No | Start date                               |
| `to`             | ISO DateTime |       No | End date                                 |
| `page`           | Number       |       No | Page number                              |
| `limit`          | Number       |       No | Number of results                        |

* At least one meaningful search/filter parameter should be provided according to the API validation rules.

---

# 12. 🔎 Keyword Search

Example:

```http
GET /api/messages/search?q=deployment
```

The search should match message content containing:

```text
deployment
```

Example messages:

```text
Deployment completed successfully
```

```text
The deployment is scheduled for tomorrow
```

Both can be returned.

---

# 13. 🛡️ Regex Search Security

MongoDB Regex is used in the initial implementation.

However, user input must be treated as **plain search text**, not as arbitrary regular-expression syntax.

### Safe Search Flow

```text
User Input
    ↓
Normalize
    ↓
Escape Regex Metacharacters
    ↓
Create Regex
    ↓
MongoDB Search
```

For example, user input such as:

```text
project.*
```

must not automatically become an executable regular expression.

The backend should escape regex metacharacters before constructing the query.

Example conceptual implementation:

```javascript
const escapedSearch = escapeRegex(searchTerm);

const filter = {
  content: {
    $regex: escapedSearch,
    $options: "i"
  }
};
```

This prevents users from unintentionally or intentionally constructing expensive regex expressions.

---

# 14. 👤 Sender Filtering

Example:

```http
GET /api/messages/search?q=meeting&senderId=68user123
```

The `senderId` must also respect authorization.

The system must not assume that an arbitrary sender ID is valid.

### Required Validation

```text
senderId
    ↓
Sender exists
    ↓
Sender belongs to accessible scope
    ↓
Sender can participate in accessible conversation
    ↓
Apply sender filter
```

The search API must never expose messages simply because a valid-looking `senderId` was supplied.

---

# 15. 💬 Conversation Search

Example:

```http
GET /api/messages/search?q=deadline&conversationId=conv123
```

Before searching:

```text
conversationId
      ↓
Verify conversation exists
      ↓
Verify authenticated user has access
      ↓
Search messages
```

If the conversation is not accessible:

```http
403 Forbidden
```

or, depending on the platform's resource-disclosure policy:

```http
404 Not Found
```

The implementation should avoid revealing the existence of private conversations to unauthorized users.

---

# 16. 🗂️ Workspace Search

Example:

```http
GET /api/messages/search?q=invoice&workspaceId=workspace123
```

The search scope becomes:

```text
Workspace
    ↓
Accessible Conversations
    ↓
Messages
```

The important rule is:

> Workspace search must return only messages from conversations that the authenticated user is authorized to access.

It must not simply search every message whose conversation belongs to the workspace.

---

# 17. 📁 Project Search

Example:

```http
GET /api/messages/search?q=client&projectId=project123
```

Search flow:

```text
Project
   ↓
Accessible Workspaces
   ↓
Accessible Conversations
   ↓
Messages
```

Unauthorized projects must never be searchable.

---

# 18. 🏢 Organization-Level Global Search

Example:

```http
GET /api/messages/search?q=contract
```

Default global search scope:

```text
Current Organization
        ↓
Accessible Projects
        ↓
Accessible Workspaces
        ↓
Accessible Conversations
        ↓
Messages
```

It must **never** mean:

```text
All organizations
        ↓
All projects
        ↓
All messages
```

---

# 19. 📅 Date Filtering

Messages can be filtered by creation date.

Example:

```http
GET /api/messages/search?q=meeting&from=2026-08-01T00:00:00Z&to=2026-08-08T23:59:59Z
```

Recommended API format:

```text
ISO 8601 timestamps
```

Example:

```text
2026-08-08T00:00:00Z
2026-08-08T23:59:59Z
```

### Date Normalization

All incoming timestamps should be:

```text
Client Timestamp
      ↓
Validate
      ↓
Normalize
      ↓
UTC
      ↓
MongoDB
```

MongoDB stores and queries dates consistently in UTC.

---

# 20. 🗓️ Date-Only Filters

If date-only values are supported, their timezone interpretation must be explicitly defined.

For example:

```text
from=2026-08-08
```

should not have ambiguous behavior.

Recommended rule:

> Date-only filters are interpreted using the application's configured timezone and normalized into UTC before querying MongoDB.

Alternatively, the API can require full ISO timestamps to eliminate ambiguity.

---

# 21. 📎 Attachment Filtering

The search API supports:

```http
hasAttachment=true
```

and:

```http
hasAttachment=false
```

The current architecture separates attachments from messages:

```text
Message
   ↓
Attachment
   ↓
messageId
```

Therefore, attachment filtering should use the `Attachment` collection.

### Search Flow

```text
Messages
    ↓
Attachment Lookup
    ↓
Match messageId
    ↓
hasAttachment
```

Conceptually:

```text
hasAttachment = true
        ↓
Message has at least one Attachment
```

```text
hasAttachment = false
        ↓
Message has no Attachment
```

This can be implemented using MongoDB aggregation / `$lookup` or an optimized attachment-existence strategy.

---

# 22. 📝 Message Type Filtering

Supported message types:

```text
text
image
file
audio
video
system
```

Example:

```http
GET /api/messages/search?q=invoice&messageType=file
```

The search should only return messages matching the requested type.

---

# 23. ⚙️ System Message Search

System messages can contain events such as:

```text
Akshaya joined the conversation
```

```text
Ravi changed the conversation name
```

For the default search experience:

```text
System messages
       ↓
Excluded
```

Recommended behavior:

```text
Default:
includeSystemMessages = false
```

If system-message search is required later:

```text
includeSystemMessages=true
```

can be introduced as an optional filter.

---

# 24. 📑 Pagination

### V1

The initial implementation uses traditional page-based pagination:

```text
page
limit
skip
```

Example:

```http
GET /api/messages/search?q=project&page=2&limit=20
```

Conceptually:

```javascript
skip = (page - 1) * limit;
```

---

# 25. 🚀 Future Cursor Pagination

For large chat platforms, deep pagination using:

```text
skip=100000
```

can become inefficient.

Therefore:

```text
V1
    ↓
page + limit

Future
    ↓
cursor-based pagination
```

Cursor pagination can use fields such as:

```text
createdAt
messageId
```

to efficiently retrieve the next result set.

---

# 26. 📊 Search Sorting

### V1 — Regex Search

Results are sorted:

```text
createdAt DESC
```

Therefore:

```text
Newest matching message
        ↓
Older matching message
```

Example:

```javascript
.sort({
  createdAt: -1
});
```

---

# 27. 🔮 Future Atlas Search Sorting

When MongoDB Atlas Search is introduced:

```text
Search Query
     ↓
Relevance Score
     ↓
createdAt Tie-Breaker
```

Recommended sorting:

```text
1. Search relevance
2. createdAt descending
```

Therefore:

```text
Regex Search
    ↓
Newest First

Atlas Search
    ↓
Most Relevant
    ↓
Newest as Tie-Breaker
```

This provides a clean migration path from the V1 implementation to a production-grade search engine.

---

# 28. 🔎 Search Engine Strategy

## V1 — MongoDB Regex

```text
Client
  ↓
Search Service
  ↓
MongoDB
  ↓
Regex
```

Advantages:

* Simple implementation
* No additional infrastructure
* Easy to understand
* Suitable for initial development

Limitations:

* Can become slow with large datasets
* Limited relevance ranking
* Limited full-text search capabilities
* Regex performance depends heavily on query/index design

---

## V2 — MongoDB Atlas Search

Future architecture:

```text
Client
   ↓
Search Service
   ↓
Atlas Search
   ↓
Relevance Ranking
   ↓
Results
```

Benefits:

* Full-text search
* Relevance scoring
* Better text matching
* Fuzzy search
* Highlighting
* Better scalability

---

# 29. 🧠 Search Query Builder

Search filters should be constructed separately from the controller.

Recommended architecture:

```text
Controller
    ↓
Scope Resolver
    ↓
Authorization
    ↓
Search Query Builder
    ↓
Search Service
    ↓
Repository / MongoDB
```

The query builder should combine:

```text
Authorization Scope
+
Search Filters
+
Pagination
+
Sorting
```

Example conceptual query:

```javascript
{
  conversationId: {
    $in: accessibleConversationIds
  },

  content: {
    $regex: escapedSearchTerm,
    $options: "i"
  },

  senderId: senderId,

  messageType: messageType,

  createdAt: {
    $gte: from,
    $lte: to
  }
}
```

---

# 30. 🧱 Authorization Must Be Part of the Query

A critical rule:

❌ Do not do:

```text
Search all messages
        ↓
Filter unauthorized messages
```

Instead:

✅ Do:

```text
Resolve authorized conversations
        ↓
Build restricted query
        ↓
Search only authorized messages
```

This is both safer and more efficient.

---

# 31. 🔐 Recommended Query Structure

Conceptually:

```javascript
const query = {
  conversationId: {
    $in: accessibleConversationIds
  }
};
```

Then apply optional filters:

```text
query
 ├── conversationId
 ├── senderId
 ├── messageType
 ├── createdAt
 ├── content
 └── attachment condition
```

The authorization filter should never be removed because a client did not provide a scope parameter.

---

# 32. 🧹 Result Sanitization

Before returning results to the client:

```text
MongoDB Results
      ↓
Authorization Verification
      ↓
Sensitive Field Removal
      ↓
Response DTO
      ↓
Client
```

Only fields required by the search UI should be returned.

Recommended response fields:

```text
messageId
conversationId
senderId
content
messageType
createdAt
hasAttachment
```

Optional:

```text
conversationName
senderName
workspaceId
projectId
highlight
```

---

# 33. 🔗 Search Result Navigation

Search results should allow the frontend to navigate directly to the matching message.

Each result should contain:

```text
conversationId
messageId
```

Frontend flow:

```text
Search Result
      ↓
conversationId
      ↓
Open Conversation
      ↓
messageId
      ↓
Locate Message
      ↓
Scroll
      ↓
Highlight Message
```

Example:

```json
{
  "messageId": "msg_123",
  "conversationId": "conv_456",
  "content": "Deployment completed successfully"
}
```

The frontend can use:

```text
conversationId → open conversation
messageId       → locate/highlight message
```

This is essential for a good chat-search experience.

---

# 34. 📦 Response Structure

Recommended successful response:

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "messageId": "msg_123",
        "conversationId": "conv_456",
        "senderId": "user_123",
        "content": "Deployment completed successfully",
        "messageType": "text",
        "hasAttachment": false,
        "createdAt": "2026-08-08T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

# 35. ❌ Error Handling

### 401 — Unauthenticated

```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

### 403 — Unauthorized Scope

```json
{
  "success": false,
  "message": "You are not authorized to search this resource"
}
```

---

### 400 — Invalid Query

```json
{
  "success": false,
  "message": "Invalid search parameters"
}
```

---

### 404 — Resource Not Found

Used where appropriate without exposing private-resource existence.

```json
{
  "success": false,
  "message": "Resource not found"
}
```

---

### 500 — Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

# 36. 🧩 Recommended Backend Structure

```text
backend/
│
├── controllers/
│   └── messageSearchController.js
│
├── services/
│   └── messageSearchService.js
│
├── repositories/
│   └── messageSearchRepository.js
│
├── utils/
│   ├── escapeRegex.js
│   └── searchQueryBuilder.js
│
├── middleware/
│   ├── authenticate.js
│   └── authorize.js
│
├── routes/
│   └── messageRoutes.js
│
└── models/
    ├── Message.js
    ├── Conversation.js
    ├── ConversationMember.js
    ├── Workspace.js
    ├── Project.js
    ├── Organization.js
    └── Attachment.js
```

---

# 37. 🧠 Controller Responsibility

The controller should remain lightweight.

```text
Request
  ↓
Validate parameters
  ↓
Call Search Service
  ↓
Return response
```

It should not contain complex authorization or MongoDB query logic.

Example conceptual flow:

```javascript
const searchMessages = async (req, res) => {
  const userId = req.user.id;

  const result = await messageSearchService.search({
    userId,
    filters: req.query
  });

  return res.status(200).json({
    success: true,
    data: result
  });
};
```

---

# 38. ⚙️ Search Service Responsibility

The service coordinates:

```text
User
 ↓
Scope Resolution
 ↓
Authorization
 ↓
Query Construction
 ↓
Search Repository
 ↓
Result Formatting
```

The service should be responsible for business rules rather than HTTP-specific logic.

---

# 39. 🛡️ Scope Resolver Responsibility

The scope resolver determines:

```text
Current Organization
       ↓
Accessible Projects
       ↓
Accessible Workspaces
       ↓
Accessible Conversations
```

Example conceptual result:

```javascript
{
  organizationId: "...",
  projectIds: ["..."],
  workspaceIds: ["..."],
  conversationIds: ["...", "..."]
}
```

This result is passed to the search service.

---

# 40. 🧪 Search Examples

### Global Search

```http
GET /api/messages/search?q=meeting
```

Searches:

```text
Current Organization
    ↓
Accessible Conversations
```

---

### Workspace Search

```http
GET /api/messages/search?q=meeting&workspaceId=workspace123
```

Searches:

```text
Workspace
    ↓
Accessible Conversations
```

---

### Conversation Search

```http
GET /api/messages/search?q=meeting&conversationId=conversation123
```

Searches:

```text
One Authorized Conversation
```

---

### Sender Search

```http
GET /api/messages/search?q=meeting&senderId=user123
```

Searches:

```text
Accessible Conversations
        ↓
Messages from Authorized Sender
```

---

### Attachment Search

```http
GET /api/messages/search?q=invoice&hasAttachment=true
```

Returns:

```text
Messages
    ↓
Associated Attachments
    ↓
Only messages containing attachments
```

---

### Date Search

```http
GET /api/messages/search?q=meeting&from=2026-08-01T00:00:00Z&to=2026-08-08T23:59:59Z
```

---

### Message Type Search

```http
GET /api/messages/search?q=invoice&messageType=file
```

---

### Paginated Search

```http
GET /api/messages/search?q=project&page=2&limit=20
```

---

# 41. 🧪 Authorization Test Cases

The following cases must be tested.

### Test 1 — Organization Isolation

```text
User belongs to Organization A

Search
    ↓
Organization A messages only
```

Messages from Organization B must never appear.

---

### Test 2 — Workspace Isolation

```text
User belongs to Workspace A

Search
    ↓
Workspace A accessible conversations only
```

---

### Test 3 — Private Conversation

```text
User belongs to Workspace A

Private Conversation B
    ↓
User has no access

Search
    ↓
Conversation B messages NOT returned
```

---

### Test 4 — Sender Authorization

```text
senderId = unauthorizedUser

Search
    ↓
No unauthorized messages returned
```

---

### Test 5 — Conversation ID Manipulation

```text
User has access to Conversation A

Request:
conversationId=Conversation B
```

Expected:

```text
Unauthorized / Not Found
```

---

### Test 6 — Cross-Organization Conversation ID

```text
User → Organization A

conversationId → Organization B
```

Expected:

```text
No data disclosure
```

---

# 42. 🧪 Functional Test Cases

| Test                      | Expected                                |
| ------------------------- | --------------------------------------- |
| Search by keyword         | Matching messages returned              |
| Search without keyword    | Filters can be used if supported        |
| Search by sender          | Only matching sender                    |
| Search by conversation    | Only conversation messages              |
| Search by workspace       | Only authorized workspace conversations |
| Search by project         | Only authorized project conversations   |
| Filter by type            | Correct message types                   |
| `hasAttachment=true`      | Messages with attachments               |
| `hasAttachment=false`     | Messages without attachments            |
| Date range                | Correct time range                      |
| Pagination                | Correct page and limit                  |
| Empty result              | Empty array                             |
| Invalid date              | `400`                                   |
| Invalid limit             | `400`                                   |
| Unauthorized conversation | `403/404`                               |
| Unauthenticated request   | `401`                                   |

---

# 43. 🚨 Security Requirements

The Message Search module must enforce:

### 1. Authentication

Every search request requires a valid JWT.

### 2. Organization Isolation

Users cannot search messages from another organization.

### 3. Project Isolation

Users cannot search unauthorized projects.

### 4. Workspace Isolation

Users cannot search unauthorized workspaces.

### 5. Conversation Isolation

Users cannot search conversations they cannot access.

### 6. Sender Validation

`senderId` must belong to the authorized search scope.

### 7. Regex Escaping

User search input must be escaped before being passed to MongoDB Regex.

### 8. Result Sanitization

Only authorized and required fields are returned.

### 9. No Authorization After Search

Unauthorized messages must never be fetched first and filtered later.

---

# 44. ⚡ Performance Considerations

Regex search can become expensive as the number of messages grows.

Potential performance improvements:

```text
1. Restrict by conversationId
2. Restrict by date range
3. Use appropriate indexes
4. Limit result count
5. Escape regex input
6. Avoid unrestricted collection scans
7. Introduce Atlas Search when dataset grows
```

---

# 45. 📚 Recommended Indexes

Depending on the final Message schema and query patterns, indexes may include:

```text
conversationId
createdAt
senderId
messageType
```

A compound index may be considered for frequent access patterns such as:

```text
conversationId + createdAt
```

The exact index strategy should be validated against real query patterns and MongoDB explain plans.

---

# 46. 🔮 Future Enhancements

The search module can later support:

```text
├── MongoDB Atlas Search
├── Relevance Ranking
├── Fuzzy Search
├── Search Highlighting
├── Search Suggestions
├── Recent Searches
├── Saved Searches
├── Search by Attachment Type
├── Search by File Name
├── Search by Reaction
├── Search by Mention
├── Search by Thread
├── Search by Date Presets
└── Cursor Pagination
```

---

# 47. 🗺️ Implementation Roadmap

## Phase 1 — Basic Search

```text
GET /api/messages/search
        ↓
Authentication
        ↓
Organization Scope
        ↓
Conversation Authorization
        ↓
Keyword Search
        ↓
Pagination
```

---

## Phase 2 — Advanced Filters

```text
Keyword
Sender
Conversation
Workspace
Project
Message Type
Date Range
Attachments
```

---

## Phase 3 — Search Optimization

```text
Indexes
Regex Optimization
Query Optimization
Cursor Pagination
```

---

## Phase 4 — Advanced Search

```text
MongoDB Atlas Search
        ↓
Relevance
        ↓
Fuzzy Matching
        ↓
Highlighting
```

---

# 48. 🔄 Complete Search Flow

The final architecture is:

```text
┌──────────────────────────┐
│          Client          │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│    Authentication        │
│       Validate JWT       │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│     Scope Resolution     │
│                          │
│ Organization             │
│ Project                  │
│ Workspace                │
│ Conversation             │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│      Authorization       │
│                          │
│ Accessible Conversations │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│   Search Query Builder   │
│                          │
│ Keyword                  │
│ Sender                   │
│ Type                     │
│ Date                     │
│ Attachment               │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│      Search Engine       │
│                          │
│ MongoDB Regex (V1)       │
│ Atlas Search (Future)    │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│    Result Sanitization   │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│    Paginated Response    │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│          Client          │
│                          │
│ Open Conversation        │
│ Scroll to Message        │
│ Highlight Message        │
└──────────────────────────┘
```

---

# 49. ✅ Definition of Done

The Message Search module is considered complete when:

### Authentication

* [ ] JWT authentication implemented
* [ ] Unauthorized requests rejected

### Authorization

* [ ] Organization scope enforced
* [ ] Project scope enforced
* [ ] Workspace scope enforced
* [ ] Conversation-level access enforced
* [ ] Private conversations protected
* [ ] Sender authorization enforced
* [ ] Cross-organization access prevented

### Search

* [ ] Keyword search implemented
* [ ] Regex input escaped
* [ ] Message-type filtering implemented
* [ ] Sender filtering implemented
* [ ] Conversation filtering implemented
* [ ] Workspace filtering implemented
* [ ] Project filtering implemented
* [ ] Date filtering implemented
* [ ] Attachment filtering implemented
* [ ] System-message behavior defined

### Pagination

* [ ] `page` supported
* [ ] `limit` supported
* [ ] Total count returned
* [ ] Maximum limit enforced
* [ ] Cursor pagination documented as future enhancement

### Results

* [ ] `messageId` returned
* [ ] `conversationId` returned
* [ ] Search results sanitized
* [ ] Frontend can navigate to exact message
* [ ] Matching message can be highlighted

### Performance

* [ ] Relevant indexes created
* [ ] Query performance tested
* [ ] Regex limitations documented
* [ ] Atlas Search migration path documented

---

# 50. 📌 Final Architecture Principle

The most important rule of this module is:

> **Search is performed only inside the authenticated user's authorized conversation scope.**

The final security model is:

```text
Authentication
      ↓
Scope Resolution
      ↓
Authorization
      ↓
Accessible Conversations
      ↓
Search Query
      ↓
Search Engine
      ↓
Sanitized Results
```

Never:

```text
Authentication
      ↓
Search Entire Messages Collection
      ↓
Filter Results
```

This design keeps the Message Search module compatible with the platform's **multi-tenant architecture**, protects private conversations, prevents cross-organization data leakage, and provides a clean path from the initial MongoDB Regex implementation to a future **MongoDB Atlas Search** implementation.

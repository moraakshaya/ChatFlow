# 📁 Attachments Module

## 📋 Module Information

| Property        | Value                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Module          | Attachments                                                                                         |
| Version         | v1.0                                                                                                |
| Status          | 🟡 In Development                                                                                   |
| Phase           | Phase 2 — Messaging Features                                                                        |
| Depends On      | Organization, Project, Workspace, User Authentication, Conversation, Conversation Members, Messages |
| Previous Module | Read Receipts                                                                                       |
| Next Module     | Message Search                                                                                      |
| Database        | MongoDB                                                                                             |
| File Storage    | External Object/File Storage                                                                        |

---

# 📌 Overview

The **Attachments module** allows users to securely send files through the chat platform.

Examples include:

```text
Images
PDFs
Documents
Spreadsheets
Videos
Audio
ZIP files
Other supported files
```

The important architectural decision is:

> **Do not store actual files inside MongoDB.**

MongoDB stores **attachment metadata**, while the actual file is stored in external object/file storage.

Architecture:

```text
User
 │
 ▼
Chat Application
 │
 ├───────────────┐
 ▼               ▼
MongoDB       File Storage
 │               │
 ▼               ▼
Metadata       Actual File
```

---

# 🎯 Objectives

The Attachments module is responsible for:

* Uploading files
* Validating files
* Storing file metadata
* Linking files to messages
* Generating upload URLs
* Generating secure download URLs
* Deleting attachments
* Supporting multiple attachments per message
* Tracking attachment upload state
* Validating conversation membership
* Enforcing organization isolation
* Preventing unauthorized file access
* Supporting upload idempotency
* Supporting file integrity verification
* Supporting future malware scanning
* Supporting future cloud storage providers
* Preparing attachment data for real-time messaging

---

# 🧠 Important Architecture Decision

Do **not** store binary files directly in MongoDB.

Avoid:

```js
{
    "messageId": "...",
    "file": "<binary data>"
}
```

Instead:

```text
Message
   │
   ▼
Attachment
   │
   ├── fileName
   ├── mimeType
   ├── fileSize
   ├── storageKey
   ├── storageProvider
   ├── status
   └── metadata
```

The actual file exists in external storage.

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
Message
      │
      ▼
Attachment
      │
      └──────────────► External File Storage
```

---

# 📂 Collection Name

```text
attachments
```

---

# 🗄️ Database Schema

| Field               | Type     | Required | Description                           |
| ------------------- | -------- | -------: | ------------------------------------- |
| organizationId      | ObjectId |        ✅ | Organization reference                |
| projectId           | ObjectId |        ✅ | Project reference                     |
| workspaceId         | ObjectId |        ✅ | Workspace reference                   |
| conversationId      | ObjectId |        ✅ | Conversation reference                |
| messageId           | ObjectId |        ❌ | Associated message; null until linked |
| uploadedBy          | ObjectId |        ✅ | User who initiated/uploaded the file  |
| fileName            | String   |        ✅ | Sanitized/display filename            |
| storageKey          | String   |        ✅ | Internal storage object identifier    |
| storageProvider     | String   |        ✅ | Storage provider                      |
| mimeType            | String   |        ✅ | Validated MIME type                   |
| fileSize            | Number   |        ✅ | File size in bytes                    |
| fileExtension       | String   |        ❌ | Sanitized file extension              |
| thumbnailStorageKey | String   |        ❌ | Storage key for generated thumbnail   |
| status              | String   |        ✅ | Attachment lifecycle state            |
| checksum            | String   |        ❌ | Optional file integrity hash          |
| metadata            | Object   |        ❌ | Flexible media metadata               |
| isDeleted           | Boolean  |     Auto | Soft deletion state                   |
| createdAt           | Date     |     Auto | Upload initialization timestamp       |
| updatedAt           | Date     |     Auto | Last update timestamp                 |

---

# 📄 Example Document

```js
{
    "_id": "68xxxxxxxxxxxx",

    "organizationId": "68xxxxxxxxxxxx",

    "projectId": "68xxxxxxxxxxxx",

    "workspaceId": "68xxxxxxxxxxxx",

    "conversationId": "68xxxxxxxxxxxx",

    "messageId": null,

    "uploadedBy": "68xxxxxxxxxxxx",

    "fileName": "project-proposal.pdf",

    "storageKey": "organizations/org123/projects/project123/workspaces/ws123/conversations/conv123/uploads/7f3a9c2e",

    "storageProvider": "s3",

    "mimeType": "application/pdf",

    "fileSize": 245760,

    "fileExtension": ".pdf",

    "thumbnailStorageKey": null,

    "status": "uploaded",

    "checksum": "sha256:xxxxxxxx",

    "metadata": {},

    "isDeleted": false,

    "createdAt": "2026-08-08T17:00:00Z",

    "updatedAt": "2026-08-08T17:02:00Z"
}
```

---

# 🔗 Relationships

## Message → Attachments

One message can contain multiple attachments.

```text
Message
   │
   │ 1
   │
   │ N
   ▼
Attachment
```

Example:

```text
Message:
"Here are the project files."

    ├── proposal.pdf
    ├── requirements.docx
    └── design.png
```

---

# 👤 User → Attachments

One user can upload many attachments.

```text
User
 │
 │ 1
 │
 │ N
 ▼
Attachment
```

`uploadedBy` records the user who initiated/uploaded the file.

Important:

> `uploadedBy` is primarily audit information. It does not automatically define the complete authorization policy.

Authorization is determined by:

```text
Conversation Membership
+
Organization Isolation
+
Project Isolation
+
Workspace Isolation
+
Application Roles / Permissions
```

---

# 🏢 Organization → Attachments

An organization can contain many attachments.

```text
Organization
     │
     │ 1
     │
     │ N
     ▼
Attachment
```

The attachment must always belong to the correct organization.

---

# 📊 Complete Relationship

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
Message
      │
      ▼
Attachment
      │
      ▼
External Storage
```

---

# 📌 Why Message ID Is Optional

An attachment can be uploaded **before the message is created**.

This supports the flow:

```text
Upload File
     ↓
Receive Attachment ID
     ↓
Create Message
     ↓
Link Attachment
```

Therefore:

```text
messageId = null
```

is valid during the initial upload stage.

After successful message creation:

```text
messageId = message._id
```

---

# 🔐 Unlinked Attachment Security

When:

```text
messageId = null
```

the attachment is considered **unlinked**.

Unlinked attachments must not become generally accessible.

The rule is:

> Unlinked attachments are accessible only to the authenticated uploader and authorized backend processes. They must not be retrievable through normal conversation/message attachment APIs until they are linked to an accessible message.

Therefore:

```text
Unlinked Attachment
        │
        ├── Uploader → Allowed according to upload lifecycle
        │
        └── Other Users → Denied
```

Once linked:

```text
Attachment
    │
    ▼
Message
    │
    ▼
Conversation Membership
    │
    ▼
Authorized Users
```

---

# 🔄 Attachment Lifecycle

The attachment lifecycle is explicitly state-based.

```text
Pending
   │
   ▼
Uploading
   │
   ├────────────► Failed
   │
   ▼
Uploaded
   │
   ▼
Linked
   │
   ▼
Deleted
```

Recommended states:

```text
pending
uploading
uploaded
linked
failed
deleted
```

---

# 📊 Attachment States

## Pending

Upload has been initialized but the storage upload has not started or completed.

```text
status = pending
```

---

## Uploading

The upload operation is currently in progress.

```text
status = uploading
```

---

## Uploaded

The storage object has been successfully verified.

```text
status = uploaded
```

At this stage:

```text
messageId = null
```

may still be valid.

---

## Linked

The attachment has been successfully associated with a message.

```text
status = linked
messageId != null
```

Only uploaded attachments can transition to `linked`.

---

## Failed

The upload or verification process failed.

```text
status = failed
```

---

## Deleted

The attachment has been soft-deleted.

```text
status = deleted
isDeleted = true
```

---

# 🔄 State Transition Rules

Valid transitions:

```text
pending
   ↓
uploading
   ↓
uploaded
   ↓
linked
   ↓
deleted
```

Failure:

```text
pending
   ↓
failed
```

or:

```text
uploading
   ↓
failed
```

Invalid transitions must be rejected.

For example:

```text
deleted → linked ❌

deleted → uploaded ❌

failed → linked ❌
```

---

# 🧠 Recommended Upload Architecture

Do not send large files directly through your main Node.js API whenever possible.

Instead:

```text
Frontend
   │
   ▼
Request Upload Permission
   │
   ▼
Backend
   │
   ▼
Create Attachment Metadata
   │
   ▼
Generate Upload URL
   │
   ▼
Frontend
   │
   ▼
Upload Directly
   │
   ▼
External Storage
   │
   ▼
Frontend Confirms Upload
   │
   ▼
Backend Verifies Object
   │
   ▼
Attachment → Uploaded
```

This reduces load on the backend server.

---

# ☁️ Storage Provider

The module should not tightly couple itself to one storage provider.

Use:

```text
storageProvider
```

Example values:

```text
s3
cloudinary
azure_blob
google_cloud
local
```

For development:

```text
local
```

can be used.

For production:

```text
S3-compatible object storage
```

or another cloud provider can be used.

---

# 📁 Storage Key Design

The storage path must preserve tenant boundaries.

Recommended:

```text
organizations/
    {organizationId}/
        projects/
            {projectId}/
                workspaces/
                    {workspaceId}/
                        conversations/
                            {conversationId}/
                                uploads/
                                    {uniqueObjectId}
```

Example:

```text
organizations/
org123/
projects/
project123/
workspaces/
workspace123/
conversations/
conversation123/
uploads/
7f3a9c2e
```

---

# 🔐 Storage Key Security

Do not directly use the original filename as the storage object identifier.

Avoid:

```text
messages/msg123/../../../secret.pdf
```

or:

```text
messages/msg123/project-proposal.pdf
```

Instead generate an internal unique identifier:

```text
messages/msg123/7f3a9c2e
```

MongoDB stores:

```text
fileName:
project-proposal.pdf
```

while storage uses:

```text
storageKey:
organizations/org123/.../7f3a9c2e
```

This prevents filename-based path traversal and naming collisions.

---

# 📛 Filename Validation

The original filename is treated as display metadata, not as a trusted storage path.

The backend should:

```text
Original Filename
        ↓
Sanitize Filename
        ↓
Remove Path Components
        ↓
Remove Dangerous Characters
        ↓
Validate Length
        ↓
Store Safe Display Name
```

Examples that must not become storage paths:

```text
../../../secret.txt

<script>.html

../../../../file.pdf
```

The storage key should always be generated internally.

---

# 🌐 REST APIs

## 1. Initialize Upload

### Endpoint

```http
POST /api/attachments/upload/init
```

### Request

```json
{
    "fileName": "proposal.pdf",
    "mimeType": "application/pdf",
    "fileSize": 245760,
    "conversationId": "68xxxxxxxxxxxx"
}
```

Optional:

```json
{
    "idempotencyKey": "upload-unique-key"
}
```

---

# 🔄 Initialize Upload Flow

```text
Frontend
   │
   ▼
POST /attachments/upload/init
   │
   ▼
Authenticate
   │
   ▼
Validate Conversation
   │
   ▼
Validate Membership
   │
   ▼
Validate File Metadata
   │
   ▼
Check Idempotency Key
   │
   ▼
Create Attachment
   │
   ▼
Generate Upload URL
   │
   ▼
Return Attachment ID
```

---

# 📄 Initialize Upload Response

```json
{
    "success": true,
    "data": {
        "attachmentId": "68attachment",
        "uploadUrl": "https://storage.example.com/upload/...",
        "storageKey": "organizations/org123/...",
        "expiresAt": "2026-08-08T17:15:00Z",
        "status": "pending"
    }
}
```

---

# 2. Upload File

The frontend uses the generated upload URL to upload the file directly to external storage.

```text
Frontend
    │
    ▼
Signed Upload URL
    │
    ▼
External Storage
    │
    ▼
Object Stored
```

The client does **not** choose an arbitrary storage key.

The storage key was generated and recorded by the backend during initialization.

---

# 3. Confirm Upload

### Endpoint

```http
POST /api/attachments/:attachmentId/complete
```

### Request Body

```json
{}
```

No `storageKey` should be accepted from the client.

The backend already knows the correct storage key:

```text
attachmentId
      ↓
Backend loads attachment
      ↓
Reads stored storageKey
      ↓
Checks storage object
      ↓
Verifies object
      ↓
Updates status
```

---

# 🔐 Upload Completion Security

The client must never tell the backend:

```json
{
    "storageKey": "another-users-object"
}
```

The backend obtains:

```text
storageKey
```

only from the existing Attachment document.

This prevents users from attempting to confirm another storage object.

---

# 🔄 Upload Verification

When completing an upload:

```text
Attachment ID
      │
      ▼
Load Attachment
      │
      ▼
Verify uploader/access
      │
      ▼
Read stored storageKey
      │
      ▼
Check object exists
      │
      ▼
Verify file size
      │
      ▼
Verify MIME/signature where supported
      │
      ▼
Optional checksum verification
      │
      ▼
Mark Uploaded
```

Successful result:

```text
status = uploaded
```

---

# 📄 Confirm Upload Response

```json
{
    "success": true,
    "message": "Attachment uploaded successfully",
    "data": {
        "attachmentId": "68xxxxxxxx",
        "status": "uploaded"
    }
}
```

---

# 4. Get Attachment

### Endpoint

```http
GET /api/attachments/:attachmentId
```

For linked attachments, the backend first verifies:

```text
Attachment
   ↓
Message
   ↓
Conversation
   ↓
Membership
```

Response:

```json
{
    "success": true,
    "data": {
        "_id": "68xxxxxxxx",
        "fileName": "proposal.pdf",
        "mimeType": "application/pdf",
        "fileSize": 245760,
        "status": "linked"
    }
}
```

The API should not expose internal storage credentials or private storage configuration.

---

# 5. Get Message Attachments

### Endpoint

```http
GET /api/attachments/message/:messageId
```

Only attachments that are:

```text
linked
+
not deleted
+
associated with the specified message
```

should be returned.

Response:

```json
{
    "success": true,
    "data": [
        {
            "_id": "68attachment1",
            "fileName": "proposal.pdf",
            "mimeType": "application/pdf",
            "fileSize": 245760,
            "status": "linked"
        },
        {
            "_id": "68attachment2",
            "fileName": "design.png",
            "mimeType": "image/png",
            "fileSize": 1048576,
            "status": "linked"
        }
    ]
}
```

---

# 6. Generate Download URL

### Endpoint

```http
GET /api/attachments/:attachmentId/download
```

For private storage, generate a short-lived signed URL.

Response:

```json
{
    "success": true,
    "data": {
        "downloadUrl": "https://storage.example.com/temporary-url",
        "expiresAt": "2026-08-08T17:30:00Z"
    }
}
```

---

# 🔐 Download Flow

```text
Client
   │
   ▼
GET /attachments/:id/download
   │
   ▼
Authenticate
   │
   ▼
Find Attachment
   │
   ▼
Check Deleted State
   │
   ▼
Check Message
   │
   ▼
Check Conversation
   │
   ▼
Check Membership
   │
   ▼
Storage Service
   │
   ▼
Generate Signed URL
   │
   ▼
Return Temporary URL
```

---

# 7. Delete Attachment

### Endpoint

```http
DELETE /api/attachments/:attachmentId
```

Response:

```json
{
    "success": true,
    "message": "Attachment deleted successfully"
}
```

---

# 🗑️ Soft Delete

Recommended:

```text
isDeleted = true
status = deleted
```

instead of immediately deleting metadata.

The physical file can be removed asynchronously later.

---

# 🔄 Delete Flow

```text
Delete Request
      │
      ▼
Authenticate
      │
      ▼
Validate Permission
      │
      ▼
Atomically Validate State
      │
      ▼
Mark Attachment Deleted
      │
      ▼
Queue Physical File Deletion
      │
      ▼
Return Response
```

---

# 📌 Why Delete Storage Asynchronously?

Suppose:

```text
MongoDB update succeeds
```

but:

```text
Storage deletion fails
```

If the entire operation depends on both happening synchronously, error handling becomes complicated.

Instead:

```text
Database
   ↓
Mark Deleted
   ↓
Background Cleanup
   ↓
Delete Physical File
```

This can later be implemented with a job queue.

---

# 🔗 Linking Attachment to Message

After successful upload:

```text
Attachment
   │
   ▼
attachmentId
```

The Messages module can create a message referencing the attachment.

Example:

```json
{
    "content": "Here is the proposal.",
    "attachmentIds": [
        "68attachment1",
        "68attachment2"
    ]
}
```

---

# 🔐 Attachment-to-Message Authorization

A user must not be able to link an attachment belonging to another user or another conversation.

Before linking, the backend must verify:

```text
Attachment exists
        ↓
Same organization
        ↓
Same project
        ↓
Same workspace
        ↓
Same conversation
        ↓
Attachment is authorized for current user
        ↓
status = uploaded
        ↓
isDeleted = false
        ↓
Link to message
        ↓
status = linked
```

---

# 📌 Linking Rule

Only:

```text
status = uploaded
```

attachments can be linked.

After successful linking:

```text
status = linked
messageId = message._id
```

The operation must not allow:

```text
deleted → linked ❌
failed → linked ❌
pending → linked ❌
uploading → linked ❌
```

---

# 📊 Maximum Attachments Per Message

Multiple attachments are supported, but the number should be configurable.

Use:

```text
MAX_ATTACHMENTS_PER_MESSAGE
```

Example:

```text
Message
   ├── File 1
   ├── File 2
   ├── File 3
   └── File 4
```

Do not allow an uncontrolled number such as:

```text
Message
   └── 10,000 attachments
```

The Messages/Attachments integration must reject requests exceeding the configured limit.

---

# 📌 Message Schema Integration

There are two possible approaches.

## Option A — Attachment IDs Inside Message

```json
{
    "content": "Here is the file.",
    "attachments": [
        "68attachment1",
        "68attachment2"
    ]
}
```

This duplicates relationship information if `messageId` is also stored.

---

## Option B — Attachment Contains messageId

```json
{
    "messageId": "68message"
}
```

This allows:

```text
Message
   │
   ▼
Attachments
```

---

# 📌 Recommended Design

Use:

```text
Attachment
   │
   └── messageId
```

as the authoritative attachment-to-message relationship.

The frontend can retrieve:

```http
GET /api/attachments/message/:messageId
```

when necessary.

If the Messages module accepts `attachmentIds`, the backend should use those IDs only to establish the relationship and must validate every attachment before linking it.

---

# 🔐 Authorization

A user can access an attachment only when the required access rules are satisfied.

For linked attachments:

```text
Authenticated
      │
      ▼
Attachment Exists
      │
      ▼
Attachment Not Deleted
      │
      ▼
Message Exists
      │
      ▼
Conversation Exists
      │
      ▼
User Is Active Member
      │
      ▼
Allow Access
```

For unlinked attachments:

```text
Authenticated
      │
      ▼
Attachment Exists
      │
      ▼
Current User = uploadedBy
      │
      ▼
Allow according to upload lifecycle
```

Other users must not access unlinked attachments.

---

# 👤 `uploadedBy` Semantics

The field:

```text
uploadedBy
```

means:

> The authenticated user who initiated/uploaded the attachment.

It is an **audit field**.

It should not automatically mean:

```text
uploadedBy = owner
```

or:

```text
uploadedBy = only person allowed to delete
```

Authorization should instead be determined by:

```text
Conversation Membership
+
Application Roles
+
Permissions
+
Attachment State
```

For example, an administrator may be permitted to delete an attachment uploaded by another user.

---

# 🚫 Unauthorized Download

User A must not be able to access User B's attachment simply by guessing:

```text
attachmentId
```

Backend must validate the appropriate access relationship.

---

# 🔒 Storage Security

Do not expose permanent public storage paths when attachments are private.

Prefer:

```text
Private Storage
       ↓
Backend Authorization
       ↓
Generate Signed URL
       ↓
Temporary Access
```

Example:

```text
URL expires in 10 minutes
```

---

# 📌 Do Not Store Permanent Private URLs

For private attachments, avoid storing:

```text
url
```

as a permanent access URL.

Instead store:

```text
storageKey
storageProvider
```

and generate:

```text
downloadUrl
```

dynamically.

Architecture:

```text
MongoDB
   ↓
storageKey
   ↓
Storage Service
   ↓
Generate Signed URL
   ↓
Client
```

For thumbnails, optionally store:

```text
thumbnailStorageKey
```

and generate a temporary thumbnail URL when needed.

---

# 📁 Storage Provider Abstraction

Create a service interface rather than directly calling a storage SDK throughout controllers.

Example:

```text
StorageService
    │
    ├── generateUploadUrl()
    ├── generateDownloadUrl()
    ├── deleteFile()
    ├── fileExists()
    ├── getObjectMetadata()
    └── verifyObject()
```

Then:

```text
Attachment Service
        │
        ▼
Storage Service
        │
        ├── S3
        ├── Cloudinary
        ├── Azure
        └── Local
```

This makes the chat application reusable across different environments.

---

# 📏 File Size Limits

Set a configurable maximum.

Example development configuration:

```text
MAX_FILE_SIZE = 10 MB
```

Later different limits can be configured:

```text
Images → 10 MB
Documents → 25 MB
Videos → 100 MB
```

Do not hard-code limits inside controllers.

Use configuration:

```text
MAX_ATTACHMENT_SIZE
```

---

# 📎 Supported File Types

The exact list should be configurable.

Recommended initial categories:

## Images

```text
image/jpeg
image/png
image/webp
image/gif
```

## Documents

```text
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

## Spreadsheets

```text
application/vnd.ms-excel
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

## Text

```text
text/plain
text/csv
```

## Archives

Only if required:

```text
application/zip
```

---

# 🚫 File Type Validation

Never trust only the file extension.

For example:

```text
malicious.exe
```

should not become safe simply because it is renamed:

```text
document.pdf
```

The backend should validate:

```text
Extension
+
MIME type
+
File signature where appropriate
```

---

# 📛 Dangerous Filename Handling

The filename must never control the storage path.

Examples:

```text
../../../secret.txt

../../file.pdf

<script>.html
```

must be sanitized.

Recommended architecture:

```text
Original Filename
        ↓
Sanitize
        ↓
Validate Length
        ↓
Store as Display Filename
        ↓
Generate Internal Storage Object ID
```

Example:

```text
fileName:
project-proposal.pdf

storageKey:
organizations/org123/.../7f3a9c2e
```

---

# 🔐 File Integrity Verification

An optional integrity mechanism is:

```text
checksum
```

Recommended algorithm:

```text
SHA-256
```

Flow:

```text
Client
   ↓
Upload
   ↓
Storage
   ↓
Backend verifies object
   ↓
Verify size
   ↓
Verify MIME/signature
   ↓
Optional checksum
   ↓
uploaded
```

Example:

```json
{
    "checksum": "sha256:xxxxxxxx"
}
```

Checksum verification can initially remain optional and can be strengthened in later production hardening.

---

# 🔄 Upload Idempotency

The client may retry:

```http
POST /api/attachments/upload/init
```

without realizing the first request succeeded.

Without idempotency, this could create:

```text
Attachment A
Attachment B
Attachment C
```

for one logical upload.

Use an idempotency key:

```text
idempotencyKey
```

Flow:

```text
Client generates idempotencyKey
        │
        ▼
POST /upload/init
        │
        ▼
Backend checks key
        │
        ├── Existing upload
        │       ↓
        │   Return existing attachment
        │
        └── New upload
                ↓
           Create attachment
```

The idempotency key should be unique within the appropriate authenticated/tenant scope.

---

# 🧹 Abandoned Uploads

A user may initialize an upload but never finish it.

Example:

```text
Attachment
status = pending
messageId = null
```

After a configurable period:

```text
24 hours
```

a cleanup process can remove:

```text
Pending metadata
+
Temporary uploaded object
```

The exact retention period should be configurable.

---

# 🗑️ Message Deletion Behavior

When a message containing attachments is deleted:

```text
Message deleted
      ↓
Attachments remain temporarily
      ↓
Attachments become inaccessible
      ↓
Background cleanup removes physical files
```

Recommended behavior:

```text
Message.isDeleted = true
        ↓
Attachment remains for historical consistency
        ↓
Normal attachment access is denied
        ↓
Attachment cleanup job removes storage object
```

This keeps attachment behavior consistent with deleted-message handling in the messaging system.

---

# 🧠 Deleted Attachment Behavior

When:

```text
status = deleted
```

normal attachment APIs should not expose:

```text
downloadUrl
```

or allow the attachment to be linked to a new message.

Existing metadata can remain for audit/history until permanent cleanup.

---

# ⚡ Concurrency Rules

Attachment state transitions must be validated atomically.

Important race conditions include:

```text
Delete attachment
      +
Link attachment to message
```

and:

```text
Complete upload
      +
Delete attachment
```

The rule is:

> Attachment state transitions are validated atomically. A deleted attachment cannot subsequently be linked to a message, and an attachment can only transition to `linked` after successful upload confirmation.

Therefore:

```text
uploaded → linked ✅

deleted → linked ❌

deleted → uploaded ❌
```

Concurrent requests must not move the attachment into an invalid state.

---

# 🛡️ Optional Malware Scanning

Malware scanning can later be introduced between:

```text
uploaded
```

and:

```text
linked
```

Future state machine:

```text
pending
   ↓
uploading
   ↓
uploaded
   ↓
scanning
   ├── infected → rejected
   │
   └── safe
        ↓
       ready
        ↓
      linked
```

For the initial Phase 2 implementation, malware scanning can remain a future enhancement.

The state design should remain flexible enough to support it later.

---

# 📊 Recommended Future Status Model

Initial implementation:

```text
pending
uploading
uploaded
linked
failed
deleted
```

Future security scanning may introduce:

```text
scanning
rejected
ready
```

The status field should therefore be implemented as a controlled enum/state machine rather than arbitrary strings.

---

# 📊 Attachment Metadata

Recommended future metadata structure:

```json
{
    "width": 1920,
    "height": 1080,
    "duration": 45
}
```

Keep it flexible:

```text
metadata: Object
```

rather than creating many fields immediately.

---

# 🖼️ Image Attachments

For images, optionally generate:

```text
thumbnailStorageKey
```

Example:

```text
Original:
1920 × 1080

Thumbnail:
300 × 169
```

The thumbnail URL should be generated dynamically when needed.

This makes the chat UI faster.

---

# 🎥 Video Attachments

For videos, future metadata can include:

```text
duration
width
height
thumbnail
```

Example:

```json
{
    "duration": 45,
    "width": 1920,
    "height": 1080
}
```

Do not require these fields for the initial version.

---

# 🎵 Audio Attachments

Future metadata:

```text
duration
bitrate
format
```

Again, optional.

---

# ⚡ Performance

Do not load attachment data unnecessarily when retrieving messages.

Avoid:

```text
Message
   ↓
Populate every attachment
   ↓
Generate every download URL
```

for every request.

Instead return only required metadata.

Example:

```json
{
    "messageId": "68message",
    "content": "Here is the file.",
    "attachment": {
        "fileName": "proposal.pdf",
        "mimeType": "application/pdf",
        "fileSize": 245760
    }
}
```

Generate the download URL only when required.

---

# 📦 Attachment Limits

The module should support configurable limits for:

```text
Maximum file size
Maximum attachments per message
Maximum filename length
Maximum metadata size
Maximum upload session lifetime
```

Example configuration:

```text
MAX_ATTACHMENT_SIZE
MAX_ATTACHMENTS_PER_MESSAGE
MAX_FILENAME_LENGTH
UPLOAD_SESSION_EXPIRY
```

These should not be hard-coded inside controllers.

---

# 🔌 Future Socket.IO Integration

Attachments will eventually work with real-time messaging.

Flow:

```text
Upload File
    │
    ▼
Create Attachment
    │
    ▼
Create Message
    │
    ▼
Socket.IO
    │
    ▼
Conversation Room
    │
    ├── User A
    ├── User B
    └── User C
```

The socket event can contain:

```json
{
    "messageId": "68message",
    "messageType": "file",
    "attachments": [
        {
            "attachmentId": "68attachment",
            "fileName": "proposal.pdf",
            "mimeType": "application/pdf"
        }
    ]
}
```

The socket event should not contain private storage credentials.

---

# 🔔 Notifications

Attachment messages can eventually trigger the same notification system as normal messages.

Example:

```text
Akshaya sent a file
```

The notification system should not handle file storage itself.

---

# 📂 Recommended Folder Structure

```text
src/
│
├── models/
│   └── Attachment.js
│
├── controllers/
│   └── attachment.controller.js
│
├── services/
│   ├── attachment.service.js
│   └── storage.service.js
│
├── routes/
│   └── attachment.routes.js
│
├── validators/
│   └── attachment.validator.js
│
├── middleware/
│   ├── auth.middleware.js
│   └── conversationAccess.middleware.js
│
└── utils/
    └── fileValidation.js
```

---

# 🔄 Service Architecture

```text
Route
  │
  ▼
Authentication Middleware
  │
  ▼
Controller
  │
  ▼
Attachment Service
  │
  ├── Validate File
  ├── Validate Membership
  ├── Validate Idempotency
  ├── Create Metadata
  ├── Generate Upload URL
  ├── Verify Uploaded Object
  ├── Link Attachment
  └── Generate Download URL
          │
          ▼
     Storage Service
          │
          ▼
    External Storage
```

---

# 🧩 Module Responsibilities

## Messages Module

Responsible for:

```text
Message content
Sender
Message type
Message creation
Message deletion
Message ↔ Attachment linking workflow
```

---

## Attachments Module

Responsible for:

```text
File metadata
Upload initialization
Upload verification
Storage interaction
File validation
Attachment state
File access
Download URL generation
Attachment deletion
Storage cleanup
```

The Messages module should not contain storage implementation.

---

# 📌 Message Type

The Message module can support:

```text
text
image
file
audio
video
system
```

Example:

```json
{
    "messageType": "file"
}
```

For an image:

```json
{
    "messageType": "image"
}
```

The attachment remains responsible for file-specific information.

---

# 🌐 API Summary

| Method | Endpoint                                  | Purpose                         |
| ------ | ----------------------------------------- | ------------------------------- |
| POST   | `/api/attachments/upload/init`            | Initialize upload               |
| POST   | `/api/attachments/:attachmentId/complete` | Verify and complete upload      |
| GET    | `/api/attachments/:attachmentId`          | Get attachment metadata         |
| GET    | `/api/attachments/message/:messageId`     | Get message attachments         |
| GET    | `/api/attachments/:attachmentId/download` | Generate temporary download URL |
| DELETE | `/api/attachments/:attachmentId`          | Soft-delete attachment          |

---

# 🚨 Error Handling

## File Too Large

```json
{
    "success": false,
    "message": "File size exceeds the allowed limit"
}
```

Status:

```text
413
```

---

## Unsupported File Type

```json
{
    "success": false,
    "message": "File type is not supported"
}
```

Status:

```text
400
```

---

## Attachment Not Found

```json
{
    "success": false,
    "message": "Attachment not found"
}
```

Status:

```text
404
```

---

## Unauthorized Access

```json
{
    "success": false,
    "message": "You do not have access to this attachment"
}
```

Status:

```text
403
```

---

## Invalid Attachment State

```json
{
    "success": false,
    "message": "Attachment cannot be used in its current state"
}
```

Status:

```text
409
```

Examples:

```text
deleted → linked
failed → linked
linked → linked
```

---

## Upload Conflict

`409 Conflict` may be used for genuine state/idempotency conflicts such as:

```text
Attachment already completed
Conflicting upload session
Attachment already linked
Conflicting idempotency request
```

It should not be used simply because the client retries an idempotent request that can safely return the existing upload.

---

## Upload Failed

```json
{
    "success": false,
    "message": "File upload failed"
}
```

Status:

```text
500
```

---

# 📊 HTTP Status Codes

| Status | Usage                         |
| -----: | ----------------------------- |
|    200 | Successful operation          |
|    201 | Attachment metadata created   |
|    400 | Invalid request/file metadata |
|    401 | Authentication required       |
|    403 | Unauthorized access           |
|    404 | Attachment/message not found  |
|    409 | State/idempotency conflict    |
|    413 | File too large                |
|    500 | Server error                  |

---

# 🧪 Postman Testing Plan

## 1. Login

```http
POST /api/auth/login
```

Obtain JWT.

---

## 2. Initialize Upload

```http
POST /api/attachments/upload/init
```

```json
{
    "fileName": "proposal.pdf",
    "mimeType": "application/pdf",
    "fileSize": 245760,
    "conversationId": "68xxxxxxxx"
}
```

Verify:

```text
attachmentId
uploadUrl
storageKey
status = pending
```

---

## 3. Test Idempotent Initialization

Send the same request with the same:

```text
idempotencyKey
```

Verify:

```text
No duplicate attachment is created.
```

---

## 4. Upload File

Use the generated upload URL.

Verify the file exists in storage.

---

## 5. Complete Upload

```http
POST /api/attachments/:attachmentId/complete
```

Request body:

```json
{}
```

Verify:

```text
status = uploaded
```

---

## 6. Attempt Malicious Storage Key

Do not provide a storage key in the completion request.

Verify the backend always uses:

```text
attachment.storageKey
```

rather than a client-provided storage key.

---

## 7. Get Attachment

```http
GET /api/attachments/:attachmentId
```

Verify metadata.

---

## 8. Create Message

Create a message referencing the uploaded attachment.

The backend must verify:

```text
Same organization
Same project
Same workspace
Same conversation
Authorized user
status = uploaded
isDeleted = false
```

After successful linking:

```text
status = linked
messageId = message._id
```

---

## 9. Get Message Attachments

```http
GET /api/attachments/message/:messageId
```

Expected:

```text
proposal.pdf
```

---

## 10. Generate Download URL

```http
GET /api/attachments/:attachmentId/download
```

Verify:

```text
Temporary signed URL
Expiration time
```

---

## 11. Unauthorized Download

Login as a non-member.

Attempt to download the attachment.

Expected:

```text
403 Forbidden
```

---

## 12. Unlinked Attachment Security

Create:

```text
messageId = null
status = uploaded
```

Login as another user.

Attempt to retrieve/download the attachment.

Expected:

```text
403 Forbidden
```

or equivalent access denial.

---

## 13. Unsupported File

Attempt to upload:

```text
.exe
```

Expected:

```text
400 Bad Request
```

---

## 14. Oversized File

Upload a file larger than the configured limit.

Expected:

```text
413 Payload Too Large
```

---

## 15. Maximum Attachments Per Message

Attempt to link more than:

```text
MAX_ATTACHMENTS_PER_MESSAGE
```

Expected:

```text
400 Bad Request
```

or configured validation response.

---

## 16. Delete Attachment

```http
DELETE /api/attachments/:attachmentId
```

Verify:

```text
isDeleted = true
status = deleted
```

---

## 17. Access Deleted Attachment

Attempt to download a deleted attachment.

Expected:

```text
404
```

or:

```text
403
```

depending on the application's access policy.

---

## 18. Link Deleted Attachment

Attempt to link:

```text
status = deleted
```

attachment to a message.

Expected:

```text
409 Conflict
```

---

## 19. Abandoned Upload

Initialize an upload but don't complete it.

Verify:

```text
status = pending
messageId = null
```

The future cleanup job should remove abandoned uploads.

---

## 20. Message Deletion

Create a message containing an attachment.

Delete the message.

Verify:

```text
Attachment becomes inaccessible
```

while metadata can remain temporarily for cleanup/audit purposes.

---

## 21. Concurrent Completion/Delete

Attempt:

```text
Complete Upload
+
Delete Attachment
```

concurrently.

Verify:

```text
No invalid state
Deleted attachment cannot become linked/uploaded again
```

---

# 🔐 Security Checklist

Before marking this module complete:

* [ ] Authentication middleware is applied.
* [ ] Conversation membership is verified.
* [ ] Organization isolation is enforced.
* [ ] Project isolation is enforced.
* [ ] Workspace isolation is enforced.
* [ ] Uploading user is recorded.
* [ ] `uploadedBy` is treated as audit information.
* [ ] Authorization is based on membership/permissions rather than only uploader identity.
* [ ] File size is validated.
* [ ] MIME type is validated.
* [ ] File extension is validated.
* [ ] File signature is validated where appropriate.
* [ ] Dangerous file types are blocked.
* [ ] Filenames are sanitized.
* [ ] Original filenames are never used directly as storage paths.
* [ ] Storage keys use internal unique identifiers.
* [ ] Storage keys include tenant context.
* [ ] Client cannot provide an arbitrary storage key during completion.
* [ ] Private files are not publicly accessible.
* [ ] Download URLs are temporary where appropriate.
* [ ] Unlinked attachments are protected.
* [ ] Attachment-to-message linking is authorized.
* [ ] Same organization/project/workspace/conversation is enforced.
* [ ] Deleted attachments cannot be linked.
* [ ] Deleted attachments cannot be downloaded.
* [ ] Upload status is tracked.
* [ ] Attachment state transitions are validated atomically.
* [ ] Duplicate upload initialization is handled with idempotency.
* [ ] Maximum attachment size is configurable.
* [ ] Maximum attachments per message is configurable.
* [ ] Checksum support is available for future integrity verification.
* [ ] Abandoned uploads can be cleaned up.
* [ ] Message deletion behavior is defined.
* [ ] Storage provider is abstracted.
* [ ] Database indexes are created.
* [ ] File metadata is not stored as binary data in MongoDB.
* [ ] Future malware scanning can be integrated into the state machine.

---

# 📈 Database Indexes

Recommended indexes:

## Message Attachments

```js
attachmentSchema.index({
    messageId: 1,
    isDeleted: 1
});
```

Useful for:

```text
Get attachments for a message
```

---

## Conversation Attachments

```js
attachmentSchema.index({
    conversationId: 1,
    createdAt: -1
});
```

Useful for:

```text
Conversation-level attachment queries
```

---

## Uploaded By

```js
attachmentSchema.index({
    uploadedBy: 1,
    status: 1,
    createdAt: -1
});
```

Useful for:

```text
Find user's active/unlinked uploads
Cleanup
Auditing
```

---

## Idempotency

If idempotency keys are stored:

```js
attachmentSchema.index({
    uploadedBy: 1,
    idempotencyKey: 1
});
```

with an appropriate uniqueness strategy.

---

# 🚀 Future Enhancements

The module can later support:

## Image Preview

```text
📷 image.png
```

---

## PDF Preview

```text
📄 proposal.pdf
```

---

## Video Preview

```text
🎥 demo.mp4
```

---

## Audio Player

```text
🎵 voice-message.mp3
```

---

## Drag & Drop

```text
Drag files here
       ↓
Upload
```

---

## Multiple Uploads

```text
Upload 5 files
```

---

## Upload Progress

```text
proposal.pdf
████████████░░ 80%
```

---

## Resumable Uploads

For large files:

```text
Upload
   ↓
Interrupted
   ↓
Resume
```

---

## Virus/Malware Scanning

Production systems can integrate:

```text
Upload
   ↓
Security Scan
   ↓
Safe
   ↓
Available in Chat
```

Future state:

```text
uploaded
   ↓
scanning
   ├── infected → rejected
   └── safe → ready
```

---

## File Preview Generation

```text
Image
  ↓
Thumbnail

Video
  ↓
Preview frame

PDF
  ↓
First-page preview
```

---

## File Integrity

Future implementations can support:

```text
SHA-256 checksum
```

for stronger upload verification.

---

# 📈 Phase 2 Progress

After completing this module:

```text
Phase 2 — Messaging Features

├── Message Reactions      ✅
├── Read Receipts          ✅
├── Attachments            🟡 Current
└── Message Search         ⏳
```

---

# 📊 Overall Project Progress

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
Attachments            🟡
Message Search         ⏳
```

---

# 📌 Summary

The **Attachments module** provides a secure and scalable way to send files through the reusable Chat Platform.

The most important architectural decision is:

```text
MongoDB
   │
   └── Stores attachment metadata

External Storage
   │
   └── Stores actual file
```

The core relationship is:

```text
Message
   │
   │ 1
   │
   │ N
   ▼
Attachment
   │
   ▼
External Storage
```

The upload architecture is:

```text
Frontend
    │
    ▼
Initialize Upload
    │
    ▼
Backend
    │
    ├── Validate User
    ├── Validate Conversation
    ├── Validate File
    ├── Create Attachment
    └── Generate Upload URL
    │
    ▼
External Storage
    │
    ▼
Complete Upload
    │
    ▼
Backend Verifies Object
    │
    ▼
Attachment → Uploaded
    │
    ▼
Create Message
    │
    ▼
Validate Attachment
    │
    ▼
Attachment → Linked
```

The attachment lifecycle is:

```text
Pending
   ↓
Uploading
   ↓
Uploaded
   ↓
Linked
   ↓
Deleted
```

with failure handling:

```text
Pending / Uploading
        ↓
      Failed
```

The module also provides:

* Secure external file storage
* Tenant-aware storage keys
* Direct-to-storage uploads
* Signed download URLs
* Upload verification
* File validation
* Filename sanitization
* Upload idempotency
* Configurable file limits
* Configurable attachment-per-message limits
* Unlinked attachment protection
* Attachment-to-message authorization
* Asynchronous storage cleanup
* Deleted attachment handling
* Future integration with malware scanning, Socket.IO, and notifications.

After this module is implemented and tested, the next Phase 2 module should be:

```text
Attachments
       ↓
Message Search ← NEXT
```

This completes the documentation for the Attachments Module.

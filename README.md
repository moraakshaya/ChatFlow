# ChatFlow

ChatFlow is a multi-tenant chat platform designed to be embedded into CRM, HRM, ERP, and other business applications. It provides real-time messaging, notification, and organization management.

## 🏢 Multi-Tenancy Architecture

The platform uses an organization-based data isolation model. Every piece of data (workspaces, projects, conversations, messages, users) belongs strictly to an `Organization`.

### Example: Prodbiz Solutions

When a new business signs up to use ChatFlow (e.g., **Prodbiz Solutions**), the platform completely isolates their environment from other businesses.

1. **Registration:** The Prodbiz admin visits the ChatFlow registration page and enters their Name, Email, Password, and Organization Name (`Prodbiz Solutions`).
2. **Backend Creation:** The backend dynamically generates a unique `Organization` document for Prodbiz Solutions.
3. **User Creation:** The backend then creates the admin `User`, assigning them the role of `owner` and linking them directly to the `Organization`.
4. **Authentication:** The backend returns an `accessToken` and `refreshToken` alongside the `User` and `Organization` records, automatically logging them in.
5. **Dashboard Isolation:** Because the JWT tokens contain the `organizationId`, the Prodbiz admin is routed to their isolated dashboard, completely unable to see or interact with data from other tenants (e.g., `ABC Technologies`).

```text
ChatFlow
│
├── Prodbiz Solutions
│     ├── Akshaya (Owner)
│     ├── Rahul (Member)
│     └── Priya (Member)
│
├── ABC Technologies
│     ├── John (Owner)
│     └── David (Member)
```

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, MongoDB, Mongoose, Socket.io
- **Security:** bcrypt, JSON Web Tokens (JWT)

## 📖 Documentation

For detailed architectural and API documentation, please refer to the `docs/` folder:
- [Organization Module](docs/01_organization_module.md)
- [User Authentication Module](docs/03_user_authentication_module.md)
- [Database Design](docs/00_database_design.md)

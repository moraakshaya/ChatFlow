# 🟥 Redis Module

## 📋 Module Information

| Property | Value |
|---|---|
| Module | Redis |
| Version | v1.0 |
| Status | 🟡 In Development |
| Phase | Phase 5 — Security & Production |
| Previous Module | Logging |
| Next Phase | Phase 6 — Integration Platform |
| Depends On | Authentication, Rate Limiting, Error Handling, Logging, Socket.IO |
| Database | MongoDB + Redis |
| Backend | Node.js + Express + Socket.IO |

---

# 📌 Overview

The **Redis module** introduces an in-memory data store designed for low-latency access to the chat platform.

As the platform moves toward production, relying solely on MongoDB for all state operations (such as rate-limiting counters or tracking user presence) becomes inefficient. Additionally, relying on in-memory Node.js state prevents horizontal scaling of Socket.IO servers.

Redis provides the shared infrastructure needed for this architecture.

The core goals are to offload high-frequency, temporary state from MongoDB and to prepare the Socket.IO real-time layer for multi-server deployments.

---

# 🎯 Objectives

The module should:

* Introduce a stable Redis connection layer
* Provide shared infrastructure for distributed rate limiting
* Manage temporary real-time state efficiently (e.g., presence, typing)
* Prepare the platform for cross-server Socket.IO event propagation
* Ensure resilient fallback behaviors when Redis is unavailable
* Offload high-frequency updates from the primary database

---

# 🗃️ Data Strategy: MongoDB vs Redis

The platform distinguishes between persistent data (MongoDB) and transient, high-speed data (Redis).

| Data | MongoDB | Redis |
|---|---:|---:|
| Users | ✅ | ❌ |
| Organizations | ✅ | ❌ |
| Conversations | ✅ | Optional cache |
| Messages | ✅ | ❌ |
| Notifications | ✅ | Optional counter |
| Rate-limit counters | ❌ | ✅ |
| Presence | ❌ | ✅ |
| Typing state | ❌ | ✅ |
| Temporary state | ❌ | ✅ |
| Cache | ❌ | ✅ |

---

# 🏗️ Implementation Hierarchy

To keep the scope manageable and focused on infrastructure and distributed state, the implementation is prioritized into three tiers:

## Required
├── Redis connection
├── Rate limiting
├── TTL (Time-to-Live) management
├── Failure handling
└── Logging integration

## Recommended
├── Presence state management
└── Typing state management

## Optional
└── Application caching

This hierarchy ensures that the core distributed state features are prioritized over less critical application caching, which can be introduced later if performance requires it.

---

# 📡 Socket.IO and Redis

While Redis provides the shared state, it does not automatically make Socket.IO scalable on its own. Scaling Socket.IO across multiple servers requires propagating real-time events between nodes.

This is achieved using the **Socket.IO Redis Adapter**:

```text
                 Redis
                   │
          Socket.IO Redis Adapter
              /         \
             ▼           ▼
        Socket A     Socket B
             │           │
             └─────┬─────┘
                   ▼
             Shared events
```

This ensures that if User A is connected to Socket Server A and User B is connected to Socket Server B, a message sent by User A is reliably propagated to Socket Server B via Redis and delivered to User B.

While multi-server Socket.IO might not be immediately deployed for the initial portfolio environment, configuring the Redis adapter ensures the platform is structurally ready for scaling.

---

# 🟢 Presence & Multiple Connections

A simplistic approach to user presence is setting a boolean flag when a user connects and unsetting it when they disconnect:

```text
presence:user123
    ↓
online
```

However, with multiple Socket.IO connections—such as a user accessing the platform from a browser, a mobile device, and a second browser tab simultaneously—simply setting `offline` when *one* socket disconnects would incorrectly mark the user as offline everywhere.

A more scalable and accurate concept involves tracking the active connection count:

```text
user:presence:user123
        ↓
connection count / active connections
        ↓
online while count > 0
```

Alternatively, connection-specific keys with TTLs can be used to track individual device sessions, automatically expiring if a connection drops ungracefully.

---

# 🚦 Redis Failure Behavior

Redis is a critical infrastructure component, but network disruptions or service restarts can occur. The system must explicitly define its failure behavior, especially concerning security controls like rate limiting.

For rate limiting, the fallback strategy determines what happens to incoming requests if the distributed rate limiter (Redis) is unreachable:

```text
Rate limiting:
Redis available → distributed limiter
Redis unavailable → controlled fallback / fail-safe policy
```

Implementation options include:
1. **Fallback to local in-memory limiter**: Provide temporary rate-limiting protection, though it is scoped to the individual server.
2. **Fail closed**: Reject protected requests, prioritizing security over availability during infrastructure degraded states.

The exact implementation will depend on the configured rate-limit middleware, but the system must deliberately choose and log its fallback behavior.

---

# 🧠 Performance and Persistence

Redis is an in-memory data store designed for low-latency access.

Because Redis stores data in RAM, read and write operations are executed with minimal latency compared to traditional disk-based databases. However, this comes with two important constraints:
1. Data loss is possible upon restart unless explicitly configured for persistence.
2. Memory is limited compared to disk space.

Always configure TTL (Time-to-Live) values on Redis keys (like rate limit IPs, session tokens, or caching items) to ensure stale data is automatically evicted and memory is preserved.

---

# 🏗️ Final Phase 5 Architecture

Integrating Redis solidifies the final architecture for Phase 5. The backend pipeline is now secure, observable, and prepared for horizontal scaling.

## REST Pipeline Architecture

```text
                    Client
                      │
                      ▼
                 Request ID
                      │
                      ▼
                Rate Limiting
                      │
                ┌─────┴─────┐
                ▼           ▼
              Redis       Request
                            │
                            ▼
                     Input Validation
                            │
                            ▼
                     Authentication
                            │
                            ▼
                     Authorization
                            │
                            ▼
                       Controller
                            │
                            ▼
                         Service
                       /       \
                      ▼         ▼
                  MongoDB      Redis
                      │         │
                      └────┬────┘
                           ▼
                         Logger
                           │
                           ▼
                    Safe Response
```

## Socket.IO Real-Time Architecture

```text
                 Client
                   │
                   ▼
              Socket.IO
                   │
          ┌────────┴────────┐
          ▼                 ▼
      Socket Server A   Socket Server B
          │                 │
          └────────┬────────┘
                   ▼
                 Redis
                   │
                   ▼
          Shared real-time state
```

---

# 🔐 Implementation Checklist

Before marking this module complete:

* [ ] Redis client integrated (e.g., `ioredis` or `redis` package)
* [ ] Connection management and retry logic established
* [ ] Redis failure and fallback policies explicitly configured
* [ ] Rate Limiting module migrated to use Redis distributed store
* [ ] Connection count logic implemented for user presence (Recommended)
* [ ] Socket.IO Redis Adapter configured (Recommended)
* [ ] Proper TTL configured for all volatile keys
* [ ] Redis events integrated with the Central Logger

---

# 📊 Phase 5 Progress

```text
Phase 5 — Security & Production

├── Rate Limiting                    ✅
├── Input Validation & Sanitization  ✅
├── Authorization                    ✅
├── Error Handling                   ✅
├── Logging                          ✅
└── Redis                            🟡 Current
```

---

# 🎯 Module Completion Criteria

The Redis module will be considered complete when:

```text
Redis Infrastructure
│
├── Redis Connection                 ⬜
├── Fallback Policies Defined        ⬜
├── Distributed Rate Limiting        ⬜
├── Socket.IO Redis Adapter          ⬜
├── Presence Connection Counting     ⬜
├── TTL Enforcement                  ⬜
└── Logging Integration              ⬜
```

---

# 🏁 Summary

The **Redis module** elevates the platform from a single-node application to a scalable, distributed backend. By offloading high-frequency state updates and implementing a distributed rate limiting strategy, MongoDB is protected from unnecessary load, and the Socket.IO layer is ready for horizontal scaling.

After completing this module, **Phase 5 (Security & Production)** is complete. The next steps transition into **Phase 6 — Integration Platform**, where the chat application is extended with webhooks, external integrations, and robust search capabilities.

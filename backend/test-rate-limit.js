import { validateSocketRateLimit } from "./src/socket/middleware/rateLimit.socket.js";
import { authRateLimiter } from "./src/middleware/rateLimit.middleware.js";

const runTests = async () => {
    console.log("✅ Starting Rate Limiting Tests\n");

    // --- 1. Test REST Auth Rate Limiter (Max 10 requests) ---
    console.log("Testing REST Auth Rate Limiter (Max 10)...");
    
    let isRateLimited = false;
    let lastResponse = null;

    for (let i = 1; i <= 12; i++) {
        const mockReq = {
            ip: "192.168.1.100",
            body: { email: "test@example.com" }
        };

        const mockRes = {
            statusCode: 200,
            headers: {},
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                lastResponse = data;
                if (this.statusCode === 429) {
                    isRateLimited = true;
                }
            },
            getHeader: function(name) { return this.headers[name]; },
            setHeader: function(name, value) { this.headers[name] = value; },
            end: function() {} // express-rate-limit might call end directly
        };

        const mockNext = () => {};

        await new Promise(resolve => {
            // express-rate-limit's callback might not fire properly in a tight loop with mock res
            // but we can try to run it.
            const originalEnd = mockRes.end;
            const originalJson = mockRes.json;

            mockRes.end = function(data) {
                originalEnd.call(this, data);
                resolve();
            };

            mockRes.json = function(data) {
                originalJson.call(this, data);
                resolve();
            };

            authRateLimiter(mockReq, mockRes, () => {
                resolve();
            });
        });
        
        if (isRateLimited) {
            console.log(`   Blocked on request ${i}`);
            break;
        }
    }

    if (isRateLimited && lastResponse?.message.includes("Too many")) {
        console.log("✅ REST Auth Rate Limiter successfully blocked excessive traffic.");
    } else {
        console.error("❌ REST Auth Rate Limiter failed to block traffic.");
        process.exit(1);
    }

    // --- 2. Test Socket.IO Rate Limiter (Max 30 for CONVERSATION_JOIN) ---
    console.log("\nTesting Socket.IO Rate Limiter (CONVERSATION_JOIN Max 30)...");

    let socketEmitCalled = false;
    let socketEmitData = null;

    const mockSocket = {
        user: { _id: "user123" },
        emit: (event, data) => {
            socketEmitCalled = true;
            socketEmitData = data;
        }
    };

    let blockedAt = -1;
    // Simulate 35 requests
    for (let i = 1; i <= 35; i++) {
        const allowed = validateSocketRateLimit(mockSocket, "CONVERSATION_JOIN");
        if (!allowed && blockedAt === -1) {
            blockedAt = i;
        }
    }

    if (blockedAt === 31 && socketEmitCalled && socketEmitData?.code === "RATE_LIMIT_EXCEEDED") {
        console.log("✅ Socket.IO Rate Limiter successfully blocked request 31.");
    } else {
        console.error("❌ Socket.IO Rate Limiter failed to block correctly. Blocked at:", blockedAt);
        process.exit(1);
    }

    console.log("\n🎉 All rate limiting tests passed!");
    process.exit(0);
};

runTests();

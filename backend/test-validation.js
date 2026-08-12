import { createMessageValidator } from "./src/validators/message.validator.js";
import { validate } from "./src/middleware/validate.js";
import { validateSocketPayload } from "./src/socket/middleware/validate.socket.js";
import mongoose from "mongoose";

const runTest = async () => {
    console.log("✅ Starting Validation Tests\n");

    // --- 1. REST Validation Test ---
    console.log("Testing REST Validation (Message Schema)...");
    
    // Construct the middleware chain
    const middlewareChain = validate(createMessageValidator);

    const mockReq = {
        body: {
            // Missing conversationId
            content: "   ", // Whitespace only (should fail notEmpty)
            replyTo: "invalid-object-id" // Invalid mongo id
        }
    };

    let responseStatus = 200;
    let responseJson = null;

    const mockRes = {
        status: (code) => {
            responseStatus = code;
            return mockRes;
        },
        json: (data) => {
            responseJson = data;
        }
    };

    const mockNext = () => {
        console.error("❌ Validation passed incorrectly!");
    };

    // Run the validation chain manually
    for (const middleware of middlewareChain) {
        await new Promise(resolve => {
            const next = () => resolve();
            
            mockRes.json = (data) => {
                responseJson = data;
                resolve(); // Resolve here to prevent hanging if next() is not called
            };

            middleware(mockReq, mockRes, next);
        });
        if (responseJson) break; // If a response was sent (400), stop chain
    }

    if (responseStatus === 400 && responseJson && responseJson.success === false) {
        console.log("✅ REST Validation properly rejected invalid payload.");
        console.log("   Received errors:", responseJson.errors.map(e => e.message).join(", "));
    } else {
        console.error("❌ REST Validation did not reject the payload properly.");
        process.exit(1);
    }

    // --- 2. Socket.IO Payload Validation Test ---
    console.log("\nTesting Socket.IO Payload Validation...");

    let socketEmitCalled = false;
    let socketEmitEvent = "";
    let socketEmitData = null;

    const mockSocket = {
        emit: (event, data) => {
            socketEmitCalled = true;
            socketEmitEvent = event;
            socketEmitData = data;
        }
    };

    const invalidSocketPayload = {
        conversationId: 12345, // Number instead of string ObjectId
        content: true // Boolean instead of string
    };

    const socketRules = {
        conversationId: { required: true, type: "objectId" },
        content: { required: true, type: "string" }
    };

    const isValid = validateSocketPayload(mockSocket, invalidSocketPayload, socketRules);

    if (!isValid && socketEmitCalled && socketEmitEvent === "message:error") {
        console.log("✅ Socket.IO Validation properly rejected invalid payload.");
        console.log("   Received socket errors:", socketEmitData.errors.map(e => e.message).join(", "));
    } else {
        console.error("❌ Socket.IO Validation did not reject the payload properly.");
        process.exit(1);
    }

    console.log("\n🎉 All validation tests passed!");
    process.exit(0);
};

runTest();

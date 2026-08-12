import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const API_URL = "http://localhost:5000/api";
let jwtToken1 = "";
let jwtToken2 = "";
let user1Id = "";
let user2Id = "";

let testWorkspaceId = "";
let testConversationId = "";
let testMessageId = "";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runTests() {
    console.log("=== Authorization Hardening Tests ===");

    await mongoose.connect(process.env.MONGO_URI);
    
    // Get two distinct users
    const users = await mongoose.connection.db.collection("users").find({}).limit(2).toArray();
    
    if (users.length < 2) {
        console.log("Not enough users to test.");
        process.exit(0);
    }
    
    user1Id = users[0]._id.toString();
    user2Id = users[1]._id.toString();
    
    jwtToken1 = jwt.sign({ id: user1Id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    jwtToken2 = jwt.sign({ id: user2Id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    console.log(`User 1 logged in: ${user1Id}`);
    console.log(`User 2 logged in: ${user2Id}`);

    // 2. Fetch a workspace and create a private conversation for user 1
    const workspaces = await fetch(`${API_URL}/workspaces`, {
        headers: { "Authorization": `Bearer ${jwtToken1}` }
    }).then(r => r.json());

    if (workspaces.data && workspaces.data.length > 0) {
        testWorkspaceId = workspaces.data[0]._id;
    } else {
        console.error("No workspaces found for user 1. Run initialization script first.");
        return;
    }

    // Create conversation for user 1
    const createConvRes = await fetch(`${API_URL}/conversations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken1}`
        },
        body: JSON.stringify({
            workspaceId: testWorkspaceId,
            projectId: workspaces.data[0].projectId,
            type: "private",
            directKey: `private-${Date.now()}`
        })
    }).then(r => r.json());

    if (createConvRes.success) {
        testConversationId = createConvRes.data._id;
        console.log(`Created private conversation: ${testConversationId}`);
    } else {
        console.error("Failed to create conversation:", createConvRes);
        return;
    }

    // 3. Test: User 2 tries to access User 1's private conversation (should fail)
    console.log("\nTesting: Unauthorized conversation access...");
    const getConvRes = await fetch(`${API_URL}/conversations/${testConversationId}`, {
        headers: { "Authorization": `Bearer ${jwtToken2}` }
    });
    
    if (getConvRes.status === 403) {
        console.log("✅ SUCCESS: User 2 correctly blocked from accessing User 1's conversation.");
    } else {
        console.error(`❌ FAILURE: Expected 403, got ${getConvRes.status}`);
    }

    // 4. User 1 sends a message in the conversation
    const sendMsgRes = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken1}`
        },
        body: JSON.stringify({
            conversationId: testConversationId,
            clientMessageId: `msg-${Date.now()}`,
            type: "text",
            content: "Hello from User 1!"
        })
    }).then(r => r.json());

    if (sendMsgRes.success) {
        testMessageId = sendMsgRes.data._id;
        console.log(`User 1 sent message: ${testMessageId}`);
    } else {
        console.error("Failed to send message:", sendMsgRes);
    }

    // 5. Test: User 2 tries to edit User 1's message (should fail)
    console.log("\nTesting: Unauthorized message edit...");
    const editMsgRes = await fetch(`${API_URL}/messages/${testMessageId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken2}`
        },
        body: JSON.stringify({ content: "Hacked!" })
    });

    if (editMsgRes.status === 403) {
        console.log("✅ SUCCESS: User 2 correctly blocked from editing User 1's message.");
    } else {
        console.error(`❌ FAILURE: Expected 403, got ${editMsgRes.status}`);
    }

    // 6. Test: User 1 edits own message (should succeed)
    console.log("\nTesting: Authorized message edit...");
    const editOwnMsgRes = await fetch(`${API_URL}/messages/${testMessageId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken1}`
        },
        body: JSON.stringify({ content: "Edited by User 1" })
    });

    if (editOwnMsgRes.status === 200) {
        console.log("✅ SUCCESS: User 1 correctly edited own message.");
    } else {
        console.error(`❌ FAILURE: Expected 200, got ${editOwnMsgRes.status}`);
    }
}

runTests().catch(console.error);

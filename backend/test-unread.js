import { io } from "socket.io-client";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const MOCK_USER_B = "000000000000000000000002"; // User B
const tokenB = jwt.sign({ id: MOCK_USER_B }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

console.log("Connecting Socket B...");
const socketB = io("http://localhost:5000", { auth: { token: tokenB } });

socketB.on("connect", () => {
    console.log("Socket B connected!");
    
    socketB.on("unread:update", (data) => {
        console.log("✅ Socket B received unread:update!", data);
        
        setTimeout(() => {
            socketB.disconnect();
            process.exit(0);
        }, 1000);
    });

    // Make an HTTP request to trigger an unread update calculation & socket emit
    setTimeout(() => {
        console.log("Triggering unread update via REST API...");
        fetch("http://localhost:5000/api/test/unread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                conversationId: "605c72a4e4d5c95c80a5e8f1", // Valid ObjectId
                userId: MOCK_USER_B
            })
        }).then(res => res.json()).then(data => console.log("Test route response:", data));
    }, 1000);
});

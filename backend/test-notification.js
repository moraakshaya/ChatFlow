import { io } from "socket.io-client";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const MOCK_USER_B = "000000000000000000000002"; // User B will receive the notification
const tokenB = jwt.sign({ id: MOCK_USER_B }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

console.log("Connecting Socket B...");
const socketB = io("http://localhost:5000", { auth: { token: tokenB } });

socketB.on("connect", () => {
    console.log("Socket B connected!");
    
    socketB.on("notification:new", (data) => {
        console.log("✅ Socket B received notification:new!", data);
        
        setTimeout(() => {
            socketB.disconnect();
            process.exit(0);
        }, 1000);
    });

    // Make an HTTP request to trigger a notification
    setTimeout(() => {
        console.log("Triggering notification via REST API...");
        fetch("http://localhost:5000/api/test/notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: MOCK_USER_B,
                type: "MESSAGE",
                title: "Test Message",
                message: "This is a test notification",
                actor: "000000000000000000000001"
            })
        }).then(res => res.json()).then(data => console.log("Test route response:", data));
    }, 1000);
});

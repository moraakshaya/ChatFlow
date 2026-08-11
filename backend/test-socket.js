import { io } from "socket.io-client";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const conversationId = "68conversation123";

const MOCK_USER_A = "000000000000000000000001";
const tokenA = jwt.sign({ id: MOCK_USER_A }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

const MOCK_USER_B = "000000000000000000000002";
const tokenB = jwt.sign({ id: MOCK_USER_B }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

console.log("Connecting Socket A...");
const socketA = io("http://localhost:5000", { auth: { token: tokenA } });

console.log("Connecting Socket B...");
const socketB = io("http://localhost:5000", { auth: { token: tokenB } });

socketB.on("connect", () => {
    socketB.emit("join_conversation", { conversationId });
    socketB.on("message:read", (data) => {
        console.log("✅ Socket B received message:read event!", data);
    });
});

socketA.on("connect", () => {
    socketA.emit("join_conversation", { conversationId });

    setTimeout(() => {
        console.log("Socket A emitting read:message (First read)...");
        socketA.emit("read:message", { conversationId, messageId: "new_read_msg" }, (response) => {
            console.log("Socket A received ack (First read):", response);
            
            setTimeout(() => {
                console.log("Socket A emitting read:message (Repeated read)...");
                socketA.emit("read:message", { conversationId, messageId: "already_read_msg" }, (response2) => {
                    console.log("Socket A received ack (Repeated read):", response2);
                    
                    setTimeout(() => {
                        socketA.disconnect();
                        socketB.disconnect();
                        process.exit(0);
                    }, 1000);
                });
            }, 1000);
        });
    }, 1000);
});

socketA.on("message:read", (data) => {
    console.error("❌ Socket A received message:read event incorrectly!", data);
});

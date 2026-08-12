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
    socketB.on("reaction:added", (data) => {
        console.log("✅ Socket B received reaction:added!", data);
    });
    socketB.on("reaction:removed", (data) => {
        console.log("✅ Socket B received reaction:removed!", data);
    });
});

socketA.on("connect", () => {
    socketA.emit("join_conversation", { conversationId });

    setTimeout(() => {
        console.log("Socket A emitting reaction:add...");
        socketA.emit("reaction:add", { conversationId, messageId: "message123", reaction: "❤️" }, (response) => {
            console.log("Socket A received add ack:", response);
            
            setTimeout(() => {
                console.log("Socket A emitting reaction:remove...");
                socketA.emit("reaction:remove", { conversationId, messageId: "message123", reaction: "❤️" }, (response2) => {
                    console.log("Socket A received remove ack:", response2);
                    
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

socketA.on("reaction:added", () => { console.error("❌ Socket A received added event incorrectly!"); });
socketA.on("reaction:removed", () => { console.error("❌ Socket A received removed event incorrectly!"); });

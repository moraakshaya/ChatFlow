import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    
    // Find a message
    const message = await db.collection("messages").findOne({});
    if (!message) {
        console.log("NO_MESSAGES");
        process.exit(0);
    }
    
    // Find a user who is a member of the conversation but NOT the sender
    const memberships = await db.collection("conversationmembers").find({
        conversationId: message.conversationId,
        userId: { $ne: message.senderId }
    }).toArray();
    
    if (memberships.length === 0) {
        console.log("NO_VALID_USER");
        process.exit(0);
    }
    
    const readerId = memberships[0].userId;
    
    const token = jwt.sign({ id: readerId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    
    console.log(JSON.stringify({
        messageId: message._id,
        conversationId: message.conversationId,
        token
    }));
    
    process.exit(0);
};

run();

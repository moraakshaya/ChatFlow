import mongoose from "mongoose";
import dns from "node:dns";

// Fix for Node.js DNS resolution of MongoDB SRV records on some networks
dns.setServers(['8.8.8.8']);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error.message);
        process.exit(1);
    }
};

export default connectDB;
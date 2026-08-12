import mongoose from "mongoose";
import logger from "../utils/logger.js";
import dns from "node:dns";

// Fix for Node.js DNS resolution of MongoDB SRV records on some networks
dns.setServers(['8.8.8.8']);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        logger.info({ event: "database.connected" }, "MongoDB Connected");
    } catch (error) {
        logger.error({ event: "database.error", error: error.message }, "MongoDB Connection Failed");
        process.exit(1);
    }
};

export default connectDB;
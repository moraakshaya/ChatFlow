import mongoose from 'mongoose';
import MessageReaction from './src/models/MessageReaction.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

async function checkDB() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const reactions = await MessageReaction.find({}).lean();
    console.log("All reactions in DB:");
    console.log(JSON.stringify(reactions, null, 2));

    await mongoose.disconnect();
}

checkDB().catch(console.error);

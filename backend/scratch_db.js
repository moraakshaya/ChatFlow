import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkUsers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chat-platform');
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log(JSON.stringify(users.map(u => ({ email: u.email, status: u.status, isDeleted: u.isDeleted })), null, 2));
  process.exit(0);
}

checkUsers();

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    
    // Find first user to get orgId
    const firstUser = await db.collection('users').findOne({});
    
    if (!firstUser) {
        console.log("No users exist.");
        process.exit(1);
    }
    
    // Create new test user in the same org
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const newUser = {
        organizationId: firstUser.organizationId,
        fullName: "Test User 2",
        email: "test2@example.com",
        password: hashedPassword,
        role: "member",
        status: "active",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    // We also need to add them to the workspace if one exists!
    const workspace = await db.collection('workspaces').findOne({ organizationId: firstUser.organizationId });
    if (workspace) {
        // Find existing workspace member
        const existingMember = await db.collection('workspacemembers').findOne({
            workspaceId: workspace._id,
            userId: result.insertedId
        });
        
        if (!existingMember) {
            await db.collection('workspacemembers').insertOne({
                workspaceId: workspace._id,
                userId: result.insertedId,
                role: "member",
                status: "active",
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log("Added Test User 2 to Workspace: " + workspace.name);
        }
    }
    
    console.log(`Created new user "Test User 2" in organization ${firstUser.organizationId}`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

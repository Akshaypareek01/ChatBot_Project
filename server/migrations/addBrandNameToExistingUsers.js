const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const addBrandNameToExistingUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update all users without brandName
        const result = await User.updateMany(
            { $or: [{ brandName: { $exists: false } }, { brandName: "" }, { brandName: null }] },
            { $set: { brandName: "ChatBot" } }
        );

        console.log(`Updated ${result.modifiedCount} users with default brandName "ChatBot"`);

        // Disconnect
        await mongoose.disconnect();
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

addBrandNameToExistingUsers();

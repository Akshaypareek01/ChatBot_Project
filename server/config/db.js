const mongoose = require('mongoose');

const connectDB = async () => {
    if (process.env.MONGODB_URI) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Connected to MongoDB Atlas');
        } catch (err) {
            console.error('MongoDB connection error:', err);
            process.exit(1);
        }
    } else {
        console.error('MongoDB connection error: MONGODB_URI is not defined in environment variables');
        console.error('Please create a .env file with: MONGODB_URI=your_mongodb_connection_string');
        process.exit(1);
    }
};

module.exports = connectDB;

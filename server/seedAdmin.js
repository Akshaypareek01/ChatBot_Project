const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
            throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
        }

        // Check if admin exists
        let admin = await User.findOne({ email });

        if (admin) {
            console.log('Admin already exists. Updating credentials...');
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password, salt);
            admin.role = 'admin';
            admin.isActive = true;
            await admin.save();
            console.log('Admin updated successfully.');
        } else {
            console.log('Creating new Super Admin...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            admin = new User({
                name: 'Super Admin',
                email: email,
                password: hashedPassword,
                role: 'admin',
                isActive: true,
                tokenBalance: 10000000 // High balance for admin testing
            });

            await admin.save();
            console.log('Super Admin created successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();

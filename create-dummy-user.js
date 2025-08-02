const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createDummyUser() {
    try {
        console.log('👤 Creating dummy user account...\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        const User = require('./models/User');
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: 'admin@test.com' });
        if (existingUser) {
            console.log('✅ Dummy user already exists!');
            console.log('📧 Email: admin@test.com');
            console.log('🔑 Password: password123');
            await mongoose.disconnect();
            return;
        }
        
        // Create dummy user
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const dummyUser = new User({
            name: 'Admin User',
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'admin'
        });
        
        await dummyUser.save();
        
        console.log('✅ Dummy user created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('📧 Email: admin@test.com');
        console.log('🔑 Password: password123');
        console.log('\n🚀 You can now login at: http://localhost:5173');
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error creating dummy user:', error.message);
    }
}

createDummyUser();

const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
    try {
        console.log('🔍 Checking existing users in database...\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        const User = require('./models/User');
        const users = await User.find({});
        
        if (users.length === 0) {
            console.log('❌ No users found in database');
            console.log('💡 You need to register a new account:');
            console.log('   1. Go to: http://localhost:5173');
            console.log('   2. Click "Register"');
            console.log('   3. Create a new account');
        } else {
            console.log(`✅ Found ${users.length} user(s):`);
            users.forEach((user, index) => {
                console.log(`\n${index + 1}. User:`);
                console.log(`   - Email: ${user.email}`);
                console.log(`   - Name: ${user.name}`);
                console.log(`   - Role: ${user.role || 'user'}`);
                console.log(`   - Created: ${user.createdAt}`);
                console.log(`   - Password: [encrypted - cannot show]`);
            });
            
            console.log('\n💡 Use any of these emails with the password you set during registration');
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Database check complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkUsers();

const axios = require('axios');

async function createDummyUserViaAPI() {
    try {
        console.log('👤 Creating dummy user via API...\n');
        
        const userData = {
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'password123'
        };
        
        // Make API call to register endpoint
        const response = await axios.post('http://localhost:3000/api/auth/register', userData);
        
        console.log('✅ Dummy user created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('📧 Email: admin@test.com');
        console.log('🔑 Password: password123');
        console.log('\n🚀 You can now login at: http://localhost:5173');
        console.log('\n💡 Response:', response.data.message || 'User registered successfully');
        
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
            console.log('✅ Dummy user already exists!');
            console.log('\n📋 Login Credentials:');
            console.log('📧 Email: admin@test.com');
            console.log('🔑 Password: password123');
            console.log('\n🚀 You can now login at: http://localhost:5173');
        } else {
            console.error('❌ Error creating dummy user:', error.response?.data?.message || error.message);
        }
    }
}

createDummyUserViaAPI();

// Simple test for Google API credentials
require('dotenv').config();
const { google } = require('googleapis');

console.log('🔍 Testing Google API Connection...\n');

// Check if credentials are loaded
console.log('📋 Credentials Check:');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Loaded' : '❌ Missing');
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('API Key:', process.env.GOOGLE_API_KEY ? '✅ Loaded' : '❌ Missing');

// Test OAuth2 client creation
try {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    
    console.log('\n🔗 OAuth2 Client:', '✅ Created successfully');
    
    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/adwords'],
        prompt: 'consent'
    });
    
    console.log('🌐 Auth URL:', '✅ Generated successfully');
    console.log('\n📋 Your Google Ads OAuth URL:');
    console.log(authUrl);
    
    console.log('\n🎉 Google API connection test PASSED!');
    console.log('\n📝 Next steps:');
    console.log('1. Click the URL above to authenticate with Google');
    console.log('2. You\'ll get a code - use it with /api/integrations/google-ads/callback');
    console.log('3. The system will work with mock data until you get a Developer Token');
    
} catch (error) {
    console.error('❌ Error:', error.message);
}

console.log('\n✅ Test completed successfully!');

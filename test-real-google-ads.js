const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

async function testRealGoogleAdsAccess() {
    try {
        console.log('🔍 Testing real Google Ads API access...\n');
        
        console.log('📋 Configuration Check:');
        console.log('✅ Developer Token:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'Present' : 'Missing');
        console.log('✅ Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
        console.log('✅ Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
        
        if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
            console.log('\n❌ Google Ads Developer Token is missing!');
            console.log('💡 Add your token to .env file: GOOGLE_ADS_DEVELOPER_TOKEN=your-token');
            return;
        }
        
        // Initialize Google Ads API client
        const client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        });
        
        console.log('\n🔍 Attempting to list accessible customers...');
        
        // Try to get accessible customers without authentication first
        try {
            // This will help us understand what's available
            console.log('📊 Developer Token Format Check:');
            const tokenParts = process.env.GOOGLE_ADS_DEVELOPER_TOKEN.split('-');
            console.log('- Token Length:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN.length);
            console.log('- Has Dash:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN.includes('-'));
            console.log('- First Part Length:', tokenParts[0]?.length);
            
            // Check if token looks valid
            if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN.length < 20) {
                console.log('\n⚠️ Developer Token seems too short. Valid tokens are usually 40+ characters.');
                console.log('💡 Please verify your token from Google Ads API Center.');
            } else {
                console.log('\n✅ Developer Token format looks correct.');
            }
            
        } catch (error) {
            console.log('\n❌ Error testing API access:', error.message);
        }
        
        console.log('\n💡 Next Steps to Get Real Data:');
        console.log('1. Verify your developer token is approved (not just applied)');
        console.log('2. Make sure your Google account has access to Google Ads campaigns');
        console.log('3. Check if your developer token has the right permissions');
        console.log('4. Ensure your Google Ads account has active campaigns');
        
        console.log('\n🔗 Useful Links:');
        console.log('- Google Ads API Center: https://ads.google.com/nav/selectaccount?authuser=0&dst=/aw/apicenter');
        console.log('- Developer Token Status: Check "Basic Information" section');
        console.log('- Account Access: Check "Account Access" section');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
            console.log('\n💡 Your developer token is not approved yet.');
            console.log('   - Apply for approval in Google Ads API Center');
            console.log('   - This can take 1-2 business days');
        } else if (error.message.includes('AUTHENTICATION_ERROR')) {
            console.log('\n💡 Authentication issue - check your OAuth setup');
        } else if (error.message.includes('PERMISSION_DENIED')) {
            console.log('\n💡 Permission issue - check account access');
        }
    }
}

testRealGoogleAdsAccess();

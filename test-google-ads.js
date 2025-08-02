// Test script to verify Google Ads integration
require('dotenv').config();
const GoogleAdsService = require('./services/googleAdsService');

async function testGoogleAdsIntegration() {
    console.log('🔍 Testing Google Ads Integration...\n');
    
    // Check environment variables
    console.log('📋 Checking credentials:');
    console.log('✅ Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : '❌ Missing');
    console.log('✅ Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : '❌ Missing');
    console.log('✅ Redirect URI:', process.env.GOOGLE_REDIRECT_URI ? 'Set' : '❌ Missing');
    console.log('✅ API Key:', process.env.GOOGLE_API_KEY ? 'Set' : '❌ Missing');
    console.log('⚠️  Developer Token:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'Set' : 'Not set (will use mock data)');
    
    console.log('\n🚀 Testing Google Ads Service...');
    
    try {
        const googleAdsService = new GoogleAdsService();
        
        // Test OAuth URL generation
        console.log('🔗 Generating OAuth URL...');
        const authUrl = googleAdsService.getAuthUrl();
        console.log('✅ OAuth URL generated successfully');
        console.log('🌐 Auth URL:', authUrl);
        
        // Test mock campaign data (since we don't have developer token yet)
        console.log('\n📊 Testing campaign data retrieval...');
        const mockCampaigns = googleAdsService.getMockCampaignData();
        console.log('✅ Mock campaign data retrieved successfully');
        console.log('📈 Sample campaigns:', mockCampaigns.length, 'campaigns found');
        
        // Display sample campaign
        if (mockCampaigns.length > 0) {
            console.log('\n📋 Sample Campaign Data:');
            const sample = mockCampaigns[0];
            console.log(`   Campaign: ${sample.name}`);
            console.log(`   Status: ${sample.status}`);
            console.log(`   Impressions: ${sample.impressions.toLocaleString()}`);
            console.log(`   Clicks: ${sample.clicks.toLocaleString()}`);
            console.log(`   Cost: $${sample.cost}`);
            console.log(`   CTR: ${sample.ctr}%`);
            console.log(`   CPC: $${sample.cpc}`);
        }
        
        console.log('\n🎉 Google Ads integration test completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Visit the OAuth URL above to authenticate');
        console.log('   2. Use the callback endpoint: /api/integrations/google-ads/callback');
        console.log('   3. Get a Developer Token from Google Ads for production use');
        console.log('   4. Test the API endpoints: /api/google-ads/performance/:accountId');
        
    } catch (error) {
        console.error('❌ Error testing Google Ads integration:', error.message);
    }
}

// Run the test
testGoogleAdsIntegration();

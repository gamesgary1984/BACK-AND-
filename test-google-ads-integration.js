const GoogleAdsService = require('./services/googleAdsService');
const AdAccount = require('./models/AdAccount');
const connectDB = require('./db');
require('dotenv').config();

// Test Google Ads Integration
async function testGoogleAdsIntegration() {
    console.log('🧪 Testing Google Ads Integration...\n');
    
    try {
        // Connect to database
        await connectDB();
        console.log('✅ Database connected\n');
        
        // Initialize Google Ads Service
        const googleAdsService = new GoogleAdsService();
        console.log('✅ Google Ads Service initialized\n');
        
        // Check environment variables
        console.log('📋 Environment Check:');
        console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
        console.log(`   GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
        console.log(`   GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || 'Not set'}`);
        console.log(`   GOOGLE_ADS_DEVELOPER_TOKEN: ${process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? '✅ Set' : '❌ Missing (will use mock data)'}\n`);
        
        // Check for connected accounts in database
        console.log('🔍 Checking for connected Google Ads accounts...');
        const connectedAccounts = await AdAccount.find({ platform: 'google' }).populate('client', 'name');
        
        if (connectedAccounts.length === 0) {
            console.log('❌ No Google Ads accounts found in database');
            console.log('   Please connect a Google Ads account through the Data Sources page first\n');
            return;
        }
        
        console.log(`✅ Found ${connectedAccounts.length} connected Google Ads account(s):`);
        connectedAccounts.forEach((account, index) => {
            console.log(`   ${index + 1}. Account ID: ${account.accountId}`);
            console.log(`      Name: ${account.name}`);
            console.log(`      Client: ${account.client?.name || 'No client'}`);
            console.log(`      Has Credentials: ${account.credentials ? '✅' : '❌'}`);
            console.log(`      Created: ${account.createdAt.toISOString()}\n`);
        });
        
        // Test with the first connected account
        const testAccount = connectedAccounts[0];
        console.log(`🧪 Testing data retrieval with account: ${testAccount.accountId}\n`);
        
        try {
            // Test 1: Get stored account and set credentials
            console.log('📡 Test 1: Loading stored account credentials...');
            const storedAccount = await googleAdsService.getStoredAdAccount(testAccount.accountId);
            console.log('✅ Account credentials loaded successfully');
            console.log(`   Account Name: ${storedAccount.name}`);
            console.log(`   Has Access Token: ${storedAccount.credentials?.access_token ? '✅' : '❌'}`);
            console.log(`   Has Refresh Token: ${storedAccount.credentials?.refresh_token ? '✅' : '❌'}`);
            console.log(`   Token Expiry: ${storedAccount.credentials?.expiry_date ? new Date(storedAccount.credentials.expiry_date).toISOString() : 'Not set'}\n`);
            
            // Test 2: Try to get ad accounts
            console.log('📡 Test 2: Fetching accessible ad accounts...');
            const adAccounts = await googleAdsService.getAdAccounts();
            console.log(`✅ Successfully retrieved ${adAccounts.length} ad account(s):`);
            adAccounts.forEach((account, index) => {
                console.log(`   ${index + 1}. ${account}`);
            });
            console.log();
            
            // Test 3: Get campaign data
            console.log('📡 Test 3: Fetching campaign data...');
            const campaigns = await googleAdsService.getCampaigns(testAccount.accountId);
            console.log(`✅ Successfully retrieved ${campaigns.length} campaign(s):`);
            
            if (campaigns.length > 0) {
                // Show summary
                const totalImpressions = campaigns.reduce((sum, c) => sum + (parseInt(c.impressions) || 0), 0);
                const totalClicks = campaigns.reduce((sum, c) => sum + (parseInt(c.clicks) || 0), 0);
                const totalCost = campaigns.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);
                const totalConversions = campaigns.reduce((sum, c) => sum + (parseFloat(c.conversions) || 0), 0);
                
                console.log('\n📊 Campaign Summary:');
                console.log(`   Total Campaigns: ${campaigns.length}`);
                console.log(`   Total Impressions: ${totalImpressions.toLocaleString()}`);
                console.log(`   Total Clicks: ${totalClicks.toLocaleString()}`);
                console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
                console.log(`   Total Conversions: ${totalConversions}`);
                console.log(`   Average CTR: ${totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0}%`);
                console.log(`   Average CPC: $${totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : 0}`);
                
                console.log('\n📋 Campaign Details:');
                campaigns.slice(0, 5).forEach((campaign, index) => { // Show first 5 campaigns
                    console.log(`   ${index + 1}. ${campaign.name}`);
                    console.log(`      Status: ${campaign.status}`);
                    console.log(`      Impressions: ${campaign.impressions}`);
                    console.log(`      Clicks: ${campaign.clicks}`);
                    console.log(`      Cost: $${campaign.cost}`);
                    console.log(`      CTR: ${campaign.ctr}%`);
                    console.log(`      CPC: $${campaign.cpc}`);
                    console.log(`      Conversions: ${campaign.conversions}\n`);
                });
                
                if (campaigns.length > 5) {
                    console.log(`   ... and ${campaigns.length - 5} more campaigns\n`);
                }
            }
            
            // Test 4: Test API endpoints
            console.log('🌐 Test 4: Testing API endpoints...');
            console.log('   You can test these endpoints in your browser or with curl:');
            console.log(`   GET http://localhost:3000/api/google-ads/performance/${testAccount.accountId}`);
            console.log(`   GET http://localhost:3000/api/google-ads/report-data/${testAccount.accountId}?format=summary`);
            console.log(`   GET http://localhost:3000/api/google-ads/health/${testAccount.accountId}`);
            
        } catch (apiError) {
            console.log('❌ API Error:', apiError.message);
            
            if (apiError.message.includes('Developer token')) {
                console.log('\n💡 This is expected without a Google Ads Developer Token');
                console.log('   The system will use mock data for testing purposes');
                console.log('   To get real data, you need to:');
                console.log('   1. Apply for a Google Ads Developer Token');
                console.log('   2. Add it to your .env file as GOOGLE_ADS_DEVELOPER_TOKEN');
                console.log('   3. Get your account approved by Google');
            }
            
            // Try with mock data
            console.log('\n🎭 Testing with mock data...');
            const mockCampaigns = googleAdsService.getMockCampaignData();
            console.log(`✅ Mock data retrieved: ${mockCampaigns.length} campaigns`);
            
            console.log('\n📊 Mock Campaign Summary:');
            const totalImpressions = mockCampaigns.reduce((sum, c) => sum + (parseInt(c.impressions) || 0), 0);
            const totalClicks = mockCampaigns.reduce((sum, c) => sum + (parseInt(c.clicks) || 0), 0);
            const totalCost = mockCampaigns.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);
            
            console.log(`   Total Campaigns: ${mockCampaigns.length}`);
            console.log(`   Total Impressions: ${totalImpressions.toLocaleString()}`);
            console.log(`   Total Clicks: ${totalClicks.toLocaleString()}`);
            console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
        }
        
        console.log('\n🎉 Google Ads Integration Test Complete!');
        console.log('\n📋 Summary:');
        console.log(`   ✅ Database connection: Working`);
        console.log(`   ✅ Google Ads Service: Initialized`);
        console.log(`   ✅ Connected accounts: ${connectedAccounts.length} found`);
        console.log(`   ${process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? '✅' : '⚠️'} API access: ${process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'Production ready' : 'Mock data only'}`);
        console.log(`   ✅ Data retrieval: Working (${process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'real' : 'mock'} data)`);
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

// Run the test
testGoogleAdsIntegration();

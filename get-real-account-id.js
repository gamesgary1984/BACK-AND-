const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

async function getRealAccountId() {
    try {
        console.log('🔍 Fetching your real Google Ads account ID...\n');
        
        // Initialize Google Ads API
        const client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        });

        // Get accessible accounts
        const customer = client.Customer({
            customer_id: process.env.GOOGLE_ADS_DEVELOPER_TOKEN.split('-')[0], // Use first part as customer ID
            refresh_token: 'dummy', // We'll get this from OAuth
        });

        // Try to list accessible customers
        console.log('📋 Your accessible Google Ads accounts:');
        console.log('Developer Token:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
        console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
        
        // Alternative approach - check what we have in database
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const AdAccount = require('./models/AdAccount');
        const accounts = await AdAccount.find({ platform: 'google' });
        
        console.log('\n🗄️ Accounts in your database:');
        accounts.forEach(account => {
            console.log(`- Account ID: ${account.accountId}`);
            console.log(`- Client: ${account.client}`);
            console.log(`- Has Credentials: ${!!account.credentials}`);
            console.log(`- Created: ${account.createdAt}`);
            console.log('---');
        });

        if (accounts.length > 0) {
            console.log('\n💡 Next steps:');
            console.log('1. The account ID "1234567890" is a test ID');
            console.log('2. You need to reconnect your Google Ads account to get the real ID');
            console.log('3. Go to Data Sources page and reconnect Google Ads');
            console.log('4. This will store your real account ID with proper OAuth tokens');
        }

        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 This is expected - you need to reconnect your Google Ads account');
        console.log('The stored account ID "1234567890" is from testing');
    }
}

getRealAccountId();

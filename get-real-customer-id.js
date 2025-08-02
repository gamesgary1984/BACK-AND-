const { GoogleAdsApi } = require('google-ads-api');
const { google } = require('googleapis');
const mongoose = require('mongoose');
require('dotenv').config();

async function getRealCustomerId() {
    try {
        console.log('🔍 Getting your real Google Ads customer ID...\n');
        
        // Connect to database to get stored OAuth tokens
        await mongoose.connect(process.env.MONGODB_URI);
        const AdAccount = require('./models/AdAccount');
        
        // Find the connected Google Ads account
        const account = await AdAccount.findOne({ 
            platform: 'google',
            accountId: { $regex: /^account-/ } // Find timestamp-based account
        });
        
        if (!account) {
            console.log('❌ No connected Google Ads account found');
            console.log('💡 Please connect your Google Ads account first');
            return;
        }
        
        console.log('✅ Found connected account:', account.accountId);
        console.log('🔑 Has OAuth tokens:', !!account.credentials);
        
        // Initialize OAuth2 client for googleapis
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        
        // Set credentials with refresh token
        oauth2Client.setCredentials({
            refresh_token: account.credentials.refresh_token
        });
        
        console.log('🔍 Fetching accessible customers...');
        
        try {
            // Get fresh access token
            const { credentials } = await oauth2Client.refreshAccessToken();
            const accessToken = credentials.access_token;
            
            // Use axios for cleaner HTTP requests
            const axios = require('axios');
            
            const response = await axios.post(
                'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const customers = response.data.resourceNames || [];
            
            if (customers && customers.length > 0) {
                console.log('\\n✅ Found accessible customers:');
                customers.forEach((customerId, index) => {
                    const cleanId = customerId.replace('customers/', '');
                    console.log(`${index + 1}. Customer ID: ${cleanId}`);
                });
                
                // Use the first customer ID
                const realCustomerId = customers[0].replace('customers/', '');
                
                console.log('\\n🔄 Updating database with real customer ID...');
                
                // Update the account with real customer ID
                account.accountId = realCustomerId;
                account.name = `Google Ads Account ${realCustomerId}`;
                await account.save();
                
                console.log('✅ Database updated successfully!');
                console.log('🎯 Real Customer ID:', realCustomerId);
                console.log('\\n🚀 Now try your Google Ads Analytics page - you should see real data!');
                
            } else {
                console.log('\\n⚠️ No accessible customers found');
                console.log('💡 This could mean:');
                console.log("   - Your Google account doesn\\'t have Google Ads campaigns");
                console.log('   - Your developer token needs approval');
                console.log('   - Account permissions need to be set up');
            }
            
        } catch (apiError) {
            console.log('\\n❌ API Error:', apiError.message);
            
            // Check if it's a 404 error (API endpoint issue)
            if (apiError.response && apiError.response.status === 404) {
                console.log('\\n🔧 API Endpoint Issue Detected');
                console.log('💡 This could mean:');
                console.log('   - Google Ads API access is not properly configured');
                console.log('   - Developer token needs approval from Google');
                console.log('   - API endpoint URL or version mismatch');
                console.log('\\n🎯 Alternative Solution:');
                console.log('   1. Go to Google Ads Manager: https://ads.google.com');
                console.log('   2. Look at the URL - it will show your customer ID');
                console.log('   3. The customer ID is the number after "?authuser=0&__c="');
                console.log('   4. Update your .env file with GOOGLE_ADS_CUSTOMER_ID=your_id');
                console.log('\\n📝 For now, using mock data for development...');
            } else if (apiError.message.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
                console.log('\\n💡 Your developer token is not approved yet');
                console.log('   - Go to Google Ads API Center');
                console.log('   - Check "Basic Information" section');
                console.log('   - Apply for approval if needed');
            } else if (apiError.message.includes('AUTHENTICATION_ERROR')) {
                console.log('\\n💡 Authentication issue');
                console.log('   - Try reconnecting your Google Ads account');
                console.log('   - Check OAuth permissions');
            } else {
                console.log('\\n💡 For now, your system will use realistic mock data');
                console.log('   - This is normal for new developer tokens');
                console.log('   - Real data will work once API access is fully set up');
            }
        }
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

getRealCustomerId();

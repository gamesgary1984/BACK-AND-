require('dotenv').config();
const { GoogleAdsApi } = require('google-ads-api');

async function testAuthentication() {
  console.log('🔍 Testing Google Ads Authentication...\n');
  
  try {
    // Test 1: Environment variables
    console.log('1️⃣ Environment Variables Check:');
    console.log('  ✅ Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : '❌ Missing');
    console.log('  ✅ Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : '❌ Missing');
    console.log('  ✅ Developer Token:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'Present' : '❌ Missing');
    console.log('  ✅ Customer ID:', process.env.GOOGLE_ADS_CUSTOMER_ID ? 'Present' : '❌ Missing');
    console.log('');
    
    // Test 2: Google Ads API Client Creation
    console.log('2️⃣ Google Ads API Client Creation:');
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
    console.log('  ✅ Client created successfully');
    console.log('');
    
    // Test 3: Check if we have stored OAuth tokens
    console.log('3️⃣ OAuth Token Check:');
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const AdAccount = require('../models/AdAccount');
    const googleAccount = await AdAccount.findOne({ platform: 'google' });
    
    if (!googleAccount) {
      console.log('  ❌ No Google account found in database');
      console.log('  💡 You need to connect your Google Ads account first');
      return;
    }
    
    console.log('  ✅ Google account found in database');
    console.log('  ✅ Account ID:', googleAccount.accountId);
    console.log('  ✅ Refresh token:', googleAccount.credentials.refresh_token ? 'Present' : '❌ Missing');
    console.log('');
    
    // Test 4: Token validation
    console.log('4️⃣ Token Validation Test:');
    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: googleAccount.credentials.refresh_token,
    });
    
    // Try a simple API call to test authentication
    const simpleQuery = `SELECT customer.id FROM customer LIMIT 1`;
    console.log('  🔄 Testing with simple query:', simpleQuery);
    
    const result = await customer.query(simpleQuery);
    console.log('  ✅ Authentication successful!');
    console.log('  📊 Result:', result);
    
  } catch (error) {
    console.error('❌ Authentication Test Failed:');
    console.error('  Error:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    }
  }
}

testAuthentication().then(() => {
  console.log('\n🏁 Authentication test completed');
  process.exit(0);
}).catch(console.error);

require('dotenv').config();
const { GoogleAdsApi } = require('google-ads-api');

async function testDeveloperToken() {
  console.log('🔍 Testing Google Ads Developer Token...\n');
  
  try {
    console.log('1️⃣ Developer Token Status Check:');
    console.log('  Token:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
    console.log('  Length:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.length);
    console.log('');
    
    // Test with minimal setup to isolate developer token issues
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
    
    console.log('2️⃣ Testing Developer Token with Customer Info Query:');
    
    // Get OAuth tokens from database
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    const AdAccount = require('../models/AdAccount');
    const googleAccount = await AdAccount.findOne({ platform: 'google' });
    
    if (!googleAccount) {
      console.log('  ❌ No Google account in database');
      return;
    }
    
    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: googleAccount.credentials.refresh_token,
    });
    
    // Test 1: Basic customer info (should work with any developer token)
    console.log('  🔄 Testing basic customer info query...');
    const basicQuery = `SELECT customer.id, customer.descriptive_name FROM customer`;
    const basicResult = await customer.query(basicQuery);
    console.log('  ✅ Basic query successful:', basicResult);
    console.log('');
    
    // Test 2: Campaign query (might require approved developer token)
    console.log('3️⃣ Testing Campaign Access (requires approved token):');
    const campaignQuery = `SELECT campaign.id, campaign.name FROM campaign LIMIT 1`;
    console.log('  🔄 Testing campaign query...');
    const campaignResult = await customer.query(campaignQuery);
    console.log('  ✅ Campaign query successful:', campaignResult);
    
  } catch (error) {
    console.error('❌ Developer Token Test Failed:');
    console.error('  Error message:', error.message);
    
    if (error.message && error.message.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
      console.error('  🚨 DIAGNOSIS: Developer token is not approved!');
      console.error('  💡 Solution: Apply for developer token approval at:');
      console.error('     https://developers.google.com/google-ads/api/docs/first-call/dev-token');
    }
    
    if (error.message && error.message.includes('INVALID_DEVELOPER_TOKEN')) {
      console.error('  🚨 DIAGNOSIS: Developer token is invalid!');
      console.error('  💡 Solution: Check your developer token in Google Ads API Center');
    }
    
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDeveloperToken().then(() => {
  console.log('\n🏁 Developer token test completed');
  process.exit(0);
}).catch(console.error);

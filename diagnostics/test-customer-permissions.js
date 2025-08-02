require('dotenv').config();
const { GoogleAdsApi } = require('google-ads-api');

async function testCustomerPermissions() {
  console.log('🔍 Testing Google Ads Customer ID Permissions...\n');
  
  try {
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
    
    // Get OAuth tokens from database
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    const AdAccount = require('../models/AdAccount');
    const googleAccount = await AdAccount.findOne({ platform: 'google' });
    
    if (!googleAccount) {
      console.log('❌ No Google account in database');
      return;
    }
    
    console.log('1️⃣ Customer ID Access Test:');
    console.log('  Current Customer ID:', process.env.GOOGLE_ADS_CUSTOMER_ID);
    console.log('');
    
    // Test 1: List accessible customers to see what we actually have access to
    console.log('2️⃣ Listing Accessible Customers:');
    try {
      // Use the REST API approach since the SDK method was problematic
      const axios = require('axios');
      const { google } = require('googleapis');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({
        refresh_token: googleAccount.credentials.refresh_token
      });
      
      const accessToken = await oauth2Client.getAccessToken();
      
      const response = await axios.get(
        'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
        {
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN
          }
        }
      );
      
      console.log('  ✅ Accessible customers:', response.data);
      
      if (response.data.resourceNames) {
        const customerIds = response.data.resourceNames.map(name => 
          name.replace('customers/', '')
        );
        console.log('  📋 Available Customer IDs:', customerIds);
        
        const currentId = process.env.GOOGLE_ADS_CUSTOMER_ID;
        if (customerIds.includes(currentId)) {
          console.log(`  ✅ Current ID ${currentId} is accessible`);
        } else {
          console.log(`  ❌ Current ID ${currentId} is NOT accessible`);
          console.log(`  💡 Try using one of these IDs: ${customerIds.join(', ')}`);
        }
      }
      
    } catch (listError) {
      console.error('  ❌ Failed to list accessible customers:', listError.message);
      if (listError.response) {
        console.error('  Response:', listError.response.data);
      }
    }
    
    console.log('');
    
    // Test 2: Try to access the specific customer
    console.log('3️⃣ Testing Direct Customer Access:');
    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: googleAccount.credentials.refresh_token,
    });
    
    const customerQuery = `SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer`;
    console.log('  🔄 Querying customer info...');
    
    const customerResult = await customer.query(customerQuery);
    console.log('  ✅ Customer access successful:', customerResult);
    
  } catch (error) {
    console.error('❌ Customer Permissions Test Failed:');
    console.error('  Error message:', error.message);
    
    if (error.message && error.message.includes('CUSTOMER_NOT_FOUND')) {
      console.error('  🚨 DIAGNOSIS: Customer ID not found or no access!');
      console.error('  💡 Solution: Use the accessible customer IDs listed above');
    }
    
    if (error.message && error.message.includes('PERMISSION_DENIED')) {
      console.error('  🚨 DIAGNOSIS: No permission to access this customer!');
      console.error('  💡 Solution: Request access or use a different customer ID');
    }
    
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCustomerPermissions().then(() => {
  console.log('\n🏁 Customer permissions test completed');
  process.exit(0);
}).catch(console.error);

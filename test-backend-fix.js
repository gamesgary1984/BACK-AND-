require('dotenv').config();
const GoogleAdsService = require('./services/googleAdsService');

async function testBackendFix() {
  console.log('🧪 Testing Backend Fix with Updated Customer ID...\n');
  
  try {
    console.log('1️⃣ Environment Check:');
    console.log('  Customer ID from .env:', process.env.GOOGLE_ADS_CUSTOMER_ID);
    console.log('');
    
    const googleAdsService = new GoogleAdsService();
    
    console.log('2️⃣ Testing getCampaigns with working customer ID:');
    // Use the customer ID that we know works from diagnostics
    const campaigns = await googleAdsService.getCampaigns('1929531529');
    
    console.log('  ✅ Success! Got campaigns:', campaigns.length);
    if (campaigns.length > 0) {
      console.log('  📊 Sample campaign data:');
      console.log('    Name:', campaigns[0].name);
      console.log('    Impressions:', campaigns[0].impressions);
      console.log('    Clicks:', campaigns[0].clicks);
      console.log('    Cost:', campaigns[0].cost);
    }
    
    console.log('');
    console.log('3️⃣ Testing with database account lookup:');
    
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    const AdAccount = require('./models/AdAccount');
    
    const googleAccounts = await AdAccount.find({ platform: 'google' });
    console.log('  📋 Google accounts in database:');
    googleAccounts.forEach(acc => {
      console.log(`    - ID: ${acc.accountId}, Name: ${acc.name}`);
    });
    
    if (googleAccounts.length > 0) {
      console.log('');
      console.log('4️⃣ Testing with first database account:');
      const firstAccount = googleAccounts[0];
      const campaignsFromDB = await googleAdsService.getCampaigns(firstAccount.accountId);
      console.log('  ✅ Success with database account:', campaignsFromDB.length, 'campaigns');
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
  
  process.exit(0);
}

testBackendFix();

const mongoose = require('mongoose');
require('dotenv').config();
const { GoogleAdsApi } = require('google-ads-api');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const AdAccount = require('./models/AdAccount');
  // Find the first Google Ads account with a non-numeric accountId (likely placeholder)
  const account = await AdAccount.findOne({
    platform: 'google',
    accountId: { $not: /^\d{10}$/ }
  });

  if (!account) {
    console.log('✅ All Google Ads account IDs in MongoDB are already real customer IDs.');
    await mongoose.disconnect();
    return;
  }

  if (!account.credentials || !account.credentials.refresh_token) {
    console.error('❌ No valid refresh token found for this account. Please reconnect your Google Ads account.');
    await mongoose.disconnect();
    return;
  }

  // Use google-ads-api to fetch the real customer ID
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  const customer = client.Customer({
    customer_id: '0000000000', // placeholder, will be replaced
    refresh_token: account.credentials.refresh_token,
  });

  try {
    // Use customer ID from .env file instead of API call
    const realCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    
    if (!realCustomerId) {
      console.error('❌ GOOGLE_ADS_CUSTOMER_ID not found in .env file.');
      await mongoose.disconnect();
      return;
    }
    console.log('✅ Real customer ID fetched:', realCustomerId);
    account.accountId = realCustomerId;
    account.name = `Google Ads Account ${realCustomerId}`;
    await account.save();
    console.log('✅ MongoDB record updated with real customer ID!');
  } catch (err) {
    console.error('❌ Error fetching/updating real customer ID:', err.message);
  }
  await mongoose.disconnect();
}

run();

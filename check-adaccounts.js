const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const AdAccount = require('./models/AdAccount');
  const accounts = await AdAccount.find({ platform: 'google' });
  if (!accounts.length) {
    console.log('❌ No Google Ads accounts found in the database.');
  } else {
    console.log(`\n📊 Found ${accounts.length} Google Ads account(s):`);
    accounts.forEach(acc => {
      console.log(`- accountId: ${acc.accountId}, name: ${acc.name}, tokens: ${!!acc.credentials?.refresh_token}`);
    });
  }
  await mongoose.disconnect();
}

run();

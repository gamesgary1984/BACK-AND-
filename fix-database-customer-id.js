require('dotenv').config();
const mongoose = require('mongoose');
const AdAccount = require('./models/AdAccount');

async function fixDatabaseCustomerId() {
  console.log('🔧 Fixing Database Customer ID...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the working customer ID from .env
    const workingCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    console.log('🎯 Working Customer ID from .env:', workingCustomerId);
    
    // Find all Google Ads accounts in database
    const googleAccounts = await AdAccount.find({ platform: 'google' });
    console.log('📊 Current Google accounts in database:');
    googleAccounts.forEach(acc => {
      console.log(`  - ID: ${acc.accountId}, Name: ${acc.name}`);
    });
    
    if (googleAccounts.length === 0) {
      console.log('❌ No Google accounts found in database');
      return;
    }
    
    // Update the first Google account to use the working customer ID
    const accountToUpdate = googleAccounts[0];
    console.log(`\n🔄 Updating account from ${accountToUpdate.accountId} to ${workingCustomerId}`);
    
    accountToUpdate.accountId = workingCustomerId;
    accountToUpdate.name = `Google Ads Account ${workingCustomerId}`;
    accountToUpdate.updatedAt = new Date();
    
    await accountToUpdate.save();
    
    console.log('✅ Database updated successfully!');
    console.log('📊 Updated account:');
    console.log(`  - ID: ${accountToUpdate.accountId}`);
    console.log(`  - Name: ${accountToUpdate.name}`);
    
    // Verify the update
    const updatedAccounts = await AdAccount.find({ platform: 'google' });
    console.log('\n🔍 Verification - Google accounts after update:');
    updatedAccounts.forEach(acc => {
      console.log(`  - ID: ${acc.accountId}, Name: ${acc.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Database connection closed');
  }
}

fixDatabaseCustomerId();

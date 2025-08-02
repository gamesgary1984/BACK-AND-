const mongoose = require('mongoose');
require('dotenv').config();

async function clearTestAccount() {
    try {
        console.log('🗄️ Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const AdAccount = require('./models/AdAccount');
        
        // Find and remove the test account
        const testAccount = await AdAccount.findOne({ accountId: '1234567890' });
        
        if (testAccount) {
            console.log('🔍 Found test account:', testAccount.accountId);
            await AdAccount.deleteOne({ accountId: '1234567890' });
            console.log('✅ Removed test account from database');
            console.log('💡 Now you can reconnect your real Google Ads account');
        } else {
            console.log('ℹ️ No test account found in database');
        }
        
        // Show remaining accounts
        const remainingAccounts = await AdAccount.find({ platform: 'google' });
        console.log(`\n📊 Remaining Google Ads accounts: ${remainingAccounts.length}`);
        
        await mongoose.disconnect();
        console.log('✅ Database cleanup complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

clearTestAccount();

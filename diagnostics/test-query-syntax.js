require('dotenv').config();
const { GoogleAdsApi } = require('google-ads-api');

async function testQuerySyntax() {
  console.log('🔍 Testing Google Ads Query Syntax...\n');
  
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
    
    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: googleAccount.credentials.refresh_token,
    });
    
    // Test different query complexities
    const queries = [
      {
        name: 'Simple Customer Query',
        query: `SELECT customer.id FROM customer`
      },
      {
        name: 'Basic Campaign Query',
        query: `SELECT campaign.id, campaign.name FROM campaign LIMIT 5`
      },
      {
        name: 'Campaign with Status',
        query: `SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 5`
      },
      {
        name: 'Our Complex Query (from service)',
        query: `
          SELECT 
            campaign.id,
            campaign.name,
            campaign.status,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.cost_per_conversion
          FROM campaign 
          WHERE segments.date DURING LAST_30_DAYS
          ORDER BY metrics.impressions DESC
          LIMIT 10
        `
      }
    ];
    
    for (let i = 0; i < queries.length; i++) {
      const { name, query } = queries[i];
      console.log(`${i + 1}️⃣ Testing: ${name}`);
      console.log(`   Query: ${query.trim()}`);
      
      try {
        const result = await customer.query(query);
        console.log(`   ✅ Success! Results: ${result.length} rows`);
        if (result.length > 0) {
          console.log(`   📊 Sample data:`, JSON.stringify(result[0], null, 2));
        }
      } catch (queryError) {
        console.error(`   ❌ Failed:`, queryError.message);
        
        if (queryError.message && queryError.message.includes('INVALID_QUERY')) {
          console.error('   🚨 DIAGNOSIS: Query syntax error!');
        }
        
        if (queryError.message && queryError.message.includes('PERMISSION_DENIED')) {
          console.error('   🚨 DIAGNOSIS: No permission for this query!');
        }
        
        if (queryError.response) {
          console.error('   Response:', JSON.stringify(queryError.response.data, null, 2));
        }
        
        // Stop testing more complex queries if simple ones fail
        if (i < 2) {
          console.log('   ⚠️ Stopping further tests due to basic query failure');
          break;
        }
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Query Syntax Test Setup Failed:');
    console.error('  Error:', error.message);
    if (error.response) {
      console.error('  Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testQuerySyntax().then(() => {
  console.log('\n🏁 Query syntax test completed');
  process.exit(0);
}).catch(console.error);

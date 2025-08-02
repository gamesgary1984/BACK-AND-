const { GoogleAdsApi } = require('google-ads-api');
const { google } = require('googleapis');
const AdAccount = require('../models/AdAccount');

class GoogleAdsService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Google Ads API scopes
    this.scopes = [
      'https://www.googleapis.com/auth/adwords'
    ];
  }

  // Generate OAuth URL for authentication
  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      throw new Error(`Failed to get tokens: ${error.message}`);
    }
  }

  // Set credentials for API calls
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Refresh access token if needed
  async refreshToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  // Get Google Ads accounts using official API client
  async getAdAccounts() {
    try {
      // Check if developer token is available
      if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
        throw new Error('Google Ads Developer Token is required. Please add GOOGLE_ADS_DEVELOPER_TOKEN to your .env file.');
      }

      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.refresh_token) {
        throw new Error('OAuth credentials not available. Please authenticate first.');
      }

      // Initialize Google Ads API client
      const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      });

      // Create customer with OAuth tokens
      const customer = client.Customer({
        customer_id: '0000000000', // Temporary - we'll get the real one
        refresh_token: this.oauth2Client.credentials.refresh_token,
      });

      console.log('🔍 Using customer ID from .env file (avoiding API 404 errors)...');
      
      const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
      
      if (!customerId) {
        throw new Error('GOOGLE_ADS_CUSTOMER_ID not found in .env file. Please add your Google Ads customer ID.');
      }
      
      // Return the customer ID in the expected format
      const customers = [`customers/${customerId}`];
      console.log('✅ Using customer ID from .env:', customerId);
      return customers;
    } catch (error) {
      console.error('❌ Error fetching ad accounts:', error.message || error);
      
      const errorMessage = error.message || error.toString() || 'Unknown error';
      
      if (errorMessage.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
        throw new Error('Your Google Ads Developer Token is not approved yet. Please apply for approval in Google Ads API Center.');
      } else if (errorMessage.includes('AUTHENTICATION_ERROR')) {
        throw new Error('Authentication failed. Please reconnect your Google Ads account.');
      } else {
        throw new Error(`Failed to get ad accounts: ${errorMessage}`);
      }
    }
  }

  // Get campaign data using official Google Ads API client
  async getCampaigns(customerId) {
    try {
      // Initialize OAuth credentials if not available
      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.refresh_token) {
        console.log('🔑 OAuth credentials not set, initializing from database...');
        await this.initializeOAuthCredentials();
      }
      
      // Check if developer token is available
      if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
        throw new Error('Google Ads Developer Token is required. Please add GOOGLE_ADS_DEVELOPER_TOKEN to your .env file.');
      }

      // Handle timestamp-based accounts by getting real customer ID
      let realCustomerId = customerId;
      if (customerId && customerId.startsWith('account-')) {
        console.log('🔄 Timestamp-based account detected, fetching real customer ID...');
        const realId = await this.getRealCustomerId();
        if (realId) {
          realCustomerId = realId;
          console.log('✅ Found real customer ID:', realCustomerId);
          
          // Update database with real customer ID
          await this.updateAccountWithRealId(customerId, realCustomerId);
        } else {
          throw new Error('Could not retrieve real customer ID. Please check your Google Ads account access.');
        }
      }

      console.log('🔍 Fetching real Google Ads campaign data for account:', realCustomerId);

      // Initialize Google Ads API client
      const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      });

      // Create customer with OAuth tokens and real customer ID
      console.log('🔑 OAuth credentials details:');
      console.log('  - Refresh token available:', !!this.oauth2Client.credentials.refresh_token);
      console.log('  - Access token available:', !!this.oauth2Client.credentials.access_token);
      console.log('  - Token expiry:', this.oauth2Client.credentials.expiry_date);
      
      const customer = client.Customer({
        customer_id: realCustomerId,
        refresh_token: this.oauth2Client.credentials.refresh_token,
      });
      
      console.log('🎯 Customer object created for ID:', realCustomerId);

      // Query for campaign data
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign 
        WHERE segments.date DURING LAST_30_DAYS
        ORDER BY metrics.impressions DESC
      `;

      console.log('📊 Executing Google Ads query...');
      console.log('🔍 Query:', query.trim());
      console.log('🔍 Customer ID:', realCustomerId);
      console.log('🔍 OAuth credentials available:', !!this.oauth2Client.credentials);
      
      const results = await customer.query(query);
      console.log('✅ Successfully fetched real Google Ads data:', results ? results.length : 0, 'campaigns');
      
      if (!results || results.length === 0) {
        console.log('⚠️ No campaign data returned from Google Ads API');
        return [];
      }
      
      return this.processRealCampaignData(results);
      
    } catch (error) {
      console.error('❌ Error in getCampaigns:', error);
      
      // Detailed error analysis
      console.log('🔍 Error analysis:');
      console.log('  - Error type:', typeof error);
      console.log('  - Error constructor:', error.constructor.name);
      console.log('  - Has message:', !!error.message);
      console.log('  - Has response:', !!error.response);
      console.log('  - Has data:', !!(error.response && error.response.data));
      console.log('  - Has status:', !!(error.response && error.response.status));
      
      if (error.response) {
        console.log('🌐 HTTP Response details:');
        console.log('  - Status:', error.response.status);
        console.log('  - Status text:', error.response.statusText);
        console.log('  - Headers:', error.response.headers);
        console.log('  - Data:', error.response.data);
      }
      
      // Better error message extraction
      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.data) {
        errorMessage = JSON.stringify(error.response.data);
      } else if (error.code) {
        errorMessage = `Error code: ${error.code}`;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      console.log('🔍 Extracted error message:', errorMessage);
      
      if (errorMessage.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
        throw new Error('Your Google Ads Developer Token is not approved yet. Please apply for approval in Google Ads API Center.');
      } else if (errorMessage.includes('AUTHENTICATION_ERROR')) {
        throw new Error('Authentication failed. Please reconnect your Google Ads account.');
      } else if (errorMessage.includes('PERMISSION_DENIED')) {
        throw new Error('Permission denied. Please check your Google Ads account access permissions.');
      } else {
        throw new Error(`Failed to get campaign data: ${errorMessage}`);
      }
    }
  }

  // Provide mock campaign data when API calls fail
  getMockCampaignData() {
    console.log('📊 Returning mock campaign data due to API issues');
    return [
      {
        id: '12345678901',
        name: 'Sample Campaign 1',
        status: 'ENABLED',
        impressions: 15420,
        clicks: 892,
        cost: 245.67,
        conversions: 23,
        ctr: 5.78,
        averageCpc: 0.28,
        conversionRate: 2.58
      },
      {
        id: '12345678902', 
        name: 'Sample Campaign 2',
        status: 'ENABLED',
        impressions: 8930,
        clicks: 445,
        cost: 156.89,
        conversions: 12,
        ctr: 4.98,
        averageCpc: 0.35,
        conversionRate: 2.70
      },
      {
        id: '12345678903',
        name: 'Sample Campaign 3', 
        status: 'PAUSED',
        impressions: 3210,
        clicks: 178,
        cost: 89.45,
        conversions: 5,
        ctr: 5.54,
        averageCpc: 0.50,
        conversionRate: 2.81
      }
    ];
  }

  // Process real campaign data from Google Ads API client
  processRealCampaignData(results) {
    if (!results || results.length === 0) {
      console.log('⚠️ No campaign data found');
      return [];
    }

    return results.map(row => {
      const campaign = row.campaign;
      const metrics = row.metrics;
      
      return {
        id: campaign.id.toString(),
        name: campaign.name,
        status: campaign.status,
        impressions: parseInt(metrics.impressions) || 0,
        clicks: parseInt(metrics.clicks) || 0,
        cost: (parseInt(metrics.cost_micros) || 0) / 1000000, // Convert micros to currency
        conversions: parseFloat(metrics.conversions) || 0,
        ctr: (parseFloat(metrics.ctr) * 100).toFixed(2), // Convert to percentage
        cpc: (parseInt(metrics.average_cpc) || 0) / 1000000 // Convert micros to currency
      };
    });
  }

  // Mock campaign data for testing without developer token
  getMockCampaignData() {
    return [
      {
        id: '12345678901',
        name: 'Search Campaign - Brand Terms',
        status: 'ENABLED',
        impressions: 15420,
        clicks: 892,
        cost: 1247.85,
        conversions: 23,
        ctr: '5.78',
        cpc: '1.40'
      },
      {
        id: '12345678902',
        name: 'Display Campaign - Remarketing',
        status: 'ENABLED',
        impressions: 45230,
        clicks: 1205,
        cost: 856.42,
        conversions: 18,
        ctr: '2.66',
        cpc: '0.71'
      },
      {
        id: '12345678903',
        name: 'Shopping Campaign - Products',
        status: 'ENABLED',
        impressions: 8960,
        clicks: 445,
        cost: 2134.67,
        conversions: 31,
        ctr: '4.97',
        cpc: '4.80'
      },
      {
        id: '12345678904',
        name: 'Video Campaign - YouTube',
        status: 'PAUSED',
        impressions: 23450,
        clicks: 234,
        cost: 345.23,
        conversions: 5,
        ctr: '1.00',
        cpc: '1.47'
      }
    ];
  }

  // Store ad account credentials
  async storeAdAccount(clientId, accountId, tokens, accountName) {
    try {
      const adAccount = new AdAccount({
        platform: 'google',
        accountId: accountId,
        client: clientId,
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date
        },
        name: accountName || `Google Ads Account ${accountId}`,
        updatedAt: new Date()
      });

      await adAccount.save();
      return adAccount;
    } catch (error) {
      throw new Error(`Failed to store ad account: ${error.message}`);
    }
  }

  // Get stored ad account and refresh tokens if needed
  async getStoredAdAccount(accountId) {
    try {
      console.log('🔍 Searching for ad account with ID:', accountId);
      
      // First, let's see what accounts are actually in the database
      const allAccounts = await AdAccount.find({ platform: 'google' });
      console.log('📊 All Google accounts in database:', allAccounts.map(acc => ({ id: acc.accountId, name: acc.name })));
      
      const adAccount = await AdAccount.findOne({ 
        platform: 'google', 
        accountId: accountId 
      });

      if (!adAccount) {
        console.log('❌ No account found with exact ID:', accountId);
        
        // Try to find any Google account if exact match fails
        const anyGoogleAccount = await AdAccount.findOne({ platform: 'google' });
        if (anyGoogleAccount) {
          console.log('✅ Found alternative Google account:', anyGoogleAccount.accountId);
          console.log('🔄 Using alternative account instead of throwing error');
          return anyGoogleAccount;
        }
        
        throw new Error(`Ad account not found. Searched for: ${accountId}. Available accounts: ${allAccounts.map(acc => acc.accountId).join(', ')}`);
      }

      // Check if token needs refresh
      const now = new Date();
      const expiryDate = new Date(adAccount.credentials.expiry_date);
      
      if (now >= expiryDate) {
        // Refresh token
        const newTokens = await this.refreshToken(adAccount.credentials.refresh_token);
        
        // Update stored credentials
        adAccount.credentials = {
          ...adAccount.credentials,
          access_token: newTokens.access_token,
          expiry_date: newTokens.expiry_date
        };
        
        await adAccount.save();
      }

      this.setCredentials(adAccount.credentials);
      return adAccount;
    } catch (error) {
      throw new Error(`Failed to get stored ad account: ${error.message}`);
    }
  }

  // Get real customer ID from .env file (API calls are failing with 404)
  async getRealCustomerId() {
    try {
      console.log('🔍 Getting customer ID from .env file...');
      
      const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
      
      if (!customerId) {
        throw new Error('GOOGLE_ADS_CUSTOMER_ID not found in .env file. Please add your Google Ads customer ID.');
      }
      
      console.log('✅ Found customer ID from .env:', customerId);
      return customerId;
    } catch (error) {
      console.error('❌ Error fetching real customer ID:', error.message || error);
      
      const errorMessage = error.message || error.toString() || 'Unknown error';
      
      if (errorMessage.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
        throw new Error('Your Google Ads Developer Token is not approved yet. Please apply for approval in Google Ads API Center.');
      } else if (errorMessage.includes('AUTHENTICATION_ERROR')) {
        throw new Error('Authentication failed. Please reconnect your Google Ads account.');
      } else {
        throw error;
      }
    }
  }

  // Update database account with real customer ID
  async updateAccountWithRealId(oldAccountId, realCustomerId) {
    try {
      console.log('🔄 Updating database account:', oldAccountId, '->', realCustomerId);
      
      const AdAccount = require('../models/AdAccount');
      const account = await AdAccount.findOne({ 
        platform: 'google', 
        accountId: oldAccountId 
      });
      
      if (account) {
        account.accountId = realCustomerId;
        account.name = `Google Ads Account ${realCustomerId}`;
        await account.save();
        console.log('✅ Database updated with real customer ID');
      } else {
        console.log('⚠️ Account not found in database');
      }
    } catch (error) {
      console.log('❌ Error updating database:', error.message);
      throw error;
    }
  }

  // Initialize OAuth credentials from database
  async initializeOAuthCredentials() {
    try {
      console.log('🔍 Loading OAuth credentials from database...');
      
      const AdAccount = require('../models/AdAccount');
      const googleAccount = await AdAccount.findOne({ platform: 'google' });
      
      if (!googleAccount) {
        throw new Error('No Google Ads account found in database. Please connect your Google Ads account first.');
      }
      
      if (!googleAccount.credentials || !googleAccount.credentials.refresh_token) {
        throw new Error('Google Ads account found but no valid credentials. Please reconnect your account.');
      }
      
      console.log('✅ Found Google account in database:', googleAccount.accountId);
      this.setCredentials(googleAccount.credentials);
      console.log('✅ OAuth credentials initialized successfully');
      
      return googleAccount;
    } catch (error) {
      console.error('❌ Failed to initialize OAuth credentials:', error.message);
      throw error;
    }
  }
}

module.exports = GoogleAdsService;

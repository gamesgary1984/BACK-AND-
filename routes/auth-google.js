const express = require('express');
const GoogleAdsService = require('../services/googleAdsService');
const router = express.Router();

const googleAdsService = new GoogleAdsService();

// Google OAuth callback route
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        
        if (!code) {
            // Redirect to frontend with error
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/datasources?error=${encodeURIComponent('No authorization code received from Google')}`);
        }

        // Decode state parameter to get client and user info
        let stateData = {};
        if (state) {
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            } catch (error) {
                console.error('Error decoding state:', error);
                // Continue without state data for backward compatibility
            }
        }

        const { clientId, userId } = stateData;
        
        // Exchange code for tokens
        const tokens = await googleAdsService.getTokens(code);
        googleAdsService.setCredentials(tokens);
        
        // Try to get accessible ad accounts, but handle errors gracefully
        let adAccounts = [];
        let accountId = 'pending';
        let accountName = 'Google Ads Account (Connected)';
        
        try {
            console.log('🔍 Attempting to fetch Google Ads accounts...');
            adAccounts = await googleAdsService.getAdAccounts();
            console.log('✅ Successfully fetched ad accounts:', adAccounts.length);
            
            if (adAccounts.length > 0) {
                accountId = adAccounts[0].replace('customers/', '');
                accountName = `Google Ads Account ${accountId}`;
            }
        } catch (accountError) {
            console.log('⚠️ Could not fetch ad accounts (this is normal for new connections):', accountError.message);
            // Use OAuth user info to create a more meaningful account ID
            try {
                const { google } = require('googleapis');
                const oauth2 = google.oauth2('v2');
                const userInfo = await oauth2.userinfo.get({ auth: googleAdsService.oauth2Client });
                accountId = `user-${userInfo.data.id}`;
                accountName = `Google Ads - ${userInfo.data.email}`;
                console.log('✅ Using user info for account:', { accountId, accountName });
            } catch (userError) {
                console.log('⚠️ Could not get user info, using timestamp-based ID');
                accountId = `account-${Date.now()}`;
                accountName = 'Google Ads Account (Connected)';
            }
        }
        
        // Store the account connection in database
        if (clientId) {
            
            console.log('🔄 Attempting to store Google Ads account:', {
                clientId,
                accountId,
                accountName,
                hasTokens: !!tokens,
                tokenKeys: Object.keys(tokens || {})
            });
            
            try {
                const storedAccount = await googleAdsService.storeAdAccount(
                    clientId,
                    accountId,
                    tokens,
                    accountName
                );
                
                console.log('✅ Google Ads account stored successfully:', {
                    id: storedAccount._id,
                    platform: storedAccount.platform,
                    accountId: storedAccount.accountId,
                    clientId: storedAccount.client,
                    name: storedAccount.name,
                    hasCredentials: !!storedAccount.credentials
                });
                
                // Redirect to frontend with success
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/datasources?success=${encodeURIComponent('Google Ads connected successfully')}`);
                
            } catch (storeError) {
                console.error('Error storing Google Ads account:', storeError);
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/datasources?error=${encodeURIComponent('Failed to store account connection')}`);
            }
        } else {
            // No client ID in state - show HTML page for manual testing
            console.log('⚠️ No client ID in state, showing manual confirmation page');
            
            res.send(`
                <html>
                <head>
                    <title>Google Ads Authentication Success</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .success { color: #28a745; margin-bottom: 20px; }
                        .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff; }
                        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
                        .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 10px 0 0; }
                        .button:hover { background: #0056b3; }
                        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2 class="success">✅ Google Ads Authentication Successful!</h2>
                        
                        <div class="warning">
                            <h3>⚠️ Manual Connection Required</h3>
                            <p>The OAuth flow completed successfully, but no client was specified. To complete the connection:</p>
                            <ol>
                                <li>Go to the Data Sources page in your application</li>
                                <li>Click "Connect" on Google Ads</li>
                                <li>Select a client from the dropdown</li>
                                <li>Complete the OAuth flow with the client context</li>
                            </ol>
                        </div>
                        
                        <div class="info">
                            <h3>📊 Connection Details:</h3>
                            <p><strong>Access Token:</strong> ${tokens.access_token ? '✅ Received' : '❌ Missing'}</p>
                            <p><strong>Refresh Token:</strong> ${tokens.refresh_token ? '✅ Received' : '❌ Missing'}</p>
                            <p><strong>Token Expiry:</strong> ${new Date(tokens.expiry_date).toLocaleString()}</p>
                            <p><strong>Ad Accounts Found:</strong> ${adAccounts.length}</p>
                        </div>
                        
                        <div class="info">
                            <h3>🔗 Next Steps:</h3>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/datasources" class="button">Go to Data Sources</a>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">Dashboard</a>
                        </div>
                    </div>
                    
                    <script>
                        // Auto-redirect after 5 seconds
                        setTimeout(() => {
                            window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:5173'}/datasources';
                        }, 5000);
                    </script>
                </body>
                </html>
            `);
        }
        
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.status(500).send(`
            <html>
            <body>
                <h2>❌ Authentication Error</h2>
                <p>Error: ${error.message}</p>
                <a href="/">Back to Home</a>
            </body>
            </html>
        `);
    }
});

// Start Google OAuth flow
router.get('/google/start', (req, res) => {
    try {
        const authUrl = googleAdsService.getAuthUrl();
        res.redirect(authUrl);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

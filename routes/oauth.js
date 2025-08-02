const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const GoogleAdsService = require('../services/googleAdsService');
const router = express.Router();

// Initialize services
const googleAdsService = new GoogleAdsService();

// OAuth callback handler
router.post('/callback', authenticate, async (req, res) => {
    try {
        const { code, state } = req.body;

        if (!code || !state) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                required: ['code', 'state']
            });
        }

        // Decode state parameter
        let stateData;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch (error) {
            return res.status(400).json({ 
                error: 'Invalid state parameter' 
            });
        }

        const { type, clientId, userId } = stateData;

        if (!type || !clientId || !userId) {
            return res.status(400).json({ 
                error: 'Invalid state data',
                required: ['type', 'clientId', 'userId']
            });
        }

        // Verify user matches
        if (userId !== req.user.id) {
            return res.status(403).json({ 
                error: 'User mismatch' 
            });
        }

        // Handle OAuth callback based on datasource type
        let result;
        switch (type) {
            case 'google-ads':
                result = await handleGoogleAdsCallback(code, clientId);
                break;
            
            case 'facebook-ads':
                // Facebook OAuth callback implementation would go here
                return res.status(501).json({ 
                    error: 'Facebook Ads OAuth not yet implemented' 
                });
            
            case 'tiktok-ads':
                // TikTok OAuth callback implementation would go here
                return res.status(501).json({ 
                    error: 'TikTok Ads OAuth not yet implemented' 
                });
            
            default:
                return res.status(400).json({ 
                    error: 'Unsupported datasource type',
                    type: type
                });
        }

        res.json({
            message: 'OAuth callback processed successfully',
            datasource: type,
            account: result
        });

    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).json({ 
            error: 'Failed to process OAuth callback',
            message: error.message 
        });
    }
});

// Handle Google Ads OAuth callback
async function handleGoogleAdsCallback(code, clientId) {
    try {
        // Exchange code for tokens
        const tokens = await googleAdsService.getTokens(code);
        
        // Set credentials to get account info
        googleAdsService.setCredentials(tokens);
        
        // Get ad accounts
        const accounts = await googleAdsService.getAdAccounts();
        
        // For now, use the first account or create a default one
        const accountId = accounts.length > 0 ? accounts[0].replace('customers/', '') : 'default';
        const accountName = `Google Ads Account ${accountId}`;
        
        // Store the ad account
        const storedAccount = await googleAdsService.storeAdAccount(
            clientId,
            accountId,
            tokens,
            accountName
        );

        return {
            id: storedAccount._id,
            accountId: storedAccount.accountId,
            name: storedAccount.name,
            platform: storedAccount.platform
        };

    } catch (error) {
        throw new Error(`Google Ads OAuth error: ${error.message}`);
    }
}

// GET callback route for direct browser redirects (alternative to POST)
router.get('/callback/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`/datasources?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            return res.redirect('/datasources?error=Missing OAuth parameters');
        }

        // For GET requests, we'll redirect to a frontend callback page that will handle the POST
        const callbackUrl = `/oauth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&type=${type}`;
        res.redirect(callbackUrl);

    } catch (error) {
        console.error('OAuth GET callback error:', error);
        res.redirect(`/datasources?error=${encodeURIComponent('OAuth callback failed')}`);
    }
});

module.exports = router;

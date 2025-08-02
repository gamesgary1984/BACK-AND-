const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const GoogleAdsService = require('../services/googleAdsService');
const AdAccount = require('../models/AdAccount');
const router = express.Router();

const googleAdsService = new GoogleAdsService();

// Start Google Ads OAuth flow
router.post('/google-ads/auth', authenticate, authorize('admin'), (req, res) => {
    try {
        const authUrl = googleAdsService.getAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle Google Ads OAuth callback
router.post('/google-ads/callback', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { code, clientId } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }
        
        // Exchange code for tokens
        const tokens = await googleAdsService.getTokens(code);
        googleAdsService.setCredentials(tokens);
        
        // Get accessible ad accounts
        const adAccounts = await googleAdsService.getAdAccounts();
        
        // Store the first account (or let user choose)
        if (adAccounts.length > 0) {
            const accountId = adAccounts[0].replace('customers/', '');
            const storedAccount = await googleAdsService.storeAdAccount(
                clientId || req.user.id, 
                accountId, 
                tokens,
                `Google Ads Account ${accountId}`
            );
            
            res.json({ 
                success: true, 
                account: storedAccount,
                availableAccounts: adAccounts
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Authentication successful but no ad accounts found',
                tokens 
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Google Ads campaigns
router.get('/google-ads/campaigns/:accountId', authenticate, async (req, res) => {
    try {
        const { accountId } = req.params;
        
        // Get stored account and set credentials
        const adAccount = await googleAdsService.getStoredAdAccount(accountId);
        
        // Fetch campaigns
        const campaigns = await googleAdsService.getCampaigns(accountId);
        
        res.json({ campaigns, account: adAccount.name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all connected Google Ads accounts
router.get('/google-ads/accounts', authenticate, async (req, res) => {
    try {
        const accounts = await AdAccount.find({ 
            platform: 'google',
            client: req.user.clientId || req.user.id 
        }).select('-credentials');
        
        res.json({ accounts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/facebook-ads', authenticate, authorize('admin'), (req, res) => {
    res.json({ authUrl: 'https://www.facebook.com/v18.0/dialog/oauth' });
});

router.post('/tiktok-ads', authenticate, authorize('admin'), (req, res) => {
    res.json({ authUrl: 'https://ads.tiktok.com/marketing_api/auth' });
});

module.exports = router;

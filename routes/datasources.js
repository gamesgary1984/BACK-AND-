const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const AdAccount = require('../models/AdAccount');
const GoogleAdsService = require('../services/googleAdsService');
const router = express.Router();

// Initialize services
const googleAdsService = new GoogleAdsService();

// Supported datasource types with their configurations
const DATASOURCE_TYPES = {
    'google-ads': {
        name: 'Google Ads',
        authType: 'oauth2',
        scopes: ['https://www.googleapis.com/auth/adwords'],
        service: googleAdsService
    },
    'facebook-ads': {
        name: 'Facebook Ads',
        authType: 'oauth2',
        scopes: ['ads_read', 'ads_management'],
        service: null // To be implemented
    },
    'tiktok-ads': {
        name: 'TikTok Ads',
        authType: 'oauth2',
        scopes: ['advertiser.read', 'campaign.read'],
        service: null // To be implemented
    }
};

// GET /datasources - Get all datasources with their connection status
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Clean up any test accounts first
        await AdAccount.deleteMany({ accountId: '1234567890' });
        console.log('🧹 Cleaned up test accounts');
        
        // Get all connected ad accounts (for now, show all accounts to all users)
        // TODO: Implement proper user-client associations for multi-tenant support
        const connectedAccounts = await AdAccount.find({ platform: { $in: ['google', 'facebook', 'tiktok'] } }).populate('client', 'name');
        
        console.log(`🔍 Found ${connectedAccounts.length} connected accounts:`, 
            connectedAccounts.map(acc => ({
                id: acc._id,
                platform: acc.platform,
                accountId: acc.accountId,
                clientName: acc.client?.name
            }))
        );

        // Build datasources response with dynamic status
        const datasources = Object.keys(DATASOURCE_TYPES).map(type => {
            const config = DATASOURCE_TYPES[type];
            const connectedAccount = connectedAccounts.find(account => account.platform === type.replace('-ads', ''));
            
            return {
                id: type,
                name: config.name,
                type: type,
                status: connectedAccount ? 'connected' : 'disconnected',
                authType: config.authType,
                scopes: config.scopes,
                connectedAccount: connectedAccount ? {
                    id: connectedAccount._id,
                    accountId: connectedAccount.accountId,
                    name: connectedAccount.name,
                    client: connectedAccount.client?.name,
                    lastUpdated: connectedAccount.updatedAt
                } : null,
                capabilities: {
                    canConnect: true,
                    canDisconnect: connectedAccount ? true : false,
                    canRefresh: connectedAccount ? true : false
                }
            };
        });

        res.json({ 
            datasources,
            summary: {
                total: datasources.length,
                connected: datasources.filter(ds => ds.status === 'connected').length,
                disconnected: datasources.filter(ds => ds.status === 'disconnected').length
            }
        });
    } catch (error) {
        console.error('Error fetching datasources:', error);
        res.status(500).json({ 
            error: 'Failed to fetch datasources',
            message: error.message 
        });
    }
});

// POST /datasources/connect - Initiate connection to a datasource
router.post('/connect', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { type, clientId } = req.body;

        if (!type || !DATASOURCE_TYPES[type]) {
            return res.status(400).json({ 
                error: 'Invalid datasource type',
                supportedTypes: Object.keys(DATASOURCE_TYPES)
            });
        }

        if (!clientId) {
            return res.status(400).json({ 
                error: 'Client ID is required' 
            });
        }

        const config = DATASOURCE_TYPES[type];
        
        // Check if already connected
        const existingAccount = await AdAccount.findOne({
            platform: type.replace('-ads', ''),
            client: clientId
        });

        if (existingAccount) {
            return res.status(409).json({ 
                error: 'Datasource already connected for this client',
                account: {
                    id: existingAccount._id,
                    name: existingAccount.name,
                    lastUpdated: existingAccount.updatedAt
                }
            });
        }

        // Generate auth URL based on datasource type
        let authUrl;
        let state;

        switch (type) {
            case 'google-ads':
                authUrl = config.service.getAuthUrl();
                state = Buffer.from(JSON.stringify({ type, clientId, userId: req.user.id })).toString('base64');
                authUrl += `&state=${state}`;
                break;
            
            case 'facebook-ads':
                // Facebook OAuth implementation would go here
                authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)}&scope=${config.scopes.join(',')}&state=${Buffer.from(JSON.stringify({ type, clientId, userId: req.user.id })).toString('base64')}`;
                break;
            
            case 'tiktok-ads':
                // TikTok OAuth implementation would go here
                authUrl = `https://ads.tiktok.com/marketing_api/auth?app_id=${process.env.TIKTOK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.TIKTOK_REDIRECT_URI)}&scope=${config.scopes.join(',')}&state=${Buffer.from(JSON.stringify({ type, clientId, userId: req.user.id })).toString('base64')}`;
                break;
            
            default:
                return res.status(501).json({ 
                    error: 'Datasource connection not yet implemented',
                    type: type
                });
        }

        res.json({ 
            message: `Initiating ${config.name} connection`,
            authUrl: authUrl,
            type: type,
            clientId: clientId,
            instructions: `Please visit the auth URL to authorize access to your ${config.name} account.`
        });

    } catch (error) {
        console.error('Error initiating datasource connection:', error);
        res.status(500).json({ 
            error: 'Failed to initiate connection',
            message: error.message 
        });
    }
});

// POST /datasources/disconnect - Disconnect a datasource
router.post('/disconnect', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { accountId } = req.body;

        if (!accountId) {
            return res.status(400).json({ 
                error: 'Account ID is required' 
            });
        }

        const account = await AdAccount.findById(accountId);
        if (!account) {
            return res.status(404).json({ 
                error: 'Account not found' 
            });
        }

        await AdAccount.findByIdAndDelete(accountId);

        res.json({ 
            message: 'Datasource disconnected successfully',
            disconnectedAccount: {
                id: account._id,
                platform: account.platform,
                name: account.name
            }
        });

    } catch (error) {
        console.error('Error disconnecting datasource:', error);
        res.status(500).json({ 
            error: 'Failed to disconnect datasource',
            message: error.message 
        });
    }
});

// GET /datasources/:type/status - Get detailed status for a specific datasource type
router.get('/:type/status', authenticate, async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!DATASOURCE_TYPES[type]) {
            return res.status(400).json({ 
                error: 'Invalid datasource type',
                supportedTypes: Object.keys(DATASOURCE_TYPES)
            });
        }

        const platform = type.replace('-ads', '');
        const accounts = await AdAccount.find({
            platform: platform
        }).populate('client', 'name');
        
        console.log(`🔍 Found ${accounts.length} ${platform} accounts:`, 
            accounts.map(acc => ({
                id: acc._id,
                accountId: acc.accountId,
                clientName: acc.client?.name
            }))
        );

        const config = DATASOURCE_TYPES[type];
        
        res.json({
            type: type,
            name: config.name,
            platform: platform,
            accounts: accounts.map(account => ({
                id: account._id,
                accountId: account.accountId,
                name: account.name,
                client: account.client?.name,
                status: 'connected',
                lastUpdated: account.updatedAt,
                hasValidCredentials: account.credentials && account.credentials.access_token ? true : false
            })),
            summary: {
                totalAccounts: accounts.length,
                connectedClients: [...new Set(accounts.map(acc => acc.client?._id))].length
            }
        });

    } catch (error) {
        console.error('Error getting datasource status:', error);
        res.status(500).json({ 
            error: 'Failed to get datasource status',
            message: error.message 
        });
    }
});

module.exports = router;

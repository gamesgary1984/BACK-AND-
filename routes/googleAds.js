const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const GoogleAdsService = require('../services/googleAdsService');
const AdAccount = require('../models/AdAccount');
const router = express.Router();

const googleAdsService = new GoogleAdsService();

// Get Google Ads performance data for reporting
router.get('/performance/:accountId', authenticate, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { dateRange = '30' } = req.query; // Default to last 30 days
        
        // Check if this is the test account ID
        if (accountId === '1234567890') {
            return res.status(400).json({
                error: 'Test account detected',
                message: 'Please reconnect your Google Ads account to get real data',
                action: 'Go to Data Sources page and reconnect Google Ads'
            });
        }
        
        // Get stored account and set credentials
        const adAccount = await googleAdsService.getStoredAdAccount(accountId);
        
        // Fetch campaign performance data
        const campaigns = await googleAdsService.getCampaigns(accountId);
        
        // Calculate summary metrics
        const summary = campaigns.reduce((acc, campaign) => {
            acc.totalImpressions += parseInt(campaign.impressions) || 0;
            acc.totalClicks += parseInt(campaign.clicks) || 0;
            acc.totalCost += parseFloat(campaign.cost) || 0;
            acc.totalConversions += parseFloat(campaign.conversions) || 0;
            return acc;
        }, {
            totalImpressions: 0,
            totalClicks: 0,
            totalCost: 0,
            totalConversions: 0
        });
        
        // Calculate overall metrics
        summary.overallCTR = summary.totalImpressions > 0 
            ? (summary.totalClicks / summary.totalImpressions * 100).toFixed(2)
            : 0;
        summary.overallCPC = summary.totalClicks > 0 
            ? (summary.totalCost / summary.totalClicks).toFixed(2)
            : 0;
        summary.conversionRate = summary.totalClicks > 0 
            ? (summary.totalConversions / summary.totalClicks * 100).toFixed(2)
            : 0;
        
        res.json({
            accountName: adAccount.name,
            accountId: accountId,
            dateRange: `Last ${dateRange} days`,
            summary,
            campaigns,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Google Ads data formatted for reports
router.get('/report-data/:accountId', authenticate, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { format = 'table' } = req.query; // table, chart, summary
        
        // Check if this is the test account ID
        if (accountId === '1234567890') {
            return res.status(400).json({
                error: 'Test account detected',
                message: 'Please reconnect your Google Ads account to get real data',
                action: 'Go to Data Sources page and reconnect Google Ads'
            });
        }
        
        // Get stored account and set credentials
        const adAccount = await googleAdsService.getStoredAdAccount(accountId);
        
        // Fetch campaign data
        const campaigns = await googleAdsService.getCampaigns(accountId);
        
        let formattedData;
        
        switch (format) {
            case 'chart':
                formattedData = {
                    type: 'chart',
                    data: {
                        labels: campaigns.map(c => c.name),
                        datasets: [
                            {
                                label: 'Impressions',
                                data: campaigns.map(c => c.impressions),
                                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                borderColor: 'rgba(54, 162, 235, 1)'
                            },
                            {
                                label: 'Clicks',
                                data: campaigns.map(c => c.clicks),
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                borderColor: 'rgba(255, 99, 132, 1)'
                            },
                            {
                                label: 'Cost',
                                data: campaigns.map(c => c.cost),
                                backgroundColor: 'rgba(255, 206, 86, 0.2)',
                                borderColor: 'rgba(255, 206, 86, 1)'
                            }
                        ]
                    }
                };
                break;
                
            case 'summary':
                const totalImpressions = campaigns.reduce((sum, c) => sum + (parseInt(c.impressions) || 0), 0);
                const totalClicks = campaigns.reduce((sum, c) => sum + (parseInt(c.clicks) || 0), 0);
                const totalCost = campaigns.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);
                const totalConversions = campaigns.reduce((sum, c) => sum + (parseFloat(c.conversions) || 0), 0);
                
                formattedData = {
                    type: 'summary',
                    data: {
                        metrics: [
                            { label: 'Total Impressions', value: totalImpressions.toLocaleString() },
                            { label: 'Total Clicks', value: totalClicks.toLocaleString() },
                            { label: 'Total Cost', value: `$${totalCost.toFixed(2)}` },
                            { label: 'Total Conversions', value: totalConversions.toFixed(0) },
                            { label: 'Average CTR', value: `${totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0}%` },
                            { label: 'Average CPC', value: `$${totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : 0}` }
                        ]
                    }
                };
                break;
                
            default: // table
                formattedData = {
                    type: 'table',
                    data: {
                        headers: ['Campaign', 'Status', 'Impressions', 'Clicks', 'CTR', 'Cost', 'CPC', 'Conversions'],
                        rows: campaigns.map(campaign => [
                            campaign.name,
                            campaign.status,
                            campaign.impressions.toLocaleString(),
                            campaign.clicks.toLocaleString(),
                            `${campaign.ctr}%`,
                            `$${campaign.cost}`,
                            `$${campaign.cpc}`,
                            campaign.conversions
                        ])
                    }
                };
        }
        
        res.json({
            accountName: adAccount.name,
            accountId: accountId,
            format,
            ...formattedData,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get account health status
router.get('/health/:accountId', authenticate, async (req, res) => {
    try {
        const { accountId } = req.params;
        
        // Get stored account and set credentials
        const adAccount = await googleAdsService.getStoredAdAccount(accountId);
        
        // Check if credentials are still valid by making a simple API call
        try {
            await googleAdsService.getAdAccounts();
            res.json({
                accountId,
                accountName: adAccount.name,
                status: 'healthy',
                lastChecked: new Date().toISOString(),
                message: 'Account connection is working properly'
            });
        } catch (apiError) {
            res.json({
                accountId,
                accountName: adAccount.name,
                status: 'error',
                lastChecked: new Date().toISOString(),
                message: 'Account connection needs to be refreshed',
                error: apiError.message
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

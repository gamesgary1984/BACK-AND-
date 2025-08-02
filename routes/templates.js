const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    res.json({ 
        templates: [
            { id: 1, name: 'Blank Report', description: 'Start from scratch' },
            { id: 2, name: 'Google Ads Template', description: 'Google Ads KPIs' },
            { id: 3, name: 'Facebook Ads Template', description: 'Facebook KPIs' }
        ] 
    });
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
    res.json({ id: Date.now(), message: 'Template saved successfully' });
});

module.exports = router;

const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    res.json({ 
        reports: [
            { id: 1, name: 'Monthly Performance - Client A', status: 'sent', date: '2025-07-31' },
            { id: 2, name: 'Weekly Report - Client B', status: 'draft', date: '2025-07-30' },
            { id: 3, name: 'Q2 Summary - Client C', status: 'sent', date: '2025-06-30' }
        ] 
    });
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
    res.json({ id: Date.now(), message: 'Report created successfully' });
});

router.get('/:id', authenticate, (req, res) => {
    res.json({ id: req.params.id, name: 'Sample Report', data: {} });
});

module.exports = router;

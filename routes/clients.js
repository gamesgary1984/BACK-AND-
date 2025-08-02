const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const Client = require('../models/Client');
const AdAccount = require('../models/AdAccount');
const router = express.Router();

// Get all clients
router.get('/', authenticate, async (req, res) => {
  const clients = await Client.find().populate('adAccounts');
  res.json({ clients });
});

// Create new client
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, logo, timezone, contacts } = req.body;
  const client = new Client({ name, logo, timezone, contacts });
  await client.save();
  res.json({ client });
});

// Add ad account to client
router.post('/:id/adaccount', authenticate, authorize('admin'), async (req, res) => {
  const { platform, accountId, credentials, name } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const adAccount = new AdAccount({ platform, accountId, credentials, name, client: client._id });
  await adAccount.save();
  client.adAccounts.push(adAccount._id);
  await client.save();
  res.json({ adAccount });
});

// Update client
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ client });
});

// Delete client
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const client = await Client.findByIdAndDelete(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ message: 'Client deleted' });
});

module.exports = router;

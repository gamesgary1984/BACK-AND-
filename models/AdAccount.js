const mongoose = require('mongoose');

const adAccountSchema = new mongoose.Schema({
  platform: { type: String, enum: ['google', 'facebook', 'tiktok'], required: true },
  accountId: { type: String, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  credentials: { type: Object }, // OAuth tokens or keys
  name: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdAccount', adAccountSchema);

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String }, // URL
  timezone: { type: String, default: 'Asia/Jerusalem' },
  contacts: [{ name: String, email: String }],
  adAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdAccount' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);

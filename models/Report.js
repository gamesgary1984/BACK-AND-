const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
  type: { type: String, required: true }, // graph, table, kpi, text
  config: { type: Object }, // widget-specific config
  order: { type: Number },
});

const reportSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  layout: [widgetSchema],
  filters: { type: Object },
  platforms: [{ type: String, enum: ['google', 'facebook', 'tiktok'] }],
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  schedule: { type: Object }, // { frequency, time, recipients }
  format: { type: String, enum: ['pdf', 'link'], default: 'link' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);

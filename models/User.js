const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // hashed
  name: { type: String },
  role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
  oauthProvider: { type: String, enum: ['google', 'facebook', null], default: null },
  oauthId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

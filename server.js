const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// DB connection
const connectDB = require('./db');
connectDB();

// CORS configuration
const corsOptions = {
  origin: '*', // Or specify your frontend URL: 'http://localhost:5173'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/datasources', require('./routes/datasources'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/google-ads', require('./routes/googleAds'));
app.use('/api/oauth', require('./routes/oauth')); // OAuth callback routes
app.use('/auth', require('./routes/auth-google')); // Google OAuth routes

app.get('/', (req, res) => {
  res.send('Swydo Reporting System API is running.');
});
// Serve React app
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Swydo Reporting System running on port ${PORT}`);
//   console.log(`📊 Dashboard: http://localhost:${PORT}`);
// });
module.exports = app;

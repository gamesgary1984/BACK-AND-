const connectDB = require('./db');

(async () => {
  try {
    await connectDB();
    console.log('✅ Test: MongoDB connection successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test: MongoDB connection failed:', err);
    process.exit(1);
  }
})();

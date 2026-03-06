const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed if collections are empty
    try {
      const { autoSeed } = require('../controllers/careerController');
      await autoSeed();
    } catch (seedErr) {
      console.error('Auto-seed error:', seedErr.message);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

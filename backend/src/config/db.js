const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed all collections after DB connection is established
    try {
      const { autoSeed } = require('../controllers/careerController');
      await autoSeed();
    } catch (seedErr) {
      console.error('Auto-seed (careers/colleges) error:', seedErr.message);
    }

    // Seed scholarships, resources, timeline — these were previously called at import
    // time before the DB connected, causing buffering timeouts
    try {
      const scholarshipRoutes = require('../routes/scholarshipRoutes');
      if (scholarshipRoutes._seedScholarships) {
        await scholarshipRoutes._seedScholarships();
        console.log('[Seed] Scholarships checked');
      }
    } catch (e) {
      console.error('[Seed] Scholarships error:', e.message);
    }

    try {
      const resourceRoutes = require('../routes/resourceRoutes');
      if (resourceRoutes._seedResources) {
        await resourceRoutes._seedResources();
        console.log('[Seed] Resources checked');
      }
    } catch (e) {
      console.error('[Seed] Resources error:', e.message);
    }

    try {
      const timelineRoutes = require('../routes/timelineRoutes');
      if (timelineRoutes._seedTimeline) {
        await timelineRoutes._seedTimeline();
        console.log('[Seed] Timeline checked');
      }
    } catch (e) {
      console.error('[Seed] Timeline error:', e.message);
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

const express = require('express');
const router = express.Router();
const { getRecommendations, getCareers, seedData, updateData } = require('../controllers/careerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/recommend', protect, getRecommendations);
router.get('/', getCareers);
router.post('/seed', seedData);
router.post('/update-data', updateData); // triggers careerDataUpdater scraper

module.exports = router;

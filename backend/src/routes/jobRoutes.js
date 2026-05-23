const express = require('express');
const router = express.Router();
const { getJobs, getTrendingSkills, getMarketData } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/jobs?career=Software+Engineer&location=Hyderabad  (auth required)
router.get('/', protect, getJobs);

// GET /api/jobs/trending — Remotive aggregated skills/sectors (public)
router.get('/trending', getTrendingSkills);

// GET /api/jobs/market?career=Software+Engineer
// Returns all 4 Adzuna data types: history, histogram, regional, topCompanies (public)
router.get('/market', getMarketData);

module.exports = router;

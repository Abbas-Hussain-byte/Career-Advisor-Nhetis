const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/chat — send a message and get a Gemini response (auth required)
router.post('/', protect, chat);

module.exports = router;

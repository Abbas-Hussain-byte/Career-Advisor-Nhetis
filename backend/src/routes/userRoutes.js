const express = require('express');
const router = express.Router();
const { registerUser, authUser, getUserProfile, updateUserProfile, saveAssessment } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', registerUser);
router.post('/login', authUser);
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);
router.put('/assessment', protect, saveAssessment);

module.exports = router;

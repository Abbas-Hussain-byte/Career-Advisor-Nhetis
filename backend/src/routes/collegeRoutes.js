const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const College = require('../models/collegeModel');

// @desc    Get colleges (with optional location-based or filter queries)
// @route   GET /api/colleges
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const { lat, lng, radius, state, program, q } = req.query;

    let query = {};

    // If lat/lng given, use geospatial query
    if (lat && lng) {
        const radiusMeters = parseFloat(radius) || 100000; // default 100km
        const colleges = await College.find({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: radiusMeters
                }
            }
        }).limit(20);
        return res.json(colleges);
    }

    // Text filter fallback
    if (state) query.state = { $regex: state, $options: 'i' };
    if (program) query.programs = { $elemMatch: { $regex: program, $options: 'i' } };
    if (q) query.name = { $regex: q, $options: 'i' };

    const colleges = await College.find(query).limit(30);
    res.json(colleges);
}));

// @desc    Get a single college
// @route   GET /api/colleges/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    const college = await College.findById(req.params.id);
    if (!college) {
        res.status(404);
        throw new Error('College not found');
    }
    res.json(college);
}));

module.exports = router;

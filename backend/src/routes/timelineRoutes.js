const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const TimelineEvent = require('../models/timelineModel');
const { protect } = require('../middleware/authMiddleware');

// Verified Indian academic calendar events (2026 tentative based on historical patterns)
const SEED_EVENTS = [
    // ── JEE ──
    { title: 'JEE Main 2026 — Session 1', description: 'Joint Entrance Examination Main, Session 1. For admission to NITs, IIITs, and GFTIs.', date: '2026-01-20', endDate: '2026-01-30', type: 'exam', stream: ['Science-PCM'], grade: ['12'], important: true, source: 'NTA', url: 'https://jeemain.nta.nic.in/' },
    { title: 'JEE Main 2026 — Session 2', description: 'JEE Main Session 2 for candidates wanting to improve Session 1 score.', date: '2026-04-01', endDate: '2026-04-15', type: 'exam', stream: ['Science-PCM'], grade: ['12'], important: true, source: 'NTA', url: 'https://jeemain.nta.nic.in/' },
    { title: 'JEE Advanced 2026', description: 'For admission to IITs. Only top 2.5 lakh JEE Main qualifiers eligible.', date: '2026-05-25', type: 'exam', stream: ['Science-PCM'], grade: ['12'], important: true, source: 'IIT', url: 'https://jeeadv.ac.in/' },

    // ── NEET ──
    { title: 'NEET UG 2026', description: 'National Eligibility cum Entrance Test for MBBS, BDS, BAMS, BHMS admissions.', date: '2026-05-04', type: 'exam', stream: ['Science-PCB'], grade: ['12'], important: true, source: 'NTA', url: 'https://neet.nta.nic.in/' },
    { title: 'NEET UG 2026 — Registration Opens', description: 'Online registration for NEET UG 2026 begins.', date: '2026-02-01', type: 'exam', stream: ['Science-PCB'], grade: ['12'], important: false, source: 'NTA', url: 'https://neet.nta.nic.in/' },

    // ── CLAT ──
    { title: 'CLAT 2026', description: 'Common Law Admission Test for admission to 22 National Law Universities.', date: '2026-12-01', type: 'exam', stream: ['Arts / Humanities', 'Commerce'], grade: ['12'], important: true, source: 'CLAT Consortium', url: 'https://consortiumofnlus.ac.in/' },

    // ── Board Exams ──
    { title: 'CBSE Class 12 Board Exams 2026', description: 'CBSE Class 12 board examinations begin.', date: '2026-02-15', endDate: '2026-04-10', type: 'exam', stream: ['All'], grade: ['12'], important: true, source: 'CBSE', url: 'https://cbse.gov.in/' },
    { title: 'CBSE Class 10 Board Exams 2026', description: 'CBSE Class 10 board examinations begin.', date: '2026-02-15', endDate: '2026-03-25', type: 'exam', stream: ['All'], grade: ['10'], important: true, source: 'CBSE', url: 'https://cbse.gov.in/' },

    // ── Counselling ──
    { title: 'JoSAA 2026 Counselling — Round 1', description: 'Joint Seat Allocation Authority counselling for IITs, NITs, IIITs, GFTIs.', date: '2026-06-15', type: 'counseling', stream: ['Science-PCM'], grade: ['12'], important: true, source: 'JoSAA', url: 'https://josaa.nic.in/' },
    { title: 'NEET Counselling (MCC) — Round 1', description: 'Medical Counselling Committee first round for AIIMS, JIPMER, govt. medical colleges.', date: '2026-07-01', type: 'counseling', stream: ['Science-PCB'], grade: ['12'], important: true, source: 'MCC', url: 'https://mcc.nic.in/' },

    // ── Scholarships ──
    { title: 'NSP Scholarship Portal Opens 2026-27', description: 'National Scholarship Portal opens for fresh and renewal applications.', date: '2026-08-01', type: 'scholarship', stream: ['All'], grade: ['10', '12', 'UG'], important: true, source: 'NSP', url: 'https://scholarships.gov.in' },
    { title: 'CSSS Scholarship Deadline', description: 'Central Sector Scheme of Scholarship — last date for fresh applications.', date: '2026-10-31', type: 'scholarship', stream: ['All'], grade: ['UG'], important: true, source: 'NSP', url: 'https://scholarships.gov.in' },
    { title: 'AICTE Pragati Scholarship Deadline', description: 'Last date to apply for AICTE Pragati (girls) and Saksham (PwD) scholarships.', date: '2026-12-31', type: 'scholarship', stream: ['Science-PCM', 'Science-PCB'], grade: ['UG'], important: false, source: 'AICTE', url: 'https://www.aicte-india.org/' },

    // ── Admission ──
    { title: 'DU Admissions 2026 — CUET Registration', description: 'Delhi University admissions via CUET — registration opens.', date: '2026-02-15', type: 'admission', stream: ['All'], grade: ['12'], important: true, source: 'CUET/DU', url: 'https://cuet.samarth.ac.in/' },
    { title: 'CUET UG 2026 Exam', description: 'Common University Entrance Test for central universities admission.', date: '2026-05-15', endDate: '2026-05-30', type: 'exam', stream: ['All'], grade: ['12'], important: true, source: 'NTA', url: 'https://cuet.samarth.ac.in/' },
];

const seedTimeline = async () => {
    const count = await TimelineEvent.countDocuments();
    if (count === 0) {
        await TimelineEvent.insertMany(SEED_EVENTS);
        console.log('[Seed] Timeline events seeded:', SEED_EVENTS.length);
    }
};

// @desc    Get all timeline events (filterable)
// @route   GET /api/timeline
const getTimeline = asyncHandler(async (req, res) => {
    const { type, stream, grade } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (stream) filter.stream = { $in: [stream, 'All'] };
    if (grade) filter.grade = { $in: [grade] };
    const events = await TimelineEvent.find(filter).sort({ date: 1 });
    res.json(events);
});

// @desc    Get upcoming events for logged-in user (next 60 days)
// @route   GET /api/timeline/upcoming
const getUpcoming = asyncHandler(async (req, res) => {
    const user = req.user;
    const grade = user.profile?.grade || '12';
    const stream = user.profile?.stream || '';

    const today = new Date().toISOString().split('T')[0];
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

    const filter = {
        date: { $gte: today, $lte: in60 },
        grade: { $in: [grade, 'UG'] },
    };
    if (stream) {
        filter.stream = { $in: [stream, 'All'] };
    }

    const events = await TimelineEvent.find(filter).sort({ date: 1 });
    res.json(events);
});

router.get('/', getTimeline);
router.get('/upcoming', protect, getUpcoming);

router._seedTimeline = seedTimeline;

module.exports = router;

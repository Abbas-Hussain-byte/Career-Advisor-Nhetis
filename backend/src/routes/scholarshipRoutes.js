const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Scholarship = require('../models/scholarshipModel');
const { protect } = require('../middleware/authMiddleware');

// Seed verified scholarship data from official Indian sources
const SEED_SCHOLARSHIPS = [
    // ── Central Government Schemes (NSP) ──────────────────────────────────
    {
        name: 'Post-Matric Scholarship for SC Students',
        provider: 'Ministry of Social Justice & Empowerment',
        description: 'Financial assistance for SC students studying post-matriculation courses including Class 11-12, UG, PG, and professional courses.',
        eligibility: 'SC category students. Family income below ₹2.5 Lakh/year. Minimum 50% marks in previous exam.',
        amount: '₹230 to ₹1,200/month (maintenance) + tuition fee waiver',
        deadline: 'November 30 (varies yearly)',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'sc-st',
        targetGrade: ['12', 'UG', 'PG'],
        targetStream: ['All'],
        incomeLimit: 'Below ₹2.5 Lakh/year',
        source: 'NSP',
        verified: true,
    },
    {
        name: 'Post-Matric Scholarship for ST Students',
        provider: 'Ministry of Tribal Affairs',
        description: 'Scholarship covering tuition fees, maintenance allowance, and book grants for ST students pursuing higher education.',
        eligibility: 'ST category students. Family income below ₹2.5 Lakh/year.',
        amount: '₹230 to ₹1,200/month + full tuition fee',
        deadline: 'November 30 (varies yearly)',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'sc-st',
        targetGrade: ['12', 'UG', 'PG'],
        targetStream: ['All'],
        incomeLimit: 'Below ₹2.5 Lakh/year',
        source: 'NSP',
        verified: true,
    },
    {
        name: 'Post-Matric Scholarship for OBC Students',
        provider: 'Ministry of Social Justice & Empowerment',
        description: 'Financial support for OBC students for post-matric studies in recognized institutions.',
        eligibility: 'OBC category students. Family income below ₹1 Lakh/year (for non-creamy layer).',
        amount: 'Up to ₹1,000/month maintenance + non-refundable fees',
        deadline: 'November 30',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'obc',
        targetGrade: ['12', 'UG', 'PG'],
        targetStream: ['All'],
        incomeLimit: 'Below ₹1 Lakh/year',
        source: 'NSP',
        verified: true,
    },
    {
        name: 'Central Sector Scheme of Scholarship (CSSS)',
        provider: 'Ministry of Education, Government of India',
        description: 'Merit-cum-means scholarship for students who scored above 80th percentile in Class 12 board exams. For pursuing UG and PG courses.',
        eligibility: 'Above 80th percentile in Class 12. Family income below ₹8 Lakh/year. Regular study in government/aided college.',
        amount: '₹10,000/year (UG 1st-3rd year), ₹20,000/year (PG)',
        deadline: 'October 31',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'merit',
        targetGrade: ['UG', 'PG'],
        targetStream: ['All'],
        incomeLimit: 'Below ₹8 Lakh/year',
        source: 'NSP',
        verified: true,
    },
    {
        name: 'Prime Minister\'s Scholarship Scheme (PMSS)',
        provider: 'Ministry of Defence',
        description: 'Scholarship for the wards and widows of ex-servicemen/ex-coast guard personnel for professional degree courses.',
        eligibility: 'Wards of ex-servicemen. Minimum 60% in Class 12 or diploma. Professional degree courses only.',
        amount: '₹3,000/month (boys), ₹3,000/month (girls)',
        deadline: 'October 15',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'central',
        targetGrade: ['UG'],
        targetStream: ['All'],
        incomeLimit: 'No limit',
        source: 'NSP',
        verified: true,
    },
    {
        name: 'AICTE Pragati Scholarship for Girls',
        provider: 'AICTE (All India Council for Technical Education)',
        description: 'For girl students admitted to AICTE-approved degree/diploma programs. One girl per family eligible.',
        eligibility: 'Girl students in AICTE-approved technical institutions. Family income below ₹8 Lakh/year.',
        amount: '₹50,000/year (up to 4 years)',
        deadline: 'December 31',
        applicationUrl: 'https://www.aicte-india.org/schemes/students-development-schemes',
        category: 'girl-child',
        targetGrade: ['UG'],
        targetStream: ['Science-PCM', 'Science-PCB'],
        incomeLimit: 'Below ₹8 Lakh/year',
        source: 'AICTE',
        verified: true,
    },
    {
        name: 'National Means-cum-Merit Scholarship (NMMSS)',
        provider: 'Ministry of Education, Government of India',
        description: 'For meritorious students from economically weaker sections studying in Class 9-12 in government schools.',
        eligibility: 'Studying in Class 9-12 in government school. Family income below ₹3.5 Lakh/year. Passed Class 8 with 55%+ marks.',
        amount: '₹12,000/year',
        deadline: 'October 15',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'need',
        targetGrade: ['10', '12'],
        targetStream: ['All'],
        incomeLimit: 'Below ₹3.5 Lakh/year',
        source: 'NSP',
        verified: true,
    },
    {
        name: 'Begum Hazrat Mahal National Scholarship',
        provider: 'Maulana Azad Education Foundation (MAEF)',
        description: 'For meritorious girl students belonging to minority communities studying in Class 9-12.',
        eligibility: 'Girl students of minority communities (Muslim, Christian, Sikh, Buddhist, Jain, Parsi). Minimum 50% marks. Family income below ₹2 Lakh/year.',
        amount: '₹5,000 (Class 9-10), ₹6,000 (Class 11-12)',
        deadline: 'September 30',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'minority',
        targetGrade: ['10', '12'],
        targetStream: ['All'],
        incomeLimit: 'Below ₹2 Lakh/year',
        source: 'NSP',
        verified: true,
    },
    {
        name: 'INSPIRE Scholarship (SHE)',
        provider: 'Department of Science & Technology (DST)',
        description: 'Innovation in Science Pursuit for Inspired Research — Scholarship for Higher Education for students pursuing BSc, BS, and integrated MS courses in natural/basic sciences.',
        eligibility: 'Top 1% in Class 12 board exam OR JEE/NEET qualified. Must pursue BSc/BS/Int. MSc in natural sciences.',
        amount: '₹80,000/year (₹60,000 scholarship + ₹20,000 mentorship)',
        deadline: 'October 31',
        applicationUrl: 'https://online-inspire.gov.in',
        category: 'merit',
        targetGrade: ['UG'],
        targetStream: ['Science-PCM', 'Science-PCB'],
        incomeLimit: 'No limit (merit-based)',
        source: 'DST',
        verified: true,
    },
    {
        name: 'Pre-Matric Scholarship for Minority Students',
        provider: 'Ministry of Minority Affairs',
        description: 'For minority community students studying in Class 1-10 to reduce dropout rates.',
        eligibility: 'Students of minority communities. Family income below ₹1 Lakh/year. Minimum 50% marks.',
        amount: 'Up to ₹5,700/year (including admission, tuition, maintenance)',
        deadline: 'September 30',
        applicationUrl: 'https://scholarships.gov.in',
        category: 'minority',
        targetGrade: ['10'],
        targetStream: ['All'],
        incomeLimit: 'Below ₹1 Lakh/year',
        source: 'NSP',
        verified: true,
    },
];

const seedScholarships = async () => {
    const count = await Scholarship.countDocuments();
    if (count === 0) {
        await Scholarship.insertMany(SEED_SCHOLARSHIPS);
        console.log('[Seed] Scholarships seeded:', SEED_SCHOLARSHIPS.length);
    }
};

// @desc    Get all scholarships (public, filterable)
// @route   GET /api/scholarships
const getScholarships = asyncHandler(async (req, res) => {
    const { category, grade, stream, search } = req.query;
    const filter = { verified: true };
    if (category) filter.category = category;
    if (grade) filter.targetGrade = grade;
    if (stream) filter.targetStream = { $in: [stream, 'All'] };
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { provider: { $regex: search, $options: 'i' } },
        ];
    }
    const scholarships = await Scholarship.find(filter).sort({ name: 1 });
    res.json(scholarships);
});

// @desc    Get personalized scholarships for logged-in user
// @route   GET /api/scholarships/personalized
const getPersonalized = asyncHandler(async (req, res) => {
    const user = req.user;
    const grade = user.profile?.grade || '12';
    const stream = user.profile?.stream || '';

    const filter = {
        verified: true,
        targetGrade: { $in: [grade, 'UG', 'PG'] },
    };
    if (stream) {
        filter.targetStream = { $in: [stream, 'All'] };
    }

    const scholarships = await Scholarship.find(filter).sort({ name: 1 });
    res.json(scholarships);
});

// Routes
router.get('/', getScholarships);
router.get('/personalized', protect, getPersonalized);

router._seedScholarships = seedScholarships;

module.exports = router;

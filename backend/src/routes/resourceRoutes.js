const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Resource = require('../models/resourceModel');
const { protect } = require('../middleware/authMiddleware');

// Curated, verified free resources from official/reputable platforms
const SEED_RESOURCES = [
    // ── NPTEL / SWAYAM (Govt. of India) ───────────────────────────────────
    { title: 'NPTEL — Programming in C', type: 'course', provider: 'NPTEL (IIT)', url: 'https://nptel.ac.in/courses/106104128', subject: 'Computer Science', grade: ['12', 'UG'], stream: ['Science-PCM'], careerCategory: ['Technology', 'Engineering'], description: 'Free IIT-quality C programming course. Certified by NPTEL.', free: true },
    { title: 'NPTEL — Engineering Mathematics', type: 'course', provider: 'NPTEL (IIT)', url: 'https://nptel.ac.in/courses/111104085', subject: 'Mathematics', grade: ['UG'], stream: ['Science-PCM'], careerCategory: ['Engineering', 'Technology'], description: 'Comprehensive engineering math course covering calculus, linear algebra, and differential equations.', free: true },
    { title: 'SWAYAM — Accounting & Finance', type: 'course', provider: 'SWAYAM (UGC)', url: 'https://swayam.gov.in/explorer?searchText=accounting', subject: 'Commerce', grade: ['12', 'UG'], stream: ['Commerce'], careerCategory: ['Commerce', 'Business'], description: 'Free UGC-approved courses in accounting and financial management.', free: true },
    { title: 'SWAYAM — Introduction to Biology', type: 'course', provider: 'SWAYAM (UGC)', url: 'https://swayam.gov.in/explorer?searchText=biology', subject: 'Biology', grade: ['12', 'UG'], stream: ['Science-PCB'], careerCategory: ['Medical', 'Agriculture'], description: 'Foundational biology courses from top Indian universities.', free: true },
    { title: 'NPTEL — Data Science for Engineers', type: 'course', provider: 'NPTEL (IIT Madras)', url: 'https://nptel.ac.in/courses/106106179', subject: 'Data Science', grade: ['UG', 'PG'], stream: ['Science-PCM'], careerCategory: ['Technology'], description: 'IIT Madras course covering statistics, ML basics, and data analysis with Python.', free: true },

    // ── Khan Academy ──────────────────────────────────────────────────────
    { title: 'Khan Academy — Calculus', type: 'course', provider: 'Khan Academy', url: 'https://www.khanacademy.org/math/calculus-1', subject: 'Mathematics', grade: ['12', 'UG'], stream: ['Science-PCM', 'Science-PCB'], careerCategory: ['Technology', 'Engineering', 'Medical'], description: 'Free interactive calculus course with practice exercises and videos.', free: true },
    { title: 'Khan Academy — Organic Chemistry', type: 'course', provider: 'Khan Academy', url: 'https://www.khanacademy.org/science/organic-chemistry', subject: 'Chemistry', grade: ['12', 'UG'], stream: ['Science-PCM', 'Science-PCB'], careerCategory: ['Medical', 'Engineering'], description: 'Comprehensive organic chemistry with molecular structure and reactions.', free: true },
    { title: 'Khan Academy — Economics', type: 'course', provider: 'Khan Academy', url: 'https://www.khanacademy.org/economics-finance-domain', subject: 'Economics', grade: ['12', 'UG'], stream: ['Commerce', 'Arts / Humanities'], careerCategory: ['Commerce', 'Business'], description: 'Micro and macroeconomics with real-world applications.', free: true },

    // ── Exam Prep ─────────────────────────────────────────────────────────
    { title: 'NTA Official — JEE Main Practice', type: 'exam-prep', provider: 'NTA (National Testing Agency)', url: 'https://jeemain.nta.nic.in/', subject: 'Engineering Entrance', grade: ['12'], stream: ['Science-PCM'], careerCategory: ['Engineering', 'Technology'], description: 'Official JEE Main practice papers, syllabus, and updates from NTA.', free: true },
    { title: 'NTA Official — NEET UG Resources', type: 'exam-prep', provider: 'NTA (National Testing Agency)', url: 'https://neet.nta.nic.in/', subject: 'Medical Entrance', grade: ['12'], stream: ['Science-PCB'], careerCategory: ['Medical'], description: 'Official NEET UG syllabus, previous papers, and exam pattern from NTA.', free: true },
    { title: 'CLAT Consortium — Law Entrance Prep', type: 'exam-prep', provider: 'CLAT Consortium', url: 'https://consortiumofnlus.ac.in/', subject: 'Law Entrance', grade: ['12', 'UG'], stream: ['Arts / Humanities', 'Commerce'], careerCategory: ['Law'], description: 'Official CLAT exam information, syllabus, and practice resources.', free: true },
    { title: 'CAT Official — Management Entrance', type: 'exam-prep', provider: 'IIM', url: 'https://iimcat.ac.in/', subject: 'Management Entrance', grade: ['UG'], stream: ['Commerce', 'Science-PCM'], careerCategory: ['Business', 'Commerce'], description: 'Official CAT exam portal with syllabus, pattern, and registration info.', free: true },

    // ── Career Guidance Articles ───────────────────────────────────────────
    { title: 'NCS — Career Guidance Portal', type: 'article', provider: 'National Career Service (Govt. of India)', url: 'https://www.ncs.gov.in/career-guidance', subject: 'Career Planning', grade: ['10', '12', 'UG'], stream: ['All'], careerCategory: ['Technology', 'Medical', 'Engineering', 'Commerce', 'Business', 'Arts & Design', 'Education', 'Law'], description: 'Official Government of India career guidance portal with career paths, skills assessment, and counselling.', free: true },
    { title: 'MyGov — Skills India Portal', type: 'tool', provider: 'Government of India', url: 'https://www.skillindia.gov.in/', subject: 'Skill Development', grade: ['12', 'UG'], stream: ['All'], careerCategory: ['Technology', 'Engineering', 'Business'], description: 'Official Skill India portal with free skill development courses and certifications.', free: true },

    // ── Design & Arts ────────────────────────────────────────────────────
    { title: 'Canva Design School', type: 'course', provider: 'Canva', url: 'https://www.canva.com/designschool/', subject: 'Design', grade: ['12', 'UG'], stream: ['Arts / Humanities'], careerCategory: ['Arts & Design', 'Media'], description: 'Free design courses covering graphic design, branding, and visual communication.', free: true },

    // ── ITI / Polytechnic / Diploma ───────────────────────────────────────
    { title: 'DGT — ITI Courses & Admissions', type: 'article', provider: 'Directorate General of Training (Ministry of Skill Development)', url: 'https://dgt.gov.in/iti', subject: 'ITI Information', grade: ['10'], stream: ['ITI / Skill Training'], careerCategory: ['Engineering', 'Technology'], description: 'Official DGT portal with information on all NCVT-certified ITI trades, admission process, and affiliated ITIs across India.', free: true },
    { title: 'Bharat Skills — ITI Course Content', type: 'course', provider: 'Directorate General of Training (Govt. of India)', url: 'https://bharatskills.gov.in/', subject: 'ITI Training', grade: ['10'], stream: ['ITI / Skill Training'], careerCategory: ['Engineering', 'Technology'], description: 'Free official training content for all NSQF-aligned ITI trades. Includes videos, e-books, and assessments for Electrician, Fitter, COPA, Welder, and more.', free: true },
    { title: 'AICTE — Polytechnic / Diploma Information', type: 'article', provider: 'AICTE (All India Council for Technical Education)', url: 'https://www.aicte-india.org/education/polytechnic', subject: 'Polytechnic Admission', grade: ['10'], stream: ['Diploma / Polytechnic'], careerCategory: ['Engineering', 'Technology'], description: 'Official AICTE page on polytechnic and diploma programs. Find AICTE-approved polytechnics, admission guidelines, and program details.', free: true },
    { title: 'Polytechnic Entrance Exam — State CET Info', type: 'exam-prep', provider: 'Various State Technical Boards', url: 'https://www.ncs.gov.in/content/polytechnic-diploma', subject: 'Polytechnic Entrance', grade: ['10'], stream: ['Diploma / Polytechnic'], careerCategory: ['Engineering', 'Technology'], description: 'Information on state-level polytechnic entrance exams (JEECUP, DCECE, TN CEEP, etc.) for diploma admission after Class 10.', free: true },
    { title: 'Paramedical & Nursing Council — Course Guide', type: 'article', provider: 'Indian Nursing Council / State Paramedical Boards', url: 'https://www.indiannursingcouncil.org/', subject: 'Paramedical Courses', grade: ['10', '12'], stream: ['Paramedical / Nursing Diploma'], careerCategory: ['Medical'], description: 'Official Indian Nursing Council portal. Information on ANM, GNM, DMLT, and other paramedical diploma courses with approved institutions.', free: true },
    { title: 'Apprenticeship India — Learn While You Earn', type: 'tool', provider: 'Ministry of Skill Development (Govt. of India)', url: 'https://www.apprenticeshipindia.gov.in/', subject: 'Apprenticeship', grade: ['10', '12'], stream: ['ITI / Skill Training', 'Diploma / Polytechnic'], careerCategory: ['Engineering', 'Technology'], description: 'Official govt apprenticeship portal. ITI and diploma students can find paid apprenticeship opportunities in PSUs and private companies.', free: true },
];

const seedResources = async () => {
    const count = await Resource.countDocuments();
    if (count === 0) {
        await Resource.insertMany(SEED_RESOURCES);
        console.log('[Seed] Resources seeded:', SEED_RESOURCES.length);
    }
};

// @desc    Get all resources (public, filterable)
// @route   GET /api/resources
const getResources = asyncHandler(async (req, res) => {
    const { type, subject, grade, stream, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (grade) filter.grade = grade;
    if (stream) filter.stream = { $in: [stream, 'All'] };
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { provider: { $regex: search, $options: 'i' } },
        ];
    }
    const resources = await Resource.find(filter).sort({ type: 1, title: 1 });
    res.json(resources);
});

// @desc    Get personalized resources based on user profile + assessment
// @route   GET /api/resources/recommended
const getRecommended = asyncHandler(async (req, res) => {
    const user = req.user;
    const grade = user.profile?.grade || '12';
    const stream = user.profile?.stream || '';
    const careerCategories = (user.assessment?.results || []).map(r => r.category).filter(Boolean);

    const filter = {
        grade: { $in: [grade, 'UG', 'PG'] },
    };
    if (stream) {
        filter.stream = { $in: [stream, 'All'] };
    }
    if (careerCategories.length > 0) {
        filter.careerCategory = { $in: careerCategories };
    }

    const resources = await Resource.find(filter).sort({ type: 1, title: 1 });
    res.json(resources);
});

router.get('/', getResources);
router.get('/recommended', protect, getRecommended);

seedResources().catch(console.error);

module.exports = router;

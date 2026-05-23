const asyncHandler = require('express-async-handler');
const CareerPath = require('../models/careerPathModel');
const College = require('../models/collegeModel');

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    const keys = ['logic', 'creativity', 'technical', 'social', 'leadership'];
    let dot = 0, magA = 0, magB = 0;
    keys.forEach(k => {
        dot += (vecA[k] || 0) * (vecB[k] || 0);
        magA += (vecA[k] || 0) ** 2;
        magB += (vecB[k] || 0) ** 2;
    });
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Interest â†’ Career Category mapping for dynamic matching
const INTEREST_CATEGORY_MAP = {
    'Technology': ['Technology'],
    'Science': ['Technology', 'Medical', 'Agriculture'],
    'Mathematics': ['Technology', 'Engineering', 'Commerce'],
    'Medicine': ['Medical'],
    'Arts': ['Arts & Design', 'Media'],
    'Design': ['Arts & Design'],
    'Business': ['Business', 'Commerce'],
    'Commerce': ['Commerce', 'Business'],
    'Agriculture': ['Agriculture'],
    'Education': ['Education'],
    'Sports': ['Education'],
    'Music': ['Arts & Design', 'Media'],
    'Writing': ['Media', 'Education'],
    'Social Work': ['Education'],
    'Environment': ['Agriculture'],
    'Engineering': ['Engineering', 'Technology'],
};

// Stream compatibility mapping
const STREAM_CAREER_MAP = {
    'Science-PCM': ['Technology', 'Engineering'],
    'Science-PCB': ['Medical', 'Agriculture'],
    'Commerce': ['Commerce', 'Business'],
    'Arts / Humanities': ['Arts & Design', 'Media', 'Education'],
    'Vocational': ['Engineering', 'Agriculture'],
};

const ASPIRATION_CATEGORY_MAP = {
    'Higher Studies': ['Technology', 'Engineering', 'Medical', 'Law', 'Education'],
    'Job Ready': ['Engineering', 'Technology', 'Commerce', 'Agriculture', 'Media'],
    'Government Exams': ['Law', 'Education', 'Commerce', 'Agriculture'],
    'Entrepreneurship': ['Business', 'Commerce', 'Technology', 'Media'],
    'Vocational Skills': ['Engineering', 'Agriculture', 'Technology', 'Arts & Design'],
};

const VALUE_KEYWORD_MAP = {
    Stability: ['education', 'government', 'law', 'commerce'],
    Impact: ['medical', 'education', 'agriculture', 'social'],
    Creativity: ['design', 'media', 'arts'],
    Income: ['business', 'technology', 'commerce'],
    Service: ['medical', 'education', 'law', 'agriculture'],
};

// Career category → relevant college programs mapping
const CATEGORY_PROGRAMS_MAP = {
    'Technology': ['B.Tech', 'BE', 'BCA', 'MCA', 'M.Tech', 'BSc IT', 'Diploma in CS', 'Diploma in ECE', 'B.Sc (Research)'],
    'Engineering': ['B.Tech', 'BE', 'M.Tech', 'ME', 'Diploma in Mechanical', 'Diploma in Civil', 'BArch'],
    'Medical': ['MBBS', 'MD', 'MS', 'BDS', 'B.Pharm', 'B.Sc Nursing', 'DM', 'BAMS', 'BHMS'],
    'Agriculture': ['BSc Agriculture', 'MSc Agriculture', 'B.Tech Food Tech', 'BTech Agri Engineering', 'Veterinary'],
    'Commerce': ['B.Com', 'BMS', 'BAF', 'MBA', 'M.Com', 'B.A. (H) Economics', 'B.Com (H)', 'B.Com (Banking)'],
    'Business': ['MBA', 'BBA', 'B.Com', 'M.Com', 'Executive MBA'],
    'Arts & Design': ['BFA', 'B.Des', 'M.Des', 'MFA', 'BMus', 'BArch', 'Diploma in Design'],
    'Media': ['BA', 'MA', 'BFA', 'BMus'],
    'Education': ['BA', 'MA', 'BSc', 'MSc', 'M.Phil', 'PhD'],
    'Law': ['BA LLB', 'LLB', 'BBA LLB', 'LLM', 'MBA (Law)'],
};

// @desc    Get recommendations based on quiz results
// @route   POST /api/careers/recommend
const getRecommendations = asyncHandler(async (req, res) => {
    const {
        quizScores,
        interests = [],
        academicScore,
        location,
        stream,
        careerCategoryScores,
        longTermGoal = '',
        aspirationTrack = '',
        coreValues = [],
        constraints = {},
    } = req.body;

    if (!quizScores) {
        res.status(400);
        throw new Error('quizScores are required');
    }

    const allCareers = await CareerPath.find({});

    // Categories boosted by user interests
    const boostedCategories = new Set();
    interests.forEach(interest => {
        const cats = INTEREST_CATEGORY_MAP[interest] || [];
        cats.forEach(c => boostedCategories.add(c));
    });

    // Categories compatible with user stream
    const streamCompatible = new Set(STREAM_CAREER_MAP[stream] || []);
    const aspirationCategories = new Set(ASPIRATION_CATEGORY_MAP[aspirationTrack] || []);

    // ── Normalize careerCategoryScores to 0-100 ──
    const catScores = careerCategoryScores || {};
    const maxCatScore = Math.max(...Object.values(catScores).map(v => Number(v) || 0), 1);

    const scoredCareers = allCareers.map(career => {
        let score = 0;
        const reasoningTags = [];

        // ═══ SIGNAL 1: Assessment Quiz (50% weight — max 50 pts) ═══
        // We use the normalized careerCategoryScores provided by the frontend.
        // To ensure perfect balance, we normalize the category score relative to the max observed score.
        const categoryWeight = Number(catScores[career.category]) || 0;
        const normalizedCatWeight = (categoryWeight / maxCatScore) * 50;
        score += normalizedCatWeight;
        if (normalizedCatWeight > 25) reasoningTags.push('Strong quiz-category alignment');

        // ═══ SIGNAL 2: Aptitude Profile Match (20% weight — max 20 pts) ═══
        // Cosine similarity on the logic/technical/creativity/social/leadership vector.
        const similarity = cosineSimilarity(quizScores, career.matchVector || {});
        score += similarity * 20;
        if (similarity > 0.7) reasoningTags.push('Aptitude profile fits this role');

        // ═══ SIGNAL 3: Explicit Interests (20% weight — max 20 pts) ═══
        if (boostedCategories.has(career.category)) {
            score += 20;
            reasoningTags.push('Matches your interests');
        }

        // ═══ SIGNAL 4: Stream Compatibility (10% weight — max 10 pts) ═══
        if (stream && streamCompatible.has(career.category)) {
            score += 10;
            reasoningTags.push('Compatible with your stream');
        }

        // ═══ SIGNAL 5: Aspiration + Values + Constraints (Bonus ~10 pts) ═══
        if (aspirationCategories.has(career.category)) {
            score += 4;
            reasoningTags.push('Aligned with your aspiration track');
        }

        const lcRoleText = `${career.title || ''} ${career.category || ''} ${(career.skills || []).join(' ')}`.toLowerCase();
        const valueHits = (coreValues || []).reduce((acc, value) => {
            const keys = VALUE_KEYWORD_MAP[value] || [];
            const matched = keys.some(k => lcRoleText.includes(k));
            return acc + (matched ? 1 : 0);
        }, 0);
        if (valueHits > 0) {
            score += Math.min(4, valueHits * 1.5);
            reasoningTags.push('Supports your personal values');
        }

        // Constraints and goals
        const budgetLevel = constraints?.budgetLevel;
        const isHighCostTrack = ['Medical', 'Business'].includes(career.category);
        if (budgetLevel === 'high-support-needed' && !isHighCostTrack) score += 2;
        if (longTermGoal && lcRoleText.includes(longTermGoal.toLowerCase().slice(0, 10))) score += 2;

        return {
            ...career.toObject(),
            score: Math.min(100, Math.round(score)),
            reasoningTags: [...new Set(reasoningTags)].slice(0, 4),
        };
    });

    scoredCareers.sort((a, b) => b.score - a.score);
    const topCareers = scoredCareers.slice(0, 5);

    // ── College matching: filter by programs relevant to top career categories ──
    const relevantPrograms = new Set();
    topCareers.forEach(career => {
        const progs = CATEGORY_PROGRAMS_MAP[career.category] || [];
        progs.forEach(p => relevantPrograms.add(p));
    });

    let nearbyColleges = [];
    try {
        // Step 1: try geolocation-aware + program-filtered query
        if (location && location.lat && location.lng) {
            nearbyColleges = await College.find({
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
                        $maxDistance: 300000,
                    }
                },
                programs: { $elemMatch: { $in: [...relevantPrograms] } },
            }).limit(15);

            // Step 2: if fewer than 4 program-matched colleges nearby, widen to all nearby
            if (nearbyColleges.length < 4) {
                nearbyColleges = await College.find({
                    location: {
                        $near: {
                            $geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
                            $maxDistance: 300000,
                        }
                    }
                }).limit(15);
            }
        }

        // Step 3: still nothing → program-filtered from all colleges sorted by ranking
        if (nearbyColleges.length === 0 && relevantPrograms.size > 0) {
            nearbyColleges = await College.find({
                programs: { $elemMatch: { $in: [...relevantPrograms] } },
            }).sort({ ranking: 1 }).limit(15);
        }

        // Step 4: absolute fallback — top-ranked colleges
        if (nearbyColleges.length === 0) {
            nearbyColleges = await College.find({}).sort({ ranking: 1 }).limit(10);
        }

        // Sort: program-match count first, then by ranking
        nearbyColleges = nearbyColleges.map(c => {
            const matchCount = (c.programs || []).filter(p => relevantPrograms.has(p)).length;
            return { ...c.toObject(), _programMatchScore: matchCount };
        }).sort((a, b) => {
            // Primary: more matching programs first
            if (b._programMatchScore !== a._programMatchScore) {
                return b._programMatchScore - a._programMatchScore;
            }
            // Secondary: better ranking first
            return (a.ranking || 999) - (b.ranking || 999);
        });

    } catch (e) {
        nearbyColleges = await College.find({}).sort({ ranking: 1 }).limit(10);
    }

    res.json({
        recommendedCareers: topCareers,
        nearbyColleges,
        userVector: quizScores,
    });
});

// @desc    Get all careers (with optional filter)
// @route   GET /api/careers
const getCareers = asyncHandler(async (req, res) => {
    const { category, stream } = req.query;
    let query = {};
    if (category) query.category = { $regex: category, $options: 'i' };
    if (stream) query.requiredStream = { $regex: stream, $options: 'i' };
    const careers = await CareerPath.find(query);
    res.json(careers);
});

// Pure seed logic â€” no HTTP context needed
const doSeed = async () => {
    const careerCount = await CareerPath.countDocuments();
    const collegeCount = await College.countDocuments();

    if (careerCount > 0 && collegeCount > 0) {
        return { message: 'Data already seeded', careers: careerCount, colleges: collegeCount };
    }

    if (careerCount === 0) {
        const careers = [
            {
                title: 'Software Engineer',
                description: 'Build and maintain software systems and applications for businesses and consumers.',
                category: 'Technology',
                requiredStream: 'Science-PCM',
                skills: ['Programming', 'Problem Solving', 'Python', 'Java'],
                matchVector: { logic: 0.9, creativity: 0.5, technical: 0.95, social: 0.3 },
                salary: { min: 600000, max: 3000000 },
                roadmap: [
                    { step: 'Complete Class 12 with PCM', duration: '2 years' },
                    { step: 'B.Tech / BCA in Computer Science', duration: '4 years' },
                    { step: 'Internship & Projects', duration: '6 months' },
                    { step: 'Entry-level Developer Job', duration: 'Ongoing' },
                ],
                outcome: 'Full Stack Developer, Backend Engineer, DevOps Engineer',
            },
            {
                title: 'Data Scientist',
                description: 'Analyze large datasets to discover insights and build predictive models.',
                category: 'Technology',
                requiredStream: 'Science-PCM',
                skills: ['Python', 'Statistics', 'Machine Learning', 'Math'],
                matchVector: { logic: 0.95, creativity: 0.3, technical: 0.9, social: 0.2 },
                salary: { min: 700000, max: 2500000 },
                roadmap: [
                    { step: 'Complete 12th with Math/Statistics', duration: '2 years' },
                    { step: 'B.Tech/BSc in CS or Statistics', duration: '4 years' },
                    { step: 'Learn ML/AI tools & build portfolio', duration: '1 year' },
                    { step: 'Data Analyst â†’ Data Scientist', duration: 'Ongoing' },
                ],
                outcome: 'Data Analyst, ML Engineer, AI Researcher',
            },
            {
                title: 'Doctor (MBBS)',
                description: 'Diagnose and treat patients, promote health and prevent disease.',
                category: 'Medical',
                requiredStream: 'Science-PCB',
                skills: ['Biology', 'Chemistry', 'Empathy', 'Problem Solving'],
                matchVector: { logic: 0.7, creativity: 0.4, technical: 0.6, social: 0.9 },
                salary: { min: 500000, max: 2000000 },
                roadmap: [
                    { step: 'Complete 12th with PCB', duration: '2 years' },
                    { step: 'Clear NEET entrance exam', duration: '1 year prep' },
                    { step: 'MBBS Degree', duration: '5.5 years' },
                    { step: 'Residency / Specialization', duration: '3 years' },
                ],
                outcome: 'General Physician, Specialist, Surgeon',
            },
            {
                title: 'Civil Engineer',
                description: 'Design and supervise construction of infrastructure like roads, bridges, and buildings.',
                category: 'Engineering',
                requiredStream: 'Science-PCM',
                skills: ['Math', 'Physics', 'Design', 'Project Management'],
                matchVector: { logic: 0.8, creativity: 0.6, technical: 0.85, social: 0.4 },
                salary: { min: 350000, max: 1500000 },
                roadmap: [
                    { step: 'Complete 12th with PCM', duration: '2 years' },
                    { step: 'B.Tech in Civil Engineering (JEE)', duration: '4 years' },
                    { step: 'Site Engineer / Junior Role', duration: '2 years' },
                    { step: 'Senior Engineer / Project Lead', duration: 'Ongoing' },
                ],
                outcome: 'Structural Engineer, Project Manager, Urban Planner',
            },
            {
                title: 'Graphic Designer',
                description: 'Create visual concepts to communicate ideas through images, typography, and layouts.',
                category: 'Arts & Design',
                requiredStream: 'Any',
                skills: ['Creativity', 'Drawing', 'Adobe Photoshop', 'Illustrator'],
                matchVector: { logic: 0.3, creativity: 0.95, technical: 0.6, social: 0.5 },
                salary: { min: 250000, max: 1200000 },
                roadmap: [
                    { step: 'Complete 12th (Any stream)', duration: '2 years' },
                    { step: 'BFA / B.Des / Diploma in Design', duration: '3-4 years' },
                    { step: 'Build portfolio & freelance', duration: '1 year' },
                    { step: 'Junior Designer Role', duration: 'Ongoing' },
                ],
                outcome: 'UI/UX Designer, Art Director, Brand Designer',
            },
            {
                title: 'Chartered Accountant (CA)',
                description: 'Manage financial accounts, audits, and tax compliance for businesses and individuals.',
                category: 'Commerce',
                requiredStream: 'Commerce',
                skills: ['Math', 'Accounting', 'Finance', 'Attention to Detail'],
                matchVector: { logic: 0.85, creativity: 0.2, technical: 0.5, social: 0.4 },
                salary: { min: 500000, max: 2000000 },
                roadmap: [
                    { step: 'Complete 12th with Commerce', duration: '2 years' },
                    { step: 'Register with ICAI, clear Foundation', duration: '1 year' },
                    { step: 'CA Intermediate & Articleship', duration: '3 years' },
                    { step: 'CA Final Exam', duration: '1-2 years' },
                ],
                outcome: 'Auditor, Tax Consultant, CFO, Finance Manager',
            },
            {
                title: 'Teacher / Educator',
                description: 'Educate students in schools or colleges, shape the next generation of learners.',
                category: 'Education',
                requiredStream: 'Any',
                skills: ['Communication', 'Empathy', 'Subject Knowledge', 'Patience'],
                matchVector: { logic: 0.5, creativity: 0.6, technical: 0.3, social: 0.95 },
                salary: { min: 250000, max: 900000 },
                roadmap: [
                    { step: 'Complete 12th & graduation in subject', duration: '5 years' },
                    { step: 'B.Ed (Bachelor of Education)', duration: '2 years' },
                    { step: 'TET/CTET exam qualification', duration: '6 months prep' },
                    { step: 'Government/Private School Teacher', duration: 'Ongoing' },
                ],
                outcome: 'School Teacher, Professor, Education Consultant',
            },
            {
                title: 'Entrepreneur',
                description: 'Start and build your own business or startup, creating products and services.',
                category: 'Business',
                requiredStream: 'Any',
                skills: ['Leadership', 'Creativity', 'Risk-taking', 'Communication'],
                matchVector: { logic: 0.6, creativity: 0.8, technical: 0.5, social: 0.8 },
                salary: { min: 0, max: 10000000 },
                roadmap: [
                    { step: 'Identify a problem and solution idea', duration: 'Ongoing' },
                    { step: 'Build MVP (Minimum Viable Product)', duration: '6 months' },
                    { step: 'Find customers and get revenue', duration: '1 year' },
                    { step: 'Scale the business', duration: 'Ongoing' },
                ],
                outcome: 'Startup Founder, Business Owner, CEO',
            },
            {
                title: 'Journalist / Media Professional',
                description: 'Research and report news, create multimedia content for print, TV, or digital media.',
                category: 'Media',
                requiredStream: 'Arts / Humanities',
                skills: ['Writing', 'Communication', 'Research', 'Creativity'],
                matchVector: { logic: 0.4, creativity: 0.8, technical: 0.3, social: 0.85 },
                salary: { min: 200000, max: 1000000 },
                roadmap: [
                    { step: 'Complete 12th (Arts/Any)', duration: '2 years' },
                    { step: 'BA in Journalism / Mass Communication', duration: '3 years' },
                    { step: 'Internship at media house', duration: '6 months' },
                    { step: 'Junior Reporter / Content Creator', duration: 'Ongoing' },
                ],
                outcome: 'Journalist, News Anchor, Content Writer, PR Manager',
            },
            {
                title: 'Agricultural Scientist',
                description: 'Research and develop methods to improve crop yield, soil health, and food production.',
                category: 'Agriculture',
                requiredStream: 'Science-PCB',
                skills: ['Biology', 'Chemistry', 'Field Work', 'Research'],
                matchVector: { logic: 0.7, creativity: 0.5, technical: 0.6, social: 0.6 },
                salary: { min: 300000, max: 900000 },
                roadmap: [
                    { step: 'Complete 12th with Biology/Agriculture', duration: '2 years' },
                    { step: 'BSc Agriculture / ICAR entrance', duration: '4 years' },
                    { step: 'Field research / internship', duration: '1 year' },
                    { step: 'Govt. Scientist or Private Research', duration: 'Ongoing' },
                ],
                outcome: 'Agri-Scientist, Agricultural Officer, Farm Manager',
            },
            // ── 8 new careers (accurate Indian market data) ───────
            {
                title: 'Cybersecurity Analyst',
                description: 'Protect computer systems and networks from digital attacks, data breaches and cyber threats.',
                category: 'Technology',
                requiredStream: 'Science-PCM',
                skills: ['Networking', 'Python', 'Ethical Hacking', 'Linux', 'Problem Solving'],
                matchVector: { logic: 0.9, creativity: 0.4, technical: 0.95, social: 0.2 },
                salary: { min: 500000, max: 2200000 },
                roadmap: [
                    { step: 'Complete 12th with PCM', duration: '2 years' },
                    { step: 'B.Tech CS / BCA / BSc IT', duration: '3-4 years' },
                    { step: 'CEH / CompTIA Security+ certifications', duration: '6 months' },
                    { step: 'Junior Cybersecurity Analyst', duration: 'Ongoing' },
                ],
                outcome: 'Security Analyst, Ethical Hacker, SOC Analyst, CISO',
            },
            {
                title: 'Mechanical Engineer',
                description: 'Design, develop and manufacture mechanical components and systems for industry and consumers.',
                category: 'Engineering',
                requiredStream: 'Science-PCM',
                skills: ['Math', 'Physics', 'CAD/CAM', 'Thermodynamics', 'Problem Solving'],
                matchVector: { logic: 0.85, creativity: 0.5, technical: 0.9, social: 0.3 },
                salary: { min: 350000, max: 1500000 },
                roadmap: [
                    { step: 'Complete 12th with PCM', duration: '2 years' },
                    { step: 'B.Tech Mechanical Engineering (JEE)', duration: '4 years' },
                    { step: 'Internship / Graduate Engineer Trainee', duration: '1 year' },
                    { step: 'Design / Production Engineer', duration: 'Ongoing' },
                ],
                outcome: 'Design Engineer, Production Engineer, AutoCAD Specialist, R&D Engineer',
            },
            {
                title: 'UI/UX Designer',
                description: 'Design intuitive digital interfaces and user experiences for apps and websites.',
                category: 'Arts & Design',
                requiredStream: 'Any',
                skills: ['Figma', 'User Research', 'Prototyping', 'Creativity', 'Adobe XD'],
                matchVector: { logic: 0.5, creativity: 0.9, technical: 0.65, social: 0.6 },
                salary: { min: 400000, max: 1800000 },
                roadmap: [
                    { step: 'Learn design fundamentals & tools (Figma, Adobe)', duration: '6 months' },
                    { step: 'BDes / B.Tech CS with design focus / Diploma', duration: '3-4 years' },
                    { step: 'Build portfolio with 5+ case studies', duration: '6 months' },
                    { step: 'Junior UI/UX Designer', duration: 'Ongoing' },
                ],
                outcome: 'UI Designer, UX Researcher, Product Designer, Interaction Designer',
            },
            {
                title: 'Financial Analyst / Investment Banker',
                description: 'Analyze financial data, market trends and guide investment decisions for clients and firms.',
                category: 'Commerce',
                requiredStream: 'Commerce',
                skills: ['Excel', 'Financial Modeling', 'Statistics', 'Accounting', 'Communication'],
                matchVector: { logic: 0.9, creativity: 0.3, technical: 0.55, social: 0.5 },
                salary: { min: 600000, max: 3000000 },
                roadmap: [
                    { step: 'Complete 12th with Commerce / Math', duration: '2 years' },
                    { step: 'B.Com / BBA / BA Economics', duration: '3 years' },
                    { step: 'MBA Finance / CFA Level 1', duration: '2 years' },
                    { step: 'Financial Analyst / IB Analyst', duration: 'Ongoing' },
                ],
                outcome: 'Financial Analyst, Investment Banker, Portfolio Manager, CFO',
            },
            {
                title: 'Advocate / Lawyer',
                description: 'Represent clients in legal proceedings, advise on laws, draft contracts and argue cases.',
                category: 'Law',
                requiredStream: 'Any',
                skills: ['Legal Research', 'Communication', 'Argumentation', 'Writing', 'Critical Thinking'],
                matchVector: { logic: 0.8, creativity: 0.5, technical: 0.3, social: 0.85 },
                salary: { min: 300000, max: 2500000 },
                roadmap: [
                    { step: 'Complete 12th (any stream)', duration: '2 years' },
                    { step: 'BA LLB / BBA LLB (5-year integrated) via CLAT', duration: '5 years' },
                    { step: 'Articled clerking / junior advocate', duration: '2 years' },
                    { step: 'Independent Practice / Law Firm', duration: 'Ongoing' },
                ],
                outcome: 'Corporate Lawyer, Criminal Lawyer, Judge, Legal Consultant',
            },
            {
                title: 'Pharmacist / Clinical Researcher',
                description: 'Dispense medications, counsel patients, and conduct drug research in labs or healthcare settings.',
                category: 'Medical',
                requiredStream: 'Science-PCB',
                skills: ['Chemistry', 'Biology', 'Pharmacology', 'Patient Care', 'Research'],
                matchVector: { logic: 0.7, creativity: 0.3, technical: 0.75, social: 0.7 },
                salary: { min: 300000, max: 1200000 },
                roadmap: [
                    { step: 'Complete 12th with PCB', duration: '2 years' },
                    { step: 'B.Pharm / D.Pharm (after 10+2)', duration: '4 years' },
                    { step: 'M.Pharm or hospital internship', duration: '2 years' },
                    { step: 'Hospital Pharmacist / Drug Inspector / R&D', duration: 'Ongoing' },
                ],
                outcome: 'Clinical Pharmacist, Drug Inspector, Medical Rep, R&D Scientist',
            },
            {
                title: 'AI / ML Engineer',
                description: 'Build intelligent systems using machine learning, deep learning and AI algorithms for real-world applications.',
                category: 'Technology',
                requiredStream: 'Science-PCM',
                skills: ['Python', 'TensorFlow / PyTorch', 'Mathematics', 'Deep Learning', 'Data Engineering'],
                matchVector: { logic: 0.95, creativity: 0.4, technical: 0.95, social: 0.15 },
                salary: { min: 800000, max: 4000000 },
                roadmap: [
                    { step: 'Complete 12th with PCM / strong Math', duration: '2 years' },
                    { step: 'B.Tech CS / Data Science — NIRF top colleges', duration: '4 years' },
                    { step: 'ML specialization + Kaggle competitions', duration: '1 year' },
                    { step: 'ML Engineer / AI Researcher', duration: 'Ongoing' },
                ],
                outcome: 'ML Engineer, AI Researcher, NLP Engineer, Computer Vision Engineer',
            },
            {
                title: 'Social Worker / NGO Professional',
                description: 'Work with communities, government, and NGOs to address social issues and improve quality of life.',
                category: 'Education',
                requiredStream: 'Arts / Humanities',
                skills: ['Empathy', 'Communication', 'Community Organizing', 'Report Writing', 'Problem Solving'],
                matchVector: { logic: 0.4, creativity: 0.5, technical: 0.2, social: 0.98 },
                salary: { min: 180000, max: 700000 },
                roadmap: [
                    { step: 'Complete 12th (any stream)', duration: '2 years' },
                    { step: 'BA Social Work / BSW', duration: '3 years' },
                    { step: 'MSW (Master of Social Work) + field placement', duration: '2 years' },
                    { step: 'NGO / Govt Social Programs', duration: 'Ongoing' },
                ],
                outcome: 'Social Worker, NGO Manager, Community Developer, Policy Advisor',
            },
            {
                title: 'Electrician / Electrical Technician',
                description: 'Install, maintain, and repair electrical systems in homes, industries, and public infrastructure.',
                category: 'Engineering',
                requiredStream: 'Vocational',
                skills: ['Electrical Basics', 'Safety', 'Troubleshooting', 'Hands-on Work'],
                matchVector: { logic: 0.65, creativity: 0.35, technical: 0.88, social: 0.35 },
                salary: { min: 220000, max: 800000 },
                roadmap: [
                    { step: 'Complete 10th or 12th', duration: '1-2 years' },
                    { step: 'ITI Electrician / Diploma', duration: '1-2 years' },
                    { step: 'Apprenticeship with local contractor or DISCOM', duration: '6-12 months' },
                    { step: 'Technician job or self-employment', duration: 'Ongoing' },
                ],
                outcome: 'Electrical Technician, Maintenance Supervisor, Licensed Contractor',
            },
            {
                title: 'Staff Nurse',
                description: 'Support doctors and deliver direct patient care in hospitals and community health centers.',
                category: 'Medical',
                requiredStream: 'Science-PCB',
                skills: ['Patient Care', 'Biology', 'Communication', 'Empathy'],
                matchVector: { logic: 0.5, creativity: 0.25, technical: 0.6, social: 0.95 },
                salary: { min: 280000, max: 1100000 },
                roadmap: [
                    { step: 'Complete 12th with PCB', duration: '2 years' },
                    { step: 'ANM / GNM / B.Sc Nursing', duration: '2-4 years' },
                    { step: 'Clinical internship and registration', duration: '6-12 months' },
                    { step: 'Hospital / PHC nurse role', duration: 'Ongoing' },
                ],
                outcome: 'Staff Nurse, ICU Nurse, Community Health Nurse',
            },
            {
                title: 'Digital Marketing Executive',
                description: 'Grow business visibility through social media, SEO, ads, and digital campaigns.',
                category: 'Media',
                requiredStream: 'Any',
                skills: ['Content', 'SEO', 'Analytics', 'Communication'],
                matchVector: { logic: 0.55, creativity: 0.8, technical: 0.55, social: 0.7 },
                salary: { min: 250000, max: 1200000 },
                roadmap: [
                    { step: 'Complete 12th / graduation', duration: '2-3 years' },
                    { step: 'Digital marketing certification', duration: '3-6 months' },
                    { step: 'Build portfolio with real campaigns', duration: '3-6 months' },
                    { step: 'Agency or in-house marketing role', duration: 'Ongoing' },
                ],
                outcome: 'SEO Specialist, Performance Marketer, Growth Associate',
            },
            {
                title: 'Police Officer',
                description: 'Serve public safety through law enforcement, investigation, and community protection.',
                category: 'Law',
                requiredStream: 'Any',
                skills: ['Discipline', 'Decision Making', 'Communication', 'Fitness'],
                matchVector: { logic: 0.65, creativity: 0.25, technical: 0.35, social: 0.8 },
                salary: { min: 350000, max: 1300000 },
                roadmap: [
                    { step: 'Complete 12th / graduation as required by post', duration: '2-3 years' },
                    { step: 'Prepare for state/central police recruitment exams', duration: '6-12 months' },
                    { step: 'Physical and medical qualification', duration: '3-6 months' },
                    { step: 'Police training academy and posting', duration: 'Ongoing' },
                ],
                outcome: 'Sub-Inspector, Constable, IPS (through UPSC)',
            },
            {
                title: 'Logistics and Supply Chain Coordinator',
                description: 'Plan movement of goods, inventory, and transport operations for businesses.',
                category: 'Business',
                requiredStream: 'Commerce',
                skills: ['Planning', 'Data Handling', 'Communication', 'Operations'],
                matchVector: { logic: 0.75, creativity: 0.35, technical: 0.55, social: 0.6 },
                salary: { min: 300000, max: 1400000 },
                roadmap: [
                    { step: 'Complete 12th / graduation', duration: '2-3 years' },
                    { step: 'BBA / diploma in logistics', duration: '1-3 years' },
                    { step: 'Internship in warehouse or transport ops', duration: '3-6 months' },
                    { step: 'Coordinator to operations manager track', duration: 'Ongoing' },
                ],
                outcome: 'Supply Chain Analyst, Logistics Supervisor, Operations Manager',
            },
            {
                title: 'Hotel and Hospitality Manager',
                description: 'Manage guest services, operations, and business performance in hotels and tourism.',
                category: 'Business',
                requiredStream: 'Any',
                skills: ['Customer Service', 'Team Management', 'Communication', 'Operations'],
                matchVector: { logic: 0.45, creativity: 0.6, technical: 0.35, social: 0.88 },
                salary: { min: 260000, max: 1300000 },
                roadmap: [
                    { step: 'Complete 12th', duration: '2 years' },
                    { step: 'Diploma / degree in hotel management', duration: '1-4 years' },
                    { step: 'Internship in hotels or tourism sector', duration: '6 months' },
                    { step: 'Front office / operations management roles', duration: 'Ongoing' },
                ],
                outcome: 'Front Office Manager, F&B Manager, Hotel Operations Manager',
            },
            {
                title: 'Solar PV Technician',
                description: 'Install and maintain rooftop and utility-scale solar systems in homes and farms.',
                category: 'Technology',
                requiredStream: 'Vocational',
                skills: ['Electrical Basics', 'Installation', 'Safety', 'Field Service'],
                matchVector: { logic: 0.6, creativity: 0.35, technical: 0.82, social: 0.4 },
                salary: { min: 240000, max: 900000 },
                roadmap: [
                    { step: 'Complete 10th/12th', duration: '1-2 years' },
                    { step: 'Skill certification in solar installation', duration: '3-6 months' },
                    { step: 'On-site apprenticeship', duration: '3-9 months' },
                    { step: 'Solar installer or field engineer role', duration: 'Ongoing' },
                ],
                outcome: 'Solar Technician, Field Service Engineer, Renewable Energy Supervisor',
            },
            {
                title: 'Government School Teacher',
                description: 'Teach and mentor school students through public education systems and teacher eligibility pathways.',
                category: 'Education',
                requiredStream: 'Any',
                skills: ['Subject Mastery', 'Communication', 'Empathy', 'Classroom Management'],
                matchVector: { logic: 0.55, creativity: 0.6, technical: 0.25, social: 0.92 },
                salary: { min: 300000, max: 1200000 },
                roadmap: [
                    { step: 'Complete graduation in relevant subject', duration: '3 years' },
                    { step: 'B.Ed / D.El.Ed as required', duration: '2 years' },
                    { step: 'Qualify TET/CTET or state eligibility', duration: '6-12 months' },
                    { step: 'Apply through government recruitment', duration: 'Ongoing' },
                ],
                outcome: 'Primary Teacher, PGT/TGT Teacher, Academic Mentor',
            },
        ];
        await CareerPath.insertMany(careers);
    }

    if (collegeCount === 0) {
        const colleges = [
            // â”€â”€ IITs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'IIT Bombay',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'BDes', 'MBA'],
                location: { type: 'Point', coordinates: [72.9156, 19.1334] },
                address: 'Powai, Mumbai, Maharashtra 400076',
                state: 'Maharashtra',
                district: 'Mumbai',
                ranking: 3,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Research Centers'],
            },
            {
                name: 'IIT Delhi',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MSc'],
                location: { type: 'Point', coordinates: [77.1926, 28.5459] },
                address: 'Hauz Khas, New Delhi 110016',
                state: 'Delhi',
                district: 'South Delhi',
                ranking: 2,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Incubation Center'],
            },
            {
                name: 'IIT Madras',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MSc'],
                location: { type: 'Point', coordinates: [80.2337, 12.9916] },
                address: 'Sardar Patel Road, Chennai, Tamil Nadu 600036',
                state: 'Tamil Nadu',
                district: 'Chennai',
                ranking: 1,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Research Park'],
            },
            {
                name: 'IIT Kanpur',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MSc'],
                location: { type: 'Point', coordinates: [80.2317, 26.5123] },
                address: 'Kalyanpur, Kanpur, Uttar Pradesh 208016',
                state: 'Uttar Pradesh',
                district: 'Kanpur',
                ranking: 4,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Startup Hub'],
            },
            {
                name: 'IIT Kharagpur',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'BArch', 'MSc'],
                location: { type: 'Point', coordinates: [87.3119, 22.3190] },
                address: 'Kharagpur, West Bengal 721302',
                state: 'West Bengal',
                district: 'Paschim Medinipur',
                ranking: 5,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Hospital'],
            },
            {
                name: 'IIT Hyderabad',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MSc', 'MBA'],
                location: { type: 'Point', coordinates: [78.1302, 17.5931] },
                address: 'Kandi, Sangareddy, Telangana 502285',
                state: 'Telangana',
                district: 'Sangareddy',
                ranking: 8,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Research Labs'],
            },
            {
                name: 'IIT Roorkee',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'BArch', 'MSc'],
                location: { type: 'Point', coordinates: [77.8960, 29.8644] },
                address: 'Roorkee, Uttarakhand 247667',
                state: 'Uttarakhand',
                district: 'Haridwar',
                ranking: 6,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'IIT Guwahati',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MSc'],
                location: { type: 'Point', coordinates: [91.6915, 26.1844] },
                address: 'Amingaon, Guwahati, Assam 781039',
                state: 'Assam',
                district: 'Kamrup',
                ranking: 7,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            // â”€â”€ NITs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'NIT Trichy (NIT Tiruchirappalli)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MCA', 'MBA'],
                location: { type: 'Point', coordinates: [78.8213, 10.7610] },
                address: 'Tanjore Main Rd, Tiruchirappalli, Tamil Nadu 620015',
                state: 'Tamil Nadu',
                district: 'Tiruchirappalli',
                ranking: 9,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Cafeteria'],
            },
            {
                name: 'NIT Warangal',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [79.5310, 17.9784] },
                address: 'NIT Campus, Warangal, Telangana 506004',
                state: 'Telangana',
                district: 'Warangal',
                ranking: 12,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'NIT Surathkal (NITK)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [74.7900, 12.9617] },
                address: 'Srinivasnagar, Mangalore, Karnataka 575025',
                state: 'Karnataka',
                district: 'Dakshina Kannada',
                ranking: 11,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'NIT Calicut',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [75.8354, 11.3220] },
                address: 'NIT Campus, Calicut, Kerala 673601',
                state: 'Kerala',
                district: 'Kozhikode',
                ranking: 13,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'NIT Rourkela',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [84.9016, 22.2547] },
                address: 'Rourkela, Odisha 769008',
                state: 'Odisha',
                district: 'Sundargarh',
                ranking: 14,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Maulana Azad NIT Bhopal',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MCA', 'MBA'],
                location: { type: 'Point', coordinates: [77.4345, 23.2134] },
                address: 'Link Road No. 3, Bhopal, Madhya Pradesh 462003',
                state: 'Madhya Pradesh',
                district: 'Bhopal',
                ranking: 16,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            // â”€â”€ IIMs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'IIM Ahmedabad',
                type: 'Government',
                programs: ['MBA (PGP)', 'Executive MBA', 'PhD'],
                location: { type: 'Point', coordinates: [72.5396, 23.0303] },
                address: 'Vastrapur, Ahmedabad, Gujarat 380015',
                state: 'Gujarat',
                district: 'Ahmedabad',
                ranking: 1,
                facilities: ['Library', 'Case Study Rooms', 'Hostel', 'Sports'],
            },
            {
                name: 'IIM Bangalore',
                type: 'Government',
                programs: ['MBA (PGP)', 'Executive MBA', 'PhD', 'PGPEM'],
                location: { type: 'Point', coordinates: [77.5693, 12.9344] },
                address: 'Bannerghatta Main Rd, Bengaluru, Karnataka 560076',
                state: 'Karnataka',
                district: 'Bengaluru',
                ranking: 2,
                facilities: ['Library', 'Case Study Rooms', 'Hostel', 'Sports'],
            },
            {
                name: 'IIM Calcutta',
                type: 'Government',
                programs: ['MBA (PGP)', 'Executive MBA', 'PhD', 'MBAEx'],
                location: { type: 'Point', coordinates: [88.4333, 22.5553] },
                address: 'Diamond Harbour Rd, Joka, Kolkata, West Bengal 700104',
                state: 'West Bengal',
                district: 'Kolkata',
                ranking: 3,
                facilities: ['Library', 'Case Study Rooms', 'Hostel', 'Sports'],
            },
            // â”€â”€ AIIMS & Medical â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'AIIMS New Delhi',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'PhD', 'BPT', 'B.Sc Nursing', 'DM'],
                location: { type: 'Point', coordinates: [77.2101, 28.5672] },
                address: 'Ansari Nagar, New Delhi 110029',
                state: 'Delhi',
                district: 'South Delhi',
                ranking: 1,
                facilities: ['Hospital', 'Research Labs', 'Library', 'Hostel'],
            },
            {
                name: 'AIIMS Hyderabad (NIMS)',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'PhD', 'B.Sc Nursing'],
                location: { type: 'Point', coordinates: [78.4772, 17.4239] },
                address: 'Punjagutta, Hyderabad, Telangana 500082',
                state: 'Telangana',
                district: 'Hyderabad',
                ranking: 2,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'JIPMER Puducherry',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'PhD', 'B.Sc Nursing', 'DM'],
                location: { type: 'Point', coordinates: [79.8628, 11.9340] },
                address: 'Dhanvantari Nagar, Puducherry 605006',
                state: 'Puducherry',
                district: 'Puducherry',
                ranking: 4,
                facilities: ['Hospital', 'Research Labs', 'Library', 'Hostel'],
            },
            {
                name: 'Government Medical College Mumbai (Grant Medical College)',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'DNB', 'B.Sc Nursing'],
                location: { type: 'Point', coordinates: [72.8340, 18.9637] },
                address: 'JJ Hospital Campus, Byculla, Mumbai, Maharashtra 400008',
                state: 'Maharashtra',
                district: 'Mumbai',
                ranking: 5,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'Madras Medical College',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'BDS', 'B.Pharm', 'B.Sc Nursing'],
                location: { type: 'Point', coordinates: [80.2705, 13.0843] },
                address: 'Park Town, Chennai, Tamil Nadu 600003',
                state: 'Tamil Nadu',
                district: 'Chennai',
                ranking: 3,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'AIIMS Bhopal',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'PhD', 'B.Sc Nursing'],
                location: { type: 'Point', coordinates: [77.3516, 23.1763] },
                address: 'Saket Nagar, Bhopal, Madhya Pradesh 462020',
                state: 'Madhya Pradesh',
                district: 'Bhopal',
                ranking: 6,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'King George\'s Medical University (KGMU)',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'MDS', 'PhD', 'B.Sc Nursing'],
                location: { type: 'Point', coordinates: [80.9462, 26.8638] },
                address: 'Shah Mina Rd, Lucknow, Uttar Pradesh 226003',
                state: 'Uttar Pradesh',
                district: 'Lucknow',
                ranking: 7,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            // â”€â”€ Agriculture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'Indian Agricultural Research Institute (IARI)',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD Agriculture', 'MSc Biotechnology'],
                location: { type: 'Point', coordinates: [77.1491, 28.6328] },
                address: 'Pusa Campus, New Delhi 110012',
                state: 'Delhi',
                district: 'New Delhi',
                ranking: 1,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields'],
            },
            {
                name: 'Punjab Agricultural University (PAU)',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD', 'B.Tech Food Tech', 'BTech Agri Engineering'],
                location: { type: 'Point', coordinates: [75.7873, 30.9010] },
                address: 'Ludhiana, Punjab 141004',
                state: 'Punjab',
                district: 'Ludhiana',
                ranking: 2,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields', 'Sports'],
            },
            {
                name: 'Tamil Nadu Agricultural University (TNAU)',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD', 'B.Tech Food Tech', 'B.Tech Agri Biotech'],
                location: { type: 'Point', coordinates: [77.0152, 11.0068] },
                address: 'Lawley Road, Coimbatore, Tamil Nadu 641003',
                state: 'Tamil Nadu',
                district: 'Coimbatore',
                ranking: 3,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields'],
            },
            {
                name: 'G.B. Pant University of Agriculture and Technology',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD', 'B.Tech', 'Veterinary'],
                location: { type: 'Point', coordinates: [79.4892, 29.0025] },
                address: 'Pantnagar, Udham Singh Nagar, Uttarakhand 263145',
                state: 'Uttarakhand',
                district: 'Udham Singh Nagar',
                ranking: 4,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields'],
            },
            // â”€â”€ Law â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'National Law School of India University (NLSIU)',
                type: 'Government',
                programs: ['BA LLB', 'LLM', 'PhD', 'Executive LLM'],
                location: { type: 'Point', coordinates: [77.5691, 12.9582] },
                address: 'Nagarbhavi, Bengaluru, Karnataka 560072',
                state: 'Karnataka',
                district: 'Bengaluru',
                ranking: 1,
                facilities: ['Library', 'Moot Court', 'Hostel', 'Cafeteria'],
            },
            {
                name: 'NALSAR University of Law',
                type: 'Government',
                programs: ['BA LLB', 'LLM', 'PhD', 'PG Diploma'],
                location: { type: 'Point', coordinates: [78.4808, 17.4908] },
                address: 'Justice City, Shamirpet, Hyderabad, Telangana 500101',
                state: 'Telangana',
                district: 'Medchal',
                ranking: 2,
                facilities: ['Library', 'Moot Court', 'Hostel', 'Cafeteria'],
            },
            {
                name: 'National Law University Delhi',
                type: 'Government',
                programs: ['BA LLB', 'LLM', 'PhD', 'MBA (Law)'],
                location: { type: 'Point', coordinates: [77.2034, 28.5457] },
                address: 'Sector 14, Dwarka, New Delhi 110078',
                state: 'Delhi',
                district: 'West Delhi',
                ranking: 3,
                facilities: ['Library', 'Moot Court', 'Hostel', 'Sports'],
            },
            // â”€â”€ Arts, Humanities & Social Science â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'Delhi University (North Campus)',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'MA', 'M.Com', 'MSc', 'PhD', 'LLB'],
                location: { type: 'Point', coordinates: [77.2090, 28.6968] },
                address: 'University Road, Delhi 110007',
                state: 'Delhi',
                district: 'North Delhi',
                ranking: 5,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports', 'Cafeteria'],
            },
            {
                name: 'Jadavpur University',
                type: 'Government',
                programs: ['B.Tech', 'BE', 'BSc', 'BA', 'MA', 'MSc', 'M.Tech', 'PhD'],
                location: { type: 'Point', coordinates: [88.3733, 22.4979] },
                address: 'Raja SC Mullick Rd, Kolkata, West Bengal 700032',
                state: 'West Bengal',
                district: 'Kolkata',
                ranking: 10,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Banaras Hindu University (BHU)',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'MBBS', 'LLB', 'MBA', 'MA', 'PhD'],
                location: { type: 'Point', coordinates: [82.9994, 25.2677] },
                address: 'Lanka, Varanasi, Uttar Pradesh 221005',
                state: 'Uttar Pradesh',
                district: 'Varanasi',
                ranking: 11,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports', 'Hospital'],
            },
            {
                name: 'Jawaharlal Nehru University (JNU)',
                type: 'Government',
                programs: ['MA', 'MSc', 'MCA', 'MBA', 'PhD', 'M.Phil'],
                location: { type: 'Point', coordinates: [77.1674, 28.5407] },
                address: 'New Mehrauli Rd, New Delhi 110067',
                state: 'Delhi',
                district: 'South-West Delhi',
                ranking: 6,
                facilities: ['Library', 'Hostel', 'Sports', 'Research Centers'],
            },
            {
                name: 'Hyderabad Central University (University of Hyderabad)',
                type: 'Government',
                programs: ['MA', 'MSc', 'M.Tech', 'MBA', 'PhD', 'M.Phil', 'MCA'],
                location: { type: 'Point', coordinates: [78.3994, 17.4065] },
                address: 'Prof. C.R. Rao Rd, Gachibowli, Hyderabad, Telangana 500046',
                state: 'Telangana',
                district: 'Hyderabad',
                ranking: 12,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Osmania University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'LLB', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [78.5182, 17.4126] },
                address: 'University Rd, Hyderabad, Telangana 500007',
                state: 'Telangana',
                district: 'Hyderabad',
                ranking: 13,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports', 'Cafeteria'],
            },
            {
                name: 'University of Mumbai',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'LLB', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [72.8345, 18.9294] },
                address: 'M.G. Road, Fort, Mumbai, Maharashtra 400032',
                state: 'Maharashtra',
                district: 'Mumbai',
                ranking: 14,
                facilities: ['Library', 'Labs', 'Sports'],
            },
            // â”€â”€ Science & Research â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'Indian Institute of Science (IISc)',
                type: 'Government',
                programs: ['B.Sc (Research)', 'M.Tech', 'MSc', 'PhD', 'M.Des'],
                location: { type: 'Point', coordinates: [77.5683, 13.0212] },
                address: 'CV Raman Rd, Bengaluru, Karnataka 560012',
                state: 'Karnataka',
                district: 'Bengaluru',
                ranking: 1,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Tata Institute of Fundamental Research (TIFR)',
                type: 'Government',
                programs: ['PhD', 'Integrated PhD', 'MSc'],
                location: { type: 'Point', coordinates: [72.8051, 18.9065] },
                address: 'Homi Bhabha Rd, Colaba, Mumbai, Maharashtra 400005',
                state: 'Maharashtra',
                district: 'Mumbai',
                ranking: 2,
                facilities: ['Research Labs', 'Library', 'Hostel'],
            },
            // â”€â”€ Commerce & Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'Shri Ram College of Commerce (SRCC), Delhi University',
                type: 'Government',
                programs: ['B.Com (H)', 'B.A. (H) Economics', 'M.Com'],
                location: { type: 'Point', coordinates: [77.2186, 28.6845] },
                address: 'Maurice Nagar, Delhi 110007',
                state: 'Delhi',
                district: 'North Delhi',
                ranking: 1,
                facilities: ['Library', 'Labs', 'Sports', 'Cafeteria'],
            },
            {
                name: 'Government College of Commerce & Economics, Mumbai',
                type: 'Government',
                programs: ['B.Com', 'B.Com (Banking)', 'BMS', 'BAF'],
                location: { type: 'Point', coordinates: [72.8246, 18.9439] },
                address: 'V N Purav Marg, Chunabhatti, Mumbai, Maharashtra 400022',
                state: 'Maharashtra',
                district: 'Mumbai',
                ranking: 5,
                facilities: ['Library', 'Labs', 'Cafeteria'],
            },
            // â”€â”€ Design & Fine Arts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'National Institute of Design (NID), Ahmedabad',
                type: 'Government',
                programs: ['B.Des', 'M.Des', 'Diploma in Design', 'PhD'],
                location: { type: 'Point', coordinates: [72.5676, 23.0290] },
                address: 'Paldi, Ahmedabad, Gujarat 380007',
                state: 'Gujarat',
                district: 'Ahmedabad',
                ranking: 1,
                facilities: ['Design Studios', 'Library', 'Hostel', 'Workshops'],
            },
            {
                name: 'Government College of Fine Arts, Chennai',
                type: 'Government',
                programs: ['BFA (Painting)', 'BFA (Sculpture)', 'BFA (Applied Art)', 'MFA'],
                location: { type: 'Point', coordinates: [80.2677, 13.0701] },
                address: 'College Road, Nungambakkam, Chennai, Tamil Nadu 600006',
                state: 'Tamil Nadu',
                district: 'Chennai',
                ranking: 3,
                facilities: ['Art Studios', 'Library', 'Exhibition Halls'],
            },
            // â”€â”€ Polytechnic / Vocational â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'Government Polytechnic Hyderabad',
                type: 'Government',
                programs: ['Diploma in CS', 'Diploma in ECE', 'Diploma in Mechanical', 'Diploma in Civil'],
                location: { type: 'Point', coordinates: [78.4867, 17.3850] },
                address: 'Masab Tank, Hyderabad, Telangana 500028',
                state: 'Telangana',
                district: 'Hyderabad',
                ranking: 1,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Government Polytechnic Mumbai',
                type: 'Government',
                programs: ['Diploma in CS', 'Diploma in ECE', 'Diploma in Mechanical', 'Diploma in Production'],
                location: { type: 'Point', coordinates: [72.8347, 19.0215] },
                address: 'Bandra East, Mumbai, Maharashtra 400051',
                state: 'Maharashtra',
                district: 'Mumbai',
                ranking: 2,
                facilities: ['Labs', 'Library', 'Sports'],
            },
            // â”€â”€ State Universities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            {
                name: 'Anna University',
                type: 'Government',
                programs: ['B.Tech', 'BE', 'M.Tech', 'ME', 'MBA', 'MCA', 'PhD'],
                location: { type: 'Point', coordinates: [80.2337, 13.0129] },
                address: 'Sardar Patel Rd, Guindy, Chennai, Tamil Nadu 600025',
                state: 'Tamil Nadu',
                district: 'Chennai',
                ranking: 15,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Rajasthan Technical University (RTU)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'BArch'],
                location: { type: 'Point', coordinates: [75.7873, 25.2138] },
                address: 'Akelgarh, Kota, Rajasthan 324010',
                state: 'Rajasthan',
                district: 'Kota',
                ranking: 20,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Sri Venkateswara University',
                type: 'Government',
                programs: ['B.Tech', 'BSc', 'BA', 'B.Com', 'MBA', 'MCA', 'PhD'],
                location: { type: 'Point', coordinates: [79.3129, 13.6288] },
                address: 'Tirupati, Andhra Pradesh 517502',
                state: 'Andhra Pradesh',
                district: 'Tirupati',
                ranking: 18,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Savitribai Phule Pune University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [73.8567, 18.5596] },
                address: 'Ganeshkhind Rd, Pune, Maharashtra 411007',
                state: 'Maharashtra',
                district: 'Pune',
                ranking: 17,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Calcutta University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'LLB', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [88.3639, 22.5800] },
                address: 'Senate House, College Street, Kolkata, West Bengal 700073',
                state: 'West Bengal',
                district: 'Kolkata',
                ranking: 19,
                facilities: ['Library', 'Labs', 'Hostel'],
            },
            {
                name: 'Panjab University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'LLB', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [76.7476, 30.7593] },
                address: 'Sector 14, Chandigarh 160014',
                state: 'Punjab',
                district: 'Chandigarh',
                ranking: 16,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Gauhati University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'LLB', 'B.Tech', 'MBA', 'MA', 'PhD'],
                location: { type: 'Point', coordinates: [91.6915, 26.1540] },
                address: 'Gopinath Bordoloi Nagar, Jalukbari, Guwahati, Assam 781014',
                state: 'Assam',
                district: 'Kamrup',
                ranking: 22,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Rajiv Gandhi University of Health Sciences (RGUHS)',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'BDS', 'B.Pharm', 'B.Sc Nursing', 'BAMS', 'BHMS'],
                location: { type: 'Point', coordinates: [77.5693, 12.9344] },
                address: 'Jayanagar 4th T Block, Bengaluru, Karnataka 560041',
                state: 'Karnataka',
                district: 'Bengaluru',
                ranking: 10,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'Government Engineering College Rajkot',
                type: 'Government',
                programs: ['B.Tech in CS', 'B.Tech in Civil', 'B.Tech in Mechanical', 'B.Tech in ECE'],
                location: { type: 'Point', coordinates: [70.8022, 22.3039] },
                address: 'Rajkot, Gujarat 360005',
                state: 'Gujarat',
                district: 'Rajkot',
                ranking: 25,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Government College of Engineering Pune (COEP)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'PhD'],
                location: { type: 'Point', coordinates: [73.8567, 18.5308] },
                address: 'Wellesley Rd, Shivajinagar, Pune, Maharashtra 411005',
                state: 'Maharashtra',
                district: 'Pune',
                ranking: 21,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'PSG College of Technology (Autonomous)',
                type: 'Government',
                programs: ['B.Tech', 'BE', 'M.Tech', 'MBA', 'MCA', 'PhD'],
                location: { type: 'Point', coordinates: [77.0099, 11.0253] },
                address: 'Peelamedu, Coimbatore, Tamil Nadu 641004',
                state: 'Tamil Nadu',
                district: 'Coimbatore',
                ranking: 23,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Visva-Bharati University (Santiniketan)',
                type: 'Government',
                programs: ['BA', 'BFA', 'BMus', 'BSc', 'MA', 'MFA', 'PhD'],
                location: { type: 'Point', coordinates: [87.6882, 23.6835] },
                address: 'Santiniketan, Birbhum, West Bengal 731235',
                state: 'West Bengal',
                district: 'Birbhum',
                ranking: 24,
                facilities: ['Library', 'Art Studios', 'Hostel', 'Heritage Campus'],
            },
        ];
        await College.insertMany(colleges);
    }

    // ── Phase 2: Additional colleges (Telangana/AP focus + cross-state) ──────
    // Insert extra colleges always (they have unique names so won't duplicate if DB was fresh seeded)
    const extraCollegeNames = [
        'JNTU Hyderabad', 'Osmania Medical College', 'Gandhi Medical College Hyderabad',
        'BITS Pilani Hyderabad Campus', 'NIT Andhra Pradesh',
    ];
    const existingExtras = await College.countDocuments({ name: { $in: extraCollegeNames } });

    if (existingExtras === 0) {
        const extraColleges = [
            // ── Telangana ──────────────────────────────────────────────────────
            {
                name: 'JNTU Hyderabad (Jawaharlal Nehru Technological University)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'PhD', 'B.Pharm'],
                location: { type: 'Point', coordinates: [78.3719, 17.4065] },
                address: 'Kukatpally, Hyderabad, Telangana 500085',
                state: 'Telangana', district: 'Hyderabad', ranking: 35,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Innovation Center'],
            },
            {
                name: 'Osmania Medical College',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'MDS', 'B.Sc Nursing', 'B.Pharm'],
                location: { type: 'Point', coordinates: [78.4862, 17.3766] },
                address: 'Afzalgunj, Hyderabad, Telangana 500095',
                state: 'Telangana', district: 'Hyderabad', ranking: 8,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'Gandhi Medical College Hyderabad',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'B.Sc Nursing'],
                location: { type: 'Point', coordinates: [78.4750, 17.4487] },
                address: 'Secunderabad, Telangana 500003',
                state: 'Telangana', district: 'Hyderabad', ranking: 9,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'Government College of Arts & Social Sciences (Osmania)',
                type: 'Government',
                programs: ['BA', 'MA', 'B.Com', 'M.Com', 'BSc', 'PhD'],
                location: { type: 'Point', coordinates: [78.4967, 17.4126] },
                address: 'Osmania University Campus, Hyderabad, Telangana 500007',
                state: 'Telangana', district: 'Hyderabad', ranking: 40,
                facilities: ['Library', 'Hostel', 'Sports', 'Cafeteria'],
            },
            {
                name: 'BITS Pilani Hyderabad Campus',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MSc'],
                location: { type: 'Point', coordinates: [78.3490, 17.5449] },
                address: 'Jawahar Nagar, Shameerpet Mandal, Hyderabad, Telangana 500078',
                state: 'Telangana', district: 'Medchal', ranking: 18,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Research Center'],
            },
            {
                name: 'Telangana State Police Academy',
                type: 'Government',
                programs: ['Diploma in Criminology', 'Certificate in Law Enforcement'],
                location: { type: 'Point', coordinates: [78.5480, 17.3940] },
                address: 'Petlaburj, Hyderabad, Telangana 500173',
                state: 'Telangana', district: 'Hyderabad', ranking: 50,
                facilities: ['Training Grounds', 'Library', 'Hostel'],
            },
            {
                name: 'Kakatiya University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'MBA', 'MCA', 'MA', 'PhD'],
                location: { type: 'Point', coordinates: [79.5310, 18.0057] },
                address: 'Vidyaranyapuri, Warangal, Telangana 506009',
                state: 'Telangana', district: 'Warangal', ranking: 42,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Mahatma Gandhi Institute of Technology (MGIT)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [78.3430, 17.4050] },
                address: 'Gandipet, Hyderabad, Telangana 500075',
                state: 'Telangana', district: 'Hyderabad', ranking: 38,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'IIIT Hyderabad (International Institute of Information Technology)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MSc', 'MBA'],
                location: { type: 'Point', coordinates: [78.3492, 17.4450] },
                address: 'Gachibowli, Hyderabad, Telangana 500032',
                state: 'Telangana', district: 'Hyderabad', ranking: 14,
                facilities: ['Labs', 'Library', 'Hostel', 'Research Labs', 'Incubation'],
            },
            {
                name: 'Palamuru University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'MBA', 'MCA', 'MA', 'PhD'],
                location: { type: 'Point', coordinates: [77.9860, 16.7437] },
                address: 'Mahabubnagar, Telangana 509001',
                state: 'Telangana', district: 'Mahabubnagar', ranking: 55,
                facilities: ['Library', 'Labs', 'Hostel'],
            },
            // ── Andhra Pradesh ──────────────────────────────────────────────────
            {
                name: 'NIT Andhra Pradesh',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MSc'],
                location: { type: 'Point', coordinates: [80.6480, 16.5193] },
                address: 'Tadepalligudem, West Godavari, Andhra Pradesh 534101',
                state: 'Andhra Pradesh', district: 'West Godavari', ranking: 22,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Andhra University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'BE', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [83.3183, 17.7246] },
                address: 'Visakhapatnam, Andhra Pradesh 530003',
                state: 'Andhra Pradesh', district: 'Visakhapatnam', ranking: 25,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports', 'Hospital'],
            },
            {
                name: 'JNTU Anantapur',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'PhD'],
                location: { type: 'Point', coordinates: [77.6006, 14.6787] },
                address: 'Ananthapuramu, Andhra Pradesh 515002',
                state: 'Andhra Pradesh', district: 'Ananthapuramu', ranking: 40,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Government Medical College Nellore',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'B.Sc Nursing'],
                location: { type: 'Point', coordinates: [79.9860, 14.4426] },
                address: 'Nellore, Andhra Pradesh 524002',
                state: 'Andhra Pradesh', district: 'Nellore', ranking: 15,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'RGUKT AP (IIIT Nuzvid)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech'],
                location: { type: 'Point', coordinates: [80.8521, 16.7848] },
                address: 'Nuzvid, Krishna District, Andhra Pradesh 521201',
                state: 'Andhra Pradesh', district: 'Krishna', ranking: 30,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Acharya Nagarjuna University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'MBA', 'MCA', 'MA', 'PhD'],
                location: { type: 'Point', coordinates: [80.4365, 16.5415] },
                address: 'Nagarjuna Nagar, Guntur, Andhra Pradesh 522510',
                state: 'Andhra Pradesh', district: 'Guntur', ranking: 33,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            // ── Karnataka additional ────────────────────────────────────────────
            {
                name: 'Visvesvaraya Technological University (VTU)',
                type: 'Government',
                programs: ['B.Tech', 'BE', 'M.Tech', 'MBA', 'MCA', 'PhD'],
                location: { type: 'Point', coordinates: [75.7139, 15.3647] },
                address: 'Belgaum (Belagavi), Karnataka 590018',
                state: 'Karnataka', district: 'Belagavi', ranking: 28,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Government Law College Bengaluru',
                type: 'Government',
                programs: ['BA LLB', 'LLB', 'LLM', 'PhD'],
                location: { type: 'Point', coordinates: [77.5873, 12.9768] },
                address: 'Infantry Road, Bengaluru, Karnataka 560001',
                state: 'Karnataka', district: 'Bengaluru', ranking: 10,
                facilities: ['Library', 'Moot Court', 'Cafeteria'],
            },
            {
                name: 'University of Agricultural Sciences Bengaluru (UAS)',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD', 'B.Tech Agri Engineering'],
                location: { type: 'Point', coordinates: [77.5798, 13.0003] },
                address: 'GKVK, Yelahanka, Bengaluru, Karnataka 560065',
                state: 'Karnataka', district: 'Bengaluru', ranking: 5,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields'],
            },
            // ── Tamil Nadu additional ────────────────────────────────────────────
            {
                name: 'Government College of Engineering Salem',
                type: 'Government',
                programs: ['B.Tech', 'BE', 'M.Tech', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [78.1460, 11.6810] },
                address: 'Omalur, Salem, Tamil Nadu 636011',
                state: 'Tamil Nadu', district: 'Salem', ranking: 45,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'The New College (Autonomous) Chennai',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'MA', 'MSc', 'M.Com'],
                location: { type: 'Point', coordinates: [80.2585, 13.0520] },
                address: 'Royapettah, Chennai, Tamil Nadu 600014',
                state: 'Tamil Nadu', district: 'Chennai', ranking: 50,
                facilities: ['Library', 'Labs', 'Sports', 'Cafeteria'],
            },
            // ── Maharashtra additional ────────────────────────────────────────────
            {
                name: 'Veermata Jijabai Technological Institute (VJTI)',
                type: 'Government',
                programs: ['B.Tech', 'BE', 'M.Tech', 'PhD'],
                location: { type: 'Point', coordinates: [72.8511, 19.0176] },
                address: 'HR Mahajani Road, Matunga, Mumbai, Maharashtra 400019',
                state: 'Maharashtra', district: 'Mumbai', ranking: 30,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Dr. Babasaheb Ambedkar Marathwada University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'B.Tech', 'MBA', 'MA', 'PhD'],
                location: { type: 'Point', coordinates: [75.3561, 19.8802] },
                address: 'Aurangabad, Maharashtra 431004',
                state: 'Maharashtra', district: 'Aurangabad', ranking: 48,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            // ── Uttar Pradesh additional ────────────────────────────────────────
            {
                name: 'Dr. APJ Abdul Kalam Technical University (AKTU)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'BArch', 'PhD'],
                location: { type: 'Point', coordinates: [80.9459, 26.8647] },
                address: 'Jankipuram, Lucknow, Uttar Pradesh 226031',
                state: 'Uttar Pradesh', district: 'Lucknow', ranking: 32,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Allahabad University (University of Allahabad)',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'LLB', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [81.9327, 25.4487] },
                address: 'Senate House, University Road, Prayagraj, UP 211002',
                state: 'Uttar Pradesh', district: 'Prayagraj', ranking: 27,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            // ── Rajasthan additional ─────────────────────────────────────────────
            {
                name: 'University of Rajasthan',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'LLB', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [75.7959, 26.9106] },
                address: 'JLN Marg, Jaipur, Rajasthan 302004',
                state: 'Rajasthan', district: 'Jaipur', ranking: 35,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'MNIT Jaipur (Malaviya National Institute of Technology)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MSc'],
                location: { type: 'Point', coordinates: [75.8048, 26.8624] },
                address: 'JLN Marg, Jaipur, Rajasthan 302017',
                state: 'Rajasthan', district: 'Jaipur', ranking: 17,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            // ── Gujarat additional ───────────────────────────────────────────────
            {
                name: 'Sardar Vallabhbhai NIT Surat (SVNIT)',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
                location: { type: 'Point', coordinates: [72.7849, 21.1694] },
                address: 'Ichchhanath, Surat, Gujarat 395007',
                state: 'Gujarat', district: 'Surat', ranking: 20,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Gujarat National Law University (GNLU)',
                type: 'Government',
                programs: ['BA LLB', 'BBA LLB', 'LLM', 'PhD'],
                location: { type: 'Point', coordinates: [72.5030, 23.0860] },
                address: 'GNLU, Attalika Avenue, Koba, Gandhinagar, Gujarat 382426',
                state: 'Gujarat', district: 'Gandhinagar', ranking: 5,
                facilities: ['Library', 'Moot Court', 'Hostel', 'Sports'],
            },
            // ── Punjab / Haryana / HP ────────────────────────────────────────────
            {
                name: 'NIT Hamirpur',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
                location: { type: 'Point', coordinates: [76.5225, 31.6869] },
                address: 'Hamirpur, Himachal Pradesh 177005',
                state: 'Himachal Pradesh', district: 'Hamirpur', ranking: 26,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'NIT Kurukshetra',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [76.8309, 29.9720] },
                address: 'Kurukshetra, Haryana 136119',
                state: 'Haryana', district: 'Kurukshetra', ranking: 24,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            // ── Bihar / Jharkhand ────────────────────────────────────────────────
            {
                name: 'NIT Patna',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
                location: { type: 'Point', coordinates: [85.1376, 25.6093] },
                address: 'Ashok Rajpath, Patna, Bihar 800005',
                state: 'Bihar', district: 'Patna', ranking: 29,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'NIT Jamshedpur',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
                location: { type: 'Point', coordinates: [86.1823, 22.7753] },
                address: 'Adityapur, Jamshedpur, Jharkhand 831014',
                state: 'Jharkhand', district: 'East Singhbhum', ranking: 31,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            // ── Madhya Pradesh additional ────────────────────────────────────────
            {
                name: 'Indian Institute of Information Technology Design & Manufacturing (IIITDM) Jabalpur',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD'],
                location: { type: 'Point', coordinates: [79.9464, 23.2198] },
                address: 'ITI Campus, Jabalpur, Madhya Pradesh 482005',
                state: 'Madhya Pradesh', district: 'Jabalpur', ranking: 34,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            // ── Odisha additional ────────────────────────────────────────────────
            {
                name: 'Utkal University',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'LLB', 'MBA', 'MA', 'MSc', 'PhD'],
                location: { type: 'Point', coordinates: [85.8281, 20.2986] },
                address: 'Vani Vihar, Bhubaneswar, Odisha 751004',
                state: 'Odisha', district: 'Khordha', ranking: 37,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            // ── North Eastern States ─────────────────────────────────────────────
            {
                name: 'NIT Silchar',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [92.7789, 24.6868] },
                address: 'Silchar, Assam 788010',
                state: 'Assam', district: 'Cachar', ranking: 36,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            // ── Design & Fine Arts additional ────────────────────────────────────
            {
                name: 'National Institute of Design Hyderabad (NID Hyderabad)',
                type: 'Government',
                programs: ['B.Des', 'M.Des', 'Diploma in Design'],
                location: { type: 'Point', coordinates: [78.4100, 17.4400] },
                address: 'Opposite to IIIT-H, Gachibowli, Hyderabad, Telangana 500032',
                state: 'Telangana', district: 'Hyderabad', ranking: 3,
                facilities: ['Design Studios', 'Library', 'Hostel', 'Workshops'],
            },
            {
                name: 'Government Institute of Fine Arts Hyderabad',
                type: 'Government',
                programs: ['BFA (Painting)', 'BFA (Applied Art)', 'BFA (Sculpture)', 'MFA'],
                location: { type: 'Point', coordinates: [78.4682, 17.3995] },
                address: 'Nampally, Hyderabad, Telangana 500001',
                state: 'Telangana', district: 'Hyderabad', ranking: 12,
                facilities: ['Art Studios', 'Library', 'Exhibition Hall'],
            },
            // ── Agriculture additional ───────────────────────────────────────────
            {
                name: 'Professor Jayashankar Telangana State Agricultural University (PJTSAU)',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD', 'B.Tech Agri Engineering'],
                location: { type: 'Point', coordinates: [78.3958, 17.3984] },
                address: 'Rajendranagar, Hyderabad, Telangana 500030',
                state: 'Telangana', district: 'Hyderabad', ranking: 6,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields', 'Greenhouses'],
            },
            {
                name: 'ANGRAU (Acharya N.G. Ranga Agricultural University)',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD', 'B.Tech Food Tech'],
                location: { type: 'Point', coordinates: [80.6345, 16.5193] },
                address: 'Lam, Guntur, Andhra Pradesh 522034',
                state: 'Andhra Pradesh', district: 'Guntur', ranking: 7,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields'],
            },
            // ── Commerce additional ──────────────────────────────────────────────
            {
                name: 'Government City College Hyderabad (Nampally)',
                type: 'Government',
                programs: ['BA', 'B.Com', 'B.Com (Honours)', 'BSc', 'MA', 'M.Com'],
                location: { type: 'Point', coordinates: [78.4682, 17.3869] },
                address: 'Nampally, Hyderabad, Telangana 500001',
                state: 'Telangana', district: 'Hyderabad', ranking: 45,
                facilities: ['Library', 'Labs', 'Sports', 'Cafeteria'],
            },
            {
                name: 'St. Aloysius College (Autonomous) Mangalore',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'BCA', 'MA', 'M.Com', 'MSc'],
                location: { type: 'Point', coordinates: [74.8560, 12.8699] },
                address: 'Light House Hill Road, Mangalore, Karnataka 575003',
                state: 'Karnataka', district: 'Dakshina Kannada', ranking: 42,
                facilities: ['Library', 'Labs', 'Sports', 'Cafeteria', 'Chapel'],
            },
            // ── Polytechnic / Vocational ─────────────────────────────────────────
            {
                name: 'Government Polytechnic Warangal',
                type: 'Government',
                programs: ['Diploma in CS', 'Diploma in ECE', 'Diploma in Mechanical', 'Diploma in Civil', 'Diploma in EEE'],
                location: { type: 'Point', coordinates: [79.5950, 17.9754] },
                address: 'Hanamkonda, Warangal, Telangana 506001',
                state: 'Telangana', district: 'Warangal', ranking: 5,
                facilities: ['Labs', 'Library', 'Hostel'],
            },
            {
                name: 'Government Polytechnic Nizamabad',
                type: 'Government',
                programs: ['Diploma in CS', 'Diploma in ECE', 'Diploma in Mechanical', 'Diploma in Civil'],
                location: { type: 'Point', coordinates: [78.0958, 18.6726] },
                address: 'Nizamabad, Telangana 503001',
                state: 'Telangana', district: 'Nizamabad', ranking: 6,
                facilities: ['Labs', 'Library'],
            },
            {
                name: 'Government Polytechnic Secunderabad',
                type: 'Government',
                programs: ['Diploma in CS', 'Diploma in ECE', 'Diploma in Mechanical', 'Diploma in EEE'],
                location: { type: 'Point', coordinates: [78.4983, 17.4481] },
                address: 'Bowenpally, Secunderabad, Telangana 500011',
                state: 'Telangana', district: 'Hyderabad', ranking: 4,
                facilities: ['Labs', 'Library', 'Sports'],
            },
        ];
        await College.insertMany(extraColleges);
    }

    const finalCareers = await CareerPath.countDocuments();
    const finalColleges = await College.countDocuments();
    return { message: 'Seeded successfully', careers: finalCareers, colleges: finalColleges };
};

// @desc    Seed Data via HTTP (force-clears all data and re-seeds)
// @route   POST /api/careers/seed
const seedData = asyncHandler(async (req, res) => {
    // Force clear both careers and colleges so expanded data is always applied
    await CareerPath.deleteMany({});
    await College.deleteMany({});
    const result = await doSeed();
    res.json(result);
});

// Auto-seed on startup â€” called from db.js, no HTTP context needed
const autoSeed = async () => {
    try {
        const result = await doSeed();
        console.log('[Seed]', result.message);
    } catch (e) {
        console.error('[Seed] Error during auto-seed:', e.message);
    }
};

// @desc    Trigger data update via scrapers (career market data + optionally colleges)
// @route   POST /api/careers/update-data
const updateData = asyncHandler(async (req, res) => {
    const { target = 'careers' } = req.body; // 'careers' | 'colleges' | 'all'
    try {
        const { runScrapers } = require('../scrapers/index');
        const result = await runScrapers({ target, dryRun: false });
        res.json({ message: 'Data updated successfully', result });
    } catch (err) {
        res.status(500);
        throw new Error(`Scraper failed: ${err.message}`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STREAM RECOMMENDATION — Most important for Class 10 students
// ═══════════════════════════════════════════════════════════════════════════════

// Stream → career-category mapping (used for scoring)
// Covers ALL real post-Class 10 pathways in India
const STREAM_TO_CATEGORIES = {
    'Science-PCM': { Technology: 3, Engineering: 3, Commerce: 0.5, Business: 0.5, Medical: 0, Agriculture: 0, 'Arts & Design': 0, Media: 0, Education: 0.5, Law: 0.5 },
    'Science-PCB': { Medical: 3, Agriculture: 2, Technology: 0.5, Engineering: 0.5, Commerce: 0, Business: 0, 'Arts & Design': 0, Media: 0, Education: 0.5, Law: 0 },
    'Commerce':    { Commerce: 3, Business: 3, Law: 1.5, Technology: 0.5, Engineering: 0, Medical: 0, Agriculture: 0, 'Arts & Design': 0, Media: 0, Education: 0.5 },
    'Arts / Humanities': { 'Arts & Design': 3, Media: 3, Education: 2.5, Law: 2, Commerce: 0.5, Business: 0.5, Technology: 0, Engineering: 0, Medical: 0, Agriculture: 0 },
    'Diploma / Polytechnic': { Engineering: 3, Technology: 2.5, Agriculture: 1.5, Commerce: 0, Business: 0.5, Medical: 0, 'Arts & Design': 0.5, Media: 0, Education: 0, Law: 0 },
    'ITI / Skill Training':  { Engineering: 2.5, Technology: 1.5, Agriculture: 1, Commerce: 0, Business: 0, Medical: 0, 'Arts & Design': 0.5, Media: 0, Education: 0, Law: 0 },
    'Paramedical / Nursing Diploma': { Medical: 3, Agriculture: 0.5, Technology: 0, Engineering: 0, Commerce: 0, Business: 0, 'Arts & Design': 0, Media: 0, Education: 1, Law: 0 },
};

// Aptitude vector → stream affinity
const APTITUDE_STREAM_WEIGHTS = {
    'Science-PCM': { logic: 0.35, technical: 0.35, creativity: 0.15, social: 0.15 },
    'Science-PCB': { logic: 0.25, technical: 0.25, creativity: 0.15, social: 0.35 },
    'Commerce':    { logic: 0.35, technical: 0.15, creativity: 0.15, social: 0.35 },
    'Arts / Humanities': { logic: 0.10, technical: 0.10, creativity: 0.40, social: 0.40 },
    'Diploma / Polytechnic': { logic: 0.25, technical: 0.40, creativity: 0.15, social: 0.20 },
    'ITI / Skill Training':  { logic: 0.15, technical: 0.45, creativity: 0.20, social: 0.20 },
    'Paramedical / Nursing Diploma': { logic: 0.20, technical: 0.20, creativity: 0.10, social: 0.50 },
};

const STREAM_LABELS = {
    'Science-PCM': 'Science (PCM — Physics, Chemistry, Math) → B.Tech, B.Sc, JEE pathway',
    'Science-PCB': 'Science (PCB — Physics, Chemistry, Biology) → MBBS, B.Sc, NEET pathway',
    'Commerce': 'Commerce (Accounts, Economics, Business Studies) → B.Com, CA, MBA pathway',
    'Arts / Humanities': 'Arts / Humanities (History, Pol. Science, Languages) → BA, Law, Civil Services',
    'Diploma / Polytechnic': 'Diploma / Polytechnic (3-year technical diploma) → Engineering, IT, direct industry jobs',
    'ITI / Skill Training': 'ITI / Skill Training (1-2 year trade course) → Electrician, Fitter, COPA, Welder, Mechanic',
    'Paramedical / Nursing Diploma': 'Paramedical / Nursing Diploma (DMLT, ANM/GNM, X-Ray Tech) → Healthcare jobs',
};

// Extra info shown to students about each pathway
const STREAM_INFO = {
    'Science-PCM': { duration: '2 years (11th-12th)', after: 'B.Tech/BE, B.Sc, BCA, JEE Main/Advanced', institutions: 'CBSE/State Board schools' },
    'Science-PCB': { duration: '2 years (11th-12th)', after: 'MBBS, BDS, B.Sc Nursing, BAMS, NEET', institutions: 'CBSE/State Board schools' },
    'Commerce': { duration: '2 years (11th-12th)', after: 'B.Com, BBA, CA/CS, MBA', institutions: 'CBSE/State Board schools' },
    'Arts / Humanities': { duration: '2 years (11th-12th)', after: 'BA, BFA, BA LLB, UPSC, Journalism', institutions: 'CBSE/State Board schools' },
    'Diploma / Polytechnic': { duration: '3 years after 10th', after: 'Direct jobs, Lateral entry to B.Tech 2nd year, higher diplomas', institutions: 'Govt. Polytechnics (AICTE approved)' },
    'ITI / Skill Training': { duration: '1-2 years after 10th', after: 'Govt/Private sector jobs, Apprenticeships, further ITI', institutions: 'Govt. ITIs (DGT/NCVT certified)' },
    'Paramedical / Nursing Diploma': { duration: '1-3 years after 10th', after: 'Hospital jobs, Lab technician, ANM/GNM nursing, X-Ray tech', institutions: 'State Health Board / Govt. paramedical colleges' },
};

// @desc    Get personalized stream recommendations
// @route   POST /api/careers/recommend-stream
const getStreamRecommendation = asyncHandler(async (req, res) => {
    const { careerCategoryScores, quizScores, interests = [], grade } = req.body;

    if (!careerCategoryScores && !quizScores) {
        res.status(400);
        throw new Error('Assessment data required (careerCategoryScores or quizScores)');
    }

    const catScores = careerCategoryScores || {};
    const aptVec = quizScores || {};

    // Normalize career-category scores to 0-1
    const maxCatScore = Math.max(...Object.values(catScores).map(v => Number(v) || 0), 1);

    // ═══ Fetch and rank top careers for stream boosting ═══
    const allCareers = await CareerPath.find({});
    const boostedCategories = new Set();
    interests.forEach(interest => {
        const cats = INTEREST_CATEGORY_MAP[interest] || [];
        cats.forEach(c => boostedCategories.add(c));
    });

    const scoredCareers = allCareers.map(career => {
        let score = 0;
        const categoryWeight = Number(catScores[career.category]) || 0;
        const normalizedCatWeight = (categoryWeight / maxCatScore) * 50;
        score += normalizedCatWeight;

        const similarity = cosineSimilarity(aptVec, career.matchVector || {});
        score += similarity * 20;

        if (boostedCategories.has(career.category)) {
            score += 20;
        }

        return {
            requiredStream: career.requiredStream,
            score,
        };
    });

    scoredCareers.sort((a, b) => b.score - a.score);
    const top3Careers = scoredCareers.slice(0, 3);

    const streamBoosts = {
        'Science-PCM': 0,
        'Science-PCB': 0,
        'Commerce': 0,
        'Arts / Humanities': 0,
        'Diploma / Polytechnic': 0,
        'ITI / Skill Training': 0,
        'Paramedical / Nursing Diploma': 0,
    };

    top3Careers.forEach((c, idx) => {
        const boostVal = (3 - idx) * 15; // 45, 30, 15
        if (c.requiredStream === 'Science-PCM') {
            streamBoosts['Science-PCM'] += boostVal;
        } else if (c.requiredStream === 'Science-PCB') {
            streamBoosts['Science-PCB'] += boostVal;
            streamBoosts['Paramedical / Nursing Diploma'] += boostVal * 0.7;
        } else if (c.requiredStream === 'Commerce') {
            streamBoosts['Commerce'] += boostVal;
        } else if (c.requiredStream === 'Arts / Humanities') {
            streamBoosts['Arts / Humanities'] += boostVal;
        } else if (c.requiredStream === 'Vocational') {
            streamBoosts['Diploma / Polytechnic'] += boostVal;
            streamBoosts['ITI / Skill Training'] += boostVal * 0.8;
        }
    });

    const streamScores = {};

    for (const [stream, catWeights] of Object.entries(STREAM_TO_CATEGORIES)) {
        let score = 0;

        // ═══ SIGNAL 1: Career-category alignment (50%) ═══
        let catSignal = 0;
        for (const [cat, weight] of Object.entries(catWeights)) {
            const studentCatScore = (Number(catScores[cat]) || 0) / maxCatScore;
            catSignal += studentCatScore * weight;
        }
        const maxWeight = Object.values(catWeights).reduce((a, b) => a + b, 0);
        score += (catSignal / (maxWeight || 1)) * 50;

        // ═══ SIGNAL 2: Aptitude vector alignment (30%) ═══
        const aptWeights = APTITUDE_STREAM_WEIGHTS[stream] || {};
        let aptSignal = 0;
        for (const [dim, weight] of Object.entries(aptWeights)) {
            aptSignal += (Number(aptVec[dim]) || 0) * weight;
        }
        score += aptSignal * 30;

        // ═══ SIGNAL 3: Interest alignment (20%) ═══
        let interestMatches = 0;
        for (const [cat, weight] of Object.entries(catWeights)) {
            if (weight > 1 && boostedCategories.has(cat)) interestMatches++;
        }
        const highWeightCats = Object.values(catWeights).filter(w => w > 1).length;
        score += (interestMatches / (highWeightCats || 1)) * 20;

        // Apply stream boosts from top career requirements
        const finalScore = score + (streamBoosts[stream] || 0);
        streamScores[stream] = Math.min(100, Math.round(finalScore));
    }

    // Sort by score and build reasoning
    const sortedStreams = Object.entries(streamScores)
        .sort(([, a], [, b]) => b - a)
        .map(([stream, confidence]) => {
            // Build human-readable reasoning
            const reasons = [];
            const catWeights = STREAM_TO_CATEGORIES[stream];
            const topCats = Object.entries(catWeights)
                .filter(([, w]) => w >= 2)
                .map(([cat]) => cat);

            // Check which of the stream's top categories match the student's strengths
            const studentTopCats = Object.entries(catScores)
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .slice(0, 3)
                .map(([cat]) => cat);

            const matchingCats = topCats.filter(c => studentTopCats.includes(c));
            if (matchingCats.length > 0) {
                reasons.push(`Strong alignment with ${matchingCats.join(', ')} career fields`);
            }

            // Check aptitude match
            const aptWeights = APTITUDE_STREAM_WEIGHTS[stream] || {};
            const topAptDim = Object.entries(aptWeights).sort(([, a], [, b]) => b - a)[0];
            if (topAptDim && (Number(aptVec[topAptDim[0]]) || 0) > 0.5) {
                reasons.push(`Your ${topAptDim[0]} aptitude score supports this choice`);
            }

            // Check interest match
            const matchedInterests = interests.filter(i => {
                const cats = INTEREST_CATEGORY_MAP[i] || [];
                return cats.some(c => topCats.includes(c));
            });
            if (matchedInterests.length > 0) {
                reasons.push(`Aligns with your interests: ${matchedInterests.slice(0, 3).join(', ')}`);
            }

            if (reasons.length === 0) {
                reasons.push('Based on overall assessment profile');
            }

            return {
                stream,
                label: STREAM_LABELS[stream] || stream,
                confidence,
                reasoning: reasons.join('. ') + '.',
                info: STREAM_INFO[stream] || null,
            };
        });

    // For Class 10: return top 3 as explicit recommendations
    // For Class 12: return all with compatibility note
    const isClass10 = grade === '10';
    const recommendations = isClass10 ? sortedStreams.slice(0, 3) : sortedStreams;

    // If Class 12, add compatibility info
    const currentStream = req.user?.profile?.stream;
    let compatibility = null;
    if (!isClass10 && currentStream) {
        const currentStreamScore = streamScores[currentStream] || 0;
        const bestStream = sortedStreams[0];
        compatibility = {
            currentStream,
            currentScore: currentStreamScore,
            bestStream: bestStream.stream,
            bestScore: bestStream.confidence,
            isOptimal: currentStream === bestStream.stream,
            message: currentStream === bestStream.stream
                ? `Great news! Your current stream (${currentStream}) is the best match for your aptitude profile.`
                : `Your aptitude best matches ${bestStream.label}, but your current stream (${currentStream}) scored ${currentStreamScore}%. ${currentStreamScore > 40 ? "You can still excel in many careers with your current stream." : "Consider exploring careers that bridge both streams."}`,
        };
    }

    res.json({
        recommendations,
        compatibility,
        isClass10,
    });
});

module.exports = { getRecommendations, getCareers, seedData, autoSeed, updateData, getStreamRecommendation };

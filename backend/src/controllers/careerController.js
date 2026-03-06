const asyncHandler = require('express-async-handler');
const CareerPath = require('../models/careerPathModel');
const College = require('../models/collegeModel');

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    const keys = ['logic', 'creativity', 'technical', 'social'];
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

// @desc    Get recommendations based on quiz results
// @route   POST /api/careers/recommend
const getRecommendations = asyncHandler(async (req, res) => {
    const { quizScores, interests = [], academicScore, location, stream } = req.body;

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

    const scoredCareers = allCareers.map(career => {
        let score = 0;

        // 1. Cosine similarity on aptitude quiz scores (max 50 pts)
        const similarity = cosineSimilarity(quizScores, career.matchVector || {});
        score += similarity * 50;

        // 2. Interest-to-category match: user interests mapped to career categories (max 25 pts)
        if (boostedCategories.has(career.category)) score += 25;

        // 3. Stream compatibility boost (max 20 pts)
        if (stream && streamCompatible.has(career.category)) score += 20;

        // 4. Skill-level interest keyword match (max 10 pts fallback)
        const skillMatch = career.skills.some(skill =>
            interests.map(i => i.toLowerCase()).includes(skill.toLowerCase())
        );
        if (skillMatch) score += 10;

        // 5. Academic score multiplier (subtle 0-5% boost for high scorers)
        if (academicScore && academicScore > 70) {
            score *= (1 + (academicScore - 70) / 2000);
        }

        return { ...career.toObject(), score: Math.min(100, Math.round(score)) };
    });

    scoredCareers.sort((a, b) => b.score - a.score);
    const topCareers = scoredCareers.slice(0, 5);

    let nearbyColleges = [];
    try {
        if (location && location.lat && location.lng) {
            nearbyColleges = await College.find({
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
                        $maxDistance: 100000,
                    }
                }
            }).limit(10);
        }
        if (nearbyColleges.length === 0) {
            nearbyColleges = await College.find({}).limit(8);
        }
    } catch (e) {
        nearbyColleges = await College.find({}).limit(8);
    }

    res.json({
        recommendedCareers: topCareers,
        nearbyColleges,
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
                location: { type: 'Point', coordinates: [78.3310, 17.4065] },
                address: 'Prof. C.R. Rao Rd, Hyderabad, Telangana 500046',
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

    const finalCareers = await CareerPath.countDocuments();
    const finalColleges = await College.countDocuments();
    return { message: 'Seeded successfully', careers: finalCareers, colleges: finalColleges };
};

// @desc    Seed Data via HTTP (force-clears colleges and re-seeds)
// @route   POST /api/careers/seed
const seedData = asyncHandler(async (req, res) => {
    // Force clear colleges so new expanded data is applied
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

module.exports = { getRecommendations, getCareers, seedData, autoSeed };

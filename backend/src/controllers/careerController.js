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

// @desc    Get recommendations based on quiz results
// @route   POST /api/careers/recommend
const getRecommendations = asyncHandler(async (req, res) => {
    const { quizScores, interests = [], academicScore, location } = req.body;

    if (!quizScores) {
        res.status(400);
        throw new Error('quizScores are required');
    }

    const allCareers = await CareerPath.find({});

    const scoredCareers = allCareers.map(career => {
        let score = 0;
        const similarity = cosineSimilarity(quizScores, career.matchVector || {});
        score += similarity * 60;
        const interestMatch = career.skills.some(skill =>
            interests.map(i => i.toLowerCase()).includes(skill.toLowerCase())
        );
        if (interestMatch) score += 40;
        return { ...career.toObject(), score: Math.round(score) };
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
                        $maxDistance: 100000, // 100km
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

// @desc    Get all careers (with optional interest filter)
// @route   GET /api/careers
const getCareers = asyncHandler(async (req, res) => {
    const { category, stream } = req.query;
    let query = {};
    if (category) query.category = { $regex: category, $options: 'i' };
    if (stream) query.requiredStream = { $regex: stream, $options: 'i' };
    const careers = await CareerPath.find(query);
    res.json(careers);
});

// @desc    Seed Data
// @route   POST /api/careers/seed
const seedData = asyncHandler(async (req, res) => {
    const careerCount = await CareerPath.countDocuments();
    const collegeCount = await College.countDocuments();

    if (careerCount > 0 && collegeCount > 0) {
        return res.json({ message: 'Data already seeded', careers: careerCount, colleges: collegeCount });
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
                    { step: 'Data Analyst → Data Scientist', duration: 'Ongoing' },
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
                requiredStream: 'Arts / Any',
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
                requiredStream: 'Science-PCB / Agriculture',
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
            {
                name: 'Government Polytechnic Hyderabad',
                type: 'Government',
                programs: ['Diploma in CS', 'Diploma in Mechanical', 'Diploma in ECE', 'Diploma in Civil'],
                location: { type: 'Point', coordinates: [78.4867, 17.3850] },
                address: 'Masab Tank, Hyderabad, Telangana',
                state: 'Telangana',
                ranking: 1,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
            {
                name: 'Osmania University',
                type: 'Government',
                programs: ['B.Tech', 'BSc', 'BA', 'B.Com', 'LLB', 'MBA'],
                location: { type: 'Point', coordinates: [78.5182, 17.4126] },
                address: 'Hyderabad - 500007, Telangana',
                state: 'Telangana',
                ranking: 2,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports', 'Cafeteria'],
            },
            {
                name: 'IIT Bombay',
                type: 'Government',
                programs: ['B.Tech', 'M.Tech', 'PhD', 'BDes', 'MBA'],
                location: { type: 'Point', coordinates: [72.9156, 19.1334] },
                address: 'Powai, Mumbai, Maharashtra',
                state: 'Maharashtra',
                ranking: 1,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports', 'Research Centers'],
            },
            {
                name: 'Delhi University (DU)',
                type: 'Government',
                programs: ['BA', 'B.Com', 'BSc', 'LLB', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [77.2090, 28.6968] },
                address: 'North Campus, New Delhi',
                state: 'Delhi',
                ranking: 3,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports', 'Cafeteria'],
            },
            {
                name: 'Government Medical College Chennai',
                type: 'Government',
                programs: ['MBBS', 'MD', 'MS', 'BDS', 'B.Pharm'],
                location: { type: 'Point', coordinates: [80.2707, 13.0827] },
                address: 'Address: Park Town, Chennai, Tamil Nadu',
                state: 'Tamil Nadu',
                ranking: 2,
                facilities: ['Hospital', 'Labs', 'Library', 'Hostel'],
            },
            {
                name: 'Indian Agricultural Research Institute (IARI)',
                type: 'Government',
                programs: ['BSc Agriculture', 'MSc Agriculture', 'PhD'],
                location: { type: 'Point', coordinates: [77.1491, 28.6328] },
                address: 'Pusa, New Delhi',
                state: 'Delhi',
                ranking: 1,
                facilities: ['Research Labs', 'Library', 'Hostel', 'Farm Fields'],
            },
            {
                name: 'Government Engineering College Rajkot',
                type: 'Government',
                programs: ['B.Tech in CS', 'B.Tech in Civil', 'B.Tech in Mech', 'B.Tech in ECE'],
                location: { type: 'Point', coordinates: [70.8022, 22.3039] },
                address: 'Rajkot, Gujarat',
                state: 'Gujarat',
                ranking: 5,
                facilities: ['Labs', 'Library', 'Hostel', 'Sports'],
            },
            {
                name: 'Sri Venkateswara University',
                type: 'Government',
                programs: ['B.Tech', 'BSc', 'BA', 'B.Com', 'MBA', 'MCA'],
                location: { type: 'Point', coordinates: [79.3129, 13.6288] },
                address: 'Tirupati, Andhra Pradesh',
                state: 'Andhra Pradesh',
                ranking: 4,
                facilities: ['Library', 'Labs', 'Hostel', 'Sports'],
            },
        ];
        await College.insertMany(colleges);
    }

    res.json({ message: 'Seeded successfully', careers: await CareerPath.countDocuments(), colleges: await College.countDocuments() });
});

module.exports = { getRecommendations, getCareers, seedData };

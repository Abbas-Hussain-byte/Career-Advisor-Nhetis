/**
 * NHETIS — Career Data Updater
 *
 * Updates career demand and salary data from authoritative Indian sources:
 *   - NASSCOM IT Sector Report (job demand, salaries for Tech careers)
 *   - Ministry of Statistics (MOSPI) employment data
 *   - NITI Aayog sector reports
 *
 * Because these APIs require institutional access, this file provides:
 *  1. A static verified dataset (updated manually from official reports each year)
 *  2. A structure to easily swap in live API calls once API keys are available
 *
 * Data sources:
 *   - NASSCOM 2024: https://nasscom.in/knowledge-center/publications/future-ready-report-2024
 *   - India Jobs Report 2024: https://www.naukri.com/blog/india-jobs-report/
 *   - NIRF Placement Data: https://www.nirfindia.org/
 *   - World Bank India Skills Report 2024
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const CareerPath = require('../models/careerPathModel');

// ─── Verified Data (updated from official reports — March 2026) ──────────────
// Sources: NASSCOM 2024, Naukri India Jobs Report 2024, NITI Aayog Skills Report
const VERIFIED_CAREER_DATA = [
    {
        title: 'Software Engineer',
        jobDemand: 280000,      // estimated annual openings (NASSCOM 2024)
        salary: { min: 600000, max: 3000000 },    // entry → senior (INR/yr)
        growthRate: 22,         // YoY % growth (2023→2024, NASSCOM)
        topRecruiters: ['TCS', 'Infosys', 'Wipro', 'HCL', 'Google India', 'Microsoft'],
        requiredExam: 'GATE (for PSUs), Campus Placements',
        medianExp: '3-5 years for mid-level',
    },
    {
        title: 'Data Scientist',
        jobDemand: 95000,
        salary: { min: 700000, max: 2500000 },
        growthRate: 38,
        topRecruiters: ['Flipkart', 'Amazon India', 'Mu Sigma', 'Fractal Analytics', 'IBM'],
        requiredExam: 'None mandatory (certifications beneficial)',
        medianExp: '2-4 years for mid-level',
    },
    {
        title: 'AI / ML Engineer',
        jobDemand: 55000,
        salary: { min: 800000, max: 4000000 },
        growthRate: 45,
        topRecruiters: ['Google India', 'Microsoft Research', 'Adobe', 'NVIDIA', 'Ola'],
        requiredExam: 'None mandatory',
        medianExp: '2-5 years',
    },
    {
        title: 'Cybersecurity Analyst',
        jobDemand: 40000,
        salary: { min: 500000, max: 2200000 },
        growthRate: 33,
        topRecruiters: ['Wipro Cybersecurity', 'TCS CERT', 'IBM Security', 'Deloitte', 'DRDO'],
        requiredExam: 'CEH, CISSP, CompTIA Security+',
        medianExp: '2-4 years',
    },
    {
        title: 'UI/UX Designer',
        jobDemand: 45000,
        salary: { min: 400000, max: 1800000 },
        growthRate: 28,
        topRecruiters: ['Flipkart', 'Meesho', 'Swiggy', 'Byju\'s', 'PhonePe', 'Razorpay'],
        requiredExam: 'None mandatory (portfolio-driven)',
        medianExp: '2-3 years',
    },
    {
        title: 'Civil Engineer',
        jobDemand: 140000,
        salary: { min: 350000, max: 1500000 },
        growthRate: 12,
        topRecruiters: ['L&T Construction', 'NHAI', 'RITES', 'CPWD', 'DDA', 'NHPC'],
        requiredExam: 'GATE (for PSUs), SSC JE, State PWD exams',
        medianExp: '3-5 years',
    },
    {
        title: 'Mechanical Engineer',
        jobDemand: 120000,
        salary: { min: 350000, max: 1500000 },
        growthRate: 10,
        topRecruiters: ['BHEL', 'DRDO', 'HAL', 'ISRO', 'Tata Motors', 'Maruti Suzuki'],
        requiredExam: 'GATE, SSC JE, UPSC ESE',
        medianExp: '3-5 years',
    },
    {
        title: 'Doctor (MBBS)',
        jobDemand: 80000,
        salary: { min: 500000, max: 2000000 },
        growthRate: 9,
        topRecruiters: ['AIIMS', 'Government Hospitals', 'Apollo', 'Fortis', 'Medanta'],
        requiredExam: 'NEET-UG (MBBS admission), NEET-PG (specialization)',
        medianExp: '7+ years (including MBBS + residency)',
    },
    {
        title: 'Pharmacist / Clinical Researcher',
        jobDemand: 35000,
        salary: { min: 300000, max: 1200000 },
        growthRate: 14,
        topRecruiters: ['Dr. Reddy\'s', 'Sun Pharma', 'Cipla', 'Lupin', 'MSD India'],
        requiredExam: 'GPAT (for M.Pharm admission), NIPER entrance',
        medianExp: '2-4 years',
    },
    {
        title: 'Chartered Accountant (CA)',
        jobDemand: 95000,
        salary: { min: 500000, max: 2000000 },
        growthRate: 16,
        topRecruiters: ['Big 4 (Deloitte, EY, PwC, KPMG)', 'ICICI Bank', 'Reliance', 'HDFC'],
        requiredExam: 'ICAI CA Foundation → Intermediate → Final',
        medianExp: '3-5 years',
    },
    {
        title: 'Financial Analyst / Investment Banker',
        jobDemand: 60000,
        salary: { min: 600000, max: 3000000 },
        growthRate: 20,
        topRecruiters: ['Goldman Sachs', 'Morgan Stanley', 'Kotak', 'ICICI Securities', 'HDFC Securities'],
        requiredExam: 'CFA, MBA Finance (CAT/XAT), NISM',
        medianExp: '2-4 years',
    },
    {
        title: 'Graphic Designer',
        jobDemand: 60000,
        salary: { min: 250000, max: 1200000 },
        growthRate: 18,
        topRecruiters: ['Ogilvy India', 'McCann', 'DDB Mudra', 'Publicis', 'Startups'],
        requiredExam: 'NID entrance, NIFT UG, CEED',
        medianExp: '2-3 years',
    },
    {
        title: 'Teacher / Educator',
        jobDemand: 200000,
        salary: { min: 250000, max: 900000 },
        growthRate: 7,
        topRecruiters: ['KV Schools (KVS)', 'NVS', 'State Govt Schools', 'Private Schools'],
        requiredExam: 'CTET/TET, UGC NET (for college), DSSSB',
        medianExp: '5+ years for senior positions',
    },
    {
        title: 'Journalist / Media Professional',
        jobDemand: 45000,
        salary: { min: 200000, max: 1000000 },
        growthRate: 11,
        topRecruiters: ['NDTV', 'The Hindu', 'HT Media', 'Network18', 'Scroll', 'Print'],
        requiredExam: 'None mandatory (IJU certifications help)',
        medianExp: '2-4 years',
    },
    {
        title: 'Agricultural Scientist',
        jobDemand: 35000,
        salary: { min: 300000, max: 900000 },
        growthRate: 13,
        topRecruiters: ['ICAR', 'State Agriculture Departments', 'Bayer CropScience', 'Syngenta India'],
        requiredExam: 'ICAR NET (for Scientist), ASRB (for ICAR), State PSC',
        medianExp: '3-5 years',
    },
    {
        title: 'Entrepreneur',
        jobDemand: 50000,   // startups incorporated annually
        salary: { min: 0, max: 10000000 },
        growthRate: 25,
        topRecruiters: ['Self / Startup', 'Funded through Startup India, Y Combinator India'],
        requiredExam: 'None mandatory',
        medianExp: 'N/A (self-driven)',
    },
    {
        title: 'Advocate / Lawyer',
        jobDemand: 55000,
        salary: { min: 300000, max: 2500000 },
        growthRate: 12,
        topRecruiters: ['Top Law Firms (AZB, Trilegal, Cyril Amarchand)', 'High Courts', 'Corporates Legal Depts'],
        requiredExam: 'CLAT (NLU admission), Bar Council Enrollment',
        medianExp: '3-7 years',
    },
    {
        title: 'Social Worker / NGO Professional',
        jobDemand: 30000,
        salary: { min: 180000, max: 700000 },
        growthRate: 8,
        topRecruiters: ['CRY', 'Smile Foundation', 'UNICEF India', 'World Vision', 'UNDP India'],
        requiredExam: 'None mandatory (MSW helps for senior roles)',
        medianExp: '3-5 years',
    },
];

/**
 * Updates career demand, salary, and market data in MongoDB.
 * Matches careers by title and updates enriched fields without overwriting
 * skills, roadmap, or matchVector (which are curated manually).
 */
async function updateCareerMarketData({ dryRun = false } = {}) {
    console.log('[Career Updater] Updating career market data...');
    let updated = 0;

    for (const data of VERIFIED_CAREER_DATA) {
        const { title, ...updateFields } = data;

        if (dryRun) {
            console.log(`[Career Updater] Would update: ${title} (demand: ${data.jobDemand.toLocaleString()} openings/yr)`);
            continue;
        }

        const result = await CareerPath.findOneAndUpdate(
            { title },
            {
                $set: {
                    salary: data.salary,
                    jobDemand: data.jobDemand,
                    growthRate: data.growthRate,
                    topRecruiters: data.topRecruiters,
                    requiredExam: data.requiredExam,
                    medianExp: data.medianExp,
                    lastUpdated: new Date(),
                },
            },
            { new: true }
        );

        if (result) updated++;
        else console.warn(`[Career Updater] Career not found in DB: ${title}`);
    }

    if (!dryRun) console.log(`[Career Updater] Updated ${updated} / ${VERIFIED_CAREER_DATA.length} careers`);
    return { updated, total: VERIFIED_CAREER_DATA.length };
}

// Allow running directly from CLI
if (require.main === module) {
    const dryRun = process.argv.includes('--dry-run');

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('[Career Updater] Connected to MongoDB');
            return updateCareerMarketData({ dryRun });
        })
        .then(result => {
            console.log('[Career Updater] Done:', result);
            process.exit(0);
        })
        .catch(err => {
            console.error('[Career Updater] Error:', err.message);
            process.exit(1);
        });
}

module.exports = { updateCareerMarketData, VERIFIED_CAREER_DATA };

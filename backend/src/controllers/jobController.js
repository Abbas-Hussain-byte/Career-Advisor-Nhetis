const asyncHandler = require('express-async-handler');
const axios = require('axios');
const JobCache = require('../models/jobCacheModel');

// ── Adzuna base ─────────────────────────────────────────────────────────────
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs/in';

function adzunaCredentials() {
    return {
        appId: process.env.ADZUNA_APP_ID,
        appKey: process.env.ADZUNA_APP_KEY,
    };
}

function hasAdzuna() {
    const { appId, appKey } = adzunaCredentials();
    return !!(appId && appKey);
}

function adzunaBase() {
    const { appId, appKey } = adzunaCredentials();
    return `${ADZUNA_BASE}?app_id=${appId}&app_key=${appKey}`;
}

// ── Remotive (free, no key) ─────────────────────────────────────────────────
async function fetchRemotive(category = '') {
    try {
        const url = `https://remotive.com/api/remote-jobs${category ? `?category=${encodeURIComponent(category)}` : ''}`;
        const { data } = await axios.get(url, { timeout: 8000 });
        return (data.jobs || []).slice(0, 30).map(job => ({
            id: `remotive-${job.id}`,
            title: job.title,
            company: job.company_name,
            location: job.candidate_required_location || 'Remote',
            type: job.job_type || 'Full Time',
            salary: job.salary || '',
            tags: job.tags || [],
            category: job.category || 'Technology',
            url: job.url,
            postedAt: job.publication_date,
            source: 'Remotive',
            remote: true,
            description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 400),
        }));
    } catch (e) {
        console.warn('[Jobs] Remotive fetch failed:', e.message);
        return [];
    }
}

// ── Adzuna: Job listings search ─────────────────────────────────────────────
async function fetchAdzuna(query = 'software engineer', location = '') {
    if (!hasAdzuna()) return [];
    try {
        const loc = location ? `&location0=India&location1=${encodeURIComponent(location)}` : '&location0=India';
        const url = `${ADZUNA_BASE}/search/1?app_id=${adzunaCredentials().appId}&app_key=${adzunaCredentials().appKey}&results_per_page=20&what=${encodeURIComponent(query)}${loc}&content-type=application/json`;
        const { data } = await axios.get(url, { timeout: 8000 });
        return (data.results || []).map(job => ({
            id: `adzuna-${job.id}`,
            title: job.title,
            company: job.company?.display_name || 'Unknown',
            location: job.location?.display_name || 'India',
            type: job.contract_time || 'Full Time',
            salary: job.salary_min && job.salary_max
                ? `₹${Math.round(job.salary_min / 100000)}L – ₹${Math.round(job.salary_max / 100000)}L`
                : '',
            tags: [],
            category: job.category?.label || 'Technology',
            url: job.redirect_url,
            postedAt: job.created,
            source: 'Adzuna',
            remote: false,
            description: (job.description || '').slice(0, 400),
        }));
    } catch (e) {
        console.warn('[Jobs] Adzuna search failed:', e.message);
        return [];
    }
}

// ── Adzuna: 1. Historical Data ──────────────────────────────────────────────
// Returns monthly job count for a search over 12 months
// API: GET /history?what=<query>&location0=India
async function fetchAdzunaHistory(query = 'software engineer') {
    if (!hasAdzuna()) return null;
    try {
        const { appId, appKey } = adzunaCredentials();
        const url = `${ADZUNA_BASE}/history?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&location0=India&content-type=application/json`;
        const { data } = await axios.get(url, { timeout: 8000 });
        // data.month is an object like { "2024-03": 1234, "2024-04": 1567, ... }
        const months = data.month || {};
        return Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12) // last 12 months only
            .map(([month, count]) => ({
                month: formatMonth(month),
                count: Math.round(count),
            }));
    } catch (e) {
        console.warn('[Adzuna] History fetch failed:', e.message);
        return null;
    }
}

// ── Adzuna: 2. Histogram Data ───────────────────────────────────────────────
// Returns salary distribution buckets for a role
// API: GET /histogram?what=<query>&location0=India
async function fetchAdzunaHistogram(query = 'software engineer') {
    if (!hasAdzuna()) return null;
    try {
        const { appId, appKey } = adzunaCredentials();
        const url = `${ADZUNA_BASE}/histogram?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&location0=India&content-type=application/json`;
        const { data } = await axios.get(url, { timeout: 8000 });
        // data.histogram is { "100000": 23, "200000": 87, ... } — salary bucket: count
        const hist = data.histogram || {};
        return Object.entries(hist)
            .map(([salary, count]) => ({
                range: formatSalaryRange(Number(salary)),
                count: Math.round(Number(count)),
                salary: Number(salary),
            }))
            .sort((a, b) => a.salary - b.salary)
            .slice(0, 12); // cap at 12 buckets
    } catch (e) {
        console.warn('[Adzuna] Histogram fetch failed:', e.message);
        return null;
    }
}

// ── Adzuna: 3. Regional Data ────────────────────────────────────────────────
// Returns job counts broken down by city/location in India
// API: GET /geodata?what=<query>&location0=India
async function fetchAdzunaRegional(query = 'software engineer') {
    if (!hasAdzuna()) return null;
    try {
        const { appId, appKey } = adzunaCredentials();
        const url = `${ADZUNA_BASE}/geodata?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&location0=India&content-type=application/json`;
        const { data } = await axios.get(url, { timeout: 8000 });
        // data.locations is an array of { location: { display_name }, count }
        const locations = data.locations || [];
        return locations
            .filter(l => l.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(l => ({
                city: l.location?.display_name || 'Unknown',
                count: Math.round(l.count),
            }));
    } catch (e) {
        console.warn('[Adzuna] Geodata fetch failed:', e.message);
        return null;
    }
}

// ── Adzuna: 4. Top Companies ────────────────────────────────────────────────
// Returns top companies hiring for a given query in India
// API: GET /top_companies?what=<query>&location0=India
async function fetchAdzunaTopCompanies(query = 'software engineer') {
    if (!hasAdzuna()) return null;
    try {
        const { appId, appKey } = adzunaCredentials();
        const url = `${ADZUNA_BASE}/top_companies?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&location0=India&content-type=application/json`;
        const { data } = await axios.get(url, { timeout: 8000 });
        // data.leaderboard is [{ canonical_name, count }, ...]
        const companies = data.leaderboard || [];
        return companies.slice(0, 12).map(c => ({
            name: c.canonical_name,
            count: Math.round(c.count),
        }));
    } catch (e) {
        console.warn('[Adzuna] Top companies fetch failed:', e.message);
        return null;
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatMonth(isoMonth) {
    // "2024-03" → "Mar '24"
    const [year, month] = isoMonth.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[parseInt(month, 10) - 1]} '${year.slice(2)}`;
}

function formatSalaryRange(salary) {
    // Convert annual INR to Lakhs label
    const lakhs = Math.round(salary / 100000);
    return `₹${lakhs}L`;
}

// ── Skill extraction ─────────────────────────────────────────────────────────
const SKILL_KEYWORDS = [
    'Python', 'JavaScript', 'Java', 'React', 'Node.js', 'SQL', 'Machine Learning',
    'Data Science', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'TypeScript', 'C++',
    'PHP', 'Django', 'Angular', 'Vue.js', 'MongoDB', 'PostgreSQL', 'Flutter',
    'Android', 'iOS', 'Swift', 'Kotlin', 'Cybersecurity', 'DevOps', 'UI/UX',
    'Figma', 'Excel', 'Power BI', 'Tableau', 'R', 'Hadoop', 'Spark',
    'Blockchain', 'AI', 'NLP', 'Go', 'Rust', 'Networking', 'Linux',
    'SAP', 'Salesforce', 'Finance', 'Accounting', 'Legal', 'Marketing',
    'Content Writing', 'SEO', 'Social Media', 'Graphic Design', 'AutoCAD',
];

function extractSkills(jobs) {
    const counts = {};
    jobs.forEach(job => {
        const text = `${job.title} ${job.description} ${(job.tags || []).join(' ')}`.toLowerCase();
        SKILL_KEYWORDS.forEach(skill => {
            if (text.includes(skill.toLowerCase())) {
                counts[skill] = (counts[skill] || 0) + 1;
            }
        });
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([skill, count]) => ({ skill, count }));
}

function extractSectors(jobs) {
    const sectorMap = {
        'software engineer': 'Technology', 'developer': 'Technology',
        'data': 'Data & AI', 'machine learning': 'Data & AI', 'ai ': 'Data & AI',
        'design': 'Design & Media', 'marketing': 'Business & Marketing',
        'finance': 'Commerce & Finance', 'accounting': 'Commerce & Finance',
        'medical': 'Healthcare', 'nurse': 'Healthcare', 'pharma': 'Healthcare',
        'teaching': 'Education', 'professor': 'Education',
        'legal': 'Law', 'lawyer': 'Law',
        'civil': 'Engineering', 'mechanical': 'Engineering',
    };
    const counts = {};
    jobs.forEach(job => {
        const text = job.title.toLowerCase();
        let matched = false;
        for (const [keyword, sector] of Object.entries(sectorMap)) {
            if (text.includes(keyword)) {
                counts[sector] = (counts[sector] || 0) + 1;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const cat = job.category || 'Other';
            counts[cat] = (counts[cat] || 0) + 1;
        }
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([sector, count]) => ({ sector, count }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/jobs — live job listings (auth required)
const getJobs = asyncHandler(async (req, res) => {
    const { career = '', location = '' } = req.query;
    const cacheKey = `jobs:${career.toLowerCase()}:${location.toLowerCase()}`;

    const cached = await JobCache.findOne({ cacheKey });
    if (cached) {
        return res.json({ jobs: cached.jobs, skills: extractSkills(cached.jobs), sectors: extractSectors(cached.jobs), source: cached.source, cached: true, total: cached.jobs.length });
    }

    const [remotiveJobs, adzunaJobs] = await Promise.all([
        fetchRemotive(mapCareerToRemotiveCategory(career)),
        fetchAdzuna(career || 'software engineer', location),
    ]);

    const allJobs = [...adzunaJobs, ...remotiveJobs];
    const source = adzunaJobs.length > 0 && remotiveJobs.length > 0 ? 'mixed' : adzunaJobs.length > 0 ? 'adzuna' : 'remotive';

    await JobCache.findOneAndUpdate({ cacheKey }, { cacheKey, jobs: allJobs, fetchedAt: new Date(), source, query: career }, { upsert: true });
    res.json({ jobs: allJobs, skills: extractSkills(allJobs), sectors: extractSectors(allJobs), source, cached: false, total: allJobs.length });
});

// GET /api/jobs/trending — Remotive aggregated trends (public)
const getTrendingSkills = asyncHandler(async (req, res) => {
    const cacheKey = 'jobs:trending:india';
    const cached = await JobCache.findOne({ cacheKey });
    if (cached) {
        return res.json({ skills: extractSkills(cached.jobs), sectors: extractSectors(cached.jobs), topJobs: cached.jobs.slice(0, 10), cached: true });
    }

    const [tech, commerce, design, adzuna] = await Promise.all([
        fetchRemotive('software-dev'),
        fetchRemotive('finance-legal'),
        fetchRemotive('design'),
        fetchAdzuna('software OR engineer OR developer OR medical'),
    ]);
    const allJobs = [...tech, ...commerce, ...design, ...adzuna];

    await JobCache.findOneAndUpdate({ cacheKey }, { cacheKey, jobs: allJobs, fetchedAt: new Date(), source: 'mixed', query: 'trending' }, { upsert: true });
    res.json({ skills: extractSkills(allJobs), sectors: extractSectors(allJobs), topJobs: allJobs.slice(0, 10), cached: false });
});

// GET /api/jobs/market?career=Software+Engineer
// Returns all 4 Adzuna data types in a single call — used by Insights Market panel
const getMarketData = asyncHandler(async (req, res) => {
    const { career = 'software engineer' } = req.query;
    const cacheKey = `market:${career.toLowerCase().trim()}`;

    const cached = await JobCache.findOne({ cacheKey });
    if (cached?.jobs?.length > 0) {
        // cached.jobs stores the market data object as single-element array
        return res.json({ ...cached.jobs[0], cached: true });
    }

    if (!hasAdzuna()) {
        return res.status(503).json({ error: 'Adzuna API credentials not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env' });
    }

    // Fetch all 4 Adzuna data types in parallel
    const [history, histogram, regional, topCompanies] = await Promise.all([
        fetchAdzunaHistory(career),
        fetchAdzunaHistogram(career),
        fetchAdzunaRegional(career),
        fetchAdzunaTopCompanies(career),
    ]);

    const payload = { career, history, histogram, regional, topCompanies };

    // Store as single-element array in jobs field (reusing the cache schema)
    await JobCache.findOneAndUpdate(
        { cacheKey },
        { cacheKey, jobs: [payload], fetchedAt: new Date(), source: 'adzuna', query: career },
        { upsert: true }
    );

    res.json({ ...payload, cached: false });
});

// ── Map career to Remotive category ─────────────────────────────────────────
function mapCareerToRemotiveCategory(career) {
    const cl = (career || '').toLowerCase();
    if (cl.includes('software') || cl.includes('developer') || cl.includes('engineer')) return 'software-dev';
    if (cl.includes('design') || cl.includes('ux') || cl.includes('ui')) return 'design';
    if (cl.includes('data') || cl.includes('machine learning') || cl.includes('ai')) return 'data';
    if (cl.includes('product')) return 'product';
    if (cl.includes('marketing') || cl.includes('business')) return 'marketing';
    if (cl.includes('devops') || cl.includes('cloud')) return 'devops-sysadmin';
    if (cl.includes('writing') || cl.includes('content')) return 'writing';
    if (cl.includes('finance') || cl.includes('accounting')) return 'finance-legal';
    return 'software-dev';
}

module.exports = { getJobs, getTrendingSkills, getMarketData };

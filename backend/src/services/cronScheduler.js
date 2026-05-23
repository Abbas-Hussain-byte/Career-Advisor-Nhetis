const cron = require('node-cron');
const { runScrapers } = require('../scrapers');
const CareerPath = require('../models/careerPathModel');
const JobCache = require('../models/jobCacheModel');
const {
    fetchAdzuna,
    fetchAdzunaHistory,
    fetchAdzunaHistogram,
    fetchAdzunaRegional,
    fetchAdzunaTopCompanies,
    fetchRemotive,
    mapCareerToRemotiveCategory
} = require('../controllers/jobController');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * NHETIS Background Service Scheduler
 *
 * Automates the synchronization of the database with live internet updates.
 */

function initScheduler() {
    console.log('[Scheduler] Initializing NHETIS Background Sync...');

    // 1. Daily Exam Data Refresh (3 AM)
    cron.schedule('0 3 * * *', async () => {
        console.log('[Scheduler] Running Daily Exam Update...');
        try {
            await runScrapers({ target: 'exams' });
            console.log('[Scheduler] Exam update completed.');
        } catch (err) {
            console.error('[Scheduler] Exam update failed:', err.message);
        }
    });

    // 2. Daily Market Data & Live Jobs Refresh (Midnight)
    // Refreshes Adzuna Intelligence and Remotive Listings for all careers
    cron.schedule('0 0 * * *', async () => {
        console.log('[Scheduler] Starting Daily Market Data Refresh...');
        try {
            const careers = await CareerPath.find({});
            for (const career of careers) {
                const query = career.title;
                try {
                    // Adzuna Market Intel
                    const marketKey = `market:${query.toLowerCase().trim()}`;
                    const payload = {
                        career: query,
                        history: await fetchAdzunaHistory(query),
                        histogram: (await sleep(2000), await fetchAdzunaHistogram(query)),
                        regional: (await sleep(2000), await fetchAdzunaRegional(query)),
                        topCompanies: (await sleep(2000), await fetchAdzunaTopCompanies(query))
                    };
                    await JobCache.findOneAndUpdate({ cacheKey: marketKey }, { cacheKey: marketKey, jobs: [payload], fetchedAt: new Date(), source: 'adzuna', query }, { upsert: true });

                    // Live Jobs
                    const jobsKey = `jobs:${query.toLowerCase()}:india`;
                    const [remotiveJobs, adzunaJobs] = await Promise.all([
                        fetchRemotive(mapCareerToRemotiveCategory(query)),
                        fetchAdzuna(query, 'India'),
                    ]);
                    await JobCache.findOneAndUpdate({ cacheKey: jobsKey }, { cacheKey: jobsKey, jobs: [...adzunaJobs, ...remotiveJobs], fetchedAt: new Date(), source: 'mixed', query }, { upsert: true });
                    
                    await sleep(10000); // 10s between careers
                } catch (e) {
                    console.error(`[Scheduler] Failed to refresh ${query}:`, e.message);
                }
            }
            console.log('[Scheduler] Daily Market Refresh completed.');
        } catch (err) {
            console.error('[Scheduler] Daily Market Refresh fatal error:', err.message);
        }
    });

    // 3. Weekly Scholarship Data Refresh (Sunday, 4 AM)
    cron.schedule('0 4 * * 0', async () => {
        console.log('[Scheduler] Running Weekly Scholarship Update...');
        try {
            await runScrapers({ target: 'scholarships' });
        } catch (err) {
            console.error('[Scheduler] Scholarship update failed:', err.message);
        }
    });

    // 4. Monthly Career/College Static Data Refresh (1st of month, 5 AM)
    cron.schedule('0 5 1 * *', async () => {
        console.log('[Scheduler] Running Monthly Static Data Sync...');
        try {
            await runScrapers({ target: 'all' });
        } catch (err) {
            console.error('[Scheduler] Monthly sync failed:', err.message);
        }
    });

    console.log('[Scheduler] All background jobs scheduled.');
}

module.exports = { initScheduler };

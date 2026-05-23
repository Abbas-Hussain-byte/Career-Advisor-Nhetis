const cron = require('node-cron');
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
 * Scheduled jobs to keep the platform's job market data fresh.
 * Adzuna (Market Intelligence) and Remotive (Live Trends) are updated periodically.
 */
const startDataRefreshService = () => {
    // 1. Comprehensive Market Data Refresh (Daily at Midnight)
    cron.schedule('0 0 * * *', async () => {
        console.log('[DataRefreshService] Starting scheduled market data refresh...');
        try {
            const careers = await CareerPath.find({});
            console.log(`[DataRefreshService] Found ${careers.length} careers to update.`);

            for (const career of careers) {
                const query = career.title;
                console.log(`[DataRefreshService] Processing: ${query}`);

                try {
                    // --- A. Adzuna Market Intel (4 API calls) ---
                    const marketKey = `market:${query.toLowerCase().trim()}`;
                    
                    const history = await fetchAdzunaHistory(query);
                    await sleep(2000); 
                    const histogram = await fetchAdzunaHistogram(query);
                    await sleep(2000);
                    const regional = await fetchAdzunaRegional(query);
                    await sleep(2000);
                    const topCompanies = await fetchAdzunaTopCompanies(query);
                    await sleep(2000);

                    const marketPayload = { career: query, history, histogram, regional, topCompanies };
                    await JobCache.findOneAndUpdate(
                        { cacheKey: marketKey },
                        { cacheKey: marketKey, jobs: [marketPayload], fetchedAt: new Date(), source: 'adzuna', query },
                        { upsert: true }
                    );

                    // --- B. Live Jobs (Mixed) ---
                    const jobsKey = `jobs:${query.toLowerCase()}:india`;
                    const [remotiveJobs, adzunaJobs] = await Promise.all([
                        fetchRemotive(mapCareerToRemotiveCategory(query)),
                        fetchAdzuna(query, 'India'),
                    ]);
                    const allJobs = [...adzunaJobs, ...remotiveJobs];
                    const source = adzunaJobs.length > 0 && remotiveJobs.length > 0 ? 'mixed' : adzunaJobs.length > 0 ? 'adzuna' : 'remotive';

                    await JobCache.findOneAndUpdate(
                        { cacheKey: jobsKey },
                        { cacheKey: jobsKey, jobs: allJobs, fetchedAt: new Date(), source, query },
                        { upsert: true }
                    );

                    console.log(`[DataRefreshService] Updated ${query}`);
                } catch (err) {
                    console.error(`[DataRefreshService] Failed to update ${query}:`, err.message);
                }
                
                // Pause 10s between careers to avoid hitting Adzuna minute-limits (standard is 30/min)
                await sleep(10000);
            }
            console.log('[DataRefreshService] Daily refresh completed.');
        } catch (error) {
            console.error('[DataRefreshService] Fatal error in Daily Refresh:', error);
        }
    });

    // 2. Trending Data Refresh (Every 12 hours)
    cron.schedule('0 */12 * * *', async () => {
        console.log('[DataRefreshService] Updating trending skills and sectors...');
        try {
            const cacheKey = 'jobs:trending:india';
            const [tech, commerce, design, extra] = await Promise.all([
                fetchRemotive('software-dev'),
                fetchRemotive('finance-legal'),
                fetchRemotive('design'),
                fetchAdzuna('medical OR healthcare OR lawyer OR teacher OR upsc OR ias'),
            ]);
            const allJobs = [...tech, ...commerce, ...design, ...extra];

            await JobCache.findOneAndUpdate(
                { cacheKey },
                { cacheKey, jobs: allJobs, fetchedAt: new Date(), source: 'mixed', query: 'trending' },
                { upsert: true }
            );
            console.log('[DataRefreshService] Trending data updated.');
        } catch (error) {
            console.warn('[DataRefreshService] Trending update failed:', error.message);
        }
    });

    console.log('[DataRefreshService] Background services initialized and scheduled.');
};

module.exports = { startDataRefreshService };

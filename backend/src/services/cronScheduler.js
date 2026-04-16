const cron = require('node-cron');
const { runScrapers } = require('../scrapers');

/**
 * NHETIS Background Service Scheduler
 *
 * Automates the synchronization of the database with live internet updates.
 * - Exams: Scanned daily (since dates change frequently).
 * - Scholarships: Scanned weekly.
 * - Careers/Colleges: Scanned monthly (long-term data).
 */

function initScheduler() {
    console.log('[Scheduler] Initializing NHETIS Background Sync...');

    // 1. Daily Exam Data Refresh (3 AM)
    // Accuracy for JEE, NEET, CLAT, etc.
    cron.schedule('0 3 * * *', async () => {
        console.log('[Scheduler] Running Daily Exam Update...');
        try {
            await runScrapers({ target: 'exams' });
            console.log('[Scheduler] Exam update completed successfully.');
        } catch (err) {
            console.error('[Scheduler] Exam update failed:', err.message);
        }
    });

    // 2. Weekly Scholarship Data Refresh (Sunday, 4 AM)
    // National Scholarship Portal (NSP) and state programs
    cron.schedule('0 4 * * 0', async () => {
        console.log('[Scheduler] Running Weekly Scholarship Update...');
        try {
            await runScrapers({ target: 'scholarships' });
            console.log('[Scheduler] Scholarship update completed.');
        } catch (err) {
            console.error('[Scheduler] Scholarship update failed:', err.message);
        }
    });

    // 3. Monthly Career Market & College Refresh (1st of every month, 5 AM)
    // NASSCOM trends, NIRF rankings
    cron.schedule('0 5 1 * *', async () => {
        console.log('[Scheduler] Running Monthly Career/College Market Sync...');
        try {
            await runScrapers({ target: 'all' });
            console.log('[Scheduler] Monthly sync completed.');
        } catch (err) {
            console.error('[Scheduler] Monthly sync failed:', err.message);
        }
    });

    console.log('[Scheduler] All background jobs scheduled.');
}

module.exports = { initScheduler };

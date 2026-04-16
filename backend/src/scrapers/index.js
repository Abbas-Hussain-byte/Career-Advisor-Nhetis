/**
 * NHETIS — Scraper Scheduler & Coordinator
 *
 * Orchestrates all scrapers. Can be:
 *  1. Run manually via `node src/scrapers/index.js`
 *  2. Called from the backend HTTP endpoint POST /api/careers/update-data
 *  3. Set up as a cron job (e.g. weekly college refresh, monthly career data refresh)
 *
 * Recommended Schedule:
 *   Colleges (NIRF):      Weekly  — NIRF updates rankings annually but data changes often
 *   Career Market Data:   Monthly — Job demand / salary data sourced from NASSCOM reports
 *
 * To set up an OS cron job (Windows Task Scheduler or Linux cron):
 *   Weekly:  node /path/to/src/scrapers/index.js --target=colleges
 *   Monthly: node /path/to/src/scrapers/index.js --target=careers
 *   Both:    node /path/to/src/scrapers/index.js --target=all
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { updateCollegesFromNIRF } = require('./nirfScraper');
const { updateCareerMarketData } = require('./careerDataUpdater');

/**
 * Run scrapers and return a combined result report.
 * @param {object} options
 * @param {string} options.target - 'colleges' | 'careers' | 'all'
 * @param {boolean} options.dryRun - if true, no DB writes
 */
async function runScrapers({ target = 'all', dryRun = false } = {}) {
    const results = {};

    if (target === 'colleges' || target === 'all') {
        try {
            const { updateCollegesFromNIRF } = require('./nirfScraper');
            results.colleges = await updateCollegesFromNIRF({ dryRun });
        } catch (err) {
            results.colleges = { error: err.message };
            console.error('[Scraper Scheduler] College scraper failed:', err.message);
        }
    }

    if (target === 'careers' || target === 'all') {
        try {
            const { updateCareerMarketData } = require('./careerDataUpdater');
            results.careers = await updateCareerMarketData({ dryRun });
        } catch (err) {
            results.careers = { error: err.message };
            console.error('[Scraper Scheduler] Career updater failed:', err.message);
        }
    }

    if (target === 'exams' || target === 'all') {
        try {
            const { updateExamData } = require('./examScraper');
            results.exams = await updateExamData({ dryRun });
        } catch (err) {
            results.exams = { error: err.message };
            console.error('[Scraper Scheduler] Exam scraper failed:', err.message);
        }
    }

    if (target === 'scholarships' || target === 'all') {
        try {
            const { updateScholarshipData } = require('./scholarshipScraper');
            results.scholarships = await updateScholarshipData({ dryRun });
        } catch (err) {
            results.scholarships = { error: err.message };
            console.error('[Scraper Scheduler] Scholarship scraper failed:', err.message);
        }
    }

    return results;
}

// ─── CLI entry point ─────────────────────────────────────────────────────────
if (require.main === module) {
    const target = (process.argv.find(a => a.startsWith('--target=')) || '--target=careers')
        .replace('--target=', '');
    const dryRun = process.argv.includes('--dry-run');

    console.log(`[Scraper Scheduler] Starting | target=${target} | dryRun=${dryRun}`);

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('[Scraper Scheduler] MongoDB connected');
            return runScrapers({ target, dryRun });
        })
        .then(results => {
            console.log('[Scraper Scheduler] Completed:', JSON.stringify(results, null, 2));
            process.exit(0);
        })
        .catch(err => {
            console.error('[Scraper Scheduler] Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { runScrapers };

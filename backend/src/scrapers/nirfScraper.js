/**
 * NHETIS — NIRF College Scraper
 * 
 * Fetches official college data from data.gov.in (Indian Government Open Data Portal)
 * and NIRF (National Institutional Ranking Framework) to keep college records accurate.
 * 
 * Data Sources:
 *   - NIRF Rankings API: https://www.nirfindia.org/Rankings/2024/OverallRanking.html
 *   - data.gov.in API: https://data.gov.in/catalog/national-institutional-ranking-framework
 *   - API endpoint: https://api.data.gov.in/resource/...
 *
 * Usage:
 *   node nirfScraper.js               — runs scraper and updates MongoDB
 *   node nirfScraper.js --dry-run     — fetches and prints data, no DB writes
 *
 * To run on a schedule, use the scheduler (src/scrapers/index.js).
 */

const mongoose = require('mongoose');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const College = require('../models/collegeModel');

// ─── data.gov.in API Config ─────────────────────────────────────────────────
// Register at https://data.gov.in to get a free API key
// Store it as DATA_GOV_IN_API_KEY in your .env file
const DATA_GOV_IN_API_KEY = process.env.DATA_GOV_IN_API_KEY;
const NIRF_RESOURCE_ID = '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'; // NIRF Institutions list

/**
 * Fetch JSON from a URL (basic HTTPS getter, no external deps)
 */
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'NHETIS-Scraper/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
            });
        }).on('error', reject);
    });
}

/**
 * Fetch NIRF college list from data.gov.in
 * Returns array of normalized college objects matching collegeModel schema.
 */
async function fetchNIRFColleges({ limit = 200 } = {}) {
    if (!DATA_GOV_IN_API_KEY) {
        throw new Error(
            'DATA_GOV_IN_API_KEY is not set in .env. ' +
            'Register at https://data.gov.in/user/register to get a free API key.'
        );
    }

    const url = `https://api.data.gov.in/resource/${NIRF_RESOURCE_ID}?` +
        `api-key=${DATA_GOV_IN_API_KEY}&format=json&limit=${limit}`;

    console.log('[NIRF Scraper] Fetching college data from data.gov.in...');
    const json = await fetchJSON(url);

    if (!json.records || !Array.isArray(json.records)) {
        throw new Error('[NIRF Scraper] Unexpected API response format');
    }

    console.log(`[NIRF Scraper] Received ${json.records.length} records`);

    // Normalize records to match our College schema
    return json.records.map(r => ({
        name: r.institute_name || r.name || '',
        type: r.type === 'GFI' ? 'Government'
            : r.type === 'PVT' ? 'Private'
                : r.type === 'AID' ? 'Aided'
                    : 'Government',
        state: r.state || '',
        district: r.city || r.district || '',
        address: [r.city, r.state].filter(Boolean).join(', '),
        ranking: parseInt(r.rank) || 999,
        website: r.website || '',
        programs: r.program_names
            ? r.program_names.split(',').map(p => p.trim())
            : [],
        facilities: [],
        location: {
            type: 'Point',
            // lat/lng are available in some records; default to state capital if missing
            coordinates: [
                parseFloat(r.longitude) || parseFloat(r.lng) || 77.2090,
                parseFloat(r.latitude) || parseFloat(r.lat) || 28.6139,
            ],
        },
    })).filter(c => c.name); // drop records with no name
}

/**
 * Main update function — upserts fetched colleges into MongoDB.
 * Preserves existing records and adds/updates from NIRF data.
 */
async function updateCollegesFromNIRF({ dryRun = false } = {}) {
    const colleges = await fetchNIRFColleges({ limit: 200 });

    if (dryRun) {
        console.log('[NIRF Scraper] DRY RUN — would upsert these colleges:');
        colleges.slice(0, 5).forEach(c => console.log(' •', c.name, '|', c.state, '|', c.ranking));
        console.log(`[NIRF Scraper] ...and ${colleges.length - 5} more`);
        return { upserted: 0, total: colleges.length, dryRun: true };
    }

    let upserted = 0;
    for (const college of colleges) {
        await College.findOneAndUpdate(
            { name: college.name },    // match by name
            { $set: college },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        upserted++;
    }

    console.log(`[NIRF Scraper] Successfully upserted ${upserted} colleges`);
    return { upserted, total: colleges.length };
}

// Allow running directly from CLI
if (require.main === module) {
    const dryRun = process.argv.includes('--dry-run');

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('[NIRF Scraper] Connected to MongoDB');
            return updateCollegesFromNIRF({ dryRun });
        })
        .then(result => {
            console.log('[NIRF Scraper] Done:', result);
            process.exit(0);
        })
        .catch(err => {
            console.error('[NIRF Scraper] Error:', err.message);
            process.exit(1);
        });
}

module.exports = { updateCollegesFromNIRF, fetchNIRFColleges };

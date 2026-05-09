require('dotenv').config();
const axios = require('axios');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs/in';

async function testAdzuna() {
    console.log('--- Testing Adzuna API Integration ---');
    console.log('App ID:', ADZUNA_APP_ID ? 'Present' : 'MISSING');
    console.log('App Key:', ADZUNA_APP_KEY ? 'Present' : 'MISSING');

    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        console.error('Error: ADZUNA_APP_ID or ADZUNA_APP_KEY is missing in .env');
        return;
    }

    const queries = ['software engineer', 'nurse', 'teacher'];
    
    for (const query of queries) {
        console.log(`\nTesting query: "${query}"...`);
        
        // Testing Search Endpoint (Corrected param: where)
        const searchUrl = `${ADZUNA_BASE}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=5&what=${encodeURIComponent(query)}&where=India&content-type=application/json`;
        
        try {
            const start = Date.now();
            const res = await axios.get(searchUrl, { timeout: 10000 });
            console.log(`✅ Search Success (${Date.now() - start}ms)`);
            console.log(`   Found ${res.data.count} results.`);
        } catch (err) {
            console.error(`❌ Search Failed: ${err.message}`);
            if (err.response) {
                console.error(`   Status: ${err.response.status}`);
                console.error(`   Data:`, JSON.stringify(err.response.data).slice(0, 200));
            }
        }
    }
}

testAdzuna();

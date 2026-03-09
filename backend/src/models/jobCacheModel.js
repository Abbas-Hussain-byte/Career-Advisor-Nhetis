const mongoose = require('mongoose');

/**
 * Caches job results from external APIs (Adzuna, Remotive) for 6 hours
 * to avoid hitting rate limits and speed up responses.
 */
const jobCacheSchema = new mongoose.Schema({
    cacheKey: { type: String, required: true, unique: true, index: true },
    jobs: { type: Array, default: [] },
    fetchedAt: { type: Date, default: Date.now },
    source: { type: String }, // 'adzuna' | 'remotive' | 'mixed'
    query: { type: String },
});

// TTL index: MongoDB auto-deletes documents after 6 hours
jobCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 21600 });

module.exports = mongoose.model('JobCache', jobCacheSchema);

const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Government', 'Private', 'Aided'], default: 'Government' },
    programs: [String], // ["B.Tech CS", "B.Sc Math"]
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number] // [longitude, latitude]
    },
    address: String,   // Full address string, e.g. "Masab Tank, Hyderabad, Telangana"
    state: String,
    district: String,
    website: String,
    ranking: Number,
    facilities: [String],
    // ── Enrichment fields (for detailed college info) ──
    cutoffs: {
        type: Map,
        of: String, // e.g. { "B.Tech CS": "JEE Main 95-98 percentile", "B.Sc Math": "60-70% in 12th" }
    },
    eligibility: String, // e.g. "12th with PCM, JEE Main qualified"
    medium: { type: String, default: 'English' },
    accreditation: String, // e.g. "NAAC A+", "NBA"
    establishedYear: Number,
});

CollegeSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('College', CollegeSchema);


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
    facilities: [String]
});

CollegeSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('College', CollegeSchema);

const mongoose = require('mongoose');

const CareerPathSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    category: String, // e.g. "Technology", "Medical"
    requiredStream: String, // "Science-PCM", "Commerce"
    skills: [String], // ["Python", "Data Analysis"]
    roadmap: [{
        step: String,
        duration: String
    }],
    salary: {
        min: Number,
        max: Number
    },
    outcome: String,
    matchVector: {
        logic: { type: Number, default: 0 },
        creativity: { type: Number, default: 0 },
        technical: { type: Number, default: 0 },
        social: { type: Number, default: 0 }
    },
    // ── Market data (updated by scrapers/careerDataUpdater.js) ─────────────
    jobDemand: Number,      // estimated annual openings in India
    growthRate: Number,      // YoY % growth rate
    topRecruiters: [String],    // top companies hiring for this role
    requiredExam: String,      // entrance exams / certifications needed
    medianExp: String,      // median experience for mid-level role
    lastUpdated: Date,        // when scraper last updated this record
});

module.exports = mongoose.model('CareerPath', CareerPathSchema);

const mongoose = require('mongoose');

const ScholarshipSchema = new mongoose.Schema({
    name: { type: String, required: true },
    provider: { type: String, required: true }, // e.g. "Government of India", "State Govt."
    description: String,
    eligibility: String,
    amount: String, // e.g. "₹12,000/year" or "Full tuition"
    deadline: String, // e.g. "October 31" or "Rolling"
    applicationUrl: String, // official application link
    category: {
        type: String,
        enum: ['merit', 'need', 'minority', 'state', 'central', 'sc-st', 'obc', 'disability', 'girl-child'],
        default: 'central',
    },
    targetGrade: [String], // ['10', '12', 'UG', 'PG']
    targetStream: [String], // ['Science-PCM', 'Science-PCB', 'Commerce', 'Arts / Humanities', 'All']
    incomeLimit: String, // e.g. "Below ₹2.5 Lakh/year" or "No limit"
    source: String, // "NSP", "State Portal", "Official Website"
    verified: { type: Boolean, default: true }, // only show verified data
});

ScholarshipSchema.index({ category: 1, targetGrade: 1 });

module.exports = mongoose.model('Scholarship', ScholarshipSchema);

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
    }
});

module.exports = mongoose.model('CareerPath', CareerPathSchema);

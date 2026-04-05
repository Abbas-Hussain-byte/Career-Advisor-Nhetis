const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['course', 'article', 'video', 'ebook', 'tool', 'exam-prep'],
        default: 'course',
    },
    provider: String, // "NPTEL", "SWAYAM", "Khan Academy", etc.
    url: { type: String, required: true },
    subject: String, // "Computer Science", "Mathematics", "Biology", etc.
    grade: [String], // ['10', '12', 'UG', 'PG']
    stream: [String], // ['Science-PCM', 'Science-PCB', 'Commerce', 'Arts / Humanities', 'All']
    careerCategory: [String], // ['Technology', 'Medical', etc.] — for personalized recommendations
    description: String,
    free: { type: Boolean, default: true }, // only curate free resources
    language: { type: String, default: 'English' },
});

// Separate indexes — MongoDB doesn't allow compound indexes on two array fields
ResourceSchema.index({ type: 1 });
ResourceSchema.index({ stream: 1 });
ResourceSchema.index({ careerCategory: 1 });

module.exports = mongoose.model('Resource', ResourceSchema);

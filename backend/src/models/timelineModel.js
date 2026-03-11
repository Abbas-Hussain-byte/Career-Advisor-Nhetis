const mongoose = require('mongoose');

const TimelineEventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    date: { type: String, required: true }, // e.g. "2026-04-15" or "April 2026"
    endDate: String, // for events spanning a range
    type: {
        type: String,
        enum: ['admission', 'exam', 'scholarship', 'counseling', 'result'],
        default: 'exam',
    },
    stream: [String], // ['Science-PCM', 'Science-PCB', 'Commerce', 'Arts / Humanities', 'All']
    grade: [String], // ['10', '12', 'UG']
    important: { type: Boolean, default: false }, // highlight critical deadlines
    source: String, // official source e.g. "NTA", "JoSAA", "NSP"
    url: String, // link to official notification
});

TimelineEventSchema.index({ type: 1, date: 1 });

module.exports = mongoose.model('TimelineEvent', TimelineEventSchema);

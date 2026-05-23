const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        sparse: true,   // allows multiple docs to have no email (null/undefined)
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student',
    },
    preferredLanguage: {
        type: String,
        enum: ['en', 'hi', 'te'],
        default: 'en',
    },
    profile: {
        grade: {
            type: String,
            enum: ['10', '12'],
        },
        stream: String, // For 12th grade
        board: String,
        location: {
            type: {
                type: String,
                enum: ['Point'],
            },
            coordinates: {
                type: [Number],
            },
        },
        interests: [String],
        academicScore: Number,
        longTermGoal: String,
        aspirationTrack: {
            type: String,
            enum: ['Higher Studies', 'Job Ready', 'Government Exams', 'Entrepreneurship', 'Vocational Skills', 'Undecided'],
            default: 'Undecided',
        },
        coreValues: [String],
        constraints: {
            budgetLevel: {
                type: String,
                enum: ['high-support-needed', 'moderate', 'flexible'],
                default: 'moderate',
            },
            mobility: {
                type: String,
                enum: ['near-home', 'within-state', 'anywhere'],
                default: 'within-state',
            },
            preferredLearningMode: {
                type: String,
                enum: ['offline', 'online', 'blended'],
                default: 'blended',
            },
            languageComfort: String,
        },
    },
    // Persistent assessment results — saved when student completes the quiz
    assessment: {
        vector: {
            logic: { type: Number, default: 0 },
            creativity: { type: Number, default: 0 },
            technical: { type: Number, default: 0 },
            social: { type: Number, default: 0 },
        },
        results: [{          // top matched careers saved from last quiz
            careerTitle: String,
            score: Number,
            category: String,
            skills: [String],
        }],
        recommendedStreams: [{  // stream suggestions (especially for Class 10 students)
            stream: String,       // e.g. "Science-PCM"
            confidence: Number,   // 0-100
            reasoning: String,    // e.g. "Strong logic + technical scores"
        }],
        studentSignals: {
            longTermGoal: String,
            aspirationTrack: String,
            coreValues: [String],
            constraints: {
                budgetLevel: String,
                mobility: String,
                preferredLearningMode: String,
                languageComfort: String,
            },
        },
        takenAt: Date,
    },
}, {
    timestamps: true,
});


UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.index({ "profile.location": "2dsphere" });

module.exports = mongoose.model('User', UserSchema);

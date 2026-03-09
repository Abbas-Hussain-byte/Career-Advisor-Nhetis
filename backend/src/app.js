const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security Headers
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
});
app.use(limiter);

// CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/careers', require('./routes/careerRoutes'));
app.use('/api/colleges', require('./routes/collegeRoutes'));
app.use('/api/aptitude', require('./routes/aptitudeRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Root Route
app.get('/', (req, res) => {
    res.json({ message: 'NHETIS API is running...', version: '1.0.0' });
});

// Error Handler
app.use(errorHandler);

module.exports = app;

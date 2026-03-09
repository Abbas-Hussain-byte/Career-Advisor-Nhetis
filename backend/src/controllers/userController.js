const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, phone, password, grade } = req.body;
    // Treat empty email string as undefined so sparse index works
    const email = req.body.email?.trim() || undefined;

    if (!name?.trim() || !phone?.trim() || !password) {
        res.status(400);
        throw new Error('Name, phone, and password are required');
    }

    const cleanPhone = phone.trim().replace(/\D/g, ''); // strip non-digits
    if (cleanPhone.length !== 10) {
        res.status(400);
        throw new Error('Phone number must be exactly 10 digits');
    }

    if (password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    const userExists = await User.findOne({ phone: cleanPhone });
    if (userExists) {
        res.status(400);
        throw new Error('An account with this phone number already exists. Please log in instead.');
    }

    const user = await User.create({
        name: name.trim(),
        email,
        phone: cleanPhone,
        password,
        role: 'student',
        profile: { grade: grade || '12' },
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            profile: user.profile,
            assessment: user.assessment,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        res.status(400);
        throw new Error('Phone and password are required');
    }

    const user = await User.findOne({ phone });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            profile: user.profile,
            assessment: user.assessment,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid phone number or password');
    }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            profile: user.profile,
            assessment: user.assessment,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;

        if (req.body.grade) user.profile.grade = req.body.grade;
        if (req.body.stream) user.profile.stream = req.body.stream;
        if (req.body.board) user.profile.board = req.body.board;
        if (req.body.interests) user.profile.interests = req.body.interests;
        if (req.body.academicScore !== undefined) user.profile.academicScore = req.body.academicScore;
        if (req.body.location) user.profile.location = req.body.location;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            phone: updatedUser.phone,
            email: updatedUser.email,
            role: updatedUser.role,
            profile: updatedUser.profile,
            assessment: updatedUser.assessment,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Save assessment results (quiz vector + top career matches) to user profile
// @route   PUT /api/users/assessment
// @access  Private
const saveAssessment = asyncHandler(async (req, res) => {
    const { vector, results } = req.body;
    if (!vector || !results) {
        res.status(400);
        throw new Error('vector and results are required');
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { assessment: { vector, results, takenAt: new Date() } },
        { new: true }
    );
    if (!user) { res.status(404); throw new Error('User not found'); }
    res.json({ message: 'Assessment saved', assessment: user.assessment });
});

module.exports = { registerUser, authUser, getUserProfile, updateUserProfile, saveAssessment };

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
    const { name, email, phone, password, role, grade } = req.body;

    if (!name || !phone || !password) {
        res.status(400);
        throw new Error('Name, phone, and password are required');
    }

    const userExists = await User.findOne({ phone });
    if (userExists) {
        res.status(400);
        throw new Error('User with this phone number already exists');
    }

    const user = await User.create({
        name,
        email,
        phone,
        password,
        role: role || 'student',
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
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = { registerUser, authUser, getUserProfile, updateUserProfile };

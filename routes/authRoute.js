const express = require('express');
const router = express.Router();

// Controller functions ko import kar rahe hain
const { 
    register, 
    login, 
    forgotPassword, 
    resetPassword, 
    updateProfile, 
    logout,
    getMe 
} = require('../controllers/authcontroller'); // Check kar lena path sahi ho

/**
 * @route   POST /api/auth/register
 * @desc    Naya user register karne ke liye
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    User login aur security alert mail bhejne ke liye
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    OTP generate karke email pe bhejne ke liye
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    OTP verify karke naya password set karne ke liye
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    User ki details (Name, Phone) update karne ke liye
 * @access  Private (Middlewares ki zarurat padegi baad mein)
 */
router.put('/update-profile', updateProfile);

/**
 * @route   GET /api/auth/logout
 * @desc    Cookie clear karke session khatam karne ke liye
 * @access  Public
 */
router.get('/logout', logout);

/**
 * @route   GET /api/auth/me
 * @desc    Logged in user ki current details fetch karne ke liye
 * @access  Private
 */
router.get('/me', getMe);

// --- Exporting the Router ---
module.exports = router;
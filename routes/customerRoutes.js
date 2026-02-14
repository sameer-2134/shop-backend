const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Path check kar lena sahi ho

/**
 * @route   GET /api/customers/all-customers
 * @desc    Fetch all registered users with role 'user'
 * @access  Admin (Ideally)
 */
router.get('/all-customers', async (req, res) => {
    try {
        // Sirf unhe fetch karein jinka role 'user' hai
        const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: "Data fetch nahi ho paya", 
            error: err.message 
        });
    }
});

module.exports = router;
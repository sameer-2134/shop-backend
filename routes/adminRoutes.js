const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Check karein aapka User model path sahi hai

// 1. Saare customers fetch karne ka route
router.get('/all-customers', async (req, res) => {
    try {
        // Sirf unhe fetch karein jinka role 'user' hai
        const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Data fetch nahi ho paya", error: err });
    }
});

module.exports = router;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token = req.cookies.token; // Cookie se token uthaya

    if (!token) {
        return res.status(401).json({ success: false, message: "Pehle login karo, Boss!" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password'); // Password chhod ke baaki info
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Session expired!" });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: "Sirf Owner (Admin) hi yahan ja sakta hai!" });
    }
};

module.exports = { protect, adminOnly };
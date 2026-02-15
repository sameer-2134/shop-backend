const User = require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let otpStore = {}; 

// --- Helper: Transporter Fix ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

// --- Helper: Token & Cookie Response ---
const sendTokenResponse = (user, statusCode, res, message) => {
    const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
    );

    const cookieOptions = {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 
    };

    res.status(statusCode).cookie('token', token, cookieOptions).json({
        success: true,
        message,
        token, 
        user: { 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            phone: user.phone 
        }
    });
};

// --- 1. REGISTER ---
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Details missing hain!" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name, email, password: hashedPassword, phone
        });

        // Background Email (No await)
        transporter.sendMail({
            from: `"ShopLane Atelier" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Welcome, ${name.split(' ')[0]}`,
            text: `Welcome to ShopLane Atelier! Your account is now active.`
        }).catch(err => console.log("Email error:", err));

        sendTokenResponse(user, 201, res, "Registration successful!");
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 2. LOGIN ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email aur password dono chahiye!" });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: "Credentials galat hain!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Galat password!" });
        }

        // Background Alert (No await)
        const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        transporter.sendMail({
            from: `"ShopLane Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🚨 Security Alert: New Login`,
            text: `Hi ${user.name}, your account was accessed at ${loginTime}.`
        }).catch(err => console.log("Email error:", err));

        sendTokenResponse(user, 200, res, `Vapas swagat hai, ${user.name}!`);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
};

// --- 3. FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;

        // Background OTP Send
        transporter.sendMail({
            from: `"ShopLane Atelier" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Reset Code: ${otp}`,
            text: `Your OTP is ${otp}. It will expire soon.`
        }).catch(err => console.log("Email error:", err));

        res.json({ success: true, message: "OTP sent to your email!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Email failed." });
    }
};

// --- 4. RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        if (otpStore[email] && otpStore[email] === otp) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            const user = await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true });
            delete otpStore[email];
            sendTokenResponse(user, 200, res, "Password updated successfully!");
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 5. UPDATE PROFILE ---
exports.updateProfile = async (req, res) => {
    try {
        const { userId, name, phone } = req.body;
        const updatedUser = await User.findByIdAndUpdate(userId, { name, phone }, { new: true });
        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found!" });
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed." });
    }
};

// --- 6. LOGOUT ---
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Logged out! 👋" });
};

// --- 7. GET ME ---
exports.getMe = async (req, res) => {
    try {
        if(!req.user) return res.status(401).json({ success: false, message: "Not authorized" });
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = exports;
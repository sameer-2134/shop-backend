require("dotenv").config();
const User = require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');

let otpStore = {}; 

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
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
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
            phone: user.phone,
            avatar: user.avatar || '' 
        }
    });
};

// --- GOOGLE LOGIN ---
const googleLogin = async (req, res) => {
    try {
        const { token } = req.body; 
        if (!token) return res.status(400).json({ success: false, message: "Google token missing!" });

        const googleRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
        const { email, name, picture } = googleRes.data;

        let user = await User.findOne({ email });

        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-10);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                name,
                email,
                avatar: picture,
                password: hashedPassword,
                phone: "" 
            });
        }
        sendTokenResponse(user, 200, res, `Vapas swagat hai, ${user.name}!`);
    } catch (error) {
        res.status(500).json({ success: false, message: "Google Login Failed!" });
    }
};

// --- REGISTER ---
const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) return res.status(400).json({ success: false, message: "Details missing hain!" });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "User already exists!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ name, email, password: hashedPassword, phone });
        sendTokenResponse(user, 201, res, "Registration successful!");
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- LOGIN ---
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: "Email aur password dono chahiye!" });

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials!" });
        }
        sendTokenResponse(user, 200, res, `Vapas swagat hai, ${user.name}!`);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
};

// --- NEW: SEND OTP LOGIN (Missing tha) ---
const sendOTPLogin = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Email registered nahi hai!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };

        await transporter.sendMail({
            from: `"ShopLane Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Verification Code: ${otp}`,
            html: `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
                    <h2>ShopLane Verification</h2>
                    <p>Your OTP for login is: <b style="font-size:24px;">${otp}</b></p>
                    <p>Valid for 5 minutes.</p>
                   </div>`
        });

        res.status(200).json({ success: true, message: "OTP bhej diya gaya hai!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Email service down hai." });
    }
};

// --- NEW: VERIFY OTP LOGIN (Missing tha) ---
const verifyOTPLogin = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const storedData = otpStore[email];
        if (!storedData || storedData.code !== otp.toString() || Date.now() > storedData.expiresAt) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
        }

        const user = await User.findOne({ email });
        delete otpStore[email];
        sendTokenResponse(user, 200, res, `Swagat hai, ${user.name}!`);
    } catch (error) {
        res.status(500).json({ success: false, message: "Verification failed." });
    }
};

// --- FORGOT PASSWORD ---
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = { code: otp, expiresAt: Date.now() + 10 * 60 * 1000 };

        await transporter.sendMail({
            from: `"ShopLane Atelier" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🔐 Reset Your Password - ${otp}`,
            html: `<h3>Password Reset Code: ${otp}</h3>`
        });

        res.json({ success: true, message: "OTP sent!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Email error." });
    }
};

// --- RESET PASSWORD ---
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const storedData = otpStore[email];
        if (!storedData || storedData.code !== otp.toString() || Date.now() > storedData.expiresAt) {
            return res.status(400).json({ success: false, message: "Invalid/Expired OTP!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const user = await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true });

        delete otpStore[email];
        sendTokenResponse(user, 200, res, "Password updated successfully!");
    } catch (error) {
        res.status(500).json({ success: false, message: "Reset failed." });
    }
};

const updateProfile = async (req, res) => {
    try {
       
        const userId = req.user.id; 
        const { name, phone } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { name, phone }, 
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User nahi mila!" });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Profile update fail ho gaya." });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Logged out! 👋" });
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user?.id);
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    googleLogin,
    register,
    login,
    forgotPassword,
    resetPassword,
    updateProfile,
    logout,
    getMe,
    sendOTPLogin,  
    verifyOTPLogin  
};
const User = require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * @description In-memory store for OTPs
 * @note For production, consider using Redis for better scalability
 */
let otpStore = {}; 

// --- Helper: Token & Cookie Response ---
/**
 * @access Private
 * @description Generates JWT and sets HTTP-only cookie
 */
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
/**
 * @route POST /api/auth/register
 * @description Registers a new user and sends a high-end welcome email
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // Validation logic
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Details missing hain!" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists!" });
        }

        // Password Encryption
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name, 
            email, 
            password: hashedPassword, 
            phone
        });

        // Email Configuration
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            }
        });

        // --- Professional Email Template ---
        await transporter.sendMail({
            from: `"ShopLane Atelier" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Welcome to the Elite Membership, ${name.split(' ')[0]}`,
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; color: #111111; }
                    .email-wrapper { padding: 40px 10px; background-color: #f9f9f9; }
                    .email-container { max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
                    .email-header { padding: 50px 40px 20px 40px; text-align: left; }
                    .brand-logo { font-size: 16px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #000; margin-bottom: 40px; border-left: 3px solid #000; padding-left: 15px; }
                    .email-body { padding: 0 40px 40px 40px; }
                    .hero-title { font-size: 32px; font-weight: 600; line-height: 1.2; color: #000; margin-bottom: 20px; letter-spacing: -0.5px; }
                    .main-text { font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 30px; }
                    .feature-box { background: #f0f0f0; padding: 25px; border-radius: 4px; margin-bottom: 30px; }
                    .feature-box p { margin: 0; font-size: 13px; color: #666; font-style: italic; }
                    .cta-button { display: inline-block; background-color: #000; color: #ffffff !important; padding: 16px 40px; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 1px; border-radius: 2px; }
                    .email-footer { padding: 40px; background-color: #fafafa; border-top: 1px solid #eeeeee; text-align: left; }
                    .footer-text { font-size: 11px; color: #999; line-height: 1.8; letter-spacing: 0.5px; }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="email-container">
                        <div class="email-header">
                            <div class="brand-logo">SHOPLANE ATELIER</div>
                        </div>
                        <div class="email-body">
                            <h1 class="hero-title">Welcome to a new dimension of commerce.</h1>
                            <p class="main-text">
                                Hello ${name},<br><br>
                                We are pleased to confirm your successful registration with <strong>ShopLane Atelier</strong>. Your account is now active, granting you exclusive access to our 3D-integrated shopping experience.
                            </p>
                            <div class="feature-box">
                                <p>"Our mission is to bridge the gap between digital convenience and physical reality. We are glad to have you on this journey."</p>
                            </div>
                            <p class="main-text">You can now explore the gallery and manage your digital collection directly from your dashboard.</p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/gallery" class="cta-button">EXPLORE THE ATELIER</a>
                        </div>
                        <div class="email-footer">
                            <div class="footer-text">
                                <strong>ShopLane Global Inc.</strong><br>
                                Digital Experience Division • Indore HQ<br><br>
                                This is an automated security notification. Please do not reply to this message.
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            `
        });

        sendTokenResponse(user, 201, res, "Registration successful. Professional welcome email sent.");
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 2. LOGIN ---
/**
 * @route POST /api/auth/login
 * @description Authenticates user and sends a security login notification
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ success: false, message: "User nahi mila!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Galat password!" });
        }

        // --- Professional Login Notification Mail ---
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            }
        });

        const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        await transporter.sendMail({
            from: `"ShopLane Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `New Login Detected - ShopLane Atelier`,
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; background-color: #050505; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; }
                    .wrapper { padding: 50px 20px; background-color: #050505; }
                    .glass-card { 
                        max-width: 500px; 
                        margin: 0 auto; 
                        background: linear-gradient(145deg, #111111, #000000); 
                        border: 1px solid #222; 
                        border-radius: 24px; 
                        padding: 40px; 
                        text-align: center;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    }
                    .status-dot { 
                        width: 10px; height: 10px; background: #00ffcc; border-radius: 50%; display: inline-block; 
                        box-shadow: 0 0 10px #00ffcc; margin-right: 8px;
                    }
                    .brand { font-size: 11px; font-weight: 700; letter-spacing: 5px; color: #555; text-transform: uppercase; margin-bottom: 30px; }
                    .icon-3d { font-size: 50px; margin-bottom: 20px; }
                    .title { font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 15px; }
                    .info-text { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 30px; }
                    .details-table { 
                        background: rgba(255,255,255,0.03); 
                        border-radius: 12px; 
                        padding: 20px; 
                        margin-bottom: 30px; 
                        text-align: left;
                        border: 1px solid #1a1a1a;
                    }
                    .detail-row { font-size: 12px; color: #666; margin-bottom: 8px; }
                    .detail-row span { color: #aaa; float: right; font-weight: 600; }
                    .cta-btn { 
                        display: inline-block; 
                        background: #ffffff; 
                        color: #000000 !important; 
                        padding: 14px 30px; 
                        border-radius: 12px; 
                        text-decoration: none; 
                        font-size: 13px; 
                        font-weight: 700; 
                        box-shadow: 0 4px 15px rgba(255,255,255,0.2);
                    }
                    .footer { margin-top: 40px; font-size: 10px; color: #333; letter-spacing: 1px; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="glass-card">
                        <div class="brand">SHOPLANE ATELIER</div>
                        <div class="icon-3d">🛡️</div>
                        <h1 class="title">Secure Login Access</h1>
                        <p class="info-text">Hello ${user.name}, we detected a successful login to your Atelier account. If this was you, you can safely ignore this message.</p>
                        
                        <div class="details-table">
                            <div class="detail-row"><div class="status-dot"></div> Status: <span>Authorized Access</span></div>
                            <div class="detail-row">Time (IST): <span>${loginTime}</span></div>
                            <div class="detail-row">Location: <span>Indore, India (Approx)</span></div>
                        </div>

                        <a href="${process.env.FRONTEND_URL}/profile" class="cta-btn">SECURE ACCOUNT</a>
                        
                        <div class="footer">
                            ENCRYPTED SESSION • SYSTEM ID: ${user._id.toString().slice(-6).toUpperCase()}<br>
                            © 2026 SHOPLANE GLOBAL
                        </div>
                    </div>
                </div>
            </body>
            </html>
            `
        });

        sendTokenResponse(user, 200, res, `Welcome back, ${user.name}! 👋`);
    } catch (error) {
        console.error("Login Mail Error:", error);
        res.status(500).json({ success: false, message: "Login error." });
    }
};

// --- 3. FORGOT PASSWORD ---
/**
 * @route POST /api/auth/forgot-password
 * @description Generates OTP and sends a minimal professional security code mail
 */
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            }
        });

        await transporter.sendMail({
            from: `"ShopLane Atelier" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Security Code: ${otp}`,
            html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;700;800&display=swap');
                    body { margin: 0; padding: 0; background-color: #ffffff; font-family: 'Plus Jakarta Sans', sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 60px 40px; }
                    .brand { font-size: 14px; font-weight: 800; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 80px; color: #000; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px; }
                    .hero-text { font-size: 42px; font-weight: 800; line-height: 1.1; letter-spacing: -2px; margin-bottom: 30px; color: #000; }
                    .user-greeting { font-size: 18px; font-weight: 400; color: #666; margin-bottom: 40px; line-height: 1.6; }
                    .otp-box { margin: 40px 0; padding: 40px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; }
                    .otp-label { font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 15px; }
                    .otp-code { font-size: 56px; font-weight: 800; letter-spacing: 15px; color: #000; margin: 0; }
                    .footer { margin-top: 80px; font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 2px; line-height: 2; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="brand">ShopLane Atelier</div>
                    <h1 class="hero-text">Verify<br>identity.</h1>
                    <p class="user-greeting">Hi ${user.name || 'there'},<br>"Security authorization required. Please enter the following unique verification code to authorize your password reset request"</p>
                    <div class="otp-box">
                        <div class="otp-label">Security Access Code</div>
                        <div class="otp-code">${otp}</div>
                    </div>
                    <div class="footer">ShopLane Global Inc.<br>Edition 2026 • Indore Atelier</div>
                </div>
            </body>
            </html>`
        });

        res.json({ success: true, message: "Authorization code sent! Email check karo 📧" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Email delivery failed." });
    }
};

// --- 4. RESET PASSWORD ---
/**
 * @route POST /api/auth/reset-password
 * @description Verifies OTP and updates user password
 */
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        if (otpStore[email] && otpStore[email] === otp) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            const user = await User.findOneAndUpdate(
                { email }, 
                { password: hashedPassword }, 
                { new: true }
            );
            
            delete otpStore[email];
            sendTokenResponse(user, 200, res, "Password reset successful! 🎉");
        } else {
            res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 5. UPDATE PROFILE ---
/**
 * @route PUT /api/auth/update-profile
 * @description Updates basic user information
 */
exports.updateProfile = async (req, res) => {
    try {
        const { userId, name, phone } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { name, phone }, 
            { new: true }
        );
        
        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found!" });
        
        res.json({
            success: true,
            message: "Profile updated! ✨",
            user: { 
                id: updatedUser._id, 
                name: updatedUser.name, 
                email: updatedUser.email, 
                phone: updatedUser.phone, 
                role: updatedUser.role 
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed." });
    }
};

// --- 6. LOGOUT ---
/**
 * @route GET /api/auth/logout
 * @description Clears the authentication cookie
 */
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Logged out successfully! 👋" });
};

// --- CRITICAL EXPORT ---
module.exports = exports;
const User = require("../models/User");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * @description In-memory store for OTPs
 * @note For production, consider using Redis for better scalability
 */
let otpStore = {}; 

// ============================================================
// --- HELPER UTILITIES (INTERNAL USE) ---
// ============================================================

/**
 * @access Private
 * @description Generates JWT and sets HTTP-only cookie for secure session management
 */
const sendTokenResponse = (user, statusCode, res, message) => {
    // Creating the payload for JWT
    const payload = { 
        id: user._id, 
        role: user.role,
        email: user.email 
    };

    // Signing the token
    const token = jwt.sign(
        payload, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
    );

    // Cookie Configuration for maximum security
    const cookieOptions = {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    };

    // Sending the response with both cookie and JSON for flexibility
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
            createdAt: user.createdAt
        }
    });
};

/**
 * @description Centralized Mail Transporter configuration
 */
const createMailTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { 
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS 
        }
    });
};

// ============================================================
// --- 1. USER REGISTRATION ---
// ============================================================

/**
 * @route POST /api/auth/register
 * @description Registers a new user, hashes password, and sends a premium welcome email
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // --- Input Validation Phase ---
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Arey bhai, saari details fill karona! (Name, Email, Password missing)" 
            });
        }

        // Email Format Validation (Regex)
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Email format sahi nahi hai!" });
        }

        // Checking for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "User pehle se registered hai. Login try karein!" 
            });
        }

        // --- Security: Password Encryption ---
        const salt = await bcrypt.genSalt(12); // Higher rounds for better security
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- Database Operation ---
        const user = await User.create({
            name, 
            email, 
            password: hashedPassword, 
            phone
        });

        // --- Communication: Professional Welcome Email ---
        const transporter = createMailTransporter();

        const welcomeEmailTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #111111; }
                    .wrapper { padding: 40px 10px; background-color: #f4f4f4; }
                    .main-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0; }
                    .header { padding: 40px; background: #000; color: #fff; text-align: center; }
                    .logo { font-size: 20px; font-weight: 800; letter-spacing: 5px; text-transform: uppercase; }
                    .body-content { padding: 40px; }
                    .greeting { font-size: 28px; font-weight: 700; margin-bottom: 20px; color: #333; }
                    .text-content { font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 30px; }
                    .highlight-box { background: #f9f9f9; border-left: 4px solid #000; padding: 20px; margin-bottom: 30px; }
                    .cta-btn { display: inline-block; background: #000; color: #ffffff !important; padding: 18px 35px; text-decoration: none; font-weight: 600; border-radius: 4px; }
                    .footer { padding: 30px; background: #fafafa; text-align: center; border-top: 1px solid #eee; }
                    .footer-text { font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="main-container">
                        <div class="header"><div class="logo">SHOPLANE ATELIER</div></div>
                        <div class="body-content">
                            <h2 class="greeting">Welcome to the Future, ${name.split(' ')[0]}.</h2>
                            <p class="text-content">We are thrilled to have you join <strong>ShopLane Atelier</strong>. Your account has been successfully provisioned with full access to our immersive 3D shopping platform.</p>
                            <div class="highlight-box">
                                <p style="margin:0; font-style: italic;">"Crafting the intersection of digital elegance and seamless commerce."</p>
                            </div>
                            <p class="text-content">Your journey starts here. Explore our curated collections and experience high-fidelity 3D previews.</p>
                            <a href="${process.env.FRONTEND_URL}/gallery" class="cta-btn">EXPLORE COLLECTION</a>
                        </div>
                        <div class="footer">
                            <p class="footer-text">© 2026 ShopLane Global Inc. • Indore HQ • India</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"ShopLane Onboarding" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `The Atelier Awaits: Welcome ${name}`,
            html: welcomeEmailTemplate
        });

        // Generate response
        sendTokenResponse(user, 201, res, "Registration successful. Welcome aboard!");

    } catch (error) {
        console.error("Registration Critical Error:", error);
        res.status(500).json({ success: false, message: "System error: " + error.message });
    }
};

// ============================================================
// --- 2. USER LOGIN ---
// ============================================================

/**
 * @route POST /api/auth/login
 * @description Login user, check password, send security alert email
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email aur password dono chahiye, bhai!" });
        }

        // Find user & include password (if hidden by default in schema)
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Credentials galat hain. Record nahi mila!" });
        }

        // Password Comparison
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Galat password! Dubara try karein." });
        }

        // --- Security: Login Alert Email ---
        const transporter = createMailTransporter();
        const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });

        const loginAlertTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; background-color: #000; font-family: sans-serif; }
                    .card { max-width: 450px; margin: 50px auto; background: #111; border: 1px solid #333; border-radius: 20px; padding: 40px; color: #fff; text-align: center; }
                    .icon { font-size: 40px; margin-bottom: 20px; }
                    .brand { letter-spacing: 5px; color: #666; font-size: 10px; margin-bottom: 30px; }
                    .title { font-size: 22px; margin-bottom: 10px; }
                    .msg { color: #888; font-size: 14px; margin-bottom: 30px; }
                    .data-box { background: #000; padding: 20px; border-radius: 10px; text-align: left; border: 1px solid #222; }
                    .row { font-size: 12px; margin-bottom: 10px; color: #555; }
                    .row span { float: right; color: #fff; font-weight: bold; }
                    .btn { display: block; margin-top: 30px; background: #fff; color: #000 !important; padding: 15px; text-decoration: none; border-radius: 10px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="brand">SHOPLANE SECURITY</div>
                    <div class="icon">🔒</div>
                    <h2 class="title">Secure Login Detected</h2>
                    <p class="msg">Hi ${user.name}, your account was just accessed from a new session.</p>
                    <div class="data-box">
                        <div class="row">Timestamp (IST): <span>${loginTime}</span></div>
                        <div class="row">Status: <span>Authenticated</span></div>
                        <div class="row">Device ID: <span>${user._id.toString().slice(-8).toUpperCase()}</span></div>
                    </div>
                    <a href="${process.env.FRONTEND_URL}/security" class="btn">IT WASN'T ME</a>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"ShopLane Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🚨 Security Alert: New Login to Your Account`,
            html: loginAlertTemplate
        });

        sendTokenResponse(user, 200, res, `Vapas swagat hai, ${user.name}!`);

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Login failure." });
    }
};

// ============================================================
// --- 3. PASSWORD RECOVERY (FORGOT PASSWORD) ---
// ============================================================

/**
 * @route POST /api/auth/forgot-password
 * @description Generates 6-digit OTP and sends modern verification mail
 */
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) return res.status(400).json({ success: false, message: "Email toh likho!" });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Ye email hamare database mein nahi hai!" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to in-memory store (Consider expiration logic for real production)
        otpStore[email] = {
            code: otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes validity
        };

        const transporter = createMailTransporter();

        const otpTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; color: #000; }
                    .container { max-width: 500px; margin: 50px auto; padding: 40px; border: 2px solid #000; }
                    .logo { font-weight: 900; letter-spacing: 4px; text-transform: uppercase; border-bottom: 2px solid #000; display: inline-block; }
                    .otp-title { font-size: 40px; font-weight: 800; margin-top: 40px; line-height: 1; }
                    .otp-code { font-size: 60px; font-weight: 800; letter-spacing: 10px; margin: 40px 0; color: #000; }
                    .hint { color: #666; font-size: 14px; line-height: 1.5; }
                    .footer { margin-top: 60px; font-size: 10px; color: #999; letter-spacing: 2px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">SHOPLANE</div>
                    <h1 class="otp-title">Identity<br>Verification.</h1>
                    <p class="hint">Hi ${user.name}, use the code below to reset your password. This code expires in 10 minutes.</p>
                    <div class="otp-code">${otp}</div>
                    <p class="hint">If you didn't request this, ignore this mail or contact security.</p>
                    <div class="footer">SHOPLANE ATELIER • GEN 2026 • DIGITAL DIVISION</div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"ShopLane Identity" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Verification Code: ${otp}`,
            html: otpTemplate
        });

        res.json({ success: true, message: "OTP bhej diya gaya hai. Check your inbox! 📬" });

    } catch (error) {
        console.error("OTP Error:", error);
        res.status(500).json({ success: false, message: "Email bhejte waqt fat gaya system!" });
    }
};

// ============================================================
// --- 4. PASSWORD RESET ---
// ============================================================

/**
 * @route POST /api/auth/reset-password
 * @description Verifies OTP and updates user password in database
 */
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "Saari fields jaruri hain!" });
        }

        const record = otpStore[email];

        if (record && record.code === otp) {
            // Check expiry
            if (Date.now() > record.expires) {
                delete otpStore[email];
                return res.status(400).json({ success: false, message: "OTP expire ho gaya hai, firse mangao!" });
            }

            // Hashing new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            const user = await User.findOneAndUpdate(
                { email }, 
                { password: hashedPassword }, 
                { new: true }
            );
            
            // Cleanup
            delete otpStore[email];

            sendTokenResponse(user, 200, res, "Password successfully reset! Naya wala yaad rakhna. 🎉");
        } else {
            res.status(400).json({ success: false, message: "OTP galat hai bhai!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================
// --- 5. PROFILE MANAGEMENT ---
// ============================================================

/**
 * @route PUT /api/auth/update-profile
 * @description Updates basic user information including phone and name
 */
exports.updateProfile = async (req, res) => {
    try {
        const { userId, name, phone } = req.body;
        
        // Input clean-up or validation could be added here
        
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { name, phone }, 
                { 
                new: true, // returns the updated doc
                runValidators: true // ensures model constraints
            }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User nahi mila!" });
        }
        
        res.json({
            success: true,
            message: "Profile update ho gayi! ✨",
            user: { 
                id: updatedUser._id, 
                name: updatedUser.name, 
                email: updatedUser.email, 
                phone: updatedUser.phone, 
                role: updatedUser.role 
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed internally." });
    }
};

// ============================================================
// --- 6. LOGOUT ---
// ============================================================

/**
 * @route GET /api/auth/logout
 * @description Destroys the cookie and logs out user
 */
exports.logout = (req, res) => {
    // Expire the cookie immediately
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ 
        success: true, 
        message: "Logged out successfully! Milte hain phir. 👋" 
    });
};

// ============================================================
// --- 7. GET CURRENT USER (PROTECTED) ---
// ============================================================

/**
 * @route GET /api/auth/me
 * @description Returns current logged in user details
 */
exports.getMe = async (req, res) => {
    try {
        // req.user.id comes from your 'auth' middleware
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
};

// --- FINAL EXPORT ---
module.exports = exports;

// END OF AUTH CONTROLLER FILE
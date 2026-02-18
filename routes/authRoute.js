const express = require('express');
const router = express.Router();
const authController = require('../controllers/authcontroller');
const { protect } = require('../middleware/authmiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/send-otp-login', authController.sendOTPLogin);
router.post('/verify-otp-login', authController.verifyOTPLogin);

router.put('/update-profile', protect, authController.updateProfile);
router.get('/me', protect, authController.getMe);
router.get('/logout', authController.logout);
router.post('/test', (req, res) => {
    res.send("Backend rasta khula hai!");
});

module.exports = router;
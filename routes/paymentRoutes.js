const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const paymentController = require('../controllers/paymentController');

// --- User Facing Routes ---

// Order create karte waqt (Yahan token optional ho sakta hai par protect laga doge toh safe rahega)
router.post('/order', paymentController.createOrder);

// ✅ Payment verify karte waqt 'protect' zaroori hai taaki 'req.user.id' mile
router.post('/verify', protect, paymentController.verifyPayment);

// User orders list
router.get('/my-orders', protect, paymentController.getMyOrders); 

// --- Admin Facing Routes ---
router.get('/all-orders', paymentController.getAllOrders); 
router.put('/update-status/:id', paymentController.updateOrderStatus);

module.exports = router;
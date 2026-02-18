const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const paymentController = require('../controllers/paymentController');

router.post('/order', protect, paymentController.createOrder);
router.post('/verify', protect, paymentController.verifyPayment);
router.get('/my-orders', protect, paymentController.getMyOrders); 

router.get('/all-orders', protect, paymentController.getAllOrders); 
router.put('/update-status/:id', protect, paymentController.updateOrderStatus);

module.exports = router;
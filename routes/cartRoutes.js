const express = require('express');
const router = express.Router();
// 1. Yahan emptyCart ko controller se import kar
const { addToCart, getCart, removeFromCart, emptyCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// Frontend: axios.get('/api/cart')
router.get('/', protect, getCart); 

// Frontend: axios.post('/api/cart/add')
router.post('/add', protect, addToCart);

// Frontend: axios.delete('/api/cart/remove/:id')
router.delete('/remove/:id', protect, removeFromCart);

// ✅ 2. YE LINE ADD KAR (Database saaf karne ke liye)
router.delete('/empty', protect, emptyCart); 

module.exports = router;
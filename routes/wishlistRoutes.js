const express = require('express');
const router = express.Router();
const { addToWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

// Sab raste ekdum saaf (Frontend se matching)
router.get('/', protect, getWishlist); 
router.post('/add', protect, addToWishlist);
router.delete('/remove/:id', protect, removeFromWishlist);

module.exports = router;
const express = require('express');
const router = express.Router();

// Controllers import - DHAYAN RAKHO: 'c' small hai controller mein
const cartController = require('../controllers/cartController');

// Debugging for Railway (Ye line logs mein bata degi ki functions load hue ya nahi)
console.log("Checking Cart Functions:", {
    getCart: !!cartController.getCart,
    addToCart: !!cartController.addToCart,
    updateCart: !!cartController.updateCart,
    removeFromCart: !!cartController.removeFromCart,
    emptyCart: !!cartController.emptyCart
});

// Destructuring functions after check
const { 
    getCart, 
    addToCart, 
    updateCart, 
    removeFromCart, 
    emptyCart 
} = cartController;

// Middleware import
const { protect } = require('../middleware/authMiddleware');

/**
 * @BASE_URL /api/cart
 */

// 1. Get User Cart Data
router.get('/', protect, getCart); 

// 2. Add Item to Cart
router.post('/add', protect, addToCart);

// 3. Update Item Quantity
// Railway par agar ye function nahi mila toh yehi crash karta hai
router.post('/update', protect, updateCart);

// 4. Remove Single Item
router.delete('/remove/:id', protect, removeFromCart);

// 5. Clear Full Cart
router.delete('/empty', protect, emptyCart); 

module.exports = router;
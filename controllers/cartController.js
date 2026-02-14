const Cart = require('../models/Cart');

// 1. Get Cart
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId }).populate('products.productId');
        res.status(200).json(cart || { products: [] });
    } catch (error) {
        res.status(500).json({ message: "Error fetching cart", error });
    }
};

// 2. Add to Cart
exports.addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;
        let cart = await Cart.findOne({ userId });

        if (cart) {
            const itemIndex = cart.products.findIndex(p => p.productId.toString() === productId);
            if (itemIndex > -1) {
                cart.products[itemIndex].quantity += 1;
            } else {
                cart.products.push({ productId, quantity: 1 });
            }
            await cart.save();
        } else {
            await Cart.create({ userId, products: [{ productId, quantity: 1 }] });
        }
        res.status(200).json({ message: "Cart updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// 3. Remove from Cart
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;
        let cart = await Cart.findOne({ userId });
        if (cart) {
            cart.products = cart.products.filter(p => p.productId.toString() !== productId);
            await cart.save();
            res.status(200).json({ message: "Removed successfully" });
        } else {
            res.status(404).json({ message: "Cart not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error removing item", error });
    }
};

// 4. Empty Cart (FIXED: userId use kiya hai)
exports.emptyCart = async (req, res) => {
    try {
        const userId = req.user.id; 
        // 🚨 Yahan 'user' ki jagah 'userId' aayega tere schema ke hisaab se
        const deletedCart = await Cart.findOneAndDelete({ userId: userId }); 
        
        if (deletedCart) {
            res.status(200).json({ success: true, message: "Cart cleared from DB" });
        } else {
            res.status(404).json({ success: false, message: "No cart found to clear" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error clearing cart", error });
    }
};
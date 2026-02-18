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
        const { productId, size } = req.body;
        const userId = req.user.id;
        let cart = await Cart.findOne({ userId });

        if (cart) {
            const itemIndex = cart.products.findIndex(p => 
                p.productId.toString() === productId && p.size === size
            );

            if (itemIndex > -1) {
                cart.products[itemIndex].quantity += 1;
            } else {
                cart.products.push({ productId, quantity: 1, size });
            }
            await cart.save();
        } else {
            await Cart.create({ 
                userId, 
                products: [{ productId, quantity: 1, size }] 
            });
        }
        res.status(200).json({ success: true, message: "Cart updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
    }
};

// 3. Update Cart (Iska naam updateCart rakha hai route se match karne ke liye)
exports.updateCart = async (req, res) => {
    try {
        // Frontend 'itemId' bhej raha hai toh yahan productId ki jagah itemId handle kiya hai
        const { itemId, productId, quantity, size } = req.body;
        const userId = req.user.id;
        const idToFind = itemId || productId; // Dono mein se jo bhi aaye

        const cart = await Cart.findOne({ userId });

        if (cart) {
            const itemIndex = cart.products.findIndex(p => 
                p.productId.toString() === idToFind && p.size === size
            );

            if (itemIndex > -1) {
                cart.products[itemIndex].quantity = quantity;
                await cart.save();
                res.status(200).json({ success: true, message: "Quantity updated" });
            } else {
                res.status(404).json({ success: false, message: "Item not found in cart" });
            }
        } else {
            res.status(404).json({ success: false, message: "Cart not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating cart", error: error.message });
    }
};

// 4. Remove from Cart
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;
        const { size } = req.query; 

        let cart = await Cart.findOne({ userId });
        if (cart) {
            cart.products = cart.products.filter(p => 
                !(p.productId.toString() === productId && p.size === size)
            );
            await cart.save();
            res.status(200).json({ success: true, message: "Removed successfully" });
        } else {
            res.status(404).json({ success: false, message: "Cart not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing item", error });
    }
};

// 5. Empty Cart
exports.emptyCart = async (req, res) => {
    try {
        const userId = req.user.id; 
        const deletedCart = await Cart.findOneAndDelete({ userId }); 
        
        if (deletedCart) {
            res.status(200).json({ success: true, message: "Cart cleared from DB" });
        } else {
            res.status(404).json({ success: false, message: "No cart found to clear" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Error clearing cart", error });
    }
};
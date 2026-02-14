const Wishlist = require('../models/Wishlist');

// ✅ 1. Get Wishlist (Updated structure to match Cart)
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // .populate('products') tabhi kaam karega agar model mein ref: 'Product' hai
        const wishlist = await Wishlist.findOne({ userId }).populate('products'); 
        
        if (!wishlist) {
            return res.status(200).json({ products: [] });
        }

        // 🔥 Frontend Fix: Cart jaisa structure banane ke liye (productId: object)
        const formattedProducts = wishlist.products.map(product => {
            if (!product) return null;
            return {
                productId: product // Poora product details yahan as an object jayega
            };
        }).filter(Boolean);

        res.status(200).json({ products: formattedProducts });
    } catch (error) {
        console.error("Wishlist Fetch Error:", error);
        res.status(500).json({ message: "Error fetching wishlist", error });
    }
};

// ✅ 2. Add to Wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        let wishlist = await Wishlist.findOne({ userId });

        if (wishlist) {
            // Check if product already exists (String conversion zaroori hai comparison ke liye)
            const exists = wishlist.products.some(id => id.toString() === productId);
            
            if (!exists) {
                wishlist.products.push(productId);
                await wishlist.save();
            }
        } else {
            await Wishlist.create({ userId, products: [productId] });
        }
        res.status(200).json({ message: "Added to wishlist" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// ✅ 3. Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;

        let wishlist = await Wishlist.findOne({ userId });
        if (wishlist) {
            wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
            await wishlist.save();
        }
        res.status(200).json({ message: "Removed from wishlist" });
    } catch (error) {
        res.status(500).json({ message: "Error", error });
    }
};
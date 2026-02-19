const User = require('../models/User');

exports.addAddress = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User identify nahi ho raha" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.addresses) {
            user.addresses = [];
        }

        user.addresses.push(req.body);
        await user.save();

        res.status(200).json({ 
            success: true, 
            addresses: user.addresses 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Address save karne mein dikkat: " + error.message 
        });
    }
};

exports.getAddresses = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ 
            success: true, 
            addresses: user.addresses || [] 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.addresses = user.addresses.filter(
            addr => addr._id.toString() !== req.params.id
        );
        
        await user.save();

        res.status(200).json({ 
            success: true, 
            addresses: user.addresses 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};
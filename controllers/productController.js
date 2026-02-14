const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Order = require('../models/Order'); 
const Product = require('../models/Product'); 
const { orderEmailTemplate } = require('../utils/emailTemplate');
const socketInstance = require('../socket');

// Razorpay Config
const razorpay = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});

// Email Config
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- REAL-TIME LEDGER LOGIC ---
const emitUpdatedLedger = async () => {
    try {
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalBank: { 
                        $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] } 
                    },
                    totalPending: { 
                        $sum: { $cond: [{ $ne: ["$status", "Paid"] }, "$amount", 0] } 
                    }
                }
            }
        ]);

        const io = socketInstance.getIO();
        if (io) {
            io.emit('updateLedger', {
                bankBalance: stats[0]?.totalBank || 0,
                expectedCash: stats[0]?.totalPending || 0 
            });
            console.log("📊 Ledger Updated via Socket: True");
        }
    } catch (err) {
        console.error("Ledger Emit Error:", err.message);
    }
};

// --- PRODUCT CONTROLLERS ---

// 1. Add Single Product (Updated with Sizes & Colors)
exports.addProduct = async (req, res) => {
    try {
        const { 
            name, brand, category, price, subCategory, 
            section, originalPrice, description, stock,
            sizes, colors, externalImageUrls 
        } = req.body;

        let imagePaths = [];

        // Image Handling (Files vs Cloudinary URLs)
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map(file => file.path.replace(/\\/g, '/'));
        } else if (externalImageUrls) {
            imagePaths = Array.isArray(externalImageUrls) ? externalImageUrls : externalImageUrls.split(',').map(url => url.trim());
        }

        if (imagePaths.length === 0) {
            return res.status(400).json({ success: false, message: "Security Protocol: Kam se kam 1 image authorized karein." });
        }

        const newProduct = new Product({
            name,
            brand,
            category: category ? category.toLowerCase() : "",
            subCategory: subCategory ? subCategory.toLowerCase() : "",
            section: section ? section.toLowerCase() : "",
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : null,
            description,
            stock: Number(stock),
            images: imagePaths,
            // 🔥 NEW FIELDS: Parsing agar frontend se stringify karke bhej rahe ho
            sizes: typeof sizes === 'string' ? JSON.parse(sizes) : (sizes || []),
            colors: typeof colors === 'string' ? JSON.parse(colors) : (colors || [])
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Product authorized and listed! 🚀", product: newProduct });
    } catch (error) {
        console.error("Critical Error [AddProduct]:", error.message);
        res.status(500).json({ success: false, message: "Server dispatch failed.", error: error.message });
    }
};

// 2. Bulk Add Products (Updated with Sizes & Colors mapping)
exports.bulkAddProducts = async (req, res) => {
    try {
        const productsData = Array.isArray(req.body) ? req.body : req.body.products;
        
        if (!Array.isArray(productsData)) {
            return res.status(400).json({ success: false, message: "Invalid Format: Array of products required." });
        }

        const cleanedProducts = productsData.map(item => ({
            ...item,
            category: item.category ? item.category.toLowerCase() : "",
            subCategory: item.subCategory ? item.subCategory.toLowerCase() : "",
            section: item.section ? item.section.toLowerCase() : "",
            description: item.description || item.Description,
            // 🔥 Ensure sizes and colors are arrays even in bulk
            sizes: Array.isArray(item.sizes) ? item.sizes : (item.sizes ? [item.sizes] : ["Free Size"]),
            colors: Array.isArray(item.colors) ? item.colors : (item.colors ? [item.colors] : [])
        }));

        const products = await Product.insertMany(cleanedProducts);
        res.status(201).json({ 
            success: true, 
            message: "Bulk Authorization Success!", 
            count: products.length 
        });
    } catch (error) {
        console.error("Critical Error [BulkAdd]:", error.message);
        res.status(500).json({ success: false, message: "Bulk upload failed.", error: error.message });
    }
};


// 3. Get All Products (FIXED with Search Logic)
exports.getAllProducts = async (req, res) => {
    try {
        // Inputs fetch karein (Added 'search' here)
        const { limit = 12, cursor, section, category, search } = req.query; 
        
        let query = {};
        
        // --- SEARCH LOGIC (NEW) ---
        if (search) {
            // Ye name, brand ya category kisi mein bhi match karega toh result dikhayega
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        // --- FILTER LOGIC ---
        if (section) query.section = section.toLowerCase();
        if (category) query.category = category.toLowerCase();

        // --- CURSOR LOGIC ---
        if (cursor) {
            query._id = { $lt: cursor }; 
        }

        // Database Call
        const products = await Product.find(query)
            .sort({ _id: -1 }) 
            .limit(Number(limit) + 1)
            .lean();

        const hasMore = products.length > Number(limit);
        const results = hasMore ? products.slice(0, -1) : products;
        const nextCursor = hasMore ? results[results.length - 1]._id : null;

        res.status(200).json({
            success: true,
            count: results.length,
            products: results,
            nextCursor,
            hasMore
        });

    } catch (error) {
        console.error("Pagination/Search Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Performance error: Unable to fetch products smoothly." 
        });
    }
};
// --- ORDER/PAYMENT CONTROLLERS ---

exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `rcpt_${crypto.randomBytes(4).toString('hex')}`,
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: "Razorpay order generation failed." });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, amount, items, address } = req.body;
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RZP_KEY_SECRET).update(sign.toString()).digest("hex");

        if (razorpay_signature === expectedSign) {
            const newOrder = new Order({ 
                email, 
                razorpayOrderId: razorpay_order_id, 
                razorpayPaymentId: razorpay_payment_id, 
                amount, 
                items: items.map(item => ({
                    name: item.name,
                    price: item.price,
                    qty: item.qty || item.quantity,
                    image: item.image,
                    size: item.size, // 🔥 Added size to order history
                    color: item.color // 🔥 Added color to order history
                })), 
                address, 
                status: 'Paid' 
            });

            await newOrder.save();
            await emitUpdatedLedger();

            transporter.sendMail({
                from: `"ShopLane" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Order Confirmed! 🛍️ ShopLane',
                html: orderEmailTemplate(razorpay_payment_id, amount, items)
            }).catch(e => console.log("Silent Email Fail:", e.message));

            return res.status(200).json({ success: true, message: "Authorization Success! Order Placed." });
        } else {
            return res.status(400).json({ success: false, message: "Security Breach: Invalid Signature!" });
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: "Verification process failed." });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true });
        if (!updatedOrder) return res.status(404).json({ message: "Order not found" });
        await emitUpdatedLedger();
        res.status(200).json({ success: true, message: "Status Authorized!", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: "Update failed" });
    }
};

// 4. Get Single Product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        console.error("Error [GetProductById]:", error.message);
        res.status(500).json({ success: false, message: "Invalid ID format or Server error" });
    }
};
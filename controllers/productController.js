const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Order = require('../models/Order'); 
const Product = require('../models/Product'); 
const { orderEmailTemplate } = require('../utils/emailTemplate');
const socketInstance = require('../socket');

const razorpay = new Razorpay({
    key_id: process.env.VITE_RAZORPAY_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

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

// ✅ ADD PRODUCT: Updated to match plural 'images' Schema
exports.addProduct = async (req, res) => {
    try {
        const { 
            name, brand, category, price, subCategory, 
            section, originalPrice, description, stock,
            sizes, colors, externalImageUrls, isFeatured
        } = req.body;

        let imagePaths = [];
        // Priority 1: Uploaded files via Multer
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map(file => file.path.replace(/\\/g, '/'));
        } 
        // Priority 2: External URLs
        else if (externalImageUrls) {
            imagePaths = Array.isArray(externalImageUrls) 
                ? externalImageUrls 
                : externalImageUrls.split(',').map(url => url.trim());
        }

        // Schema validation check (Images cannot be empty)
        if (imagePaths.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Validation Error: Kam se kam 1 product image zaroori hai." 
            });
        }

        const newProduct = new Product({
            name,
            brand,
            category: category?.toLowerCase().trim(),
            subCategory: subCategory?.toLowerCase().trim(),
            section: section?.toLowerCase().trim(),
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : Number(price),
            description,
            stock: Number(stock) || 0,
            images: imagePaths, // Matches plural schema
            sizes: typeof sizes === 'string' ? JSON.parse(sizes) : (sizes || []),
            colors: typeof colors === 'string' ? JSON.parse(colors) : (colors || []),
            isFeatured: isFeatured === 'true' || isFeatured === true
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Asset Authorized! Product Listed. 🚀", product: newProduct });
    } catch (error) {
        console.error("Critical Error [AddProduct]:", error.message);
        res.status(500).json({ success: false, message: "Schema Dispatch Failed.", error: error.message });
    }
};

// ✅ BULK ADD: Sabse bada fix (Mapping singular 'image' to plural 'images' array)
exports.bulkAddProducts = async (req, res) => {
    try {
        const productsData = Array.isArray(req.body) ? req.body : req.body.products;
        
        if (!Array.isArray(productsData)) {
            return res.status(400).json({ success: false, message: "Invalid Format: Products array required." });
        }

        const cleanedProducts = productsData.map(item => {
            // FIX: Convert 'image' key to 'images' array if necessary
            let finalImages = [];
            if (Array.isArray(item.images) && item.images.length > 0) {
                finalImages = item.images;
            } else if (item.image) {
                finalImages = [item.image];
            } else if (item.thumbnail) {
                finalImages = [item.thumbnail];
            }

            // Provide default placeholder if still empty to prevent schema error
            if (finalImages.length === 0) {
                finalImages = ["https://placehold.co/800x1000?text=IMAGE_MISSING_IN_UPLOAD"];
            }

            return {
                name: item.name,
                brand: item.brand,
                price: Number(item.price),
                originalPrice: Number(item.originalPrice || item.price),
                description: item.description || "No description provided",
                category: item.category ? item.category.toLowerCase().trim() : "unassigned",
                subCategory: item.subCategory ? item.subCategory.toLowerCase().trim() : "general",
                section: item.section ? item.section.toLowerCase().trim() : "unisex",
                images: finalImages,
                stock: Number(item.stock) || 10,
                sizes: Array.isArray(item.sizes) ? item.sizes : ["Free Size"],
                colors: Array.isArray(item.colors) ? item.colors : [],
                isFeatured: !!item.isFeatured
            };
        });

        const products = await Product.insertMany(cleanedProducts);
        res.status(201).json({ 
            success: true, 
            message: `Bulk Sync Complete! ${products.length} products added.`, 
            count: products.length 
        });
    } catch (error) {
        console.error("Critical Error [BulkAdd]:", error.message);
        res.status(500).json({ success: false, message: "Bulk upload rejected by database.", error: error.message });
    }
};

// ✅ GET ALL: With Optimized cursor-based pagination
exports.getAllProducts = async (req, res) => {
    try {
        const { limit = 12, cursor, section, category, search } = req.query; 
        let query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } }
            ];
        }

        if (section) query.section = section.toLowerCase().trim();
        if (category) query.category = category.toLowerCase().trim();

        if (cursor) {
            query._id = { $lt: cursor }; 
        }

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
        console.error("Pagination Error:", error);
        res.status(500).json({ success: false, message: "Smooth fetch failed." });
    }
};

// ✅ GET BY ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product missing in archive." });
        res.status(200).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: "Invalid Asset ID." });
    }
};

// RAZORPAY & ORDER LOGIC
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
        res.status(500).json({ message: "Gateway error." });
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
                    image: item.images ? item.images[0] : item.image, // Fix for plural images
                    size: item.size, 
                    color: item.color 
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
            }).catch(e => console.log("Email Notification Fail:", e.message));

            return res.status(200).json({ success: true, message: "Payment Authorized!" });
        } else {
            return res.status(400).json({ success: false, message: "Security Breach: Signature Mismatch!" });
        }
    } catch (error) {
        res.status(500).json({ message: "Verification failed." });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true });
        if (!updatedOrder) return res.status(404).json({ message: "Order not found" });
        await emitUpdatedLedger();
        res.status(200).json({ success: true, message: "Status Synced!", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: "Update failed" });
    }
};
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Order = require('../models/Order');
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
            console.log("📊 Ledger Updated via Socket");
        }
    } catch (err) {
        console.error("Socket Error:", err.message);
    }
};

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
        res.status(500).json({ message: "Order creation failed" });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            email, 
            amount, 
            items, 
            address 
        } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RZP_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            const newOrder = new Order({ 
                email, 
                userId: req.user ? req.user.id : null,
                razorpayOrderId: razorpay_order_id, 
                razorpayPaymentId: razorpay_payment_id, 
                amount, 
                items, 
                address, 
                status: 'Paid' 
            });

            await newOrder.save();
            await emitUpdatedLedger();

            try {
                await transporter.sendMail({
                    from: `"ShopLane" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: 'Order Confirmed! 🛍️ ShopLane',
                    html: orderEmailTemplate(razorpay_payment_id, amount, items)
                });
            } catch (mailErr) {
                console.log("Email error ignored:", mailErr.message);
            }

            res.status(200).json({ success: true, message: "Payment verified and order saved" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        res.status(500).json({ message: "Verification failed", error: error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ email: req.user.email }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders" });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id, 
            { status: req.body.status }, 
            { new: true }
        );
        if (!order) return res.status(404).json({ message: "Order not found" });
        
        await emitUpdatedLedger();
        res.status(200).json({ success: true, order });
    } catch (error) {
        res.status(500).json({ message: "Update failed" });
    }
};
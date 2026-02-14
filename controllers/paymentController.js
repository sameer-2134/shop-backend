const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Order = require('../models/Order');
const { orderEmailTemplate } = require('../utils/emailTemplate');
const socketInstance = require('../socket');

const razorpay = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- HELPER FUNCTION: REAL-TIME LEDGER UPDATE ---
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
            console.log("📊 Ledger Emit Success: Paid Status Checked");
        }
    } catch (err) {
        console.error("Socket Emit Error:", err.message);
    }
};

// --- CONTROLLERS ---

// 1. GET USER ORDERS
exports.getMyOrders = async (req, res) => {
    try {
        // req.user protect middleware se aata hai
        const { email, id } = req.user; 
        
        // Pehle email se dhoondo, backup ke liye ID use karo
        const query = email ? { email: email } : { userId: id };
        
        console.log("🔍 Fetching orders for:", email || id);
        
        const orders = await Order.find(query).sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            orders
        });
    } catch (error) {
        console.error("Get My Orders Error:", error);
        res.status(500).json({ success: false, message: "Orders fetch nahi ho paye" });
    }
};

// 2. CREATE RAZORPAY ORDER
exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: amount * 100, // Rs to Paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: "Order generate nahi ho paya" });
    }
};

// 3. VERIFY PAYMENT (Crash Proof Version)
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
            // ✅ Fix: req.user check kar rahe hain taaki 'id' undefined na aaye
            const currentUserId = req.user ? req.user.id : null;

            const newOrder = new Order({ 
                email, 
                userId: currentUserId, // User tracking ke liye
                razorpayOrderId: razorpay_order_id, 
                razorpayPaymentId: razorpay_payment_id, 
                amount, 
                items,
                address,
                status: 'Paid' 
            });
            
            await newOrder.save();
            await emitUpdatedLedger(); 

            // Email Notification
            try {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Order Confirmed! 🛍️ ShopLane',
                    html: orderEmailTemplate(razorpay_payment_id, amount, items)
                };
                await transporter.sendMail(mailOptions);
            } catch (mailErr) {
                console.error("Email send fail:", mailErr.message);
            }

            return res.status(200).json({ success: true, message: "Order Success!" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid Signature!" });
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: "Process failed", error: error.message });
    }
};

// 4. ADMIN: GET ALL ORDERS
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Orders fetch nahi ho paya" });
    }
};

// 5. ADMIN: UPDATE STATUS
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            { $set: { status: status } },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        await emitUpdatedLedger();
        res.status(200).json({ success: true, message: "Status Updated!", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: "Update failed", error: error.message });
    }
};
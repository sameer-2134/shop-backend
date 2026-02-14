const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }, 
    email: { 
        type: String, 
        required: true 
    },
    razorpayOrderId: { 
        type: String, 
        required: true 
    },
    razorpayPaymentId: { 
        type: String, 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    items: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true },
            qty: { type: Number, required: true },
            image: { type: String }
        }
    ],
    
    address: {
        fullName: { type: String, default: "Customer" },
        phone: { type: String, default: "N/A" },
        street: { type: String, default: "N/A" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        pincode: { type: String, default: "" }
    },
    // 🔥 Added 'Completed' and 'Pending' to the enum to fix your crash
    status: { 
        type: String, 
        enum: ['Pending', 'Paid', 'Completed', 'Ready', 'Packed', 'Shipped', 'Delivered'],
        default: 'Paid' 
    }, 
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Order', orderSchema);
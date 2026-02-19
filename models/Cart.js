const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                default: 1,
                min: [1, 'Quantity cannot be less than 1']
            },
            size: {
                type: String,
                required: false,
                trim: true,
                default: null
            }
        }
    ]
}, { 
    timestamps: true,
    versionKey: false 
});

module.exports = mongoose.model('Cart', cartSchema);

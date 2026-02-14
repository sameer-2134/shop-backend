const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Product name is required"], trim: true },
    brand: { type: String, required: [true, "Brand name is required"], trim: true },
    description: { type: String, required: [true, "Description is required"] },
    highlights: { type: [String], default: [] },
    price: { type: Number, required: [true, "Sale price is required"] },
    originalPrice: { type: Number, required: [true, "Original MRP is required"] },
    section: { type: String, required: true, lowercase: true, trim: true },
    category: { type: String, required: true, lowercase: true, trim: true },
    subCategory: { type: String, required: true, lowercase: true, trim: true },
    images: { type: [String], required: [true, "At least one image is required"] },
    
    // --- FIXED SIZES ---
    // Default empty rakho taaki hum check kar sakein ki size hai ya nahi
    sizes: { 
        type: [String], 
        default: [] 
    }, 
    colors: { 
        type: [String], 
        default: [] 
    }, 
    
    stock: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false }
}, { 
    timestamps: true 
});

productSchema.index({ name: 'text', brand: 'text', category: 'text' });
module.exports = mongoose.model('Product', productSchema);
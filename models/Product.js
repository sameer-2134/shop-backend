const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Product name is required"], 
        trim: true 
    },
    brand: { 
        type: String, 
        required: [true, "Brand name is required"], 
        trim: true 
    },
    description: { 
        type: String, 
        required: [true, "Description is required"] 
    },
    highlights: { 
        type: [String], 
        default: [] 
    },
    price: { 
        type: Number, 
        required: [true, "Sale price is required"],
        min: [0, "Price cannot be negative"]
    },
    originalPrice: { 
        type: Number, 
        required: [true, "Original MRP is required"],
        min: [0, "Original price cannot be negative"]
    },
    section: { 
        type: String, 
        required: true, 
        lowercase: true, 
        trim: true 
    },
    category: { 
        type: String, 
        required: true, 
        lowercase: true, 
        trim: true 
    },
    subCategory: { 
        type: String, 
        required: true, 
        lowercase: true, 
        trim: true 
    },
    // ✅ FIXED: Images field with default placeholder to prevent frontend 'INVALID_PATH' errors
    images: { 
        type: [String], 
        required: [true, "At least one image is required"],
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: "A product must have at least one image."
        },
        default: ["https://placehold.co/800x1000?text=IMAGE_NOT_PROVIDED_IN_DB"]
    },

    sizes: { 
        type: [String], 
        default: [] 
    }, 
    colors: { 
        type: [String], 
        default: [] 
    }, 
    
    stock: { 
        type: Number, 
        default: 0,
        min: [0, "Stock cannot be negative"]
    },
    isFeatured: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true 
});

// Text index for better search performance
productSchema.index({ name: 'text', brand: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
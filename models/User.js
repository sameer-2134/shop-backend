const mongoose = require("mongoose");

<<<<<<< HEAD
const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true // Email hamesha small letters mein save hoga
    },
 password: { type: String, required: true, select: false },

    phone: { 
        type: String, 
        default: "" 
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    }
}, { 
    timestamps: true // Isse 'createdAt' aur 'updatedAt' apne aap ban jayenge
=======
const addressSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: { type: String, required: true },
    locality: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    landmark: { type: String },
    type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' }
>>>>>>> a34d9d0
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "" },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    addresses: [addressSchema]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
const mongoose = require("mongoose");

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
    password: { 
        type: String, 
        required: true 
    },
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
});

// Model ka naam 'User' (Capital U) rakhna standard practice hai
const User = mongoose.model('User', userSchema);

module.exports = User;
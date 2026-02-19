require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const cookieParser = require('cookie-parser');
const http = require('http');
const socketInstance = require('./socket');

// --- ROUTES IMPORT ---
const authRoutes = require('./routes/authRoute'); 
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes'); 
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express(); 
const server = http.createServer(app);

// Socket Initialization
socketInstance.init(server);

// --- CORS CONFIGURATION ---
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            "http://localhost:5173",
            "https://shop-frontend-ochre.vercel.app",
            "https://shop-frontend-git-main-sameer-mansuris-projects.vercel.app"
        ];
        if (allowedOrigins.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

// --- UPLOADS DIRECTORY ---
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}
app.use('/uploads', express.static(uploadsPath));

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Database Connected: ShopLane Live!"))
  .catch(err => console.log("❌ Database Error:", err));

// --- API ROUTES MOUNTING ---
app.use('/api/auth', authRoutes); 
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/payment', paymentRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);

app.get("/", (req, res) => {
    res.send("ShopLane API is live 🚀");
});

// --- SERVER START ---
const PORT = process.env.PORT || 8080; 
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port: ${PORT}`);
});
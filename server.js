require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const cookieParser = require('cookie-parser');
const http = require('http');
const socketInstance = require('./socket');

// Route Imports
const authRoutes = require('./routes/authRoute'); // Jo tune abhi save ki
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes'); 
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express(); 
const server = http.createServer(app);

// Socket Initialize
socketInstance.init(server);

// ✅ CORS CONFIG
app.use(cors({
    origin: [
        "http://localhost:5173", 
        "https://shop-frontend-six-pi.vercel.app",
        /\.vercel\.app$/ 
    ],
    credentials: true 
})); 

app.use(express.json());
app.use(cookieParser());

// Static Uploads Setup
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}
app.use('/uploads', express.static(uploadsPath));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// ============================================================
// --- API ROUTES ---
// ============================================================

// ✅ AUTH ROUTES (Ab ye clean ho gaya, saara logic authRoute.js se aayega)
app.use('/api/auth', authRoutes);

// ✅ OTHER ROUTES
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/payment', paymentRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/customers', require('./routes/customerRoutes')); // Customers wala bhi add kar diya

app.get("/", (req, res) => {
    res.send("ShopLane API & Real-time Sockets are working! 🚀")
});

// ============================================================
// --- SERVER INITIALIZATION ---
// ============================================================

const PORT = process.env.PORT || 8080; 

// "0.0.0.0" for Railway/External access
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Live on Port: ${PORT} 🔥`);
    console.log(`🔗 Auth Endpoints: http://localhost:${PORT}/api/auth`);
});
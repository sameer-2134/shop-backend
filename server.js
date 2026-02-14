require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const cookieParser = require('cookie-parser');
const http = require('http');
const socketInstance = require('./socket');

const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes'); 
const { register, forgotPassword, resetPassword, login, updateProfile, logout } = require("./controllers/authcontroller");

const app = express(); 
const server = http.createServer(app);

socketInstance.init(server);


app.use(cors({
    origin: ["http://localhost:5173", "https://your-frontend-link.vercel.app"], // Apne frontend ka Vercel link yahan daal dena
    credentials: true 
})); 

app.use(express.json());
app.use(cookieParser());

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}

app.use('/uploads', express.static(uploadsPath));

// ✅ DATABASE CONNECTION: Ye bilkul sahi hai
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.post("/api/auth/forgot-password", forgotPassword);
app.post("/api/auth/reset-password", resetPassword);
app.put("/api/users/update-profile", updateProfile); 

app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/products', productRoutes); 
app.use('/api/payment', paymentRoutes); 
app.use('/api/admin', adminRoutes);

app.get("/", (req, res) => {
    res.send("ShopLane API & Real-time Sockets are working! 🚀")
});

const PORT = process.env.PORT || 8080; 
server.listen(PORT, () => {
    console.log(`🚀 Server Live on Port: ${PORT} 🔥`);
});
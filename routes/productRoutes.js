const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../controllers/cloudinaryConfig'); 
const Product = require('../models/Product'); 
const productController = require('../controllers/productController');

// Controller Check
console.log("Checking Controllers:", {
    add: !!productController.addProduct,
    bulk: !!productController.bulkAddProducts,
    all: !!productController.getAllProducts
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } 
});

// --- FIXED: GET ALL OR FILTER BY CATEGORY/SUBCATEGORY ---
router.get("/", async (req, res) => {
    try {
        const { category, subCategory } = req.query;
        let filter = {};
        
        if (subCategory) {
            filter.subCategory = { $regex: new RegExp(subCategory, "i") };
        } 
        else if (category) {
            filter.category = { $regex: new RegExp(category, "i") };
        }

        const products = await Product.find(filter);
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching products", error: error.message });
    }
});

// --- SINGLE ADD ---
router.post("/add", upload.array('images', 4), productController.addProduct);

// --- BULK ADD ---
router.post('/bulk-add', productController.bulkAddProducts);

// --- GET ALL (Legacy Support) ---
router.get("/all", productController.getAllProducts);

// --- GET SINGLE PRODUCT (MERGED & FIXED) ---
// Yahan humne dono logic ko merge kar diya hai taaki conflict na ho
router.get('/:id', async (req, res) => {
    try {
        // Pehle check karte hain agar controller mein function hai toh wo use karein
        if (productController.getProductById) {
            return productController.getProductById(req, res);
        }
        
        // Agar controller function nahi mila, toh ye fallback logic chalega
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: "Invalid ID format or Error fetching product" });
    }
});

// --- UPDATE ---
router.patch('/update/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true, runValidators: true }
        );
        if (!updatedProduct) return res.status(404).json({ success: false, message: "Product not found" });
        res.json({ success: true, product: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: "Update failed", error: error.message });
    }
});

// --- DELETE ---
router.delete('/delete/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product already deleted or not found" });
        res.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
});

module.exports = router;
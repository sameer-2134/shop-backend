const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../controllers/cloudinaryConfig'); 
const Product = require('../models/Product'); 
const productController = require('../controllers/productController');

// Multer Config
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } 
});

// --- GET ROUTES ---

// 1. Fetch with Filters (Category/SubCategory)
router.get("/", async (req, res) => {
    try {
        const { category, subCategory } = req.query;
        let filter = {};
        
        if (subCategory) {
            filter.subCategory = { $regex: new RegExp(subCategory, "i") };
        } else if (category) {
            filter.category = { $regex: new RegExp(category, "i") };
        }

        const products = await Product.find(filter);
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching products", error: error.message });
    }
});

// 2. Get All Products (With Cursor Pagination)
router.get("/all", productController.getAllProducts);

// 3. Get Single Product by ID
router.get('/:id', async (req, res) => {
    try {
        if (productController.getProductById) {
            return productController.getProductById(req, res);
        }
        
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: "Invalid ID format" });
    }
});


// --- POST ROUTES ---

// 4. Add Single Product (with Image Upload)
router.post("/add", upload.array('images', 4), productController.addProduct);

// 5. BULK ADD PRODUCTS (For Cloudinary URLs)
// Iska use tu Postman se array bhejte waqt karega
router.post('/bulk-add', productController.bulkAddProducts);


// --- UPDATE & DELETE ROUTES ---

// 6. Update Product
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

// 7. Delete Product
router.delete('/delete/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { addAddress, getAddresses, deleteAddress } = require('../controllers/customerController');

const { protect } = require('../middleware/authMiddleware');

router.post('/address', protect, addAddress);
router.get('/addresses', protect, getAddresses);
router.delete('/address/:id', protect, deleteAddress);

module.exports = router;
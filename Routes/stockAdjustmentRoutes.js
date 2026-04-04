const express = require('express');
const router = express.Router();
const StockAdjustment = require('../Models/StockAdjustment');

// List all adjustments (for audit trail page)
router.get('/', async (req, res, next) => {
    try {
        const { search, productId } = req.query;
        const filter = {};
        if (search) filter.productName = { $regex: search, $options: 'i' };
        if (productId) filter.productId = productId;

        const logs = await StockAdjustment.find(filter).sort({ timestamp: -1 }).limit(100);
        res.json({ data: logs });
    } catch (err) {
        next(err);
    }
});

// Delete a specific log entry (if needed)
router.delete('/:id', async (req, res, next) => {
    try {
        await StockAdjustment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Audit entry removed' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

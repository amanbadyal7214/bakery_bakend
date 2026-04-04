const mongoose = require('mongoose');

const StockAdjustmentSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    variantWeight: {
        type: String, // If adjustment is for a specific variant
        default: 'Base'
    },
    oldStock: {
        type: Number,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    difference: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    adjustedBy: {
        type: String, // You could link this to an Admin user if auth is fully implemented
        default: 'Admin'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('StockAdjustment', StockAdjustmentSchema);

// models/Invoice.js

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
        unique: true
    },
    invoice_date: {
        type: Date
    },
    total_amount: {
        type: Number,
        required: true
    },
    subtotal_amount: {
        type: Number,
        default: 0
    },
     delivery_fee: {
        type: Number,
        default: 0
    },
    order_reference: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: 'לא ידוע'
    },
    item_row_count: {
        type: Number,
        default: 0
    },
    source_path: {
        type: String,
        required: [true, 'נתיב הקובץ הוא שדה חובה']
    },
    processed_at: {
        type: Date,
        default: Date.now 
    },
    confirmed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
// server/models/syncedInvoice.model.js

const mongoose = require('mongoose');

const syncedInvoiceSchema = new mongoose.Schema({
    so_no: { type: String, required: true },
    drop_id: { type: String, required: true },
    customer_city: { type: String },
    wave_no: { type: String },
    end_cargo: { type: String },
    package_status: { type: String },
    create_at: { type: Date },
    delivery_start_time: { type: String }
}, {
    timestamps: true 
});

syncedInvoiceSchema.index({ so_no: 1, drop_id: 1 }, { unique: true });

const SyncedInvoice = mongoose.model('SyncedInvoice', syncedInvoiceSchema);

module.exports = SyncedInvoice;
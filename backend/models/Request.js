const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  item: { type: [String], required: true },
  date: String,
  time: String,
  location: String,
  customer: String,
  email: String,
  notes: String,
  status: { type: String, default: 'Bekliyor' },
  // Onay Takibi ve Çakışma Yönetimi
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  conflictIgnored: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);

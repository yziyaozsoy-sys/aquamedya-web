const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  item: { type: String, required: true },
  date: String,
  time: String,
  location: String,
  customer: String,
  notes: String,
  status: { type: String, default: 'Bekliyor' }
});

module.exports = mongoose.model('Request', requestSchema);

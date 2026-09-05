const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  specs: { type: [String], default: [] },
  price: { type: String, required: true },
  stock: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  photo: { type: String, default: null },
  videoUrl: { type: String, default: '' }
});

module.exports = mongoose.model('Equipment', equipmentSchema);

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Gecerli bir e-posta adresi giriniz']
  },
  password: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Member', memberSchema);
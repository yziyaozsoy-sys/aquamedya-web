const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  password: { type: String, required: true }
});

memberSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (this.password.startsWith('$2')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

memberSchema.methods.comparePassword = async function (candidate) {
  if (this.password.startsWith('$2')) {
    return bcrypt.compare(candidate, this.password);
  }
  if (this.password === candidate) {
    this.password = candidate;
    this.markModified('password');
    await this.save();
    return true;
  }
  return false;
};

module.exports = mongoose.model('Member', memberSchema);

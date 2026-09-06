const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// server.js'deki defaultPermissions ile birebir aynı alanlar
const permissionsSchema = new mongoose.Schema({
  equipmentView:   { type: Boolean, default: true },
  equipmentAdd:    { type: Boolean, default: false },
  equipmentEdit:   { type: Boolean, default: false },
  equipmentDelete: { type: Boolean, default: false },
  requestsView:    { type: Boolean, default: false },
  requestsManage:  { type: Boolean, default: false }
}, { _id: false });

const staffSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  displayName: { type: String, default: '' },
  role:        { type: String, default: 'personel' },
  permissions: { type: permissionsSchema, default: () => ({}) }
});

// Kaydetmeden önce şifre değişmişse otomatik hashle
staffSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (this.password.startsWith('$2')) return; // zaten hashli
  this.password = await bcrypt.hash(this.password, 10);
});

// Şifre doğrulama (eski düz metin şifreleri ilk girişte hashler)
staffSchema.methods.comparePassword = async function (candidate) {
  if (this.password.startsWith('$2')) {
    return bcrypt.compare(candidate, this.password);
  }
  if (this.password === candidate) {
    this.markModified('password');
    await this.save();
    return true;
  }
  return false;
};

module.exports = mongoose.model('Staff', staffSchema);

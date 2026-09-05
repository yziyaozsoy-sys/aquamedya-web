const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'personel'], required: true },
  displayName: { type: String, required: true },
  permissions: {
    equipmentView: { type: Boolean, default: true },
    equipmentAdd: { type: Boolean, default: false },
    equipmentEdit: { type: Boolean, default: false },
    equipmentDelete: { type: Boolean, default: false },
    requestsView: { type: Boolean, default: false },
    requestsManage: { type: Boolean, default: false }
  }
});

module.exports = mongoose.model('Staff', staffSchema);

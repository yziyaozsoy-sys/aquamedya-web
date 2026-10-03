require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const staffSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'superadmin' },
  displayName: { type: String, default: 'Yusuf Sarser (Süper Admin)' },
  permissions: { type: Object, default: {} }
});

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

async function setSuperAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB bağlantısı kuruldu.");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin", salt); // Mevcut giriş şifren admin

    const user = await Staff.findOneAndUpdate(
      { username: "admin" },
      { 
        username: "admin",
        password: hashedPassword,
        role: "superadmin", // <--- KESİN SÜPER ADMİN
        displayName: "Yusuf Sarser (Süper Admin)",
        permissions: {
          equipmentView: true,
          equipmentAdd: true,
          equipmentEdit: true,
          equipmentDelete: true,
          requestsView: true,
          requestsManage: true,
          viewFinances: true,
          staffManage: true
        }
      },
      { upsert: true, new: true }
    );

    console.log("==================================================");
    console.log("👑 TEBRİKLER! HESABIN 'superadmin' OLARAK GÜNCELLENDİ!");
    console.log(`👤 Kullanıcı Adı : ${user.username}`);
    console.log(`🎖️ Rol           : ${user.role}`);
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("Hata:", err.message);
    process.exit(1);
  }
}

setSuperAdmin();

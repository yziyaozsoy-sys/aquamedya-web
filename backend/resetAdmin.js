require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Bağlantısı (env dosyasındaki adrese bağlanır)
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Staff Modeli Şeması
const staffSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  displayName: { type: String, default: 'Yönetici' },
  permissions: { type: Object, default: {} }
});

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

async function reset() {
  try {
    if (!MONGO_URI) {
      console.error("HATA: MONGO_URI .env dosyasında bulunamadı!");
      process.exit(1);
    }

    console.log("MongoDB'ye bağlanılıyor...");
    await mongoose.connect(MONGO_URI);
    console.log("Bağlantı başarılı!");

    const newPassword = "admin"; // <--- İSTEDİĞİN ŞİFREYİ BURAYA YAZ (Örn: admin)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Admin kullanıcısını güncelle veya yoksa oluştur
    const result = await Staff.findOneAndUpdate(
      { username: 'admin' },
      { 
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        displayName: 'Yusuf Sarser'
      },
      { upsert: true, new: true }
    );

    console.log("-----------------------------------------");
    console.log("✅ ADMİN ŞİFRESİ BAŞARIYLA SIFIRLANDI!");
    console.log("Kullanıcı Adı: admin");
    console.log("Yeni Şifre    : " + newPassword);
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (err) {
    console.error("HATA:", err.message);
    process.exit(1);
  }
}

reset();

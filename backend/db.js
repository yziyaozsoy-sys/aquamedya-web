const mongoose = require('mongoose');
const Equipment = require('./models/Equipment');
const Staff = require('./models/Staff');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');
    await seedDatabase();
  } catch (err) {
    console.error('❌ MongoDB bağlantı hatası:', err.message);
    process.exit(1);
  }
}

// İlk kurulumda varsayılan admin/personel ve örnek ekipman oluşturur
async function seedDatabase() {
  const staffCount = await Staff.countDocuments();
  if (staffCount === 0) {
    await Staff.create([
      {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        displayName: 'Yönetici',
        permissions: {
          equipmentView: true, equipmentAdd: true, equipmentEdit: true,
          equipmentDelete: true, requestsView: true, requestsManage: true
        }
      },
      {
        username: 'personel',
        password: 'personel123',
        role: 'personel',
        displayName: 'Personel',
        permissions: {
          equipmentView: true, equipmentAdd: false, equipmentEdit: true,
          equipmentDelete: false, requestsView: true, requestsManage: true
        }
      }
    ]);
    console.log('🌱 Varsayılan kullanıcılar (admin/personel) oluşturuldu');
  }

  const equipCount = await Equipment.countDocuments();
  if (equipCount === 0) {
    await Equipment.create([
      {
        name: 'RED Komodo 6K Kamera', category: 'Kamera',
        specs: ['6K Süper 35 Sensör', 'Global Shutter', '20 fps RAW kayıt'],
        price: '3.500 ₺/gün', stock: 4, rating: 4.9, photo: null, videoUrl: ''
      },
      {
        name: 'Aputure LS 600 Işık', category: 'Işık',
        specs: ['600W LED', 'Bowens Mount', 'DMX kontrol'],
        price: '900 ₺/gün', stock: 10, rating: 4.6, photo: null, videoUrl: ''
      }
    ]);
    console.log('🌱 Örnek ekipmanlar oluşturuldu');
  }
}

module.exports = connectDB;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'gizli_anahtar';

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

const defaultPermissions = {
  equipmentView: true,
  equipmentAdd: false,
  equipmentEdit: false,
  equipmentDelete: false,
  requestsView: false,
  requestsManage: false
};

db.defaults({
  equipment: [
    { id: 1, name: 'RED Komodo 6K Kamera', category: 'Kamera', specs: ['6K Süper 35 Sensör', 'Global Shutter', '20 fps RAW kayıt'], price: '3.500 ₺/gün', stock: 4, rating: 4.9, photo: null, videoUrl: '' },
    { id: 2, name: 'Aputure LS 600 Işık', category: 'Işık', specs: ['600W LED', 'Bowens Mount', 'DMX kontrol'], price: '900 ₺/gün', stock: 10, rating: 4.6, photo: null, videoUrl: '' }
  ],
  requests: [],
  staff: [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', displayName: 'Yönetici', permissions: null },
    { id: 2, username: 'personel', password: 'personel123', role: 'personel', displayName: 'Personel', permissions: { equipmentView: true, equipmentAdd: false, equipmentEdit: true, equipmentDelete: false, requestsView: true, requestsManage: true } }
  ]
}).write();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// --- Auth Middleware ---
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

// --- Sadece Admin ---
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli' });
  }
  next();
}

// --- Belirli izin kontrolü (admin her zaman geçer) ---
function requirePermission(permKey) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const staff = db.get('staff').find({ id: req.user.id }).value();
    if (staff?.permissions?.[permKey]) return next();
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  };
}

// --- ROUTES ---

// Giriş (admin + personel ortak)
app.post('/api/staff/login', (req, res) => {
  const { username, password } = req.body;
  const staff = db.get('staff').find({ username, password }).value();
  if (!staff) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });

  const permissions = staff.role === 'admin'
    ? { equipmentView: true, equipmentAdd: true, equipmentEdit: true, equipmentDelete: true, requestsView: true, requestsManage: true }
    : staff.permissions;

  const token = jwt.sign(
    { id: staff.id, username: staff.username, role: staff.role, displayName: staff.displayName },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  return res.json({ token, role: staff.role, displayName: staff.displayName, permissions });
});

app.get('/api/staff/me', authMiddleware, (req, res) => {
  const staff = db.get('staff').find({ id: req.user.id }).value();
  const permissions = req.user.role === 'admin'
    ? { equipmentView: true, equipmentAdd: true, equipmentEdit: true, equipmentDelete: true, requestsView: true, requestsManage: true }
    : staff?.permissions;
  res.json({ ...req.user, permissions });
});

// Ekipman listesi (herkes görebilir - public katalog)
app.get('/api/equipment', (req, res) => {
  res.json(db.get('equipment').value());
});

// Ekipman ekle
app.post('/api/equipment', authMiddleware, requirePermission('equipmentAdd'), upload.single('photo'), (req, res) => {
  const { name, category, price, stock, specs, videoUrl } = req.body;
  const equipment = db.get('equipment').value();
  const newId = equipment.length ? Math.max(...equipment.map(e => e.id)) + 1 : 1;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const newItem = {
    id: newId, name, category, price,
    stock: parseInt(stock) || 0,
    specs: specs ? JSON.parse(specs) : [],
    rating: 4.5, photo: photoUrl, videoUrl: videoUrl || ''
  };
  db.get('equipment').push(newItem).write();
  res.json(newItem);
});

// Ekipman güncelle
app.put('/api/equipment/:id', authMiddleware, requirePermission('equipmentEdit'), upload.single('photo'), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, category, price, stock, specs, videoUrl } = req.body;
  const item = db.get('equipment').find({ id }).value();
  if (!item) return res.status(404).json({ error: 'Bulunamadı' });

  const photoUrl = req.file ? `/uploads/${req.file.filename}` : item.photo;
  db.get('equipment').find({ id }).assign({
    name, category, price,
    stock: parseInt(stock) || 0,
    specs: specs ? JSON.parse(specs) : item.specs,
    photo: photoUrl, videoUrl: videoUrl || item.videoUrl
  }).write();

  res.json(db.get('equipment').find({ id }).value());
});

// Ekipman sil
app.delete('/api/equipment/:id', authMiddleware, requirePermission('equipmentDelete'), (req, res) => {
  const id = parseInt(req.params.id);
  db.get('equipment').remove({ id }).write();
  res.json({ success: true });
});

// Kiralama talebi oluştur (herkes - müşteri tarafı)
app.post('/api/requests', (req, res) => {
  const { item, date, time, location, customer, notes } = req.body;
  const requests = db.get('requests').value();
  const newId = requests.length ? Math.max(...requests.map(r => r.id)) + 1 : 1;
  const newRequest = { id: newId, item, date, time, location, customer, notes, status: 'Bekliyor' };
  db.get('requests').push(newRequest).write();
  res.json(newRequest);
});

// Talepleri listele
app.get('/api/requests', authMiddleware, requirePermission('requestsView'), (req, res) => {
  res.json(db.get('requests').value());
});

// Talep durumu güncelle (onay/red)
app.put('/api/requests/:id', authMiddleware, requirePermission('requestsManage'), (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  db.get('requests').find({ id }).assign({ status }).write();
  res.json(db.get('requests').find({ id }).value());
});

// --- PERSONEL YÖNETİMİ (sadece admin) ---

// Personel listesi
app.get('/api/staff', authMiddleware, adminOnly, (req, res) => {
  const list = db.get('staff').value().map(s => ({
    id: s.id, username: s.username, role: s.role, displayName: s.displayName, permissions: s.permissions
  }));
  res.json(list);
});

// Yeni personel ekle
app.post('/api/staff', authMiddleware, adminOnly, (req, res) => {
  const { username, password, displayName, permissions } = req.body;
  const staffList = db.get('staff').value();
  if (staffList.find(s => s.username === username)) {
    return res.status(400).json({ error: 'Bu kullanıcı adı zaten var' });
  }
  const newId = staffList.length ? Math.max(...staffList.map(s => s.id)) + 1 : 1;
  const newStaff = {
    id: newId, username, password, role: 'personel',
    displayName: displayName || username,
    permissions: { ...defaultPermissions, ...(permissions || {}) }
  };
  db.get('staff').push(newStaff).write();
  res.json({ ...newStaff, password: undefined });
});

// Personel bilgi/yetki güncelle
app.put('/api/staff/:id', authMiddleware, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  const { displayName, password, permissions } = req.body;
  const staff = db.get('staff').find({ id }).value();
  if (!staff) return res.status(404).json({ error: 'Personel bulunamadı' });
  if (staff.role === 'admin') return res.status(400).json({ error: 'Admin yetkileri değiştirilemez' });

  const updates = {};
  if (displayName) updates.displayName = displayName;
  if (password) updates.password = password;
  if (permissions) updates.permissions = { ...staff.permissions, ...permissions };

  db.get('staff').find({ id }).assign(updates).write();
  const updated = db.get('staff').find({ id }).value();
  res.json({ ...updated, password: undefined });
});

// Personel sil
app.delete('/api/staff/:id', authMiddleware, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  const staff = db.get('staff').find({ id }).value();
  if (staff?.role === 'admin') return res.status(400).json({ error: 'Admin silinemez' });
  db.get('staff').remove({ id }).write();
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.send('Aqua Medya Backend API çalışıyor.');
});

app.listen(PORT, () => {
  console.log(`✅ Aqua Medya Backend http://localhost:${PORT} üzerinde çalışıyor`);
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Member = require('./models/Members');

const connectDB = require('./db');
const Equipment = require('./models/Equipment');
const Request = require('./models/Request');
const Staff = require('./models/Staff');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'gizli_anahtar';

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const defaultPermissions = {
  equipmentView: true, equipmentAdd: false, equipmentEdit: false,
  equipmentDelete: false, requestsView: false, requestsManage: false
};

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
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli' });
  }
  next();
}

function requirePermission(permKey) {
  return async (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const staff = await Staff.findById(req.user.id);
    if (staff?.permissions?.[permKey]) return next();
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  };
}

// --- ROUTES ---

app.post('/api/staff/login', async (req, res) => {
  const { username, password } = req.body;
  try {
        const staff = await Staff.findOne({ username });
    if (!staff) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    const ok = await staff.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    const permissions = staff.role === 'admin'
      ? { equipmentView: true, equipmentAdd: true, equipmentEdit: true, equipmentDelete: true, requestsView: true, requestsManage: true }
      : staff.permissions;

    const token = jwt.sign(
      { id: staff._id, username: staff.username, role: staff.role, displayName: staff.displayName },
      JWT_SECRET, { expiresIn: '8h' }
    );
    res.json({ token, role: staff.role, displayName: staff.displayName, permissions });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.get('/api/staff/me', authMiddleware, async (req, res) => {
  const staff = await Staff.findById(req.user.id);
  const permissions = req.user.role === 'admin'
    ? { equipmentView: true, equipmentAdd: true, equipmentEdit: true, equipmentDelete: true, requestsView: true, requestsManage: true }
    : staff?.permissions;
  res.json({ ...req.user, permissions });
});

app.get('/api/equipment', async (req, res) => {
  const list = await Equipment.find();
  res.json(list);
});

app.post('/api/equipment', authMiddleware, requirePermission('equipmentAdd'), upload.single('photo'), async (req, res) => {
  const { name, category, price, stock, specs, videoUrl } = req.body;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const newItem = await Equipment.create({
    name, category, price,
    stock: parseInt(stock) || 0,
    specs: specs ? JSON.parse(specs) : [],
    rating: 4.5, photo: photoUrl, videoUrl: videoUrl || ''
  });
  res.json(newItem);
});

app.put('/api/equipment/:id', authMiddleware, requirePermission('equipmentEdit'), upload.single('photo'), async (req, res) => {
  const { name, category, price, stock, specs, videoUrl } = req.body;
  const item = await Equipment.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Bulunamadı' });

  const photoUrl = req.file ? `/uploads/${req.file.filename}` : item.photo;
  item.name = name; item.category = category; item.price = price;
  item.stock = parseInt(stock) || 0;
  item.specs = specs ? JSON.parse(specs) : item.specs;
  item.photo = photoUrl;
  item.videoUrl = videoUrl || item.videoUrl;
  await item.save();

  res.json(item);
});

app.delete('/api/equipment/:id', authMiddleware, requirePermission('equipmentDelete'), async (req, res) => {
  await Equipment.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.post('/api/requests', memberAuthMiddleware, async (req, res) => {
  const { item, date, time, location, notes } = req.body;
  const newRequest = await Request.create({
    item, date, time, location, notes,
    customer: `${req.member.name} (${req.member.phone})`,
    email: req.member.email,
    status: 'Bekliyor'
  });
  res.json(newRequest);
});
app.get('/api/requests/mine', memberAuthMiddleware, async (req, res) => {
  try {
    const myRequests = await Request.find({ email: req.member.email }).sort({ _id: -1 });
    res.json(myRequests);
  } catch (err) {
    res.status(500).json({ error: 'Talepler alınamadı' });
  }
});
function memberAuthMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Talep göndermek için üye girişi yapmalısınız' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'member') return res.status(403).json({ error: 'Geçersiz erişim' });
    req.member = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Oturum süresi dolmuş, lütfen tekrar giriş yapın' });
  }
}
// --- ÜYELİK ROUTE'LARI ---
app.post('/api/member/register', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'Ad, telefon, e-posta ve şifre alanları zorunludur' });
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz' });
  }

  try {
    const exists = await Member.findOne({ $or: [{ phone }, { email: email.toLowerCase() }] });
    if (exists) return res.status(400).json({ error: 'Bu telefon numarası veya e-posta zaten kayıtlı' });

    const newMember = await Member.create({ name, phone, email: email.toLowerCase(), password });
    const token = jwt.sign(
      { id: newMember._id, phone: newMember.phone, name: newMember.name, email: newMember.email, type: 'member' },
      JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({ token, name: newMember.name, phone: newMember.phone, email: newMember.email });
  } catch (err) {
    res.status(500).json({ error: 'Kayıt işlemi başarısız oldu' });
  }
});

app.post('/api/member/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
       const member = await Member.findOne({ phone });
    if (!member) return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı' });
    const ok = await member.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı' });
    const token = jwt.sign(
      { id: member._id, phone: member.phone, name: member.name, email: member.email, type: 'member' },
      JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({ token, name: member.name, phone: member.phone, email: member.email });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.get('/api/requests', authMiddleware, requirePermission('requestsView'), async (req, res) => {
  const list = await Request.find();
  res.json(list);
});

app.put('/api/requests/:id', authMiddleware, requirePermission('requestsManage'), async (req, res) => {
  const { status } = req.body;
  const updated = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(updated);
});

// --- PERSONEL YÖNETİMİ (sadece admin) ---

app.get('/api/staff', authMiddleware, adminOnly, async (req, res) => {
  const list = await Staff.find().select('-password');
  res.json(list);
});

app.post('/api/staff', authMiddleware, adminOnly, async (req, res) => {
  const { username, password, displayName, permissions } = req.body;
  const exists = await Staff.findOne({ username });
  if (exists) return res.status(400).json({ error: 'Bu kullanıcı adı zaten var' });

  const newStaff = await Staff.create({
    username, password, role: 'personel',
    displayName: displayName || username,
    permissions: { ...defaultPermissions, ...(permissions || {}) }
  });
  const result = newStaff.toObject();
  delete result.password;
  res.json(result);
});

app.put('/api/staff/:id', authMiddleware, adminOnly, async (req, res) => {
  const { displayName, password, permissions } = req.body;
  const staff = await Staff.findById(req.params.id);
  if (!staff) return res.status(404).json({ error: 'Personel bulunamadı' });
  if (staff.role === 'admin') return res.status(400).json({ error: 'Admin yetkileri değiştirilemez' });

  if (displayName) staff.displayName = displayName;
  if (password) staff.password = password;
  if (permissions) staff.permissions = { ...staff.permissions.toObject(), ...permissions };
  await staff.save();

  const result = staff.toObject();
  delete result.password;
  res.json(result);
});

app.delete('/api/staff/:id', authMiddleware, adminOnly, async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (staff?.role === 'admin') return res.status(400).json({ error: 'Admin silinemez' });
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.send('Aqua Medya Backend API çalışıyor.');
});

// --- Sunucuyu MongoDB'ye bağlandıktan sonra başlat ---
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Aqua Medya Backend http://localhost:${PORT} üzerinde çalışıyor`);
  });
});

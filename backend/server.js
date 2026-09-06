require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const Member = require('./models/Members');
const connectDB = require('./db');
const Equipment = require('./models/Equipment');
const Request = require('./models/Request');
const Staff = require('./models/Staff');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'gizli_anahtar';

// --- ŞİRKET BİLGİLERİ (SABİT) ---
const COMPANY_INFO = {
  name: 'AQUA MEDYA TİCARET LİMİTED ŞİRKETİ',
  address: 'Merkez Mahallesi Seçkin Sokak Z Ofis A Blok No:2-4/90 Kağıthane / İSTANBUL',
  email: 'info@aquamedya.com.tr',
  phone: '0 212 325 25 25',
  mobile: '0 532 011 01 01'
};

// --- GÜVENLİ NODEMAILER YAPILANDIRMASI ---
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendApprovalEmail(requestData, approverName) {
  if (!requestData.email) return;

  const itemsHtml = Array.isArray(requestData.item)
    ? requestData.item.map(i => `<li><b>${i}</b></li>`).join('')
    : `<li><b>${requestData.item}</b></li>`;

  const deliveryText = requestData.location === 'MERKEZDEN_TESLIM'
    ? '<b>Merkezden Kendim Alacağım</b> (Ofis Adresimizden teslim alabilirsiniz)'
    : (requestData.location || 'Belirtilmedi');

  // Mail sunucusu yoksa güvenli modda log yazıp geç
  if (!transporter) {
    console.log('--------------------------------------------------');
    console.log(`[BİLGİ] (Güvenli Mod) Mail sunucusu henüz tanımlı değil.`);
    console.log(`[SİMÜLASYON] Müşteriye (${requestData.email}) onay bildirimi hazırlandı:`);
    console.log(`Onaylayan Yetkili: ${approverName}`);
    console.log(`Ekipmanlar: ${Array.isArray(requestData.item) ? requestData.item.join(', ') : requestData.item}`);
    console.log(`Teslimat Yeri: ${deliveryText}`);
    console.log('--------------------------------------------------');
    return;
  }

  const mailOptions = {
    from: `"${COMPANY_INFO.name}" <${process.env.EMAIL_USER}>`,
    to: requestData.email,
    subject: `Kiralama Talebiniz Onaylandı - Rezervasyon #${requestData._id.toString().slice(-6).toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">AQUA MEDYA</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Ekipman Kiralama & Prodüksiyon</p>
        </div>
        <div style="padding: 30px;">
          <h3 style="color: #10b981; margin-top: 0;">Sayın ${requestData.customer},</h3>
          <p>Kiralama talebiniz incelenmiş ve yetkilimiz tarafından <b>onaylanmıştır</b>.</p>
          
          <div style="background: #f8fafc; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><b>Rezervasyon Detayları:</b></p>
            <ul style="margin: 0; padding-left: 20px;">
              ${itemsHtml}
            </ul>
            <p style="margin: 10px 0 0 0;"><b>Tarih / Saat:</b> ${requestData.date || '-'} / ${requestData.time || '-'}</p>
            <p style="margin: 5px 0 0 0;"><b>Teslimat Şekli:</b> ${deliveryText}</p>
            <p style="margin: 5px 0 0 0;"><b>Talebi Onaylayan Yetkili:</b> ${approverName}</p>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Ekipmanların teslim alınması esnasında geçerli bir kimlik belgesi ibraz edilmesi gerekmektedir. İhtiyaç halinde aşağıdaki iletişim kanallarımızdan bize ulaşabilirsiniz.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />

          <div style="font-size: 13px; color: #475569;">
            <p style="margin: 3px 0;"><b>${COMPANY_INFO.name}</b></p>
            <p style="margin: 3px 0;">📍 <b>Adres:</b> ${COMPANY_INFO.address}</p>
            <p style="margin: 3px 0;">📞 <b>Telefon:</b> ${COMPANY_INFO.phone} | 📱 <b>Cep:</b> ${COMPANY_INFO.mobile}</p>
            <p style="margin: 3px 0;">✉️ <b>E-Posta:</b> ${COMPANY_INFO.email}</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[BAŞARILI] Onay maili ${requestData.email} adresine iletildi.`);
  } catch (err) {
    console.error('[HATA] Mail gönderilemedi:', err.message);
  }
}

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

// --- TALEP ROUTES ---
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

app.get('/api/requests', authMiddleware, requirePermission('requestsView'), async (req, res) => {
  const list = await Request.find().sort({ _id: -1 });
  res.json(list);
});

// --- TALEP DURUMU GÜNCELLEME (ÇAKIŞMA VE 2 KADEMELİ ONAY) ---
app.put('/api/requests/:id', authMiddleware, requirePermission('requestsManage'), async (req, res) => {
  const { status, force } = req.body;
  const requestId = req.params.id;

  try {
    const currentReq = await Request.findById(requestId);
    if (!currentReq) return res.status(404).json({ error: 'Talep bulunamadı' });

    // Sadece 'Onaylandı' yapılırken çakışma kontrolü
    if (status === 'Onaylandı') {
      const itemsToCheck = Array.isArray(currentReq.item) ? currentReq.item : [currentReq.item];

      // Aynı tarih ve saatte onaylanmış başka talep var mı?
      const conflictingRequest = await Request.findOne({
        _id: { $ne: requestId },
        status: 'Onaylandı',
        date: currentReq.date,
        time: currentReq.time,
        item: { $in: itemsToCheck }
      });

      // Çakışma var ve personel henüz zorlamadıysa uyar
      if (conflictingRequest && !force) {
        const conflictingItems = conflictingRequest.item.filter(it => itemsToCheck.includes(it));
        return res.status(409).json({
          conflict: true,
          message: 'Aynı tarih ve saatte bu ekipman için zaten onaylı bir rezervasyon var!',
          conflictingCustomer: conflictingRequest.customer,
          conflictingItems,
          date: currentReq.date,
          time: currentReq.time
        });
      }
    }

    const approverName = req.user.displayName || req.user.username || 'Yetkili';
    currentReq.status = status;

    if (status === 'Onaylandı') {
      currentReq.approvedBy = approverName;
      currentReq.approvedAt = new Date();
      if (force) currentReq.conflictIgnored = true;
    }

    await currentReq.save();

    // Onaylandıysa e-posta gönderimini tetikle (asenkron)
    if (status === 'Onaylandı') {
      sendApprovalEmail(currentReq, approverName);
    }

    res.json(currentReq);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Talep güncellenirken bir hata oluştu' });
  }
});

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

// --- PERSONEL YÖNETİMİ ---
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

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Aqua Medya Backend http://localhost:${PORT} üzerinde çalışıyor`);
  });
});
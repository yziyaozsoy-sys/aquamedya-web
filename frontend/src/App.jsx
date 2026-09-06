import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Camera, Calendar, MapPin, Clock, User, Package, Bell, CheckCircle, 
  Phone, Mail, Building2, Video, Mic, Lightbulb, Move3d, ScreenShare, Star, 
  Upload, Trash2, Edit2, Plus, X, Shield, Users, LogOut, AlertTriangle, 
  FileText, AlertCircle, Check
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const COMPANY_DETAILS = {
  name: 'AQUA MEDYA TİCARET LİMİTED ŞİRKETİ',
  address: 'Merkez Mahallesi Seçkin Sokak Z Ofis A Blok No:2-4/90 Kağıthane / İSTANBUL',
  phone: '0 212 325 25 25',
  mobile: '0 532 011 01 01',
  email: 'info@aquamedya.com.tr'
};

const categoryIcons = {
  'Kamera': Camera, 'Isik': Lightbulb, 'Ses': Mic, 'Stabilizasyon': Move3d,
  'Hava Cekimi': Video, 'Studyo': ScreenShare, 'Diger': Package
};

const permissionLabels = {
  equipmentAdd: 'Ekipman Ekleme',
  equipmentEdit: 'Ekipman Duzenleme',
  equipmentDelete: 'Ekipman Silme',
  requestsView: 'Talep Goruntuleme',
  requestsManage: 'Talep Onaylama/Reddetme',
  viewFinances: 'Finansal Raporları ve Fiyat Toplamlarını Görme' //
};

const emptyPermissions = { 
  equipmentView: true, equipmentAdd: false, equipmentEdit: false, 
  equipmentDelete: false, requestsView: false, requestsManage: false 
};

function App() {
  const [activeTab, setActiveTab] = useState('home');
  // Video Modal State'i ve YouTube Embed Dönüştürücü
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  const getEmbedYoutubeUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url;
  };
  // Üye state'leri
  const [memberToken, setMemberToken] = useState(localStorage.getItem('member_token') || '');
  const [memberName, setMemberName] = useState(localStorage.getItem('member_name') || '');
  const [memberPhone, setMemberPhone] = useState(localStorage.getItem('member_phone') || '');
  const [memberMode, setMemberMode] = useState('login');
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [memberError, setMemberError] = useState('');
  const isMemberLoggedIn = !!memberToken;
  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [activeCatalogCategory, setActiveCatalogCategory] = useState('Tümü');

  // Personel state'leri
  const [staffToken, setStaffToken] = useState(localStorage.getItem('staff_token') || '');
  const [staffRole, setStaffRole] = useState(localStorage.getItem('staff_role') || '');
  const [staffDisplayName, setStaffDisplayName] = useState(localStorage.getItem('staff_displayName') || '');
  const [staffPermissions, setStaffPermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('staff_permissions') || 'null'); } catch (e) { return null; }
  });
  const [staffLoginForm, setStaffLoginForm] = useState({ username: '', password: '' });
  const [staffSubTab, setStaffSubTab] = useState('stock');
  const [staffError, setStaffError] = useState('');

  const [requests, setRequests] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  // Talep Dönem Filtresi (all, week, month, year)
  const [requestPeriod, setRequestPeriod] = useState('all');

  // Talebi Silme Fonksiyonu
  const deleteRequest = async (requestId) => {
    if (!window.confirm("Bu kiralama talebini sistemden tamamen silmek istediğinize emin misiniz?")) {
      return;
    }
    try {
      if (staffToken) {
        await fetch(`${API_BASE}/api/requests/${requestId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${staffToken}` }
        });
      }
    } catch (e) {
      console.error(e);
    }
    // Listeden anında kaldır
    setRequests(prev => prev.filter(r => (r._id || r.id) !== requestId));
  };

  // Tarihe Göre Talepleri Filtreleme Mantığı
  const filteredRequests = requests.filter((req) => {
    if (requestPeriod === 'all') return true;
    if (!req.date) return true;
    
    const reqDate = new Date(req.date);
    const now = new Date();
    const diffTime = Math.abs(now - reqDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (requestPeriod === 'week') return diffDays <= 7;
    if (requestPeriod === 'month') return diffDays <= 30;
    if (requestPeriod === 'year') return diffDays <= 365;
    return true;
  });

     // Fiyat metninden temiz sayı çıkaran yardımcı fonksiyon ("2.500 TL" veya "2500 ₺" -> 2500)
  const parseSafePrice = (val) => {
    if (!val && val !== 0) return 0;
    if (typeof val === 'number') return val;
    // Harfleri, para birimlerini ve boşlukları at, sadece rakam, nokta ve virgül bırak
    let clean = String(val).replace(/[^0-9.,]/g, '').trim();
    if (!clean) return 0;
    // Eğer 1.500 gibi binlik ayraç varsa ve virgül yoksa noktayı temizle
    if (clean.includes('.') && !clean.includes(',')) {
      const parts = clean.split('.');
      if (parts[parts.length - 1].length === 3) {
        clean = clean.replace(/\./g, '');
      }
    }
    // Türk Lirası virgüllü ondalığı noktaya çevir
    clean = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  // Seçili Dönem Ciro & KDV Hesaplama Motoru
  const calculateFinancials = () => {
    let subtotal = 0;

    filteredRequests.forEach((req) => {
      // 1. Talep üzerinde doğrudan fiyat varsa öncelikli olarak al
      const directPrice = parseSafePrice(req.totalPrice || req.price || req.amount);
      if (directPrice > 0) {
        subtotal += directPrice;
        return;
      }

      // 2. Talepteki ekipman isimlerini ayıkla (virgüllü veya dizi)
      let itemsList = [];
      if (Array.isArray(req.item)) {
        itemsList = req.item;
      } else if (typeof req.item === 'string') {
        itemsList = req.item.split(',').map(s => s.trim());
      }

      itemsList.forEach((reqItemName) => {
        if (!reqItemName) return;
        const target = reqItemName.trim().toLowerCase();

        // Kataloğumuzdaki ekipmanla eşleştir
        const matched = equipmentCatalog.find((eq) => {
          if (!eq || !eq.name) return false;
          const catalogName = eq.name.trim().toLowerCase();
          // Birebir eşitlik, veya biri diğerini kapsıyor mu?
          return (
            catalogName === target ||
            target.includes(catalogName) ||
            catalogName.includes(target)
          );
        });

        if (matched) {
          subtotal += parseSafePrice(matched.price);
        }
      });
    });

    const kdv = subtotal * 0.20;
    const grandTotal = subtotal + kdv;

    return { subtotal, kdv, grandTotal };
  };

  const { subtotal: reportSubtotal, kdv: reportKdv, grandTotal: reportGrandTotal } = calculateFinancials();
  // Kiralama Formu State'i
  const [deliveryType, setDeliveryType] = useState('MERKEZ');
  const [rentalForm, setRentalForm] = useState({ 
    equipment: [], 
    date: '', 
    time: '', 
    deliveryLocation: '', 
    notes: '' 
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [currency, setCurrency] = useState('₺');
  
  // 2 Kademeli Çakışma Uyarı Modalı State'i
  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    step: 1,
    requestId: null,
    data: null
  });

  const emptyNewEquip = { name: '', category: 'Kamera', specsText: '', price: '', stock: 1, photoFile: null, photoPreview: null, videoUrl: '' };
  const [newEquip, setNewEquip] = useState(emptyNewEquip);
  const [editingId, setEditingId] = useState(null);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('Tümü');
  const [staffList, setStaffList] = useState([]);
  const emptyNewStaff = { username: '', password: '', displayName: '', permissions: Object.assign({}, emptyPermissions) };
  const [newStaff, setNewStaff] = useState(emptyNewStaff);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffFormError, setStaffFormError] = useState('');

  const isStaffLoggedIn = !!staffToken;
  const isAdmin = staffRole === 'admin';

  const authHeader = { headers: { Authorization: 'Bearer ' + staffToken } };
  const memberAuthHeader = { headers: { Authorization: 'Bearer ' + memberToken } };

  const fetchMyRequests = async () => {
    setMyRequestsLoading(true);
    try {
      const res = await axios.get(API_URL + '/api/requests/mine', memberAuthHeader);
      setMyRequests(res.data);
    } catch (err) {
      setMyRequests([]);
    } finally {
      setMyRequestsLoading(false);
    }
  };

  const can = (permKey) => isAdmin || !!(staffPermissions && staffPermissions[permKey]);

  const fetchEquipment = async () => {
    try {
      const res = await axios.get(API_URL + '/api/equipment');
      setEquipmentCatalog(res.data);
    } catch (e) { console.error('Ekipman listesi alinamadi', e); }
  };

  const fetchRequests = async () => {
    if (!staffToken || !can('requestsView')) return;
    try {
      const res = await axios.get(API_URL + '/api/requests', authHeader);
      setRequests([...res.data].sort((a, b) => (b._id > a._id ? 1 : -1)));
    } catch (e) { console.error('Talepler alinamadi', e); }
  };

  const fetchStaffList = async () => {
    if (!isAdmin) return;
    try {
      const res = await axios.get(API_URL + '/api/staff', authHeader);
      setStaffList(res.data);
    } catch (e) { console.error('Personel listesi alinamadi', e); }
  };

  useEffect(() => { fetchEquipment(); }, []);

  useEffect(() => {
    if (!isStaffLoggedIn) return;
    fetchRequests();
    const interval = setInterval(() => {
      fetchRequests();
    }, 8000);
    return () => clearInterval(interval);
  }, [staffToken]);

  useEffect(() => { if (staffSubTab === 'management') fetchStaffList(); }, [staffSubTab]);

  const handleMemberAuth = async (e) => {
    e.preventDefault();
    setMemberError('');
    try {
      const endpoint = memberMode === 'login' ? '/api/member/login' : '/api/member/register';
      const payload = memberMode === 'login'
        ? { phone: memberForm.phone, password: memberForm.password }
        : { name: memberForm.name, phone: memberForm.phone, email: memberForm.email, password: memberForm.password };
      const res = await axios.post(API_URL + endpoint, payload);
      localStorage.setItem('member_token', res.data.token);
      localStorage.setItem('member_name', res.data.name);
      localStorage.setItem('member_phone', res.data.phone);
      setMemberToken(res.data.token);
      setMemberName(res.data.name);
      setMemberPhone(res.data.phone);
      setMemberForm({ name: '', phone: '', email: '', password: '' });
      setActiveTab('rental');
    } catch (err) {
      setMemberError((err.response && err.response.data && err.response.data.error) || 'Islem basarisiz oldu.');
    }
  };

  const handleMemberLogout = () => {
    localStorage.removeItem('member_token');
    localStorage.removeItem('member_name');
    localStorage.removeItem('member_phone');
    setMemberToken('');
    setMemberName('');
    setMemberPhone('');
    setActiveTab('home');
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError('');
    try {
      const res = await axios.post(API_URL + '/api/staff/login', staffLoginForm);
      localStorage.setItem('staff_token', res.data.token);
      localStorage.setItem('staff_role', res.data.role);
      localStorage.setItem('staff_displayName', res.data.displayName || '');
      localStorage.setItem('staff_permissions', JSON.stringify(res.data.permissions || {}));
      setStaffToken(res.data.token);
      setStaffRole(res.data.role);
      setStaffDisplayName(res.data.displayName || '');
      setStaffPermissions(res.data.permissions || {});
      setActiveTab('staff');
      setStaffSubTab('stock');
    } catch (err) {
      setStaffError('Kullanici adi veya sifre hatali.');
    }
  };

  const handleStaffLogout = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_role');
    localStorage.removeItem('staff_displayName');
    localStorage.removeItem('staff_permissions');
    setStaffToken('');
    setStaffRole('');
    setStaffDisplayName('');
    setStaffPermissions(null);
    setActiveTab('home');
  };

  const handleRentalSubmit = async (e) => {
    e.preventDefault();
    if (!isMemberLoggedIn) {
      setActiveTab('login');
      return;
    }
    if (rentalForm.equipment.length === 0) {
      alert('Lutfen en az bir ekipman secin.');
      return;
    }

    const finalLocation = deliveryType === 'MERKEZ' ? 'MERKEZDEN_TESLIM' : rentalForm.deliveryLocation;

    try {
      await axios.post(API_URL + '/api/requests', {
        item: rentalForm.equipment,
        date: rentalForm.date,
        time: rentalForm.time,
        location: finalLocation,
        notes: rentalForm.notes
      }, memberAuthHeader);
      setShowSuccess(true);
      setRentalForm({ equipment: [], date: '', time: '', deliveryLocation: '', notes: '' });
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        handleMemberLogout();
        alert('Oturumunuzun suresi dolmus, lutfen tekrar giris yapin.');
        setActiveTab('login');
      } else {
        alert('Talep gonderilemedi, lutfen tekrar deneyin.');
      }
    }
  };

  const updateStatus = async (id, newStatus, force = false) => {
    if (!can('requestsManage')) return;
    try {
      await axios.put(API_URL + '/api/requests/' + id, { status: newStatus, force }, authHeader);
      setConflictModal({ isOpen: false, step: 1, requestId: null, data: null });
      fetchRequests();
    } catch (err) {
      if (err.response && err.response.status === 409 && err.response.data.conflict) {
        setConflictModal({
          isOpen: true,
          step: 1,
          requestId: id,
          data: err.response.data
        });
      } else {
        alert((err.response && err.response.data && err.response.data.error) || 'Islem basarisiz oldu.');
      }
    }
  };

  const downloadRequestAsWord = (req) => {
    const locText = req.location === 'MERKEZDEN_TESLIM' ? 'Merkezden Kendisi Alacak (Ofis)' : req.location;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Kiralama Talebi</title></head>
      <body style="font-family: Arial, sans-serif; padding: 30px;">
        <h2 style="text-align:center; color:#1e3a8a;">${COMPANY_DETAILS.name}</h2>
        <p style="text-align:center; font-size:12px; color:#555;">${COMPANY_DETAILS.address} | Tel: ${COMPANY_DETAILS.phone}</p>
        <hr/>
        <h3 style="color:#0f172a;">Ekipman Kiralama Rezervasyon Formu</h3>
        <table style="width:100%; border-collapse: collapse; margin-top:15px;">
          <tr><td style="padding:8px; font-weight:bold; width:180px; border-bottom:1px solid #ddd;">Ekipman(lar):</td><td style="padding:8px; border-bottom:1px solid #ddd;">${Array.isArray(req.item) ? req.item.join(', ') : req.item}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #ddd;">Tarih / Saat:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${req.date} / ${req.time}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #ddd;">Teslimat Sekli:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${locText}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #ddd;">Musteri:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${req.customer}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #ddd;">E-posta:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${req.email || '-'}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #ddd;">Notlar:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${req.notes || '-'}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #ddd;">Durum:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${req.status}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #ddd;">Onaylayan Yetkili:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${req.approvedBy || '-'}</td></tr>
        </table>
        <br/><br/>
        <table style="width:100%; margin-top:30px;">
          <tr>
            <td style="text-align:left;"><b>Musteri Imza:</b><br/><br/>______________________</td>
            <td style="text-align:right;"><b>Yetkili Kase / Imza:</b><br/><br/>______________________</td>
          </tr>
        </table>
      </body>
      </html>`;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Talep_${Array.isArray(req.item) ? req.item[0] : req.item}_${req.date}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRentClick = (equipmentName) => {
    setRentalForm((prev) => {
      const exists = prev.equipment.includes(equipmentName);
      const updated = exists
        ? prev.equipment.filter((e) => e !== equipmentName)
        : [...prev.equipment, equipmentName];
      return { ...prev, equipment: updated };
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewEquip({ ...newEquip, photoFile: file, photoPreview: URL.createObjectURL(file) });
    }
  };

  const handleAddOrUpdateEquip = async (e) => {
    e.preventDefault();
    const specsArr = newEquip.specsText.split('\n').map(s => s.trim()).filter(s => s);

    const finalCategory = (isNewCategory && customCategory.trim()) 
      ? customCategory.trim() 
      : newEquip.category;

    const finalPrice = `${newEquip.price} ${currency} / Gün`;

    const formData = new FormData();
    formData.append('name', newEquip.name);
    formData.append('category', finalCategory);
    formData.append('price', finalPrice);
    formData.append('stock', newEquip.stock);
    formData.append('specs', JSON.stringify(specsArr));
    formData.append('videoUrl', newEquip.videoUrl || '');
    if (newEquip.photoFile) formData.append('photo', newEquip.photoFile);

    try {
      if (editingId) {
        await axios.put(API_URL + '/api/equipment/' + editingId, formData, {
          headers: Object.assign({}, authHeader.headers, { 'Content-Type': 'multipart/form-data' })
        });
        setEditingId(null);
      } else {
        await axios.post(API_URL + '/api/equipment', formData, {
          headers: Object.assign({}, authHeader.headers, { 'Content-Type': 'multipart/form-data' })
        });
      }
      setNewEquip(emptyNewEquip);
      setIsNewCategory(false);
      setCustomCategory('');
      fetchEquipment();
    } catch (e) {
      alert('İşlem başarısız. Yetkiniz olmayabilir.');
    }
  };

  const handleEditEquip = (eq) => {
    if (!can('equipmentEdit')) return;
    setEditingId(eq._id || eq.id);

    const parsedPrice = eq.price ? eq.price.replace(/[^0-9.,]/g, '').trim() : '';
    const detectedCurrency = eq.price?.includes('$') ? '$' : eq.price?.includes('€') ? '€' : '₺';
    setCurrency(detectedCurrency);

    const standardCategories = ['Kamera', 'Isik', 'Ses', 'Stabilizasyon', 'Hava Cekimi', 'Studyo', 'Diger'];
    if (eq.category && !standardCategories.includes(eq.category)) {
      setIsNewCategory(true);
      setCustomCategory(eq.category);
    } else {
      setIsNewCategory(false);
      setCustomCategory('');
    }

    setNewEquip({
      name: eq.name, 
      category: eq.category || 'Kamera', 
      specsText: (eq.specs || []).join('\n'),
      price: parsedPrice, 
      stock: eq.stock, 
      photoFile: null,
      photoPreview: eq.photo ? (API_URL + eq.photo) : null, 
      videoUrl: eq.videoUrl || ''
    });
  };

  const handleDeleteEquip = async (id) => {
    if (!can('equipmentDelete')) return;
    if (!confirm('Bu ekipmanı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(API_URL + '/api/equipment/' + id, authHeader);
      fetchEquipment();
    } catch (e) { alert('Silme başarısız.'); }
  };

  const cancelEdit = () => { 
    setEditingId(null); 
    setNewEquip(emptyNewEquip); 
    setIsNewCategory(false);
    setCustomCategory('');
  };

  const togglePermission = (key) => {
    setNewStaff(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));
  };

  const handleAddOrUpdateStaff = async (e) => {
    e.preventDefault();
    setStaffFormError('');
    try {
      if (editingStaffId) {
        const payload = { displayName: newStaff.displayName, permissions: newStaff.permissions };
        if (newStaff.password) payload.password = newStaff.password;
        await axios.put(API_URL + '/api/staff/' + editingStaffId, payload, authHeader);
        setEditingStaffId(null);
      } else {
        await axios.post(API_URL + '/api/staff', newStaff, authHeader);
      }
      setNewStaff(emptyNewStaff);
      fetchStaffList();
    } catch (err) {
      setStaffFormError((err.response && err.response.data && err.response.data.error) || 'Islem basarisiz oldu.');
    }
  };

  const handleEditStaff = (s) => {
    setEditingStaffId(s._id || s.id);
    setNewStaff({
      username: s.username,
      password: '',
      displayName: s.displayName || '',
      permissions: Object.assign({}, emptyPermissions, s.permissions || {})
    });
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('Bu personeli silmek istediginize emin misiniz?')) return;
    try {
      await axios.delete(API_URL + '/api/staff/' + id, authHeader);
      fetchStaffList();
    } catch (e) { alert('Silme basarisiz.'); }
  };

  const cancelStaffEdit = () => { setEditingStaffId(null); setNewStaff(emptyNewStaff); setStaffFormError(''); };

  const equipmentList = equipmentCatalog.map(e => e.name);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <img src="/logo.png" alt="Aqua Medya Logo" className="h-11 w-11 object-contain bg-white rounded-full p-1 shadow" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">AQUA MEDYA</h1>
              <p className="text-[11px] text-cyan-200">Prodüksiyon Ekipman Kiralama</p>
            </div>
          </div>
          <nav className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setActiveTab('home')} className={"px-3.5 py-1.5 rounded-lg text-sm font-medium transition " + (activeTab === 'home' ? 'bg-white text-blue-900 shadow' : 'bg-blue-800/50 hover:bg-blue-800')}>Ana Sayfa</button>
            <button onClick={() => setActiveTab('catalog')} className={"px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 " + (activeTab === 'catalog' ? 'bg-white text-blue-900 shadow' : 'bg-blue-800/50 hover:bg-blue-800')}><Package size={15} /> Ekipmanlar</button>
            <button onClick={() => setActiveTab('rental')} className={"px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 " + (activeTab === 'rental' ? 'bg-white text-blue-900 shadow' : 'bg-blue-800/50 hover:bg-blue-800')}>
              Kiralama Formu
              {rentalForm.equipment.length > 0 && <span className="bg-cyan-500 text-white text-xs px-1.5 py-0.2 rounded-full font-bold">{rentalForm.equipment.length}</span>}
            </button>
            <button onClick={() => setActiveTab('login')} className={"px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 " + (activeTab === 'login' ? 'bg-white text-blue-900 shadow' : 'bg-blue-800/50 hover:bg-blue-800')}>
              <User size={15} /> {isMemberLoggedIn ? memberName.split(' ')[0] : 'Üye Girişi'}
            </button>
            <button onClick={() => setActiveTab(isStaffLoggedIn ? 'staff' : 'staffLogin')} className={"px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 " + ((activeTab === 'staff' || activeTab === 'staffLogin') ? 'bg-cyan-500 text-white shadow' : 'bg-slate-800/60 hover:bg-slate-800')}>
              <Shield size={15} /> Personel {isStaffLoggedIn && `(${staffDisplayName || staffRole})`}
            </button>
          </nav>
        </div>
      </header>

      {/* 2 KADEMELİ ÇAKIŞMA UYARI MODALI */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {conflictModal.step === 1 ? (
              <div className="p-6">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Çifte Rezervasyon Uyarısı!</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Bu talepteki ekipman(lar) için aynı tarih ve saatte <b className="text-slate-800">zaten onaylanmış başka bir kiralama mevcut!</b>
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2 mb-6">
                  <p><b className="text-amber-900">Çakışan Ekipman(lar):</b> <span className="text-amber-800">{conflictModal.data?.conflictingItems?.join(', ')}</span></p>
                  <p><b className="text-amber-900">Çakışan Müşteri:</b> <span className="text-amber-800">{conflictModal.data?.conflictingCustomer}</span></p>
                  <p><b className="text-amber-900">Tarih / Saat:</b> <span className="text-amber-800">{conflictModal.data?.date} - {conflictModal.data?.time}</span></p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setConflictModal({ isOpen: false, step: 1, requestId: null, data: null })} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 text-sm">Vazgeç</button>
                  <button onClick={() => setConflictModal(prev => ({ ...prev, step: 2 }))} className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 text-sm flex items-center gap-1.5">
                    Devam Et (Yine de Onayla)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-red-50/40">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-xl font-bold text-red-700 mb-2">KESİN ONAY: Çifte Rezervasyon Oluşturulacak!</h3>
                <p className="text-sm text-slate-700 mb-4">
                  Bu işlemi tamamlarsanız ekipman için çakışma kaydı açılacak, müşteriye <b>resmi onay e-postası</b> gidecek ve bu işlem loglarda <b className="text-red-700">"Çakışma Göz Ardı Edildi"</b> olarak sizin adınızla saklanacaktır.
                </p>
                <p className="text-xs text-red-600 font-semibold mb-6">Bu operasyonel sorumluluğu kabul edip onaylıyor musunuz?</p>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setConflictModal({ isOpen: false, step: 1, requestId: null, data: null })} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">İptal</button>
                  <button onClick={() => updateStatus(conflictModal.requestId, 'Onaylandı', true)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm flex items-center gap-1.5 shadow-md">
                    Evet, Sorumluluğu Alıyorum ve Onaylıyorum
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ANA SAYFA */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-900 to-cyan-700 text-white rounded-3xl p-10 md:p-14 text-center shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-3xl mx-auto">
                <span className="bg-white/10 text-cyan-200 text-xs uppercase tracking-widest font-semibold px-4 py-1.5 rounded-full inline-block mb-4">Profesyonel Çözüm Ortağınız</span>
                <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Prodüksiyonunuz İçin Doğru Ekipman</h2>
                <p className="text-base md:text-lg text-cyan-100 leading-relaxed mb-8">
                  Sinema, reklam ve dizi çekimleriniz için son teknoloji kamera, ışık, ses ve hava çekim ekipmanlarını esnek teslimat seçenekleriyle kiralayın.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button onClick={() => setActiveTab('catalog')} className="bg-white text-blue-900 font-bold px-8 py-3.5 rounded-xl hover:bg-cyan-50 transition shadow-lg flex items-center gap-2">
                    <Package size={18} /> Ekipman Kataloğunu İncele
                  </button>
                  <button onClick={() => setActiveTab('rental')} className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-lg">
                    Hızlı Talep Gönder
                  </button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mb-4"><Package size={24} /></div>
                <h3 className="font-bold text-lg mb-2">Geniş Ekipman Envanteri</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Arri, Sony, Red ve profesyonel ışık sistemlerinde güncel ve bakımlı ekipmanlar.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                <div className="w-12 h-12 bg-cyan-50 text-cyan-700 rounded-xl flex items-center justify-center mb-4"><Building2 size={24} /></div>
                <h3 className="font-bold text-lg mb-2">Merkezden Teslim Kolaylığı</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Kağıthane Z Ofis lokasyonumuzdan doğrudan ve hızlı ekipman teslimi.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center mb-4"><MapPin size={24} /></div>
                <h3 className="font-bold text-lg mb-2">Sete Teslimat Seçeneği</h3>
                <p className="text-slate-600 text-sm leading-relaxed">İstanbul içi tüm set lokasyonlarına zamanında ve güvenli ulaştırma.</p>
              </div>
            </div>

            {/* KURUMSAL BİLGİ KUTUSU */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <Building2 className="text-blue-700" size={26} />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{COMPANY_DETAILS.name}</h3>
                  <p className="text-xs text-slate-500">Resmi İletişim ve Teslimat Noktası</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-700">
                <p className="flex items-start gap-3"><MapPin size={18} className="text-blue-600 shrink-0 mt-0.5" /> <span><b>Adres:</b> {COMPANY_DETAILS.address}</span></p>
                <p className="flex items-center gap-3"><Phone size={18} className="text-blue-600 shrink-0" /> <span><b>Telefon:</b> {COMPANY_DETAILS.phone} | <b>GSM:</b> {COMPANY_DETAILS.mobile}</span></p>
                <p className="flex items-center gap-3"><Mail size={18} className="text-blue-600 shrink-0" /> <span><b>E-Posta:</b> {COMPANY_DETAILS.email}</span></p>
                <p className="flex items-center gap-3"><Clock size={18} className="text-blue-600 shrink-0" /> <span><b>Çalışma Saatleri:</b> Hafta İçi & Cumartesi 08:30 - 19:30</span></p>
              </div>
            </div>
          </div>
        )}

               {/* KATALOG */}
        {activeTab === 'catalog' && (
          <div>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Package className="text-blue-700" /> Ekipman Kataloğu
                </h2>
                <p className="text-slate-500 text-sm mt-1">Prodüksiyonunuza uygun ekipmanı kategoriye göre filtreleyin veya tek tıkla kiralama listesine ekleyin.</p>
              </div>
              {rentalForm.equipment.length > 0 && (
                <button onClick={() => setActiveTab('rental')} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md">
                  <CheckCircle size={17} /> {rentalForm.equipment.length} Ekipman Seçildi — Talep Formuna Geç
                </button>
              )}
            </div>

            {/* DİNAMİK KATEGORİ FİLTRELEME BUTONLARI (VİTRİN) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
              {['Tümü', ...Array.from(new Set(equipmentCatalog.map(item => item.category).filter(Boolean)))].map((cat) => {
                const count = cat === 'Tümü' 
                  ? equipmentCatalog.length 
                  : equipmentCatalog.filter(e => e.category === cat).length;
                const isActive = activeCatalogCategory === cat;
                const IconComp = categoryIcons[cat] || Package;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCatalogCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 border ${
                      isActive 
                        ? 'bg-blue-900 text-white border-blue-900 shadow' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {cat !== 'Tümü' && <IconComp size={15} className={isActive ? 'text-cyan-300' : 'text-slate-500'} />}
                    <span>{cat}</span>
                    <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

                       {/* FİLTRELENMİŞ EKİPMAN KARTLARI */}
            <div className="grid md:grid-cols-3 gap-6">
              {equipmentCatalog
                .filter((eq) => activeCatalogCategory === 'Tümü' || eq.category === activeCatalogCategory)
                .map((eq) => {
                  const IconComp = categoryIcons[eq.category] || Package;
                  const isSelected = rentalForm.equipment.includes(eq.name);
                  return (
                    <div key={eq._id || eq.id} className={"bg-white rounded-2xl shadow-sm border transition overflow-hidden flex flex-col justify-between " + (isSelected ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-slate-200 hover:shadow-md')}>
                      <div>
                        <div className="bg-slate-100 h-44 flex items-center justify-center overflow-hidden relative">
                          {eq.photo ? (
                            <img src={API_URL + eq.photo} alt={eq.name} className="w-full h-full object-cover" />
                          ) : (
                            <IconComp className="text-slate-400" size={54} />
                          )}
                          <span className="absolute top-3 left-3 text-[11px] font-bold text-blue-900 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                            {eq.category}
                          </span>
                        </div>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-800 text-base">{eq.name}</h3>
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                              <Star size={12} fill="currentColor" /> {eq.rating || 4.8}
                            </span>
                          </div>
                          <p className={"text-xs font-semibold mb-3 " + (eq.stock > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                            {eq.stock > 0 ? `Stokta: ${eq.stock} adet mevcut` : 'Geçici Olarak Stokta Yok'}
                          </p>
                          <ul className="text-xs text-slate-600 space-y-1 mb-4">
                            {(eq.specs || []).map((spec, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle size={13} className="text-cyan-600 mt-0.5 shrink-0" />{spec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* KART ALTI: VİDEO VE KİRALAMA ALANI */}
                      <div className="p-5 pt-3 border-t border-slate-100 mt-auto bg-slate-50/50 flex flex-col gap-3">
                        {(eq.videoUrl || eq.youtubeUrl) && (
                          <button
                            type="button"
                            onClick={() => setActiveVideoModal({
                              title: eq.name,
                              url: getEmbedYoutubeUrl(eq.videoUrl || eq.youtubeUrl)
                            })}
                            className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition border border-rose-200 shadow-sm"
                          >
                            <svg className="w-4 h-4 fill-current text-rose-600 shrink-0" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            Tanıtım Videosunu İzle
                          </button>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">Günlük Kiralama</span>
                            <span className="font-extrabold text-slate-800 text-base">{eq.price}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleRentClick(eq.name)} 
                            disabled={eq.stock === 0} 
                            className={"text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm " + 
                              (eq.stock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 
                              (isSelected ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-100'))}
                          >
                            {isSelected ? <><Check size={14} /> Seçildi</> : 'Sepete Ekle'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* SEÇİLİ KATEGORİDE ÜRÜN YOKSA */}
            {equipmentCatalog.filter((eq) => activeCatalogCategory === 'Tümü' || eq.category === activeCatalogCategory).length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 mt-4">
                <Package className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-slate-500 font-medium">"{activeCatalogCategory}" kategorisinde henüz ekipman bulunmuyor.</p>
                <button onClick={() => setActiveCatalogCategory('Tümü')} className="mt-3 text-xs text-blue-600 font-bold hover:underline">
                  Tüm Ekipmanları Göster
                </button>
              </div>
            )}
          </div>
        )}

        {/* ÜYE GİRİŞİ / PROFİL */}
        {activeTab === 'login' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            {isMemberLoggedIn ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="text-emerald-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{memberName}</h2>
                <p className="text-slate-500 text-sm mb-6 flex items-center justify-center gap-1"><Phone size={14}/> {memberPhone}</p>
                <button onClick={() => setActiveTab('rental')} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-xl hover:bg-cyan-700 transition mb-3">Yeni Kiralama Talebi Oluştur</button>
                <button onClick={() => { setActiveTab('myRequests'); fetchMyRequests(); }} className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition mb-3">Taleplerim & Rezervasyonlarım</button>
                <button onClick={handleMemberLogout} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-200 transition"><LogOut size={16}/> Çıkış Yap</button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <img src="/logo.png" alt="Aqua Medya Logo" className="mx-auto h-14 w-14 object-contain mb-2" />
                  <h2 className="text-2xl font-bold text-slate-800">{memberMode === 'login' ? 'Üye Girişi' : 'Kurumsal / Bireysel Kayıt'}</h2>
                  <p className="text-slate-500 text-xs mt-1">Taleplerinizi takip etmek ve kiralamak için giriş yapın</p>
                </div>
                <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl">
                  <button onClick={() => { setMemberMode('login'); setMemberError(''); }} className={"flex-1 py-2 rounded-lg text-sm font-medium transition " + (memberMode === 'login' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500')}>Giriş Yap</button>
                  <button onClick={() => { setMemberMode('register'); setMemberError(''); }} className={"flex-1 py-2 rounded-lg text-sm font-medium transition " + (memberMode === 'register' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500')}>Üye Ol</button>
                </div>
                <form onSubmit={handleMemberAuth} className="space-y-4">
                  {memberMode === 'register' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Ad Soyad veya Firma Adı</label>
                      <input type="text" required value={memberForm.name} onChange={(e) => setMemberForm({...memberForm, name: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Adınız Soyadınız / Firma Ünvanı" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Phone size={13}/> Cep Telefonu Numarası</label>
                    <input type="tel" required value={memberForm.phone} onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="05XXXXXXXXX" />
                  </div>
                  {memberMode === 'register' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Mail size={13}/> E-posta Adresi (Onay için gereklidir)</label>
                      <input type="email" required value={memberForm.email} onChange={(e) => setMemberForm({...memberForm, email: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="ornek@eposta.com" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Şifre</label>
                    <input type="password" required value={memberForm.password} onChange={(e) => setMemberForm({...memberForm, password: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="••••••••" />
                  </div>
                  {memberError && <p className="text-rose-600 text-xs font-medium">{memberError}</p>}
                  <button type="submit" className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition text-sm shadow">
                    {memberMode === 'login' ? 'Giriş Yap' : 'Kaydı Tamamla'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* MÜŞTERİNİN TALEPLERİM EKRANI */}
        {activeTab === 'myRequests' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Taleplerim</h2>
                <button onClick={() => setActiveTab('rental')} className="text-xs font-semibold bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-lg hover:bg-cyan-100">+ Yeni Talep</button>
              </div>
              {myRequestsLoading ? (
                <p className="text-slate-500 text-center py-8 text-sm">Yükleniyor...</p>
              ) : myRequests.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">Henüz bir kiralama talebiniz bulunmuyor.</p>
              ) : (
                <div className="space-y-4">
                  {myRequests.map((req) => (
                    <div key={req._id} className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 transition">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{Array.isArray(req.item) ? req.item.join(', ') : req.item}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {req.date} - {req.time} | <b>Teslimat:</b> {req.location === 'MERKEZDEN_TESLIM' ? 'Ofisten Teslim Alma' : req.location}
                        </p>
                        {req.approvedBy && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-1">Onaylayan Yetkili: {req.approvedBy}</p>
                        )}
                      </div>
                      <span className={
                        "text-xs font-semibold px-3 py-1 rounded-full " +
                        (req.status === 'Onaylandı' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                         req.status === 'Reddedildi' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                         'bg-amber-50 text-amber-700 border border-amber-200')
                      }>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KİRALAMA TALEP FORMU */}
        {activeTab === 'rental' && (
          <div className="max-w-2xl mx-auto">
            {!isMemberLoggedIn ? (
              <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="text-amber-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Giriş Yapılması Gerekiyor</h2>
                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">Kiralama talebi oluşturabilmeniz ve sürecinizi takip edebilmemiz için lütfen üye girişi yapın.</p>
                <button onClick={() => setActiveTab('login')} className="bg-blue-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-800 transition">Üye Girişi / Kayıt Ol</button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Package className="text-blue-700" size={22} /> Ekipman Kiralama Talebi</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Rezervasyon bilgilerinizi girerek talebinizi iletebilirsiniz</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium flex items-center gap-1.5"><User size={13} className="text-blue-600"/> {memberName}</span>
                </div>

                {showSuccess && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl p-4 mb-5 flex items-center gap-3 text-sm">
                    <CheckCircle size={22} className="text-emerald-600 shrink-0" />
                    <div>
                      <b>Talebiniz başarıyla alındı!</b> Personelimiz onayladığında tarafınıza bildirim iletilecektir.
                    </div>
                  </div>
                )}

                <form onSubmit={handleRentalSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Seçilen Ekipmanlar</label>
                    <div className="flex flex-wrap gap-2 mt-2 mb-2 min-h-[36px] p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {rentalForm.equipment.map((eq, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-white text-slate-800 text-xs font-semibold px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                          {eq}
                          <button type="button" onClick={() => setRentalForm({...rentalForm, equipment: rentalForm.equipment.filter((x) => x !== eq)})} className="text-slate-400 hover:text-rose-600 ml-1 font-bold">×</button>
                        </span>
                      ))}
                      {rentalForm.equipment.length === 0 && (<span className="text-xs text-slate-400 self-center">Henüz ekipman seçilmedi. Aşağıdan ekleyin.</span>)}
                    </div>
                    <select value="" onChange={(e) => { if (e.target.value && !rentalForm.equipment.includes(e.target.value)) { setRentalForm({...rentalForm, equipment: [...rentalForm.equipment, e.target.value]}); } }} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                      <option value="">+ Listeden Ekipman Seç ve Ekle</option>
                      {equipmentList.filter((eq) => !rentalForm.equipment.includes(eq)).map((eq, i) => <option key={i} value={eq}>{eq}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><Calendar size={13}/> Kiralama Tarihi</label>
                      <input type="date" required value={rentalForm.date} onChange={(e) => setRentalForm({...rentalForm, date: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><Clock size={13}/> Teslim Saati</label>
                      <input type="time" required value={rentalForm.time} onChange={(e) => setRentalForm({...rentalForm, time: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                    <label className="text-xs font-bold text-slate-800 block mb-2">Teslimat Yöntemi</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('MERKEZ')}
                        className={"p-3 rounded-xl border text-left transition flex items-start gap-2.5 " + 
                          (deliveryType === 'MERKEZ' ? 'bg-cyan-50 border-cyan-500 text-cyan-900 ring-1 ring-cyan-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                      >
                        <Building2 size={18} className={deliveryType === 'MERKEZ' ? 'text-cyan-600' : 'text-slate-400'} />
                        <div>
                          <p className="text-xs font-bold">Ofisten Kendim Alacağım</p>
                          <p className="text-[11px] opacity-75">Kağıthane Z Ofis Merkezimiz</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryType('ADRES')}
                        className={"p-3 rounded-xl border text-left transition flex items-start gap-2.5 " + 
                          (deliveryType === 'ADRES' ? 'bg-cyan-50 border-cyan-500 text-cyan-900 ring-1 ring-cyan-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                      >
                        <MapPin size={18} className={deliveryType === 'ADRES' ? 'text-cyan-600' : 'text-slate-400'} />
                        <div>
                          <p className="text-xs font-bold">Adrese Teslimat İstiyorum</p>
                          <p className="text-[11px] opacity-75">Set veya Özel Lokasyon</p>
                        </div>
                      </button>
                    </div>

                    {deliveryType === 'MERKEZ' ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
                        <MapPin size={15} className="text-blue-600 shrink-0 mt-0.5" />
                        <span><b>Teslim Alma Adresi:</b> {COMPANY_DETAILS.address}</span>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-bold text-slate-700">Teslimat / Set Adresi</label>
                        <input 
                          type="text" 
                          required 
                          value={rentalForm.deliveryLocation} 
                          onChange={(e) => setRentalForm({...rentalForm, deliveryLocation: e.target.value})} 
                          className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" 
                          placeholder="Örn: Beykoz Kundura Fabrikası Set Alanı, İstanbul" 
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Ek Notlar / Özel İstekler</label>
                    <textarea value={rentalForm.notes} onChange={(e) => setRentalForm({...rentalForm, notes: e.target.value})} rows={2} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Varsa batarya, tripod veya aksesuar tercihlerinizi yazabilirsiniz..."></textarea>
                  </div>

                  <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3.5 rounded-xl hover:bg-cyan-700 transition flex items-center justify-center gap-2 shadow-md">
                    <CheckCircle size={18}/> Kiralama Talebini İlet
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* PERSONEL GİRİŞİ */}
        {activeTab === 'staffLogin' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            <div className="text-center mb-6">
              <Shield className="mx-auto text-blue-800 mb-2" size={42} />
              <h2 className="text-2xl font-bold text-slate-900">Personel Girişi</h2>
              <p className="text-slate-500 text-xs mt-1">Aqua Medya Yetkili Yönetim Paneli</p>
            </div>
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Kullanıcı Adı</label>
                <input type="text" required value={staffLoginForm.username} onChange={(e) => setStaffLoginForm({...staffLoginForm, username: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Şifre</label>
                <input type="password" required value={staffLoginForm.password} onChange={(e) => setStaffLoginForm({...staffLoginForm, password: e.target.value})} className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              {staffError && <p className="text-rose-600 text-xs font-semibold">{staffError}</p>}
              <button type="submit" className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition text-sm shadow">Yetkili Girişi Yap</button>
            </form>
          </div>
        )}

        {/* PERSONEL PANELİ */}
        {activeTab === 'staff' && isStaffLoggedIn && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-900 rounded-xl"><Shield size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Aqua Medya Yönetim Portalı</h2>
                  <p className="text-xs text-slate-500">Yetkili: <b>{staffDisplayName || staffRole}</b> {isAdmin && <span className="text-purple-600 font-bold">(Admin)</span>}</p>
                </div>
              </div>
              <button onClick={handleStaffLogout} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded-xl hover:bg-slate-200 transition text-sm"><LogOut size={15}/> Güvenli Çıkış</button>
            </div>

            <div className="flex gap-2 mb-6 bg-slate-200/60 p-1.5 rounded-xl w-fit flex-wrap">
              <button onClick={() => setStaffSubTab('stock')} className={"px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 " + (staffSubTab ===
'stock' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                <Package size={14}/> Stok Yönetimi
              </button>

              {can('requestsView') && (
                <button onClick={() => setStaffSubTab('requests')} className={"px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 " + (staffSubTab === 'requests' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                  <Bell size={14}/> Kiralama Talepleri ({requests.filter(r => r.status?.toLowerCase() === 'bekliyor').length})
                </button>
              )}

              {isAdmin && (
                <button onClick={() => setStaffSubTab('management')} className={"px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 " + (staffSubTab === 'management' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                  <Users size={14}/> Personel Yönetimi
                </button>
              )}
            </div>

            {/* PERSONEL: STOK YÖNETİMİ SEKMESİ */}
            {staffSubTab === 'stock' && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* SOL TARAF: EKİPMAN EKLE / DÜZENLE FORMU */}
                {can('equipmentAdd') && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                      {editingId ? <Edit2 size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />} 
                      {editingId ? 'Ekipmanı Güncelle' : 'Yeni Ekipman Ekle'}
                    </h3>
                    <form onSubmit={handleAddOrUpdateEquip} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700">Ekipman Adı</label>
                        <input 
                          type="text" 
                          required 
                          value={newEquip.name} 
                          onChange={(e) => setNewEquip({...newEquip, name: e.target.value})} 
                          placeholder="Örn: Sony FX3 Sinema Kamerası" 
                          className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                        />
                      </div>

                      {/* KATEGORİ SEÇİMİ VE YENİ KATEGORİ GİRİŞİ */}
                      <div>
                        <label className="text-xs font-bold text-slate-700">Kategori</label>
                        <select
                          value={isNewCategory ? '__NEW__' : newEquip.category}
                          onChange={(e) => {
                            if (e.target.value === '__NEW__') {
                              setIsNewCategory(true);
                              setCustomCategory('');
                            } else {
                              setIsNewCategory(false);
                              setNewEquip({ ...newEquip, category: e.target.value });
                            }
                          }}
                          className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                        >
                          {Object.keys(categoryIcons).map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="__NEW__">+ Yeni Kategori Ekle...</option>
                        </select>

                        {isNewCategory && (
                          <div className="mt-2">
                            <input
                              type="text"
                              required
                              placeholder="Yeni kategori adı yazın (Örn: Gimbal & Destek)"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="w-full px-4 py-2 border-2 border-blue-500 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50/30"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Teknik Özellikler (Her satıra bir özellik)</label>
                        <textarea 
                          value={newEquip.specsText} 
                          onChange={(e) => setNewEquip({...newEquip, specsText: e.target.value})} 
                          placeholder="4K 120fps Kayıt&#10;Dual Base ISO&#10;Full Frame Sensör" 
                          rows={3} 
                          className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        ></textarea>
                      </div>

                      {/* GÜNLÜK KİRALAMA BEDELİ & STOK ADEDİ */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700">Günlük Kiralama Bedeli</label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <select
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                              className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 outline-none cursor-pointer"
                            >
                              <option value="₺">₺ (TL)</option>
                              <option value="$">$ (USD)</option>
                              <option value="€">€ (EUR)</option>
                            </select>
                            <input 
                              type="number" 
                              required 
                              value={newEquip.price} 
                              onChange={(e) => setNewEquip({...newEquip, price: e.target.value})} 
                              placeholder="2500" 
                              className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold" 
                            />
                            <span className="px-2.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold whitespace-nowrap">
                              / Gün
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700">Stok Adedi</label>
                          <input 
                            type="number" 
                            min="0" 
                            required 
                            value={newEquip.stock} 
                            onChange={(e) => setNewEquip({...newEquip, stock: parseInt(e.target.value) || 0})} 
                            placeholder="1" 
                            className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                          />
                        </div>
                      </div>

                      {/* VİDEO YOUTUBE LINK */}
                      <div>
                        <label className="text-xs font-bold text-slate-700">Video Tanıtım Linki (Opsiyonel)</label>
                        <input 
                          type="url" 
                          value={newEquip.videoUrl || ''} 
                          onChange={(e) => setNewEquip({...newEquip, videoUrl: e.target.value})} 
                          placeholder="https://youtube.com/watch?v=..." 
                          className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                        />
                      </div>

                      {/* EKİPMAN GÖRSELİ */}
                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3 hover:bg-slate-100 transition">
                          <Upload size={16} className="text-blue-600"/> Ekipman Görseli Yükle
                          <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </label>
                        {newEquip.photoPreview && <img src={newEquip.photoPreview} alt="Önizleme" className="mt-2 h-24 rounded-xl object-cover border border-slate-200" />}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          type="submit" 
                          className="flex-1 bg-blue-900 text-white font-bold py-2.5 rounded-xl hover:bg-blue-800 transition text-sm shadow"
                        >
                          {editingId ? 'Değişiklikleri Kaydet' : 'Envantere Ekle'}
                        </button>
                        {editingId && (
                          <button 
                            type="button" 
                            onClick={cancelEdit} 
                            className="px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition text-sm"
                          >
                            Vazgeç
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* SAĞ TARAF: MEVCUT ENVANTER VE DİNAMİK FİLTRE */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-slate-800">
                      Mevcut Envanter ({equipmentCatalog.length})
                    </h3>
                    {selectedCatalogCategory !== 'Tümü' && (
                      <button 
                        type="button"
                        onClick={() => setSelectedCatalogCategory('Tümü')}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Filtreyi Temizle
                      </button>
                    )}
                  </div>

                  {/* DİNAMİK KATEGORİ FİLTRE BUTONLARI */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 scrollbar-thin">
                    {['Tümü', ...Array.from(new Set(equipmentCatalog.map(item => item.category).filter(Boolean)))].map((cat) => {
                      const count = cat === 'Tümü' 
                        ? equipmentCatalog.length 
                        : equipmentCatalog.filter(e => e.category === cat).length;
                      const isActive = selectedCatalogCategory === cat;

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCatalogCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                            isActive 
                              ? 'bg-blue-900 text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* SÜZÜLMÜŞ LİSTE */}
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 flex-1">
                    {equipmentCatalog
                      .filter((eq) => selectedCatalogCategory === 'Tümü' || eq.category === selectedCatalogCategory)
                      .map((eq) => (
                        <div key={eq._id || eq.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            {eq.photo ? (
                              <img src={API_URL + eq.photo} alt={eq.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                                {React.createElement(categoryIcons[eq.category] || Package, { size: 20 })}
                              </div>
                              
                            )}
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{eq.name}</p>
  <p className="text-xs text-slate-500">{eq.category} · Stok: <b>{eq.stock}</b> · {eq.price}</p>
  
  {/* YOUTUBE VİDEO LİNKİ GÖSTERİMİ */}
  {(eq.videoUrl || eq.youtubeUrl) && (
    <a
      href={eq.videoUrl || eq.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline mt-1 bg-rose-50 px-2 py-0.5 rounded-md"
    >
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
      YouTube Videosunu Aç ↗
    </a>
  )}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {can('equipmentEdit') && (
                              <button onClick={() => handleEditEquip(eq)} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition" title="Düzenle">
                                <Edit2 size={14} />
                              </button>
                            )}
                            {can('equipmentDelete') && (
                              <button onClick={() => handleDeleteEquip(eq._id || eq.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition" title="Sil">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                    {equipmentCatalog.filter((eq) => selectedCatalogCategory === 'Tümü' || eq.category === selectedCatalogCategory).length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-10">
                        {selectedCatalogCategory === 'Tümü' 
                          ? 'Envanterde henüz ekipman bulunmuyor.' 
                          : `"${selectedCatalogCategory}" kategorisinde ekipman bulunamadı.`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

                       {/* PERSONEL: KİRALAMA TALEPLERİ SEKMESİ */}
            {staffSubTab === 'requests' && can('requestsView') && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                
                {/* BAŞLIK VE DÖNEM FİLTRE BUTONLARI */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
                      <Bell size={20} className="text-blue-700" /> Gelen Kiralama Talepleri
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Müşteri rezervasyonlarını ve talep detaylarını yönetin</p>
                  </div>

                  {/* Haftalık / Aylık / Yıllık Filtreleme Butonları */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button 
                      type="button"
                      onClick={() => setRequestPeriod('all')}
                      className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'all' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                    >
                      Tümü ({requests.length})
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRequestPeriod('week')}
                      className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'week' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                    >
                      Bu Hafta
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRequestPeriod('month')}
                      className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'month' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                    >
                      Bu Ay
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRequestPeriod('year')}
                      className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'year' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                    >
                      Bu Yıl
                    </button>
                  </div>
                </div>

                {/* FİNANSAL ÖZET KARTI (SADECE ADMİN VEYA viewFinances İZNİ OLAN PERSONELE GÖRÜNÜR) */}
                {(isAdmin || can('viewFinances')) && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl text-white shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        📊 Seçili Dönem Ciro & KDV Özeti ({requestPeriod === 'all' ? 'Tüm Zamanlar' : requestPeriod === 'week' ? 'Son 7 Gün' : requestPeriod === 'month' ? 'Son 30 Gün' : 'Son 1 Yıl'})
                      </span>
                      <span className="text-xs bg-blue-800/80 px-2.5 py-1 rounded-lg text-blue-200">
                        {filteredRequests.length} Adet Talep
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-800">
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">Ara Toplam</p>
                        <p className="text-base font-bold text-slate-100 mt-0.5">{reportSubtotal.toLocaleString('tr-TR')} ₺</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">+ %20 KDV</p>
                        <p className="text-base font-bold text-amber-400 mt-0.5">{reportKdv.toLocaleString('tr-TR')} ₺</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-emerald-400 font-medium">Genel Toplam (KDV Dahil)</p>
                        <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{reportGrandTotal.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TALEPLER LİSTESİ */}
                <div className="space-y-4">
                  {filteredRequests.map((req) => (
                    <div key={req._id || req.id} className={"border rounded-2xl p-4 transition " + (req.status === 'bekliyor' ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-white')}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-base">
                              {Array.isArray(req.item) ? req.item.join(', ') : req.item}
                            </p>
                            {req.conflictIgnored && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle size={10} /> Çakışma Göz Ardı Edildi
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-700"><Calendar size={13} className="text-blue-600" /> {req.date}</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700"><Clock size={13} className="text-blue-600" /> {req.time}</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <MapPin size={13} className="text-cyan-600" /> 
                              {req.location === 'MERKEZDEN_TESLIM' ? (
                                <span className="text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded font-bold">🏢 Merkezden Kendisi Alacak</span>
                              ) : (
                                <span>🚚 {req.location}</span>
                              )}
                            </span>
                          </div>

                          <div className="pt-1 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1 text-blue-900 font-bold"><User size={13} className="text-blue-600" /> {req.customer}</span>
                            {req.email && <span className="flex items-center gap-1 text-slate-500"><Mail size={13} /> {req.email}</span>}
                          </div>

                          {req.notes && (
                            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                              <b>Müşteri Notu:</b> {req.notes}
                            </p>
                          )}

                          {req.approvedBy && (
                            <p className="text-[11px] text-emerald-700 font-medium pt-1">
                              ✓ <b>{req.approvedBy}</b> tarafından {req.approvedAt ? new Date(req.approvedAt).toLocaleDateString('tr-TR') : ''} tarihinde onaylandı.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-center">
                          <span className={
                            "text-xs font-bold px-3 py-1.5 rounded-full " +
                            ((req.status?.toLowerCase() === 'onaylandı' || req.status?.toLowerCase() === 'onaylandi') 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : (req.status?.toLowerCase() === 'reddedildi') 
                              ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                              : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse')
                          }>
                            {req.status?.toLowerCase() === 'onaylandi' || req.status?.toLowerCase() === 'onaylandı' 
                              ? 'Onaylandı' 
                              : req.status?.toLowerCase() === 'reddedildi' 
                              ? 'reddedildi' 
                              : 'bekliyor'}
                          </span>
                          
                          <button onClick={() => downloadRequestAsWord(req)} className="p-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition" title="Word Sözleşme Formu Olarak İndir">
                            <FileText size={16} />
                          </button>

                          {/* SİLME BUTONU (SADECE ADMİN) */}
                          {isAdmin && (
                            <button 
                              onClick={() => deleteRequest(req._id || req.id)} 
                              className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 hover:text-rose-700 transition" 
                              title="Talebi Sistemden Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                          {can('requestsManage') && (req.status?.toLowerCase() === 'bekliyor') && (
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                              <button 
                                onClick={() => updateStatus(req._id || req.id, 'Onaylandı')} 
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1 text-xs font-bold shadow-sm"
                                title="Onayla ve E-posta Gönder"
                              >
                                <Check size={14} /> Onayla
                              </button>
                              <button 
                                onClick={() => updateStatus(req._id || req.id, 'Reddedildi')} 
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition flex items-center gap-1 text-xs font-bold"
                                title="Talebi Reddet"
                              >
                                <X size={14} /> Reddet
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredRequests.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-12">Seçilen dönemde kayıtlı talep bulunmuyor.</p>
                  )}
                </div>
              </div>
            )}

            {/* PERSONEL: PERSONEL YÖNETİMİ (SADECE ADMİN) */}
            {staffSubTab === 'management' && isAdmin && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                    {editingStaffId ? <Edit2 size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />} 
                    {editingStaffId ? 'Personel Yetkilerini Düzenle' : 'Yeni Personel Tanımla'}
                  </h3>
                  <form onSubmit={handleAddOrUpdateStaff} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Kullanıcı Adı</label>
                      <input type="text" required disabled={!!editingStaffId} value={newStaff.username} onChange={(e) => setNewStaff({...newStaff, username: e.target.value})} placeholder="Örn: yusuf" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Görünen Ad Soyad</label>
                      <input type="text" value={newStaff.displayName} onChange={(e) => setNewStaff({...newStaff, displayName: e.target.value})} placeholder="Örn: Yusuf Sarser" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">{editingStaffId ? "Yeni Şifre (Boş bırakırsanız değişmez)" : "Giriş Şifresi"}</label>
                      <input type="password" required={!editingStaffId} value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} placeholder="••••••••" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                      <p className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wide">Personel Yetki İzinleri</p>
                      <div className="space-y-2">
                        {Object.keys(permissionLabels).map((key) => (
                          <label key={key} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={!!newStaff.permissions[key]} onChange={() => togglePermission(key)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                            {permissionLabels[key]}
                          </label>
                        ))}
                      </div>
                    </div>

                    {staffFormError && <p className="text-rose-600 text-xs font-semibold">{staffFormError}</p>}
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="flex-1 bg-blue-900 text-white font-bold py-2.5 rounded-xl hover:bg-blue-800 transition text-sm shadow">
                        {editingStaffId ? 'Yetkileri Güncelle' : 'Personeli Kaydet'}
                      </button>
                      {editingStaffId && (
                        <button type="button" onClick={cancelStaffEdit} className="px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition text-sm">
                          Vazgeç
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                    <Users size={18} className="text-blue-700" /> Tanımlı Personeller ({staffList.length})
                  </h3>
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {staffList.map((s) => (
                      <div key={s._id || s.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 hover:border-slate-200 transition">
                        <div>
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {s.displayName || s.username}
                            {s.role === 'admin' && <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Admin</span>}
                          </p>
                          <p className="text-xs text-slate-500">@{s.username}</p>
                        </div>
                        {s.role !== 'admin' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleEditStaff(s)} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition" title="Düzenle"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteStaff(s._id || s.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition" title="Sil"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {staffList.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-10">Kayıtlı personel bulunmuyor.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

            <footer className="bg-slate-900 text-slate-400 text-center py-6 text-xs mt-16 border-t border-slate-800">
        <p className="font-semibold text-slate-300">{COMPANY_DETAILS.name}</p>
        <p className="mt-1">{COMPANY_DETAILS.address}</p>
        <p className="mt-2 text-slate-500">© 2026 Aqua Medya. Tüm hakları saklıdır.</p>
      </footer>

      {/* YOUTUBE SAYFA İÇİ VİDEO MODALI (LIGHTBOX) */}
      {activeVideoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setActiveVideoModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Başlık ve Kapat Butonu */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {activeVideoModal.title} - Tanıtım Videosu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-600 transition font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Video Oynatıcı Iframe */}
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={activeVideoModal.url}
                title={activeVideoModal.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Calendar, MapPin, Clock, User, Lock, Package, Bell, CheckCircle, Phone, Mail, Building2, Video, Mic, Lightbulb, Move3d, ScreenShare, Star, Upload, Image as ImageIcon, Trash2, Edit2, Plus, X, Shield, Users, LogOut, AlertTriangle, FileText } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const categoryIcons = {
  'Kamera': Camera, 'Isik': Lightbulb, 'Ses': Mic, 'Stabilizasyon': Move3d,
  'Hava Cekimi': Video, 'Studyo': ScreenShare, 'Diger': Package
};

const permissionLabels = {
  equipmentAdd: 'Ekipman Ekleme',
  equipmentEdit: 'Ekipman Duzenleme',
  equipmentDelete: 'Ekipman Silme',
  requestsView: 'Talep Goruntuleme',
  requestsManage: 'Talep Onaylama/Reddetme'
};

const emptyPermissions = { equipmentView: true, equipmentAdd: false, equipmentEdit: false, equipmentDelete: false, requestsView: false, requestsManage: false };

function App() {
  const [activeTab, setActiveTab] = useState('home');

  const [memberToken, setMemberToken] = useState(localStorage.getItem('member_token') || '');
  const [memberName, setMemberName] = useState(localStorage.getItem('member_name') || '');
  const [memberPhone, setMemberPhone] = useState(localStorage.getItem('member_phone') || '');
  const [memberMode, setMemberMode] = useState('login');
 const [memberForm, setMemberForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [memberError, setMemberError] = useState('');
  const isMemberLoggedIn = !!memberToken;
  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);

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

 const [rentalForm, setRentalForm] = useState({ equipment: [], date: '', time: '', deliveryLocation: '', notes: '' });
  const [showSuccess, setShowSuccess] = useState(false);

  const emptyNewEquip = { name: '', category: 'Kamera', specsText: '', price: '', stock: 1, photoFile: null, photoPreview: null, videoUrl: '' };
  const [newEquip, setNewEquip] = useState(emptyNewEquip);
  const [editingId, setEditingId] = useState(null);

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
    if (rentalForm.equipment.length === 0) { alert('Lutfen en az bir ekipman secin.'); return; }
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
    try {
      await axios.post(API_URL + '/api/requests', {
        item: rentalForm.equipment,
        date: rentalForm.date,
        time: rentalForm.time,
        location: rentalForm.deliveryLocation,
        notes: rentalForm.notes
      }, memberAuthHeader);
      setShowSuccess(true);
      setRentalForm({ equipment: '', date: '', time: '', deliveryLocation: '', notes: '' });
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        handleMemberLogout();
        alert('Oturumunuzun suresi dolmus, lutfen tekrar giris yapin.');
        setActiveTab('login');
      } else {
        alert('Talep gonderilemedi, backend calisiyor mu kontrol edin.');
      }
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!can('requestsManage')) return;
    try {
      await axios.put(API_URL + '/api/requests/' + id, { status: newStatus }, authHeader);
      fetchRequests();
    } catch (e) { console.error(e); }
  };
const downloadRequestAsWord = (req) => {
  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Kiralama Talebi</title></head>
    <body style="font-family: Arial, sans-serif; padding: 30px;">
      <h2 style="text-align:center; color:#1e3a8a;">Aqua Medya - Ekipman Kiralama Talebi</h2>
      <hr/>
      <table style="width:100%; border-collapse: collapse; margin-top:20px;">
       <tr><td style="padding:8px; font-weight:bold; width:180px;">Ekipman:</td><td style="padding:8px;">${Array.isArray(req.item) ? req.item.join(', ') : req.item}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Tarih:</td><td style="padding:8px;">${req.date}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Saat:</td><td style="padding:8px;">${req.time}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Teslim Yeri:</td><td style="padding:8px;">${req.location}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Musteri:</td><td style="padding:8px;">${req.customer}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">E-posta:</td><td style="padding:8px;">${req.email || '-'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Notlar:</td><td style="padding:8px;">${req.notes || '-'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Durum:</td><td style="padding:8px;">${req.status}</td></tr>
      </table>
      <br/><br/>
      <p>Onaylayan Yetkili Imza: ______________________</p>
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

    const formData = new FormData();
    formData.append('name', newEquip.name);
    formData.append('category', newEquip.category);
    formData.append('price', newEquip.price);
    formData.append('stock', newEquip.stock);
    formData.append('specs', JSON.stringify(specsArr));
    formData.append('videoUrl', newEquip.videoUrl);
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
      fetchEquipment();
    } catch (e) {
      alert('Islem basarisiz. Yetkiniz olmayabilir veya giris suresi dolmus olabilir.');
    }
  };

  const handleEditEquip = (eq) => {
    if (!can('equipmentEdit')) return;
    setEditingId(eq.id);
    setNewEquip({
      name: eq.name, category: eq.category, specsText: eq.specs.join('\n'),
      price: eq.price, stock: eq.stock, photoFile: null,
      photoPreview: eq.photo ? (API_URL + eq.photo) : null, videoUrl: eq.videoUrl || ''
    });
  };

  const handleDeleteEquip = async (id) => {
    if (!can('equipmentDelete')) return;
    if (!confirm('Bu ekipmani silmek istediginize emin misiniz?')) return;
    try {
      await axios.delete(API_URL + '/api/equipment/' + id, authHeader);
      fetchEquipment();
    } catch (e) { alert('Silme basarisiz.'); }
  };

  const cancelEdit = () => { setEditingId(null); setNewEquip(emptyNewEquip); };

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
    setEditingStaffId(s.id);
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-900 to-cyan-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Aqua Medya Logo" className="h-12 w-12 object-contain bg-white rounded-full p-1" />
            <div>
              <h1 className="text-2xl font-bold">Aqua Medya</h1>
              <p className="text-xs text-cyan-100">Produksiyon Ekipman Kiralama</p>
            </div>
          </div>
          <nav className="flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab('home')} className={"px-4 py-2 rounded-lg font-medium transition " + (activeTab === 'home' ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}>Ana Sayfa</button>
            <button onClick={() => setActiveTab('catalog')} className={"px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 " + (activeTab === 'catalog' ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}><Package size={16} /> Ekipman Katalogu</button>
            <button onClick={() => setActiveTab('login')} className={"px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 " + (activeTab === 'login' ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}>
              <User size={16} /> {isMemberLoggedIn ? memberName : 'Uye Girisi'}
            </button>
            <button onClick={() => setActiveTab('rental')} className={"px-4 py-2 rounded-lg font-medium transition " + (activeTab === 'rental' ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}>Kiralama Formu</button>
            <button onClick={() => setActiveTab(isStaffLoggedIn ? 'staff' : 'staffLogin')} className={"px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 " + ((activeTab === 'staff' || activeTab === 'staffLogin') ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}>
              <Shield size={16} /> Personel {isStaffLoggedIn && ('(' + (staffDisplayName || staffRole) + ')')}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-800 to-cyan-600 text-white rounded-2xl p-10 text-center shadow-xl">
              <h2 className="text-4xl font-bold mb-3">Produksiyonunuz Icin Dogru Ekipman</h2>
              <p className="text-lg text-cyan-100 max-w-2xl mx-auto">Dizi, film ve reklam cekimleriniz icin profesyonel kamera, isik, ses ve drone ekipmanlarini hizli, guvenilir ve esnek sekilde kiralayin.</p>
              <button onClick={() => setActiveTab('catalog')} className="mt-6 bg-white text-blue-900 font-bold px-8 py-3 rounded-full hover:bg-cyan-100 transition shadow-lg">Ekipman Katalogunu Incele</button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100"><Package className="text-blue-700 mb-3" size={32} /><h3 className="font-bold text-lg mb-2">Genis Ekipman Havuzu</h3><p className="text-slate-600 text-sm">Kamera, isik, ses ve gimbal sistemlerinde son teknoloji ekipmanlar.</p></div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100"><Clock className="text-blue-700 mb-3" size={32} /><h3 className="font-bold text-lg mb-2">Esnek Zamanlama</h3><p className="text-slate-600 text-sm">Istediginiz tarih ve saatte teslim/randevu planlamasi yapin.</p></div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100"><MapPin className="text-blue-700 mb-3" size={32} /><h3 className="font-bold text-lg mb-2">Set Teslimati</h3><p className="text-slate-600 text-sm">Istanbul ici tum set lokasyonlarina teslim secenegi.</p></div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-md border border-slate-100">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Building2 className="text-blue-700" /> Firma Bilgileri</h3>
              <div className="grid md:grid-cols-2 gap-4 text-slate-700">
                <p className="flex items-center gap-2"><Phone size={18} className="text-blue-600" /> +90 (212) 555 00 00</p>
                <p className="flex items-center gap-2"><Mail size={18} className="text-blue-600" /> info@aquamedya.com.tr</p>
                <p className="flex items-center gap-2"><MapPin size={18} className="text-blue-600" /> Besiktas, Istanbul</p>
                <p className="flex items-center gap-2"><Clock size={18} className="text-blue-600" /> Hafta ici 08:00 - 20:00</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-blue-700" /> Ekipman Katalogu</h2>
             <p className="text-slate-500 text-sm mt-1">Produksiyonunuza uygun ekipmani secin ve hemen kiralama talebi olusturun.</p>
{rentalForm.equipment.length > 0 && (
  <button onClick={() => setActiveTab('rental')} className="mt-3 bg-cyan-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-cyan-700 transition flex items-center gap-2">
    <CheckCircle size={16}/> {rentalForm.equipment.length} Ekipman Seçildi — Talep Formuna Geç
  </button>
)}
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {equipmentCatalog.map((eq) => {
                const IconComp = categoryIcons[eq.category] || Package;
                return (
                  <div key={eq.id} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden hover:shadow-xl transition">
                    <div className="bg-gradient-to-br from-blue-700 to-cyan-500 h-32 flex items-center justify-center overflow-hidden">
                      {eq.photo ? <img src={API_URL + eq.photo} alt={eq.name} className="w-full h-full object-cover" /> : <IconComp className="text-white" size={48} />}
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">{eq.category}</span>
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><Star size={12} fill="currentColor" /> {eq.rating}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">{eq.name}</h3>
                      <p className={"text-xs font-medium mb-2 " + (eq.stock > 0 ? 'text-green-600' : 'text-red-500')}>
                        {eq.stock > 0 ? ('Stokta: ' + eq.stock + ' adet') : 'Stok Yok'}
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1 mb-4">
                        {eq.specs.map((spec, i) => (<li key={i} className="flex items-start gap-1"><CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />{spec}</li>))}
                      </ul>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-800">{eq.price}</span>
                        <button onClick={() => handleRentClick(eq.name)} disabled={eq.stock === 0} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (eq.stock === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : (rentalForm.equipment.includes(eq.name) ? 'bg-green-600 text-white' : 'bg-cyan-600 text-white hover:bg-cyan-700'))}>{rentalForm.equipment.includes(eq.name) ? '✓ Seçildi' : 'Sepete Ekle'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'login' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            {isMemberLoggedIn ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{memberName}</h2>
                <p className="text-slate-500 text-sm mb-6 flex items-center justify-center gap-1"><Phone size={14}/> {memberPhone}</p>
                <button onClick={() => setActiveTab('rental')} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-700 transition mb-3">Kiralama Talebi Olustur</button>
                <button onClick={() => { setActiveTab('myRequests'); fetchMyRequests(); }} className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition mb-3">Taleplerim</button>
                <button onClick={handleMemberLogout} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-medium py-3 rounded-lg hover:bg-slate-200 transition"><LogOut size={16}/> Cikis Yap</button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <img src="/logo.png" alt="Aqua Medya Logo" className="mx-auto h-16 w-16 object-contain mb-2" />
                  <h2 className="text-2xl font-bold text-slate-800">{memberMode === 'login' ? 'Uye Girisi' : 'Uye Kaydi'}</h2>
                  <p className="text-slate-500 text-sm">Kiralama talebi gonderebilmek icin uye olmalisiniz</p>
                </div>
                <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => { setMemberMode('login'); setMemberError(''); }} className={"flex-1 py-2 rounded-lg text-sm font-medium transition " + (memberMode === 'login' ? 'bg-white text-blue-800 shadow' : 'text-slate-500')}>Giris Yap</button>
                  <button onClick={() => { setMemberMode('register'); setMemberError(''); }} className={"flex-1 py-2 rounded-lg text-sm font-medium transition " + (memberMode === 'register' ? 'bg-white text-blue-800 shadow' : 'text-slate-500')}>Uye Ol</button>
                </div>
                <form onSubmit={handleMemberAuth} className="space-y-4">
  {memberMode === 'register' && (
    <div>
      <label className="text-sm font-medium text-slate-700">Ad Soyad</label>
      <input type="text" required value={memberForm.name} onChange={(e) => setMemberForm({...memberForm, name: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Adiniz Soyadiniz" />
    </div>
  )}
  <div>
    <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Phone size={14}/> Telefon Numarasi</label>
    <input type="tel" required value={memberForm.phone} onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="05XX XXX XX XX" />
  </div>
  {memberMode === 'register' && (
    <div>
      <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Mail size={14}/> E-posta Adresi</label>
      <input type="email" required value={memberForm.email} onChange={(e) => setMemberForm({...memberForm, email: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ornek@eposta.com" />
    </div>
  )}
  <div>
    <label className="text-sm font-medium text-slate-700">Sifre</label>
    <input type="password" required value={memberForm.password} onChange={(e) => setMemberForm({...memberForm, password: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="********" />
  </div>
  {memberError && <p className="text-red-600 text-sm">{memberError}</p>}
  <button type="submit" className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">
    {memberMode === 'login' ? 'Giris Yap' : 'Uye Ol'}
  </button>
</form>
              </>
            )}
          </div>
        )}

        {activeTab === 'myRequests' && (
  <div className="max-w-2xl mx-auto">
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Taleplerim</h2>
      {myRequestsLoading ? (
        <p className="text-slate-500 text-center py-8">Yukleniyor...</p>
      ) : myRequests.length === 0 ? (
        <p className="text-slate-500 text-center py-8">Henuz bir talebiniz bulunmuyor.</p>
      ) : (
        <div className="space-y-4">
          {myRequests.map((req) => (
            <div key={req._id} className="border border-slate-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{Array.isArray(req.item) ? req.item.join(', ') : req.item}</p>
                <p className="text-xs text-slate-500 mt-1">{req.date} - {req.time} - {req.location}</p>
              </div>
              <span className={
                "text-xs font-medium px-3 py-1 rounded-full " +
                (req.status === 'onaylandi' ? 'bg-green-50 text-green-700' :
                 req.status === 'reddedildi' ? 'bg-red-50 text-red-600' :
                 'bg-amber-50 text-amber-700')
              }>
                {req.status === 'onaylandi' ? 'Onaylandi' : req.status === 'reddedildi' ? 'Reddedildi' : 'Bekliyor'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
{activeTab === 'rental' && (
          <div className="max-w-2xl mx-auto">
            {!isMemberLoggedIn ? (
              <div className="bg-white rounded-2xl shadow-xl p-10 border border-slate-100 text-center">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="text-amber-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Uye Girisi Gerekli</h2>
                <p className="text-slate-500 mb-6">Kiralama talebi gonderebilmek icin once uye girisi yapmaniz veya uye olmaniz gerekiyor.</p>
                <button onClick={() => setActiveTab('login')} className="bg-blue-800 text-white font-bold px-8 py-3 rounded-lg hover:bg-blue-900 transition">Uye Girisi / Kayit</button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Aqua Medya Logo" className="h-10 w-10 object-contain" />
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-blue-700" /> Ekipman Kiralama Talebi</h2>
                  </div>
                  <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium flex items-center gap-1"><User size={12}/> {memberName}</span>
                </div>
                {showSuccess && (<div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4 mb-4 flex items-center gap-2"><CheckCircle size={20} /> Talebiniz alindi! Personelimiz en kisa surede sizinle iletisime gececek.</div>)}
                <form onSubmit={handleRentalSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Ekipman Secimi (Birden Fazla Secilebilir)</label>
                    <div className="flex flex-wrap gap-2 mt-2 mb-2">
                      {rentalForm.equipment.map((eq, i) => (
                        <span key={i} className="flex items-center gap-1 bg-cyan-50 text-cyan-800 text-sm font-medium px-3 py-1 rounded-full border border-cyan-200">
                          {eq}
                          <button type="button" onClick={() => setRentalForm({...rentalForm, equipment: rentalForm.equipment.filter((x) => x !== eq)})} className="text-cyan-600 hover:text-red-600 font-bold">×</button>
                        </span>
                      ))}
                      {rentalForm.equipment.length === 0 && (<span className="text-sm text-slate-400">Henuz ekipman secilmedi</span>)}
                    </div>
                    <select value="" onChange={(e) => { if (e.target.value && !rentalForm.equipment.includes(e.target.value)) { setRentalForm({...rentalForm, equipment: [...rentalForm.equipment, e.target.value]}); } }} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">-- Ekipman Ekle --</option>
                      {equipmentList.filter((eq) => !rentalForm.equipment.includes(eq)).map((eq, i) => <option key={i} value={eq}>{eq}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Calendar size={14}/> Tarih</label><input type="date" required value={rentalForm.date} onChange={(e) => setRentalForm({...rentalForm, date: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Clock size={14}/> Saat</label><input type="time" required value={rentalForm.time} onChange={(e) => setRentalForm({...rentalForm, time: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  </div>
                  <div><label className="text-sm font-medium text-slate-700 flex items-center gap-1"><MapPin size={14}/> Teslim Yeri</label><input type="text" required value={rentalForm.deliveryLocation} onChange={(e) => setRentalForm({...rentalForm, deliveryLocation: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ornek: Kadikoy" /></div>
                  <div><label className="text-sm font-medium text-slate-700">Notlar (Opsiyonel)</label><textarea value={rentalForm.notes} onChange={(e) => setRentalForm({...rentalForm, notes: e.target.value})} rows={3} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ek bilgi veya ozel talepleriniz..."></textarea></div>
                  <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-700 transition flex items-center justify-center gap-2"><CheckCircle size={18}/> Talebi Gonder</button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staffLogin' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <div className="text-center mb-6">
              <Shield className="mx-auto text-blue-700 mb-2" size={40} />
              <h2 className="text-2xl font-bold text-slate-800">Personel Girisi</h2>
              <p className="text-slate-500 text-sm">Sadece yetkili personel erisebilir</p>
            </div>
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Kullanici Adi</label>
                <input type="text" required value={staffLoginForm.username} onChange={(e) => setStaffLoginForm({...staffLoginForm, username: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Sifre</label>
                <input type="password" required value={staffLoginForm.password} onChange={(e) => setStaffLoginForm({...staffLoginForm, password: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {staffError && <p className="text-red-600 text-sm">{staffError}</p>}
              <button type="submit" className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">Giris Yap</button>
            </form>
          </div>
        )}

        {activeTab === 'staff' && isStaffLoggedIn && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Shield className="text-blue-700" /> Personel Paneli</h2>
              <button onClick={handleStaffLogout} className="flex items-center gap-2 bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded-lg hover:bg-slate-200 transition"><LogOut size={16}/> Cikis Yap</button>
            </div>

            <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg shadow-sm border border-slate-100 w-fit flex-wrap">
              <button onClick={() => setStaffSubTab('stock')} className={"px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 " + (staffSubTab === 'stock' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-50')}><Package size={14}/> Stok Yonetimi</button>
              {can('requestsView') && (
                <button onClick={() => setStaffSubTab('requests')} className={"px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 " + (staffSubTab === 'requests' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-50')}><Bell size={14}/> Kiralama Talepleri</button>
              )}
              {isAdmin && (
                <button onClick={() => setStaffSubTab('management')} className={"px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 " + (staffSubTab === 'management' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-50')}><Users size={14}/> Personel Yonetimi</button>
              )}
            </div>

            {staffSubTab === 'stock' && (
              <div className="grid md:grid-cols-2 gap-6">
                {can('equipmentAdd') && (
                  <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">{editingId ? <Edit2 size={18}/> : <Plus size={18}/>} {editingId ? 'Ekipmani Duzenle' : 'Yeni Ekipman Ekle'}</h3>
                    <form onSubmit={handleAddOrUpdateEquip} className="space-y-3">
                      <input type="text" required value={newEquip.name} onChange={(e) => setNewEquip({...newEquip, name: e.target.value})} placeholder="Ekipman Adi" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      <select value={newEquip.category} onChange={(e) => setNewEquip({...newEquip, category: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        {Object.keys(categoryIcons).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <textarea value={newEquip.specsText} onChange={(e) => setNewEquip({...newEquip, specsText: e.target.value})} placeholder={"Ozellikler (her satira bir ozellik)"} rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" required value={newEquip.price} onChange={(e) => setNewEquip({...newEquip, price: e.target.value})} placeholder="Fiyat (orn: 500 TL/gun)" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        <input type="number" min="0" required value={newEquip.stock} onChange={(e) => setNewEquip({...newEquip, stock: e.target.value})} placeholder="Stok Adedi" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <input type="text" value={newEquip.videoUrl} onChange={(e) => setNewEquip({...newEquip, videoUrl: e.target.value})} placeholder="Video URL (opsiyonel)" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      <div>
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-slate-50 border border-dashed border-slate-300 rounded-lg px-4 py-3 hover:bg-slate-100">
                          <Upload size={16}/> Fotograf Yukle
                          <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </label>
                        {newEquip.photoPreview && <img src={newEquip.photoPreview} alt="preview" className="mt-2 h-24 rounded-lg object-cover" />}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-blue-800 text-white font-bold py-2 rounded-lg hover:bg-blue-900 transition">{editingId ? 'Guncelle' : 'Ekle'}</button>
                        {editingId && <button type="button" onClick={cancelEdit} className="px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"><X size={18}/></button>}
                      </div>
                    </form>
                  </div>
                )}
                <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6">
                                      <h3 className="font-bold text-lg mb-4">Mevcut Ekipmanlar</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {equipmentCatalog.map((eq) => (
                        <div key={eq.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            {eq.photo ? (
                              <img src={API_URL + eq.photo} alt={eq.name} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                                {React.createElement(categoryIcons[eq.category] || Package, { size: 20, className: "text-blue-600" })}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-800">{Array.isArray(req.item) ? req.item.join(', ') : req.item}</p>
                              <p className="text-xs text-slate-500">{eq.category} · Stok: {eq.stock} · {eq.price}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {can('equipmentEdit') && (
                              <button onClick={() => handleEditEquip(eq)} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"><Edit2 size={14} /></button>
                            )}
                            {can('equipmentDelete') && (
                              <button onClick={() => handleDeleteEquip(eq.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </div>
                      ))}
                      {equipmentCatalog.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-8">Henuz ekipman eklenmemis.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {staffSubTab === 'requests' && can('requestsView') && (
                <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bell size={18} /> Kiralama Talepleri</h3>
                  <div className="space-y-3">
                                      {requests.map((req) => (
                      <div key={req.id} className="border border-slate-100 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                         <p className="font-medium text-slate-800">{Array.isArray(req.item) ? req.item.join(', ') : req.item}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {req.date}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {req.time}</span>
                            <span className="flex items-center gap-1"><MapPin size={12} /> {req.location}</span>
                          </p>
                          {req.notes && <p className="text-xs text-slate-400 mt-1">Not: {req.notes}</p>}
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><User size={12} /> {req.customer}</p>
                          {req.email && <p className="text-xs text-slate-500 mt-1">✉️ {req.email}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={
                            "text-xs font-medium px-3 py-1 rounded-full " +
                            (req.status === 'onaylandi' ? 'bg-green-50 text-green-700' :
                             req.status === 'reddedildi' ? 'bg-red-50 text-red-600' :
                             'bg-amber-50 text-amber-700')
                          }>
                            {req.status === 'onaylandi' ? 'Onaylandi' : req.status === 'reddedildi' ? 'Reddedildi' : 'Bekliyor'}
                          </span>
                          <button onClick={() => downloadRequestAsWord(req)} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition" title="Word olarak indir">
                            <FileText size={14} />
                          </button>
                          {can('requestsManage') && req.status === 'Bekliyor' && (
                            <>
                              <button onClick={() => updateStatus(req._id, 'onaylandi')} className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"><CheckCircle size={14} /></button>
                              <button onClick={() => updateStatus(req._id, 'reddedildi')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><X size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {requests.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">Henuz talep bulunmuyor.</p>
                    )}

                    {requests.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">Henuz talep bulunmuyor.</p>
                    )}
                  </div>
                </div>
              )}

              {staffSubTab === 'management' && isAdmin && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">{editingStaffId ? <Edit2 size={18}/> : <Plus size={18}/>} {editingStaffId ? 'Personeli Duzenle' : 'Yeni Personel Ekle'}</h3>
                    <form onSubmit={handleAddOrUpdateStaff} className="space-y-3">
                      <input type="text" required disabled={!!editingStaffId} value={newStaff.username} onChange={(e) => setNewStaff({...newStaff, username: e.target.value})} placeholder="Kullanici Adi" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" />
                      <input type="text" value={newStaff.displayName} onChange={(e) => setNewStaff({...newStaff, displayName: e.target.value})} placeholder="Gorunen Ad" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      <input type="password" required={!editingStaffId} value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} placeholder={editingStaffId ? "Yeni Sifre (degistirmek icin doldurun)" : "Sifre"} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />

                      <div className="border border-slate-200 rounded-lg p-3">
                        <p className="text-xs font-bold text-slate-500 mb-2">YETKILER</p>
                        <div className="space-y-2">
                          {Object.keys(permissionLabels).map((key) => (
                            <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={!!newStaff.permissions[key]} onChange={() => togglePermission(key)} className="w-4 h-4" />
                              {permissionLabels[key]}
                            </label>
                          ))}
                        </div>
                      </div>

                      {staffFormError && <p className="text-red-600 text-sm">{staffFormError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-blue-800 text-white font-bold py-2 rounded-lg hover:bg-blue-900 transition">{editingStaffId ? 'Guncelle' : 'Ekle'}</button>
                        {editingStaffId && <button type="button" onClick={cancelStaffEdit} className="px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"><X size={18}/></button>}
                      </div>
                    </form>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users size={18} /> Personel Listesi</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {staffList.map((s) => (
                        <div key={s.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-slate-800 text-sm flex items-center gap-2">
                              {s.displayName || s.username}
                              {s.role === 'admin' && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Admin</span>}
                            </p>
                            <p className="text-xs text-slate-500">@{s.username}</p>
                          </div>
                          {s.role !== 'admin' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleEditStaff(s)} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteStaff(s.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>
                      ))}
                      {staffList.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-8">Henuz personel bulunmuyor.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="bg-slate-900 text-slate-400 text-center py-6 text-sm mt-12">
          © 2026 Aqua Medya. Tum haklari saklidir.
        </footer>
      </div>
    );
  }

  export default App;





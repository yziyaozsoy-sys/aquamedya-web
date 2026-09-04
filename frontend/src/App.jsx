import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Calendar, MapPin, Clock, User, Lock, Package, Bell, CheckCircle, Phone, Mail, Building2, Video, Mic, Lightbulb, Move3d, ScreenShare, Star, Upload, Image as ImageIcon, Trash2, Edit2, Plus, X, Shield, Users } from 'lucide-react';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

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

  const [rentalForm, setRentalForm] = useState({ equipment: '', date: '', time: '', deliveryLocation: '', notes: '' });
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
      setRequests(res.data);
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
  useEffect(() => { if (isStaffLoggedIn) fetchRequests(); }, [staffToken]);
  useEffect(() => { if (staffSubTab === 'management') fetchStaffList(); }, [staffSubTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.email && loginForm.password) {
      setIsLoggedIn(true);
      setActiveTab('rental');
    }
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
    try {
      await axios.post(API_URL + '/api/requests', {
        item: rentalForm.equipment,
        date: rentalForm.date,
        time: rentalForm.time,
        location: rentalForm.deliveryLocation,
        notes: rentalForm.notes,
        customer: loginForm.email || 'Misafir Kullanici'
      });
      setShowSuccess(true);
      setRentalForm({ equipment: '', date: '', time: '', deliveryLocation: '', notes: '' });
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (e) {
      alert('Talep gonderilemedi, backend calisiyor mu kontrol edin.');
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!can('requestsManage')) return;
    try {
      await axios.put(API_URL + '/api/requests/' + id, { status: newStatus }, authHeader);
      fetchRequests();
    } catch (e) { console.error(e); }
  };

  const handleRentClick = (equipmentName) => {
    setRentalForm({ ...rentalForm, equipment: equipmentName });
    setActiveTab('rental');
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
            <div className="bg-white rounded-full p-2"><Camera className="text-blue-900" size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold">Aqua Medya</h1>
              <p className="text-xs text-cyan-100">Produksiyon Ekipman Kiralama</p>
            </div>
          </div>
          <nav className="flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab('home')} className={"px-4 py-2 rounded-lg font-medium transition " + (activeTab === 'home' ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}>Ana Sayfa</button>
            <button onClick={() => setActiveTab('catalog')} className={"px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 " + (activeTab === 'catalog' ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}><Package size={16} /> Ekipman Katalogu</button>
            <button onClick={() => setActiveTab('login')} className={"px-4 py-2 rounded-lg font-medium transition " + (activeTab === 'login' ? 'bg-white text-blue-900' : 'bg-blue-800/50 hover:bg-blue-800')}>Uye Girisi</button>
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
                        <button onClick={() => handleRentClick(eq.name)} disabled={eq.stock === 0} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (eq.stock > 0 ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed')}>Hemen Kirala</button>
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
            <div className="text-center mb-6"><Lock className="mx-auto text-blue-700 mb-2" size={40} /><h2 className="text-2xl font-bold text-slate-800">Uye Girisi</h2><p className="text-slate-500 text-sm">Kiralama islemleri icin giris yapin</p></div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="text-sm font-medium text-slate-700">E-posta</label><input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ornek@sirket.com" /></div>
              <div><label className="text-sm font-medium text-slate-700">Sifre</label><input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="********" /></div>
              <button type="submit" className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">Giris Yap</button>
            </form>
          </div>
        )}

        {activeTab === 'rental' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Package className="text-blue-700" /> Ekipman Kiralama Talebi</h2>
            {showSuccess && (<div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4 mb-4 flex items-center gap-2"><CheckCircle size={20} /> Talebiniz alindi! Personelimiz en kisa surede sizinle iletisime gececek.</div>)}
            <form onSubmit={handleRentalSubmit} className="space-y-4">
              <div><label className="text-sm font-medium text-slate-700">Ekipman Secimi</label>
                <select required value={rentalForm.equipment} onChange={(e) => setRentalForm({...rentalForm, equipment: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Ekipman Secin --</option>
                  {equipmentList.map((eq, i) => <option key={i} value={eq}>{eq}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Calendar size={14}/> Tarih</label><input type="date" required value={rentalForm.date} onChange={(e) => setRentalForm({...rentalForm, date: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Clock size={14}/> Saat</label><input type="time" required value={rentalForm.time} onChange={(e) => setRentalForm({...rentalForm, time: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div><label className="text-sm font-medium text-slate-700 flex items-center gap-1"><MapPin size={14}/> Teslim Yeri</label><input type="text" required value={rentalForm.deliveryLocation} onChange={(e) => setRentalForm({...rentalForm, deliveryLocation: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ornek: Kadikoy Set Alani" /></div>
              <div><label className="text-sm font-medium text-slate-700">Not (opsiyonel)</label><textarea value={rentalForm.notes} onChange={(e) => setRentalForm({...rentalForm, notes: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows="3" placeholder="Ek bilgi..."></textarea></div>
              <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-700 transition">Talebi Gonder</button>
            </form>
          </div>
        )}

        {activeTab === 'staffLogin' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <div className="text-center mb-6"><Shield className="mx-auto text-blue-700 mb-2" size={40} /><h2 className="text-2xl font-bold text-slate-800">Personel Girisi</h2><p className="text-slate-500 text-sm">Stok yonetimi ve talep paneline erismek icin giris yapin</p></div>
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div><label className="text-sm font-medium text-slate-700">Kullanici Adi</label><input type="text" required value={staffLoginForm.username} onChange={(e) => setStaffLoginForm({...staffLoginForm, username: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="admin" /></div>
              <div><label className="text-sm font-medium text-slate-700">Sifre</label><input type="password" required value={staffLoginForm.password} onChange={(e) => setStaffLoginForm({...staffLoginForm, password: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="********" /></div>
              {staffError && <p className="text-red-600 text-sm">{staffError}</p>}
              <button type="submit" className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">Giris Yap</button>
            </form>
          </div>
        )}

        {activeTab === 'staff' && isStaffLoggedIn && (
          <div>
            <div className="flex gap-2 mb-6 flex-wrap items-center">
              <button onClick={() => setStaffSubTab('stock')} className={"px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 " + (staffSubTab === 'stock' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700')}><Package size={16}/> Stok Yonetimi</button>
              {can('requestsView') && (
                <button onClick={() => setStaffSubTab('requests')} className={"px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 " + (staffSubTab === 'requests' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700')}><Bell size={16}/> Kiralama Talepleri</button>
              )}
              {isAdmin && (
                <button onClick={() => setStaffSubTab('management')} className={"px-4 py-2 rounded-lg font-medium transition flex items-center gap-1 " + (staffSubTab === 'management' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700')}><Users size={16}/> Personel Yonetimi</button>
              )}
              <button onClick={handleStaffLogout} className="ml-auto px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200">Cikis Yap</button>
            </div>

            {staffSubTab === 'stock' && (
              <div className="space-y-6">
                {can('equipmentAdd') && (
                  <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      {editingId ? <Edit2 className="text-blue-700" /> : <Plus className="text-blue-700" />}
                      {editingId ? 'Ekipmani Duzenle' : 'Yeni Ekipman Ekle'}
                    </h2>
                    <form onSubmit={handleAddOrUpdateEquip} className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Ekipman Adi</label>
                        <input type="text" required value={newEquip.name} onChange={(e) => setNewEquip({...newEquip, name: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ornek: Canon C300 Mark III" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Kategori</label>
                        <select value={newEquip.category} onChange={(e) => setNewEquip({...newEquip, category: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                          {Object.keys(categoryIcons).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Gunluk Fiyat</label>
                        <input type="text" required value={newEquip.price} onChange={(e) => setNewEquip({...newEquip, price: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ornek: 2.000 TL/gun" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Stok Adedi</label>
                        <input type="number" min="0" required value={newEquip.stock} onChange={(e) => setNewEquip({...newEquip, stock: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Teknik Ozellikler (her satira bir ozellik)</label>
                        <textarea value={newEquip.specsText} onChange={(e) => setNewEquip({...newEquip, specsText: e.target.value})} rows="4" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={"4K kayit\nSuper 35 Sensor\nXLR ses girisi"}></textarea>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><ImageIcon size={14}/> Fotograf Yukle</label>
                        <div className="mt-1 flex items-center gap-3">
                          <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
                            <Upload size={16} /> Dosya Sec
                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                          </label>
                          {newEquip.photoPreview && <img src={newEquip.photoPreview} alt="onizleme" className="w-14 h-14 rounded-lg object-cover border" />}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Video size={14}/> Tanitim Videosu (URL)</label>
                        <input type="text" value={newEquip.videoUrl} onChange={(e) => setNewEquip({...newEquip, videoUrl: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://... (opsiyonel video linki)" />
                      </div>
                      <div className="md:col-span-2 flex gap-3">
                        <button type="submit" className="flex-1 bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-700 transition">
                          {editingId ? 'Guncelle' : 'Ekipmani Ekle'}
                        </button>
                        {editingId && (
                          <button type="button" onClick={cancelEdit} className="flex items-center gap-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"><X size={16}/> Iptal</button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Package className="text-blue-700" /> Mevcut Stok Listesi ({equipmentCatalog.length} urun)</h2>
                  <div className="space-y-3">
                    {equipmentCatalog.map((eq) => {
                      const IconComp = categoryIcons[eq.category] || Package;
                      return (
                        <div key={eq.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-3 hover:shadow-md transition flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-700 to-cyan-500 flex items-center justify-center overflow-hidden shrink-0">
                              {eq.photo ? <img src={API_URL + eq.photo} className="w-full h-full object-cover" alt="" /> : <IconComp className="text-white" size={22} />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{eq.name}</p>
                              <p className="text-xs text-slate-500">{eq.category} - {eq.price} - Stok: <span className={eq.stock > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{eq.stock}</span></p>
                            </div>
                          </div>
                          {(can('equipmentEdit') || can('equipmentDelete')) && (
                            <div className="flex gap-2">
                              {can('equipmentEdit') && (
                                <button onClick={() => handleEditEquip(eq)} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"><Edit2 size={16} /></button>
                              )}
                              {can('equipmentDelete') && (
                                <button onClick={() => handleDeleteEquip(eq.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={16} /></button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {staffSubTab === 'requests' && can('requestsView') && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2"><Bell className="text-blue-700" /> Kiralama Talepleri</h2>
                <p className="text-slate-500 text-sm mb-6">Gelen kiralama taleplerini buradan goruntuleyip yonetebilirsiniz.</p>
                <div className="space-y-4">
                  {requests.length === 0 && <p className="text-slate-400 text-sm">Henuz talep bulunmuyor.</p>}
                  {requests.map((req) => (
                    <div key={req.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div><h3 className="font-bold text-slate-800">{req.item}</h3><p className="text-sm text-slate-500 flex items-center gap-1"><User size={14}/> {req.customer}</p></div>
                        <span className={"px-3 py-1 rounded-full text-xs font-bold " + (req.status === 'Onaylandi' ? 'bg-green-100 text-green-700' : req.status === 'Reddedildi' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>{req.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-sm text-slate-600">
                        <p className="flex items-center gap-1"><Calendar size={14}/> {req.date}</p>
                        <p className="flex items-center gap-1"><Clock size={14}/> {req.time}</p>
                        <p className="flex items-center gap-1"><MapPin size={14}/> {req.location}</p>
                      </div>
                      {can('requestsManage') && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => updateStatus(req.id, 'Onaylandi')} className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700">Onayla</button>
                          <button onClick={() => updateStatus(req.id, 'Reddedildi')} className="text-xs bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700">Reddet</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {staffSubTab === 'management' && isAdmin && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    {editingStaffId ? <Edit2 className="text-blue-700" /> : <Plus className="text-blue-700" />}
                    {editingStaffId ? 'Personeli Duzenle' : 'Yeni Personel Ekle'}
                  </h2>
                  {staffFormError && <p className="text-red-600 text-sm mb-3">{staffFormError}</p>}
                  <form onSubmit={handleAddOrUpdateStaff} className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Kullanici Adi</label>
                      <input type="text" required disabled={!!editingStaffId} value={newStaff.username} onChange={(e) => setNewStaff({...newStaff, username: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" placeholder="Ornek: mehmet" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Ad Soyad</label>
                      <input type="text" value={newStaff.displayName} onChange={(e) => setNewStaff({...newStaff, displayName: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ornek: Mehmet Yilmaz" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Sifre {editingStaffId && '(bos birakilirsa degismez)'}</label>
                      <input type="password" required={!editingStaffId} value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="********" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Yetkiler</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(permissionLabels).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg cursor-pointer">
                            <input type="checkbox" checked={!!newStaff.permissions[key]} onChange={() => togglePermission(key)} className="w-4 h-4" />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 flex gap-3">
                      <button type="submit" className="flex-1 bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-700 transition">
                        {editingStaffId ? 'Guncelle' : 'Personel Ekle'}
                      </button>
                      {editingStaffId && (
                        <button type="button" onClick={cancelStaffEdit} className="flex items-center gap-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"><X size={16}/> Iptal</button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="text-blue-700" /> Personel Listesi ({staffList.length})</h2>
                  <div className="space-y-3">
                    {staffList.map((s) => (
                      <div key={s.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <p className="font-bold text-slate-800">{s.displayName || s.username} <span className="text-xs text-slate-400">({s.username})</span></p>
                            <p className="text-xs text-slate-500">{s.role === 'admin' ? 'Admin' : 'Personel'}</p>
                          </div>
                          {s.role !== 'admin' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleEditStaff(s)} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteStaff(s.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={16} /></button>
                            </div>
                          )}
                        </div>
                        {s.role !== 'admin' && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(permissionLabels).map(([key, label]) => (
                              s.permissions?.[key] && (
                                <span key={key} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{label}</span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </main>
      </div>
    );
  }

  export default App;

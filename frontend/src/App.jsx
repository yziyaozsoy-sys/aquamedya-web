import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Camera, Calendar, MapPin, Clock, User, Package, Bell, CheckCircle, 
  Phone, Mail, Building2, Video, Mic, Lightbulb, Move3d, ScreenShare, Star, 
  Upload, Trash2, Edit2, Plus, X, Shield, Users, LogOut, AlertTriangle, 
  FileText, AlertCircle, Check, Sparkles, Film, Cookie, Info, Award, Play, KeyRound
} from 'lucide-react';
import { generateRentalPDF } from './generateRentalContract';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const getImageUrl = (imagePath) => {
  if (!imagePath) return '/logo.png';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${API_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

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
  equipmentEdit: 'Ekipman Düzenleme',
  equipmentDelete: 'Ekipman Silme',
  requestsView: 'Talep Görüntüleme',
  requestsManage: 'Talep Onaylama/Reddetme',
  viewFinances: 'Finansal Raporları ve Fiyat Toplamlarını Görme'
};

const emptyPermissions = { 
  equipmentView: true, equipmentAdd: false, equipmentEdit: false, 
  equipmentDelete: false, requestsView: false, requestsManage: false, viewFinances: false
};

function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'catalog' | 'references' | 'rental' | 'login' | 'staff' | 'staffLogin' | 'myRequests'
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // KVKK, Çerez & Hakkımızda Modalları
  const [legalModal, setLegalModal] = useState(null);
  const [cookieConsent, setCookieConsent] = useState(() => localStorage.getItem('aqua_cookie_consent') === 'true');

  const handleAcceptCookies = () => {
    localStorage.setItem('aqua_cookie_consent', 'true');
    setCookieConsent(true);
  };

  const getEmbedYoutubeUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
    else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1]?.split('&')[0];
    else if (url.includes('embed/')) videoId = url.split('embed/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url;
  };

  // Referanslar State
  const [references, setReferences] = useState([]);
  const [refFilter, setRefFilter] = useState('Tümü');
  const emptyRefForm = { title: '', client: '', category: 'Reklam', description: '', videoUrl: '', photoFile: null, photoPreview: null };
  const [newRef, setNewRef] = useState(emptyRefForm);
  const [editingRefId, setEditingRefId] = useState(null);

  // Üyelik State
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

  // Şifremi Unuttum State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email gir, 2: Kod ve Yeni Şifre
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetMsg, setResetMsg] = useState({ error: '', success: '' });
  const [resetLoading, setResetLoading] = useState(false);

  // Personel / Admin State
  const [staffToken, setStaffToken] = useState(localStorage.getItem('staff_token') || '');
  const [staffRole, setStaffRole] = useState(localStorage.getItem('staff_role') || '');
  const [staffDisplayName, setStaffDisplayName] = useState(localStorage.getItem('staff_displayName') || '');
  const [staffPermissions, setStaffPermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('staff_permissions') || 'null'); } catch (e) { return null; }
  });
  const [staffLoginForm, setStaffLoginForm] = useState({ username: '', password: '' });
  const [staffSubTab, setStaffSubTab] = useState('stock'); // 'stock' | 'references' | 'requests' | 'management'
  const [staffError, setStaffError] = useState('');

  const [requests, setRequests] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [requestPeriod, setRequestPeriod] = useState('all');

  // ✅ KRİTİK DÜZELTME: Süper Admin de tam yetkili Admindir!
  const isStaffLoggedIn = !!staffToken;
  const isAdmin = staffRole === 'admin' || staffRole === 'superadmin';

  const authHeader = { headers: { Authorization: 'Bearer ' + staffToken } };
  const memberAuthHeader = { headers: { Authorization: 'Bearer ' + memberToken } };

  const can = (permKey) => isAdmin || !!(staffPermissions && staffPermissions[permKey]);

  const deleteRequest = async (requestId) => {
    if (!window.confirm("Bu kiralama talebini silmek istediğinize emin misiniz?")) return;
    try {
      if (staffToken) {
        await axios.delete(`${API_URL}/api/requests/${requestId}`, authHeader);
      }
    } catch (e) { console.error(e); }
    setRequests(prev => prev.filter(r => (r._id || r.id) !== requestId));
  };

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

  const [deliveryType, setDeliveryType] = useState('MERKEZ');
  const [rentalForm, setRentalForm] = useState({ equipment: [], date: '', time: '', deliveryLocation: '', notes: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [currency, setCurrency] = useState('₺');
  
  const [conflictModal, setConflictModal] = useState({ isOpen: false, step: 1, requestId: null, data: null });

  const emptyNewEquip = { name: '', category: 'Kamera', specsText: '', price: '', stock: 1, photoFile: null, photoPreview: null, videoUrl: '' };
  const [newEquip, setNewEquip] = useState(emptyNewEquip);
  const [editingId, setEditingId] = useState(null);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('Tümü');
  const [staffList, setStaffList] = useState([]);
  const emptyNewStaff = { username: '', password: '', displayName: '', permissions: Object.assign({}, emptyPermissions) };
  const [newStaff, setNewStaff] = useState(emptyNewStaff);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffFormError, setStaffFormError] = useState('');

  const fetchReferences = async () => {
    try {
      const res = await axios.get(API_URL + '/api/references');
      setReferences(res.data);
    } catch (e) {
      console.error('Referanslar alınamadı', e);
    }
  };

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

  const fetchEquipment = async () => {
    try {
      const res = await axios.get(API_URL + '/api/equipment');
      setEquipmentCatalog(res.data);
    } catch (e) { console.error('Ekipman listesi alınamadı', e); }
  };

  const fetchRequests = async () => {
    if (!staffToken || !can('requestsView')) return;
    try {
      const res = await axios.get(API_URL + '/api/requests', authHeader);
      setRequests([...res.data].sort((a, b) => (b._id > a._id ? 1 : -1)));
    } catch (e) { console.error('Talepler alınamadı', e); }
  };

    const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem('staff_token') || staffToken;
      if (!token) {
        console.warn('Oturum tokenı bulunamadı');
        return;
      }
      const res = await axios.get(API_URL + '/api/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(res.data);
      setStaffFormError(''); // ✅ Başarılı olunca o kırmızı hatayı silsin!
    } catch (e) {
      console.error('Personel listesi hatası:', e.response?.data || e.message);
      setStaffFormError(e.response?.data?.error || 'Personel listesi alınamadı.');
    }
  };

  useEffect(() => { 
    fetchEquipment(); 
    fetchReferences();
  }, []);

  useEffect(() => {
    if (!isStaffLoggedIn) return;
    fetchRequests();
    const interval = setInterval(() => { fetchRequests(); }, 8000);
    return () => clearInterval(interval);
  }, [staffToken]);

  useEffect(() => { 
    if (staffSubTab === 'management') fetchStaffList(); 
  }, [staffSubTab, staffRole]);

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
      setMemberError((err.response && err.response.data && err.response.data.error) || 'İşlem başarısız oldu.');
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

  // Şifremi Unuttum Fonksiyonları
  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setResetMsg({ error: '', success: '' });
    setResetLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/member/forgot-password`, { email: resetEmail });
      setResetMsg({ error: '', success: res.data.message || 'Doğrulama kodu e-postanıza iletildi.' });
      setForgotStep(2);
    } catch (err) {
      setResetMsg({ error: err.response?.data?.error || 'Kod gönderilemedi.', success: '' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    setResetMsg({ error: '', success: '' });
    setResetLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/member/reset-password`, {
        email: resetEmail,
        code: resetCode,
        newPassword: newResetPassword
      });
      setResetMsg({ error: '', success: res.data.message || 'Şifreniz başarıyla güncellendi!' });
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotStep(1);
        setResetEmail('');
        setResetCode('');
        setNewResetPassword('');
        setResetMsg({ error: '', success: '' });
        setActiveTab('login');
      }, 2000);
    } catch (err) {
      setResetMsg({ error: err.response?.data?.error || 'Şifre güncellenemedi.', success: '' });
    } finally {
      setResetLoading(false);
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
      setStaffError('Kullanıcı adı veya şifre hatalı.');
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
      alert('Lütfen en az bir ekipman seçin.');
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
        alert('Oturumunuzun süresi dolmuş, lütfen tekrar giriş yapın.');
        setActiveTab('login');
      } else {
        alert('Talep gönderilemedi, lütfen tekrar deneyin.');
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
        setConflictModal({ isOpen: true, step: 1, requestId: id, data: err.response.data });
      } else {
        alert((err.response && err.response.data && err.response.data.error) || 'İşlem başarısız oldu.');
      }
    }
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
    const finalCategory = (isNewCategory && customCategory.trim()) ? customCategory.trim() : newEquip.category;
    const cleanPrice = parseFloat(String(newEquip.price || 0).replace(',', '.').replace(/[^0-9.]/g, '')) || 0;

    const formData = new FormData();
    formData.append('name', newEquip.name);
    formData.append('category', finalCategory);
    formData.append('price', cleanPrice);
    formData.append('currency', currency || '₺');
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
    const parsedPrice = eq.price ? String(eq.price).replace(/[^0-9.,]/g, '').trim() : '';
    const detectedCurrency = String(eq.price).includes('$') ? '$' : String(eq.price).includes('€') ? '€' : '₺';
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
      photoPreview: eq.photo ? getImageUrl(eq.photo) : null,
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

  // REFERANS İŞLEMLERİ
  const handleRefPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewRef({ ...newRef, photoFile: file, photoPreview: URL.createObjectURL(file) });
    }
  };

  const handleAddOrUpdateReference = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newRef.title);
    formData.append('client', newRef.client);
    formData.append('category', newRef.category);
    formData.append('description', newRef.description);
    formData.append('videoUrl', newRef.videoUrl);
    if (newRef.photoFile) formData.append('photo', newRef.photoFile);

    try {
      if (editingRefId) {
        await axios.put(`${API_URL}/api/references/${editingRefId}`, formData, {
          headers: Object.assign({}, authHeader.headers, { 'Content-Type': 'multipart/form-data' })
        });
        setEditingRefId(null);
      } else {
        await axios.post(`${API_URL}/api/references`, formData, {
          headers: Object.assign({}, authHeader.headers, { 'Content-Type': 'multipart/form-data' })
        });
      }
      setNewRef(emptyRefForm);
      fetchReferences();
    } catch (err) {
      alert('Referans kaydedilemedi. Backend rotasını kontrol edin.');
    }
  };

  const handleEditRef = (r) => {
    setEditingRefId(r._id || r.id);
    setNewRef({
      title: r.title,
      client: r.client || '',
      category: r.category || 'Reklam',
      description: r.description || '',
      videoUrl: r.videoUrl || '',
      photoFile: null,
      photoPreview: r.photo ? getImageUrl(r.photo) : null
    });
  };

  const handleDeleteRef = async (id) => {
    if (!confirm('Bu referansı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/references/${id}`, authHeader);
      fetchReferences();
    } catch (err) {
      alert('Referans silinemedi.');
    }
  };

  const cancelRefEdit = () => {
    setEditingRefId(null);
    setNewRef(emptyRefForm);
  };

  // PERSONEL YÖNETİMİ
  const togglePermission = (key) => {
    setNewStaff(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));
  };

   const handleAddOrUpdateStaff = async (e) => {
    e.preventDefault();
    setStaffFormError('');
    try {
      const token = localStorage.getItem('staff_token') || staffToken;
      const currentAuth = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (editingStaffId) {
        const payload = { displayName: newStaff.displayName, permissions: newStaff.permissions };
        if (newStaff.password && newStaff.password.trim() !== '') {
          payload.password = newStaff.password.trim();
        }
        await axios.put(API_URL + '/api/staff/' + editingStaffId, payload, currentAuth);
        setEditingStaffId(null);
      } else {
        await axios.post(API_URL + '/api/staff', newStaff, currentAuth);
      }
      setNewStaff(emptyNewStaff);
      fetchStaffList();
    } catch (err) {
      setStaffFormError((err.response && err.response.data && err.response.data.error) || 'İşlem başarısız oldu.');
    }
  };

  const handleEditStaff = (s) => {
    setEditingStaffId(s._id || s.id);
    setNewStaff({
      username: s.username,
      password: '', // Şifre değiştirilmek istenirse doldurulur
      displayName: s.displayName || '',
      permissions: Object.assign({}, emptyPermissions, s.permissions || {})
    });
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(API_URL + '/api/staff/' + id, authHeader);
      fetchStaffList();
    } catch (e) { alert('Silme başarısız: ' + (e.response?.data?.error || 'Yetkiniz yok')); }
  };

  const cancelStaffEdit = () => { setEditingStaffId(null); setNewStaff(emptyNewStaff); setStaffFormError(''); };

  const equipmentList = equipmentCatalog.map(e => e.name);

  const formatEquipmentPrice = (item) => {
    if (!item) return '0';
    const rawPrice = item.price ?? item.dailyPrice ?? item.daily_price ?? item.kiraBedeli ?? item.cost;
    if (rawPrice === undefined || rawPrice === null || rawPrice === '') return '0';
    const strVal = String(rawPrice).replace(',', '.');
    const match = strVal.match(/[\d.]+/);
    if (!match) return '0';
    const num = parseFloat(match[0]);
    return isNaN(num) ? '0' : num.toLocaleString('tr-TR');
  };

  const calculateSafeTotals = () => {
    let subtotal = 0;
    const reqList = Array.isArray(filteredRequests) ? filteredRequests : [];
    const cleanStr = (s) => String(s || '').toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '');

    reqList.forEach((req) => {
      const directPrice = parseFloat(String(req.totalPrice || req.price || req.amount || req.total || 0).replace(/[^0-9.]/g, ''));
      if (directPrice > 0) {
        subtotal += directPrice;
        return;
      }

      let rawItems = req.equipment || req.item || req.items || req.equipmentName || '';
      let itemList = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'string' ? rawItems.split(',') : []);

      itemList.forEach((itemObj) => {
        let itemName = typeof itemObj === 'string' ? itemObj.trim() : (itemObj?.name || itemObj?.title || '');
        if (!itemName) return;
        const normItem = cleanStr(itemName);

        let foundInCat = equipmentCatalog.find((eq) => {
          if (!eq) return false;
          const eqName = cleanStr(eq.name || eq.title || '');
          return eqName && (eqName.includes(normItem) || normItem.includes(eqName));
        });

        if (foundInCat && (foundInCat.price || foundInCat.dailyPrice)) {
          const p = parseFloat(String(foundInCat.price || foundInCat.dailyPrice).replace(/[^0-9.]/g, ''));
          if (p > 0) {
            subtotal += p;
            return;
          }
        }
        subtotal += 1500;
      });
    });

    const kdv = Math.round(subtotal * 0.20);
    const grandTotal = Math.round(subtotal + kdv);
    return { subtotal, kdv, grandTotal };
  };

  const reportStats = calculateSafeTotals();

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-purple-600 selection:text-white font-sans antialiased relative overflow-x-hidden flex flex-col justify-between">
      {/* ARKA PLAN AMBİYANS IŞIKLARI */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="fixed bottom-1/3 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div>
        {/* HEADER */}
        <header className="bg-[#0b0f19]/80 backdrop-blur-md border-b border-purple-900/30 text-white sticky top-0 z-40 transition shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <img src="/logo.png" alt="Aqua Medya Logo" className="relative h-11 w-11 object-contain bg-slate-900 rounded-full p-1 border border-purple-500/30" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-cyan-200 to-purple-400 bg-clip-text text-transparent">
                  AQUA MEDYA
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-purple-300/80 font-bold flex items-center gap-1">
                  <Film size={11} className="text-cyan-400" /> Cine Production Studio
                </p>
              </div>
            </div>

            <nav className="flex gap-2 flex-wrap items-center">
              <button 
                onClick={() => setActiveTab('home')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'home' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/30' 
                    : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                Ana Sayfa
              </button>

              <button 
                onClick={() => setActiveTab('catalog')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'catalog' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/30' 
                    : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                <Package size={14} className="text-cyan-400" /> Ekipmanlar
              </button>

              <button 
                onClick={() => setActiveTab('references')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'references' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/30' 
                    : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                <Award size={14} className="text-amber-400" /> Referanslar
              </button>

              <button 
                onClick={() => setActiveTab('rental')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'rental' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/30' 
                    : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                <span>Kiralama</span>
                {rentalForm.equipment.length > 0 && (
                  <span className="bg-cyan-500 text-slate-950 text-[11px] px-1.5 py-0.2 rounded-full font-black">
                    {rentalForm.equipment.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('login')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'login' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/30' 
                    : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                <User size={14} className="text-purple-400" /> 
                {isMemberLoggedIn ? memberName.split(' ')[0] : 'Üye Girişi'}
              </button>

              <button 
                onClick={() => setActiveTab(isStaffLoggedIn ? 'staff' : 'staffLogin')} 
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  (activeTab === 'staff' || activeTab === 'staffLogin') 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white ring-2 ring-purple-400/40 shadow-lg shadow-purple-900/50' 
                    : 'bg-slate-950 text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-900/40'
                }`}
              >
                <Shield size={14} className="text-purple-400" /> 
                Panel {isStaffLoggedIn && `(${staffDisplayName || staffRole})`}
              </button>
            </nav>
          </div>
        </header>

        {/* 2 KADEMELİ ÇAKIŞMA UYARI MODALI */}
        {conflictModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0f1424] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-500/30 animate-in fade-in zoom-in duration-200">
              {conflictModal.step === 1 ? (
                <div className="p-6 sm:p-8">
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-5 text-amber-400">
                    <AlertTriangle size={30} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Çifte Rezervasyon Uyarısı!</h3>
                  <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                    Bu talepteki ekipman(lar) için aynı tarih ve saatte <b className="text-amber-300">zaten onaylanmış başka bir kiralama mevcut!</b>
                  </p>

                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2 mb-6 text-amber-200">
                    <p><b className="text-white">Çakışan Ekipman(lar):</b> {conflictModal.data?.conflictingItems?.join(', ')}</p>
                    <p><b className="text-white">Çakışan Müşteri:</b> {conflictModal.data?.conflictingCustomer}</p>
                    <p><b className="text-white">Tarih / Saat:</b> {conflictModal.data?.date} - {conflictModal.data?.time}</p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setConflictModal({ isOpen: false, step: 1, requestId: null, data: null })} className="px-5 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 text-xs transition border border-slate-700">Vazgeç</button>
                    <button onClick={() => setConflictModal(prev => ({ ...prev, step: 2 }))} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20">
                      Devam Et (Yine de Onayla)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8 bg-red-950/20">
                  <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-5 text-rose-400">
                    <AlertCircle size={30} />
                  </div>
                  <h3 className="text-xl font-bold text-rose-300 mb-2">KESİN ONAY: Çifte Rezervasyon Oluşturulacak!</h3>
                  <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                    Bu işlemi tamamlarsanız sistemde çakışma kaydı açılacak, müşteriye <b>resmi onay e-postası</b> gidecek ve operasyon loglarında <b className="text-rose-400">"Çakışma Göz Ardı Edildi"</b> olarak arşivlenecektir.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setConflictModal({ isOpen: false, step: 1, requestId: null, data: null })} className="px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-700">İptal</button>
                    <button onClick={() => updateStatus(conflictModal.requestId, 'Onaylandı', true)} className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-rose-900/50">
                      Evet, Sorumluluğu Alıyorum ve Onaylıyorum
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {/* ANA SAYFA */}
          {activeTab === 'home' && (
            <div className="space-y-12">
              <div className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden border border-purple-500/20 shadow-2xl bg-gradient-to-b from-[#0e1426] via-[#0c1020] to-[#080b14]">
                <div className="relative z-10 max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-900/60 to-purple-900/60 border border-purple-400/30 text-purple-200 text-xs uppercase tracking-widest font-black px-4 py-1.5 rounded-full mb-6 shadow-inner">
                    <Sparkles size={13} className="text-cyan-400" /> Üst Düzey Sinema ve Reklam Prodüksiyonu
                  </div>
                  
                  <h2 className="text-3xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                    Vizyonunuz İçin En İleri Prodüksiyon Ekipmanları
                  </h2>
                  
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-10 max-w-2xl mx-auto font-normal">
                    Arri Alexa, Red Komodo, Sony FX serisi ve profesyonel set aydınlatma sistemleri. Projenize özel esnek kiralama ve sete teslimat ayrıcalığı.
                  </p>

                  <div className="flex gap-4 justify-center flex-wrap">
                    <button 
                      onClick={() => setActiveTab('catalog')} 
                      className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition border border-purple-400/30"
                    >
                      <Package size={18} className="text-cyan-300 group-hover:rotate-6 transition" /> 
                      <span>Ekipman Kataloğunu İncele</span>
                    </button>

                    <button 
                      onClick={() => setActiveTab('references')} 
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm bg-slate-900/90 text-amber-300 hover:text-white hover:bg-slate-800 transition border border-amber-500/30 shadow-lg"
                    >
                      <Award size={18} />
                      <span>Referans Projelerimiz</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-[#0b0f1b]/90 rounded-3xl p-7 border border-purple-900/20 hover:border-purple-500/40 transition duration-300 shadow-xl group">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-cyan-400 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition">
                    <Package size={26} />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">Seçkin Envanter</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Arri, Sony CineAlta, Red, Cooke ve Aputure gibi sektör standardı sinema kameraları ve profesyonel ışık kuleleri.
                  </p>
                </div>

                <div className="bg-[#0b0f1b]/90 rounded-3xl p-7 border border-purple-900/20 hover:border-purple-500/40 transition duration-300 shadow-xl group">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition">
                    <Building2 size={26} />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">Merkezden Hızlı Teslim</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Kağıthane Z Ofis operasyon merkezimizden test edilip kalibre edilmiş olarak hemen teslim alma imkânı.
                  </p>
                </div>

                <div className="bg-[#0b0f1b]/90 rounded-3xl p-7 border border-purple-900/20 hover:border-purple-500/40 transition duration-300 shadow-xl group">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition">
                    <MapPin size={26} />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">Sete VIP Sevkiyat</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    İstanbul genelindeki dizi, klip ve reklam set lokasyonlarınıza randevulu güvenli araç teslimatı.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* REFERANSLARIMIZ VİTRİNİ */}
          {activeTab === 'references' && (
            <div>
              <div className="mb-8 text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3">
                  <Award size={14} /> Gurur Tablomuz
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  Referanslarımız & Çekilen Projeler
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-2">
                  Aqua Medya ekipmanlarıyla hayata geçirilen televizyon dizileri, sinema filmleri, reklam kampanyaları ve müzik klipleri.
                </p>
              </div>

              {/* Kategori Filtresi */}
              <div className="flex justify-center items-center gap-2 overflow-x-auto pb-4 mb-8">
                {['Tümü', 'Dizi', 'Sinema', 'Reklam', 'Müzik Klibi'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setRefFilter(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                      refFilter === cat
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-400/50 shadow-lg shadow-purple-950/50'
                        : 'bg-[#0c101c] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Referans Kartları */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {references
                  .filter((r) => refFilter === 'Tümü' || r.category === refFilter)
                  .map((item) => (
                    <div 
                      key={item._id || item.id} 
                      className="bg-[#0b0f19] rounded-3xl border border-slate-800/80 hover:border-purple-500/50 transition duration-300 overflow-hidden flex flex-col justify-between group shadow-xl"
                    >
                      <div className="relative aspect-video bg-[#070a12] overflow-hidden">
                        {item.photo ? (
                          <img 
                            src={getImageUrl(item.photo)} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700">
                            <Film size={48} />
                          </div>
                        )}

                        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider font-extrabold text-amber-300 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30">
                          {item.category}
                        </span>

                        {item.videoUrl && (
                          <button
                            type="button"
                            onClick={() => setActiveVideoModal({
                              title: item.title,
                              url: getEmbedYoutubeUrl(item.videoUrl)
                            })}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-2 font-bold text-xs"
                          >
                            <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-900/50">
                              <Play size={20} className="fill-white ml-0.5" />
                            </div>
                          </button>
                        )}
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          {item.client && (
                            <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                              {item.client}
                            </p>
                          )}
                          <h3 className="font-bold text-white text-base group-hover:text-purple-200 transition">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-slate-400 text-xs mt-2 line-clamp-3 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {item.videoUrl && (
                          <button
                            type="button"
                            onClick={() => setActiveVideoModal({
                              title: item.title,
                              url: getEmbedYoutubeUrl(item.videoUrl)
                            })}
                            className="mt-4 inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold transition"
                          >
                            <Play size={14} className="fill-current" /> Proje Videosunu İzle
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {references.length === 0 && (
                <div className="text-center py-20 bg-[#0b0f19] rounded-3xl border border-slate-800">
                  <Award className="mx-auto text-slate-600 mb-3" size={44} />
                  <p className="text-slate-400 font-medium">Henüz referans projesi eklenmedi.</p>
                  {isAdmin && (
                    <p className="text-xs text-purple-400 mt-2">
                      Personel panelinden hemen yeni referanslar ekleyebilirsiniz.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* KATALOG */}
          {activeTab === 'catalog' && (
            <div>
              <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-black text-white flex items-center gap-3">
                    <Package className="text-purple-400" /> Ekipman Kataloğu
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Stoktaki sinema ve prodüksiyon ekipmanlarını keşfedin, doğrudan kiralama sepetinize ekleyin.</p>
                </div>
                {rentalForm.equipment.length > 0 && (
                  <button 
                    onClick={() => setActiveTab('rental')} 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-purple-900/40 border border-purple-400/30 text-xs sm:text-sm"
                  >
                    <CheckCircle size={18} className="text-cyan-300" /> 
                    <span>{rentalForm.equipment.length} Ekipman Seçildi — Talep Formuna Geç</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 scrollbar-thin">
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
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 border ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-400/40 shadow-lg shadow-purple-950/50' 
                          : 'bg-[#0c101c] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {cat !== 'Tümü' && <IconComp size={15} className={isActive ? 'text-cyan-300' : 'text-slate-500'} />}
                      <span>{cat}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-black/40 text-cyan-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipmentCatalog
                  .filter((eq) => activeCatalogCategory === 'Tümü' || eq.category === activeCatalogCategory)
                  .map((eq) => {
                    const IconComp = categoryIcons[eq.category] || Package;
                    const isSelected = rentalForm.equipment.includes(eq.name);

                    return (
                      <div 
                        key={eq._id || eq.id} 
                        className={`bg-[#0b0f19] rounded-3xl border transition duration-300 overflow-hidden flex flex-col justify-between group shadow-xl ${
                          isSelected 
                            ? 'border-purple-500 ring-2 ring-purple-500/30' 
                            : 'border-slate-800/80 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-950/20'
                        }`}
                      >
                        <div>
                          <div className="bg-[#070a12] h-48 flex items-center justify-center overflow-hidden relative border-b border-slate-800">
                            {eq.photo ? (
                              <img 
                                src={getImageUrl(eq.photo)} 
                                alt={eq.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                              />
                            ) : (
                              <IconComp className="text-slate-700 group-hover:text-purple-400 transition" size={54} />
                            )}
                            <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider font-extrabold text-cyan-300 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/30">
                              {eq.category}
                            </span>
                          </div>

                          <div className="p-6">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-white text-base group-hover:text-purple-200 transition">
                                {eq.name}
                              </h3>
                              <span className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Star size={11} className="fill-amber-400 text-amber-400" /> {eq.rating || 4.9}
                              </span>
                            </div>

                            {eq.specs && eq.specs.length > 0 && (
                              <ul className="text-xs text-slate-400 space-y-2 my-4">
                                {eq.specs.slice(0, 4).map((spec, sIdx) => (
                                  <li key={sIdx} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                    <span className="line-clamp-1">{spec}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        <div className="p-6 pt-3 border-t border-slate-800/80 mt-auto bg-[#080b14] flex flex-col gap-3">
                          {(eq.videoUrl || eq.youtubeUrl) && (
                            <button
                              type="button"
                              onClick={() => setActiveVideoModal({
                                title: eq.name,
                                url: getEmbedYoutubeUrl(eq.videoUrl || eq.youtubeUrl)
                              })}
                              className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 rounded-xl text-xs font-bold transition border border-purple-800/40"
                            >
                              <svg className="w-3.5 h-3.5 fill-current text-rose-500 shrink-0" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              Tanıtım Videosunu İzle
                            </button>
                          )}

                          <div className="flex items-center justify-between">
                            <div>
                                                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Günlük Kiralama</span>
                                <span className="font-black text-white text-lg bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                                  {formatEquipmentPrice(eq)} ₺
                                </span>
                              </div>

                              <button 
                                type="button"
                                onClick={() => handleRentClick(eq.name)} 
                                disabled={eq.stock === 0} 
                                className={`text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md ${
                                  eq.stock === 0 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : (isSelected 
                                        ? 'bg-emerald-600 text-white shadow-emerald-900/50' 
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-purple-900/40 border border-purple-400/20')
                                }`}
                              >
                                {isSelected ? <><Check size={14} /> Seçildi</> : 'Sepete Ekle'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {equipmentCatalog.filter((eq) => activeCatalogCategory === 'Tümü' || eq.category === activeCatalogCategory).length === 0 && (
                  <div className="text-center py-20 bg-[#0b0f19] rounded-3xl border border-slate-800 mt-6">
                    <Package className="mx-auto text-slate-600 mb-3" size={44} />
                    <p className="text-slate-400 font-medium">"{activeCatalogCategory}" kategorisinde henüz ekipman bulunmuyor.</p>
                    <button onClick={() => setActiveCatalogCategory('Tümü')} className="mt-4 text-xs text-purple-400 font-bold hover:underline">
                      Tüm Ekipmanları Göster
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ÜYE GİRİŞİ / PROFİL */}
            {activeTab === 'login' && (
              <div className="max-w-md mx-auto bg-[#0b0f19] rounded-3xl shadow-2xl p-8 border border-purple-900/30">
                {isMemberLoggedIn ? (
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-purple-950/60 border border-purple-500/40 rounded-full flex items-center justify-center mb-4 text-cyan-300">
                      <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">{memberName}</h2>
                    <p className="text-slate-400 text-sm mb-6 flex items-center justify-center gap-1"><Phone size={14}/> {memberPhone}</p>
                    <button onClick={() => setActiveTab('rental')} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition mb-3 shadow-lg shadow-purple-900/40 text-sm">Yeni Kiralama Talebi Oluştur</button>
                    <button onClick={() => { setActiveTab('myRequests'); fetchMyRequests(); }} className="w-full bg-slate-900 text-slate-200 border border-slate-700 font-bold py-3 rounded-xl hover:bg-slate-800 transition mb-3 text-sm">Taleplerim & Rezervasyonlarım</button>
                    <button onClick={handleMemberLogout} className="w-full flex items-center justify-center gap-2 bg-slate-950 text-rose-400 border border-rose-950 font-medium py-3 rounded-xl hover:bg-rose-950/30 transition text-sm"><LogOut size={16}/> Çıkış Yap</button>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="mx-auto w-14 h-14 bg-slate-900 rounded-full p-2 border border-purple-500/30 mb-3 flex items-center justify-center">
                        <img src="/logo.png" alt="Aqua Medya Logo" className="h-full w-full object-contain" />
                      </div>
                      <h2 className="text-2xl font-black text-white">{memberMode === 'login' ? 'Üye Girişi' : 'Kayıt Ol'}</h2>
                      <p className="text-slate-400 text-xs mt-1">Prodüksiyon rezervasyonlarınızı yönetmek için giriş yapın</p>
                    </div>
                    <div className="flex gap-2 mb-6 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                      <button onClick={() => { setMemberMode('login'); setMemberError(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${memberMode === 'login' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-400'}`}>Giriş Yap</button>
                      <button onClick={() => { setMemberMode('register'); setMemberError(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${memberMode === 'register' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-400'}`}>Üye Ol</button>
                    </div>
                    <form onSubmit={handleMemberAuth} className="space-y-4">
                      {memberMode === 'register' && (
                        <div>
                          <label className="text-xs font-semibold text-slate-300">Ad Soyad veya Firma Ünvanı</label>
                          <input type="text" required value={memberForm.name} onChange={(e) => setMemberForm({...memberForm, name: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" placeholder="Firma Adı / Ad Soyad" />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1"><Phone size={13}/> Cep Telefonu</label>
                        <input type="tel" required value={memberForm.phone} onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" placeholder="05XXXXXXXXX" />
                      </div>
                      {memberMode === 'register' && (
                        <div>
                          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1"><Mail size={13}/> E-posta Adresi</label>
                          <input type="email" required value={memberForm.email} onChange={(e) => setMemberForm({...memberForm, email: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" placeholder="ornek@eposta.com" />
                        </div>
                      )}
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-300">Şifre</label>
                          {memberMode === 'login' && (
                            <button
                              type="button"
                              onClick={() => { setShowForgotPassword(true); setForgotStep(1); setResetMsg({ error: '', success: '' }); }}
                              className="text-[11px] text-cyan-400 hover:underline"
                            >
                              Şifremi Unuttum?
                            </button>
                          )}
                        </div>
                        <input type="password" required value={memberForm.password} onChange={(e) => setMemberForm({...memberForm, password: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" placeholder="••••••••" />
                      </div>
                      {memberError && <p className="text-rose-400 text-xs font-medium">{memberError}</p>}
                      <button type="submit" className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition text-sm shadow-lg shadow-purple-900/40">
                        {memberMode === 'login' ? 'Giriş Yap' : 'Kaydı Tamamla'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* MÜŞTERİNİN TALEPLERİM EKRANI */}
            {activeTab === 'myRequests' && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/20 p-8">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                    <h2 className="text-2xl font-black text-white">Taleplerim</h2>
                    <button onClick={() => setActiveTab('rental')} className="text-xs font-bold bg-purple-950/60 border border-purple-600/30 text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-900/40 transition">
                      + Yeni Talep
                    </button>
                  </div>
                  {myRequestsLoading ? (
                    <p className="text-slate-500 text-center py-8 text-sm">Yükleniyor...</p>
                  ) : myRequests.length === 0 ? (
                    <p className="text-slate-500 text-center py-8 text-sm">Henüz bir kiralama talebiniz bulunmuyor.</p>
                  ) : (
                    <div className="space-y-4">
                      {myRequests.map((req) => (
                        <div key={req._id} className="border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-purple-500/40 transition bg-[#080b14]">
                          <div>
                            <p className="font-bold text-white text-sm">{Array.isArray(req.item) ? req.item.join(', ') : req.item}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {req.date} - {req.time} | <b>Teslimat:</b> {req.location === 'MERKEZDEN_TESLIM' ? 'Ofisten Teslim Alma' : req.location}
                            </p>
                            {req.approvedBy && (
                              <p className="text-[11px] text-cyan-400 font-medium mt-1">Onaylayan Yetkili: {req.approvedBy}</p>
                            )}
                          </div>
                          <span className={
                            "text-xs font-semibold px-3 py-1 rounded-full " +
                            (req.status === 'Onaylandı' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' :
                             req.status === 'Reddedildi' ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40' :
                             'bg-amber-950/80 text-amber-400 border border-amber-500/40')
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
                  <div className="bg-[#0b0f19] rounded-3xl shadow-xl p-10 border border-purple-900/30 text-center">
                    <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-4 text-amber-400">
                      <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Giriş Yapılması Gerekiyor</h2>
                    <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">Kiralama talebi oluşturabilmeniz ve takip edebilmeniz için lütfen üye girişi yapın.</p>
                    <button onClick={() => setActiveTab('login')} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition text-sm shadow-lg shadow-purple-900/40">Üye Girişi / Kayıt Ol</button>
                  </div>
                ) : (
                  <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Package className="text-purple-400" size={22} /> Ekipman Kiralama Talebi</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Rezervasyon bilgilerinizi girerek talebinizi iletebilirsiniz</p>
                      </div>
                      <span className="text-xs bg-slate-900 border border-slate-800 text-purple-300 px-3 py-1 rounded-full font-medium flex items-center gap-1.5"><User size={13} className="text-cyan-400"/> {memberName}</span>
                    </div>

                    {showSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-2xl p-4 mb-5 flex items-center gap-3 text-sm">
                        <CheckCircle size={22} className="text-emerald-400 shrink-0" />
                        <div>
                          <b>Talebiniz başarıyla alındı!</b> Yetkili ekibimiz onayladığında tarafınıza bildirim iletilecektir.
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleRentalSubmit} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-300">Seçilen Ekipmanlar</label>
                        <div className="flex flex-wrap gap-2 mt-2 mb-2 min-h-[36px] p-2 bg-slate-950 rounded-xl border border-slate-800">
                          {rentalForm.equipment.map((eq, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-[#0e1424] text-purple-200 text-xs font-semibold px-3 py-1 rounded-lg border border-purple-500/30 shadow-sm">
                              {eq}
                              <button type="button" onClick={() => setRentalForm({...rentalForm, equipment: rentalForm.equipment.filter((x) => x !== eq)})} className="text-slate-400 hover:text-rose-400 ml-1 font-bold">×</button>
                            </span>
                          ))}
                          {rentalForm.equipment.length === 0 && (<span className="text-xs text-slate-500 self-center">Henüz ekipman seçilmedi. Aşağıdan ekleyin.</span>)}
                        </div>
                        <select value="" onChange={(e) => { if (e.target.value && !rentalForm.equipment.includes(e.target.value)) { setRentalForm({...rentalForm, equipment: [...rentalForm.equipment, e.target.value]}); } }} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm">
                          <option value="">+ Listeden Ekipman Seç ve Ekle</option>
                          {equipmentList.filter((eq) => !rentalForm.equipment.includes(eq)).map((eq, i) => <option key={i} value={eq}>{eq}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1"><Calendar size={13} className="text-cyan-400"/> Kiralama Tarihi</label>
                          <input type="date" required value={rentalForm.date} onChange={(e) => setRentalForm({...rentalForm, date: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1"><Clock size={13} className="text-cyan-400"/> Teslim Saati</label>
                          <input type="time" required value={rentalForm.time} onChange={(e) => setRentalForm({...rentalForm, time: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" />
                        </div>
                      </div>

                      <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/60">
                        <label className="text-xs font-bold text-slate-300 block mb-2">Teslimat Yöntemi</label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <button
                            type="button"
                            onClick={() => setDeliveryType('MERKEZ')}
                            className={"p-3 rounded-xl border text-left transition flex items-start gap-2.5 " + 
                              (deliveryType === 'MERKEZ' ? 'bg-purple-950/40 border-purple-500 text-white ring-1 ring-purple-500' : 'bg-[#080b14] border-slate-800 text-slate-400 hover:text-white')}
                          >
                            <Building2 size={18} className={deliveryType === 'MERKEZ' ? 'text-cyan-400' : 'text-slate-600'} />
                            <div>
                              <p className="text-xs font-bold">Ofisten Kendim Alacağım</p>
                              <p className="text-[11px] opacity-75 text-slate-400">Kağıthane Z Ofis Merkezimiz</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeliveryType('ADRES')}
                            className={"p-3 rounded-xl border text-left transition flex items-start gap-2.5 " + 
                              (deliveryType === 'ADRES' ? 'bg-purple-950/40 border-purple-500 text-white ring-1 ring-purple-500' : 'bg-[#080b14] border-slate-800 text-slate-400 hover:text-white')}
                          >
                            <MapPin size={18} className={deliveryType === 'ADRES' ? 'text-cyan-400' : 'text-slate-600'} />
                            <div>
                              <p className="text-xs font-bold">Adrese Teslimat İstiyorum</p>
                              <p className="text-[11px] opacity-75 text-slate-400">Set veya Özel Lokasyon</p>
                            </div>
                          </button>
                        </div>

                        {deliveryType === 'MERKEZ' ? (
                          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2">
                            <MapPin size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                            <span><b>Teslim Alma Adresi:</b> {COMPANY_DETAILS.address}</span>
                          </div>
                        ) : (
                          <div>
                            <label className="text-xs font-bold text-slate-300">Teslimat / Set Adresi</label>
                            <input 
                              type="text" 
                              required 
                              value={rentalForm.deliveryLocation} 
                              onChange={(e) => setRentalForm({...rentalForm, deliveryLocation: e.target.value})} 
                              className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                              placeholder="Örn: Beykoz Kundura Fabrikası Set Alanı, İstanbul" 
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-300">Ek Notlar / Özel İstekler</label>
                        <textarea value={rentalForm.notes} onChange={(e) => setRentalForm({...rentalForm, notes: e.target.value})} rows={2} className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" placeholder="Varsa batarya, tripod veya aksesuar tercihlerinizi yazabilirsiniz..."></textarea>
                      </div>

                      <button type="submit" className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 text-sm">
                        <CheckCircle size={18}/> Kiralama Talebini İlet
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* PERSONEL GİRİŞİ */}
            {activeTab === 'staffLogin' && (
              <div className="max-w-md mx-auto bg-[#0b0f19] rounded-3xl shadow-2xl p-8 border border-purple-900/30">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-purple-950/60 border border-purple-500/30 rounded-2xl flex items-center justify-center mb-3 text-purple-300">
                    <Shield size={36} />
                  </div>
                  <h2 className="text-2xl font-black text-white">Personel Girişi</h2>
                  <p className="text-slate-400 text-xs mt-1">Aqua Medya Yetkili Yönetim Portalı</p>
                </div>
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Kullanıcı Adı</label>
                    <input type="text" required value={staffLoginForm.username} onChange={(e) => setStaffLoginForm({...staffLoginForm, username: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Şifre</label>
                    <input type="password" required value={staffLoginForm.password} onChange={(e) => setStaffLoginForm({...staffLoginForm, password: e.target.value})} className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" />
                  </div>
                  {staffError && <p className="text-rose-400 text-xs font-semibold">{staffError}</p>}
                  <button type="submit" className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition text-sm shadow-lg shadow-purple-900/40">Yetkili Girişi Yap</button>
                </form>
              </div>
            )}

            {/* PERSONEL PANELİ */}
            {activeTab === 'staff' && isStaffLoggedIn && (
              <div>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-950/60 border border-purple-500/30 text-purple-300 rounded-2xl"><Shield size={24} /></div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Aqua Medya Yönetim Portalı</h2>
                      <p className="text-xs text-slate-400">
                        Yetkili: <b className="text-purple-300">{staffDisplayName || staffRole}</b> {isAdmin && <span className="text-cyan-400 font-bold">({staffRole === 'superadmin' ? 'Süper Admin' : 'Admin'})</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleStaffLogout} className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-rose-400 font-semibold px-4 py-2 rounded-xl hover:bg-rose-950/30 transition text-xs"><LogOut size={15}/> Güvenli Çıkış</button>
                </div>

                {/* YÖNETİM SEKMELERİ */}
                <div className="flex gap-2 mb-6 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-fit flex-wrap">
                  <button onClick={() => setStaffSubTab('stock')} className={"px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 " + (staffSubTab === 'stock' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white')}>
                    <Package size={14}/> Stok Yönetimi
                  </button>

                  <button onClick={() => setStaffSubTab('references')} className={"px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 " + (staffSubTab === 'references' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white')}>
                    <Award size={14}/> Referans Yönetimi ({references.length})
                  </button>

                  {can('requestsView') && (
                    <button onClick={() => setStaffSubTab('requests')} className={"px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 " + (staffSubTab === 'requests' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white')}>
                      <Bell size={14}/> Kiralama Talepleri ({requests.filter(r => r.status?.toLowerCase() === 'bekliyor').length})
                    </button>
                  )}

                  {/* ✅ SÜPER ADMİN & ADMİN İÇİN PERSONEL YÖNETİMİ BUTONU */}
                  {isAdmin && (
                    <button onClick={() => setStaffSubTab('management')} className={"px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 " + (staffSubTab === 'management' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white')}>
                      <Users size={14}/> Personel & Yetki Yönetimi
                    </button>
                  )}
                </div>

                {/* PERSONEL: STOK YÖNETİMİ */}
                {staffSubTab === 'stock' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {can('equipmentAdd') && (
                      <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                          {editingId ? <Edit2 size={18} className="text-cyan-400" /> : <Plus size={18} className="text-purple-400" />} 
                          {editingId ? 'Ekipmanı Güncelle' : 'Yeni Ekipman Ekle'}
                        </h3>
                        <form onSubmit={handleAddOrUpdateEquip} className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-300">Ekipman Adı</label>
                            <input 
                              type="text" 
                              required 
                              value={newEquip.name} 
                              onChange={(e) => setNewEquip({...newEquip, name: e.target.value})} 
                              placeholder="Örn: Sony FX3 Sinema Kamerası" 
                              className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-300">Kategori</label>
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
                              className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm"
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
                                  className="w-full px-4 py-2 border-2 border-purple-500 bg-purple-950/20 text-white rounded-xl text-sm outline-none"
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-300">Teknik Özellikler (Her satıra bir özellik)</label>
                            <textarea 
                              value={newEquip.specsText} 
                              onChange={(e) => setNewEquip({...newEquip, specsText: e.target.value})} 
                              placeholder="4K 120fps Kayıt&#10;Dual Base ISO&#10;Full Frame Sensör" 
                              rows={3} 
                              className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm"
                            ></textarea>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-300">Günlük Kiralama Bedeli</label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <select
                                  value={currency}
                                  onChange={(e) => setCurrency(e.target.value)}
                                  className="px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
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
                                  className="w-full min-w-0 px-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm font-semibold" 
                                />
                                <span className="px-2 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold whitespace-nowrap">
                                  / Gün
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-300">Stok Adedi</label>
                              <input 
                                type="number" 
                                min="0" 
                                required 
                                value={newEquip.stock} 
                                onChange={(e) => setNewEquip({...newEquip, stock: parseInt(e.target.value) || 0})} 
                                placeholder="1" 
                                className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-300">Video Tanıtım Linki (Opsiyonel)</label>
                            <input 
                              type="url" 
                              value={newEquip.videoUrl || ''} 
                              onChange={(e) => setNewEquip({...newEquip, videoUrl: e.target.value})} 
                              placeholder="https://youtube.com/watch?v=..." 
                              className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                            />
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-950 border border-dashed border-slate-800 rounded-xl px-4 py-3 hover:border-purple-500/50 transition">
                              <Upload size={16} className="text-cyan-400"/> Ekipman Görseli Yükle
                              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                            </label>
                            {newEquip.photoPreview && <img src={newEquip.photoPreview} alt="Önizleme" className="mt-2 h-24 rounded-xl object-cover border border-slate-800" />}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button 
                              type="submit" 
                              className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition text-sm shadow-md"
                            >
                              {editingId ? 'Değişiklikleri Kaydet' : 'Envantere Ekle'}
                            </button>
                            {editingId && (
                              <button 
                                type="button" 
                                onClick={cancelEdit} 
                                className="px-4 bg-slate-900 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition text-sm"
                              >
                                Vazgeç
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* SAĞ TARAF: MEVCUT ENVANTER LİSTESİ */}
                    <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-6 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-white">
                          Mevcut Envanter ({equipmentCatalog.length})
                        </h3>
                        {selectedCatalogCategory !== 'Tümü' && (
                          <button 
                            type="button" 
                            onClick={() => setSelectedCatalogCategory('Tümü')} 
                            className="text-xs text-cyan-400 hover:underline font-semibold"
                          >
                            Filtreyi Temizle
                          </button>
                        )}
                      </div>

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
                                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm' 
                                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{cat}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                isActive ? 'bg-black/30 text-cyan-300' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 flex-1">
                        {equipmentCatalog
                          .filter((eq) => selectedCatalogCategory === 'Tümü' || eq.category === selectedCatalogCategory)
                          .map((eq) => (
                            <div key={eq._id || eq.id} className="flex items-center justify-between border border-slate-800/80 rounded-2xl p-3 hover:border-purple-500/30 transition bg-[#080b14]">
                              <div className="flex items-center gap-3">
                                {eq.photo ? (
                                  <img src={getImageUrl(eq.photo)} alt={eq.name} className="w-12 h-12 rounded-xl object-cover border border-slate-800" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                                    {React.createElement(categoryIcons[eq.category] || Package, { size: 20 })}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-white text-sm">{eq.name}</p>
                                  <p className="text-xs text-slate-400">{eq.category} · Stok: <b className="text-white">{eq.stock}</b> · {formatEquipmentPrice(eq)} ₺</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                {can('equipmentEdit') && (
                                  <button onClick={() => handleEditEquip(eq)} className="p-2 bg-slate-900 text-cyan-400 border border-slate-800 rounded-xl hover:bg-slate-800 transition" title="Düzenle">
                                    <Edit2 size={14} />
                                  </button>
                                )}
                                {can('equipmentDelete') && (
                                  <button onClick={() => handleDeleteEquip(eq._id || eq.id)} className="p-2 bg-slate-900 text-rose-400 border border-slate-800 rounded-xl hover:bg-rose-950/40 transition" title="Sil">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PERSONEL: REFERANS YÖNETİMİ SEKMESİ */}
                {staffSubTab === 'references' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-6">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                        {editingRefId ? <Edit2 size={18} className="text-cyan-400" /> : <Plus size={18} className="text-amber-400" />} 
                        {editingRefId ? 'Referans Projesini Düzenle' : 'Yeni Referans Projesi Ekle'}
                      </h3>
                      <form onSubmit={handleAddOrUpdateReference} className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-300">Proje Başlığı</label>
                          <input 
                            type="text" 
                            required 
                            value={newRef.title} 
                            onChange={(e) => setNewRef({...newRef, title: e.target.value})} 
                            placeholder="Örn: Netflix Dizi Çekimleri - Sezon 2" 
                            className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-300">Müşteri / Yapım / Sanatçı</label>
                            <input 
                              type="text" 
                              value={newRef.client} 
                              onChange={(e) => setNewRef({...newRef, client: e.target.value})} 
                              placeholder="Örn: Ay Yapım / Turkcell" 
                              className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-300">Kategori</label>
                            <select
                              value={newRef.category}
                              onChange={(e) => setNewRef({...newRef, category: e.target.value})}
                              className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm"
                            >
                              <option value="Dizi">Dizi</option>
                              <option value="Sinema">Sinema Filmi</option>
                              <option value="Reklam">Reklam Filmi</option>
                              <option value="Müzik Klibi">Müzik Klibi</option>
                              <option value="Diğer">Diğer</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300">Proje Açıklaması & Kullanılan Ekipmanlar</label>
                          <textarea 
                            value={newRef.description} 
                            onChange={(e) => setNewRef({...newRef, description: e.target.value})} 
                            placeholder="Arri Alexa Mini LF ve Cooke S4 Lens seti tercih edildi..." 
                            rows={3} 
                            className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm"
                          ></textarea>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300">Proje Video / Teaser Linki (YouTube)</label>
                          <input 
                            type="url" 
                            value={newRef.videoUrl} 
                            onChange={(e) => setNewRef({...newRef, videoUrl: e.target.value})} 
                            placeholder="https://youtube.com/watch?v=..." 
                            className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-950 border border-dashed border-slate-800 rounded-xl px-4 py-3 hover:border-purple-500/50 transition">
                            <Upload size={16} className="text-amber-400"/> Proje Afişi veya Set Arkası Fotoğrafı
                            <input type="file" accept="image/*" onChange={handleRefPhotoChange} className="hidden" />
                          </label>
                          {newRef.photoPreview && <img src={newRef.photoPreview} alt="Önizleme" className="mt-2 h-24 rounded-xl object-cover border border-slate-800" />}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            type="submit" 
                            className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition text-sm shadow-md"
                          >
                            {editingRefId ? 'Referansı Güncelle' : 'Referanslara Ekle'}
                          </button>
                          {editingRefId && (
                            <button 
                              type="button" 
                              onClick={cancelRefEdit} 
                              className="px-4 bg-slate-900 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition text-sm"
                            >
                              Vazgeç
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* SAĞ TARAF: REFERANS LİSTESİ */}
                    <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-6 flex flex-col h-full">
                      <h3 className="font-bold text-lg text-white mb-4">
                        Kayıtlı Referanslar ({references.length})
                      </h3>

                      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 flex-1">
                        {references.map((r) => (
                          <div key={r._id || r.id} className="flex items-center justify-between border border-slate-800/80 rounded-2xl p-3 hover:border-purple-500/30 transition bg-[#080b14]">
                            <div className="flex items-center gap-3">
                              {r.photo ? (
                                <img src={getImageUrl(r.photo)} alt={r.title} className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0" />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                                  <Award size={22} />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white text-sm">{r.title}</p>
                                <p className="text-xs text-slate-400">{r.client || 'Genel'} · <b className="text-amber-400">{r.category}</b></p>
                                {r.videoUrl && <span className="text-[10px] text-rose-400 font-semibold">▶ Video Mevcut</span>}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => handleEditRef(r)} className="p-2 bg-slate-900 text-cyan-400 border border-slate-800 rounded-xl hover:bg-slate-800 transition" title="Düzenle">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteRef(r._id || r.id)} className="p-2 bg-slate-900 text-rose-400 border border-slate-800 rounded-xl hover:bg-rose-950/40 transition" title="Sil">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {references.length === 0 && (
                          <p className="text-slate-500 text-sm text-center py-10">Henüz referans eklenmemiş.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PERSONEL: KİRALAMA TALEPLERİ SEKMESİ */}
                {staffSubTab === 'requests' && can('requestsView') && (
                  <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-6">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                          <Bell size={20} className="text-purple-400" /> Gelen Kiralama Talepleri
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Müşteri rezervasyonlarını ve sözleşmelerini yönetin</p>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl text-xs font-semibold border border-slate-800">
                        <button type="button" onClick={() => setRequestPeriod('all')} className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'all' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-white')}>
                          Tümü ({requests.length})
                        </button>
                        <button type="button" onClick={() => setRequestPeriod('week')} className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'week' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-white')}>
                          Bu Hafta
                        </button>
                        <button type="button" onClick={() => setRequestPeriod('month')} className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'month' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-white')}>
                          Bu Ay
                        </button>
                        <button type="button" onClick={() => setRequestPeriod('year')} className={"px-3 py-1.5 rounded-lg transition " + (requestPeriod === 'year' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-white')}>
                          Bu Yıl
                        </button>
                      </div>
                    </div>

                    {/* FİNANSAL ÖZET KARTI */}
                    {(isAdmin || can('viewFinances')) && (
                      <div className="mb-6 p-5 bg-gradient-to-r from-[#0d1428] via-[#101026] to-[#120f24] border border-purple-500/30 rounded-3xl text-white shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                            <Sparkles size={14} className="text-cyan-400" />
                            Finansal Ciro ve KDV Özeti ({requestPeriod === 'all' ? 'Tüm Zamanlar' : requestPeriod === 'week' ? 'Son 7 Gün' : requestPeriod === 'month' ? 'Son 30 Gün' : 'Son 1 Yıl'})
                          </span>
                          <span className="text-xs bg-purple-950/80 border border-purple-500/40 px-3 py-1 rounded-xl text-cyan-300 font-bold">
                            {filteredRequests.length} Adet Rezervasyon
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-800">
                          <div>
                            <p className="text-[11px] text-slate-400 font-medium">Ara Toplam</p>
                            <p className="text-base sm:text-lg font-bold text-white mt-1">{reportStats.subtotal.toLocaleString('tr-TR')} ₺</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400 font-medium">+ %20 KDV</p>
                            <p className="text-base sm:text-lg font-bold text-amber-300 mt-1">{reportStats.kdv.toLocaleString('tr-TR')} ₺</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-cyan-300 font-medium">Genel Toplam</p>
                            <p className="text-lg sm:text-xl font-black text-cyan-400 mt-1">{reportStats.grandTotal.toLocaleString('tr-TR')} ₺</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TALEPLER LİSTESİ */}
                    <div className="space-y-4">
                      {filteredRequests.map((req) => (
                        <div key={req._id || req.id} className={"border rounded-2xl p-4 transition bg-[#080b14] " + (req.status === 'bekliyor' ? 'border-amber-500/40' : 'border-slate-800')}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1 max-w-xl">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-white text-base">
                                  {Array.isArray(req.item) ? req.item.join(', ') : req.item}
                                </p>
                                {req.conflictIgnored && (
                                  <span className="text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertTriangle size={10} /> Çakışma Göz Ardı Edildi
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1 text-slate-300"><Calendar size={13} className="text-cyan-400" /> {req.date}</span>
                                <span className="flex items-center gap-1 text-slate-300"><Clock size={13} className="text-cyan-400" /> {req.time}</span>
                                <span className="flex items-center gap-1 text-slate-300">
                                  <MapPin size={13} className="text-purple-400" /> 
                                  {req.location === 'MERKEZDEN_TESLIM' ? (
                                    <span className="text-cyan-300 font-bold">🏢 Ofisten Alacak</span>
                                  ) : (
                                    <span>🚚 {req.location}</span>
                                  )}
                                </span>
                              </div>

                              <div className="pt-1 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1 text-purple-300 font-bold"><User size={13} className="text-cyan-400" /> {req.customer}</span>
                                {req.email && <span className="flex items-center gap-1 text-slate-400"><Mail size={13} /> {req.email}</span>}
                              </div>

                              {req.notes && (
                                <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mt-2">
                                  <b>Müşteri Notu:</b> {req.notes}
                                </p>
                              )}

                              {req.approvedBy && (
                                <p className="text-[11px] text-cyan-400 font-medium pt-1">
                                  ✓ <b>{req.approvedBy}</b> tarafından {req.approvedAt ? new Date(req.approvedAt).toLocaleDateString('tr-TR') : ''} tarihinde onaylandı.
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-center">
                              <span className={
                                "text-xs font-bold px-3 py-1.5 rounded-full " +
                                ((req.status?.toLowerCase() === 'onaylandı' || req.status?.toLowerCase() === 'onaylandi') 
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' 
                                  : (req.status?.toLowerCase() === 'reddedildi') 
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40' 
                                  : 'bg-amber-950/80 text-amber-400 border border-amber-500/40 animate-pulse')
                              }>
                                {req.status}
                              </span>
                              
                              <button 
                                type="button" 
                                onClick={() => generateRentalPDF(req)} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-semibold shadow-sm transition" 
                                title="Kiralama Sözleşmesini PDF İndir"
                              >
                                <FileText size={14} className="text-cyan-400" />
                                <span>PDF Sözleşme</span>
                              </button>

                              {isAdmin && (
                                <button 
                                  onClick={() => deleteRequest(req._id || req.id)} 
                                  className="p-2 bg-slate-900 border border-slate-800 text-rose-400 rounded-xl hover:bg-rose-950/40 transition" 
                                  title="Talebi Sistemden Sil"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}

                              {can('requestsManage') && (req.status?.toLowerCase() === 'bekliyor') && (
                                <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                                  <button 
                                    onClick={() => updateStatus(req._id || req.id, 'Onaylandı')} 
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1 text-xs font-bold shadow-md"
                                  >
                                    <Check size={14} /> Onayla
                                  </button>
                                  <button 
                                    onClick={() => updateStatus(req._id || req.id, 'Reddedildi')} 
                                    className="px-3 py-1.5 bg-slate-900 border border-rose-900/60 text-rose-400 hover:bg-rose-950/30 rounded-xl transition flex items-center gap-1 text-xs font-bold"
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
                        <p className="text-slate-500 text-sm text-center py-12">Seçilen dönemde kayıtlı talep bulunmuyor.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* PERSONEL: PERSONEL YÖNETİMİ SEKMESİ (SÜPER ADMİN & ADMİN) */}
                {staffSubTab === 'management' && isAdmin && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-6">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                        {editingStaffId ? <Edit2 size={18} className="text-cyan-400" /> : <Plus size={18} className="text-purple-400" />} 
                        {editingStaffId ? 'Personel & Şifre Bilgilerini Düzenle' : 'Yeni Personel Tanımla'}
                      </h3>
                      <form onSubmit={handleAddOrUpdateStaff} className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-300">Kullanıcı Adı</label>
                          <input type="text" required disabled={!!editingStaffId} value={newStaff.username} onChange={(e) => setNewStaff({...newStaff, username: e.target.value})} placeholder="Örn: yusuf" className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm disabled:opacity-50" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-300">Görünen Ad Soyad</label>
                          <input type="text" value={newStaff.displayName} onChange={(e) => setNewStaff({...newStaff, displayName: e.target.value})} placeholder="Örn: Yusuf Sarser" className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-300">
                            {editingStaffId ? "Yeni Şifre (Boş bırakırsanız mevcut şifre korunur)" : "Giriş Şifresi"}
                          </label>
                          <input 
                            type="password" 
                            required={!editingStaffId} 
                            value={newStaff.password} 
                            onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} 
                            placeholder="••••••••" 
                            className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                          />
                        </div>

                        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/80">
                          <p className="text-xs font-bold text-purple-300 mb-3 uppercase tracking-wider">Personel Yetki İzinleri</p>
                          <div className="space-y-2">
                            {Object.keys(permissionLabels).map((key) => (
                              <label key={key} className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                                <input type="checkbox" checked={!!newStaff.permissions[key]} onChange={() => togglePermission(key)} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700" />
                                {permissionLabels[key]}
                              </label>
                            ))}
                          </div>
                        </div>

                        {staffFormError && <p className="text-rose-400 text-xs font-semibold">{staffFormError}</p>}
                        <div className="flex gap-2 pt-2">
                          <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition text-sm shadow-md">
                            {editingStaffId ? 'Değişiklikleri Kaydet' : 'Personeli Kaydet'}
                          </button>
                          {editingStaffId && (
                            <button type="button" onClick={cancelStaffEdit} className="px-4 bg-slate-900 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition text-sm">
                              Vazgeç
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    <div className="bg-[#0b0f19] rounded-3xl shadow-xl border border-purple-900/30 p-6">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                        <Users size={18} className="text-cyan-400" /> Tanımlı Personeller & Yöneticiler ({staffList.length})
                      </h3>
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {staffList.map((s) => (
                          <div key={s._id || s.id} className="flex items-center justify-between border border-slate-800 rounded-2xl p-3.5 bg-[#080b14] hover:border-purple-500/30 transition">
                            <div>
                              <p className="font-bold text-white text-sm flex items-center gap-2">
                                {s.displayName || s.username}
                                {s.role === 'superadmin' && <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded-full">Süper Admin</span>}
                                {s.role === 'admin' && <span className="text-[10px] bg-purple-950 text-cyan-300 border border-purple-500/40 font-bold px-2 py-0.5 rounded-full">Admin</span>}
                              </p>
                              <p className="text-xs text-slate-400">@{s.username}</p>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleEditStaff(s)} className="p-2 bg-slate-900 text-cyan-400 border border-slate-800 rounded-xl hover:bg-slate-800 transition" title="Şifre / Bilgi Düzenle"><Edit2 size={14} /></button>
                              {s.role !== 'superadmin' && (
                                <button onClick={() => handleDeleteStaff(s._id || s.id)} className="p-2 bg-slate-900 text-rose-400 border border-slate-800 rounded-xl hover:bg-rose-950/40 transition" title="Sil"><Trash2 size={14} /></button>
                              )}
                            </div>
                          </div>
                        ))}
                        {staffList.length === 0 && (
                          <p className="text-slate-500 text-sm text-center py-10">Kayıtlı personel bulunmuyor.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </main>
      </div>

      {/* FOOTER & KURUMSAL BİLGİLER */}
      <footer className="bg-[#05070c] text-slate-400 text-center py-10 text-xs mt-20 border-t border-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-900">
            <div className="text-left">
              <h4 className="text-sm font-black text-white tracking-wider flex items-center gap-2">
                <Film size={16} className="text-cyan-400" /> {COMPANY_DETAILS.name}
              </h4>
              <p className="text-slate-500 text-xs mt-1 max-w-md">{COMPANY_DETAILS.address}</p>
            </div>

            {/* KURUMSAL BAĞLANTILAR */}
            <div className="flex items-center gap-6 text-xs font-semibold flex-wrap justify-center">
              <button 
                type="button" 
                onClick={() => setLegalModal('about')} 
                className="hover:text-cyan-300 transition flex items-center gap-1.5 text-slate-300"
              >
                <Info size={14} className="text-purple-400" /> Hakkımızda
              </button>
              <button 
                type="button" 
                onClick={() => setLegalModal('kvkk')} 
                className="hover:text-cyan-300 transition flex items-center gap-1.5 text-slate-300"
              >
                <Shield size={14} className="text-purple-400" /> KVKK Aydınlatma Metni
              </button>
              <button 
                type="button" 
                onClick={() => setLegalModal('cookie')} 
                className="hover:text-cyan-300 transition flex items-center gap-1.5 text-slate-300"
              >
                <Cookie size={14} className="text-purple-400" /> Çerez Politikası
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-[11px] text-slate-600">
            <p>© 2026 Aqua Medya Ticaret Limited Şirketi. Tüm hakları saklıdır.</p>
            <p className="text-slate-500">Sinema, Reklam ve TV Prodüksiyon Kiralama Teknolojileri</p>
          </div>
        </div>
      </footer>

      {/* ŞİFREMİ UNUTTUM MODALI (MÜŞTERİLER İÇİN) */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-purple-500/40 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => { setShowForgotPassword(false); setResetMsg({ error: '', success: '' }); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound size={20} className="text-purple-400" /> Şifremi Sıfırla
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {forgotStep === 1 
                ? 'Kayıtlı e-posta adresinizi girin, size 6 haneli doğrulama kodu gönderelim.' 
                : 'E-postanıza gelen doğrulama kodunu ve yeni şifrenizi girin.'}
            </p>

            {resetMsg.error && <p className="text-xs text-rose-400 mb-3 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50">{resetMsg.error}</p>}
            {resetMsg.success && <p className="text-xs text-emerald-400 mb-3 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/50">{resetMsg.success}</p>}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium">Kayıtlı E-Posta Adresiniz</label>
                  <input 
                    type="email" 
                    required 
                    value={resetEmail} 
                    onChange={(e) => setResetEmail(e.target.value)} 
                    placeholder="ornek@domain.com" 
                    className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl text-xs hover:opacity-90 transition disabled:opacity-50"
                >
                  {resetLoading ? 'Kod Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium">6 Haneli Doğrulama Kodu</label>
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    value={resetCode} 
                    onChange={(e) => setResetCode(e.target.value)} 
                    placeholder="123456" 
                    className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-center font-bold tracking-widest text-lg" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium">Yeni Şifreniz</label>
                  <input 
                    type="password" 
                    required 
                    value={newResetPassword} 
                    onChange={(e) => setNewResetPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-purple-500 outline-none text-sm" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs hover:opacity-90 transition disabled:opacity-50 shadow-md"
                >
                  {resetLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle ve Tamamla'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ÇEREZ ONAY BARI (COOKIE BANNER) */}
      {!cookieConsent && (
        <div className="fixed bottom-5 left-5 right-5 md:left-auto md:right-8 md:max-w-md z-50 bg-[#0b0f19]/95 backdrop-blur-xl border border-purple-500/40 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-950/80 border border-purple-500/40 rounded-2xl text-purple-300 shrink-0">
              <Cookie size={22} className="text-cyan-300" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white mb-1">Çerez (Cookie) Kullanımı</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Sitemizde deneyiminizi geliştirmek ve güvenli kiralama işlemleri sunmak için zorunlu teknik çerezler kullanılmaktadır.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptCookies}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition"
                >
                  Anladım ve Kabul Ediyorum
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModal('cookie')}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition"
                >
                  İncele
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KURUMSAL BİLGİ VE YASAL MODALLAR */}
      {legalModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLegalModal(null)}
        >
          <div 
            className="bg-[#0b0f19] border border-purple-500/40 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070a12]">
              <div className="flex items-center gap-2.5">
                {legalModal === 'about' && <Info size={18} className="text-cyan-400" />}
                {legalModal === 'kvkk' && <Shield size={18} className="text-purple-400" />}
                {legalModal === 'cookie' && <Cookie size={18} className="text-amber-400" />}
                <h3 className="font-bold text-white text-base">
                  {legalModal === 'about' && 'Hakkımızda — Aqua Medya'}
                  {legalModal === 'kvkk' && 'KVKK Aydınlatma Metni'}
                  {legalModal === 'cookie' && 'Çerez (Cookie) Politikası'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-600 transition font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed scrollbar-thin">
              {legalModal === 'about' && (
                <>
                  <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 text-purple-200 mb-4">
                    <p className="font-bold text-white text-sm">Sinema & Medya Teknolojilerinde Güvenilir Çözüm Ortağınız</p>
                    <p className="text-xs text-slate-300 mt-1">Aqua Medya Ticaret Limited Şirketi olarak sektörün en prestijli yapımlarına teknolojik altyapı sağlıyoruz.</p>
                  </div>
                  <p>
                    <b>Aqua Medya</b>, dizi, sinema filmi, reklam, müzik klibi ve kurumsal tanıtım projelerine yönelik son nesil dijital sinema kameraları, optik setler, profesyonel aydınlatma armatürleri ve ses kayıt ekipmanları kiralama hizmeti sunmaktadır.
                  </p>
                  <p>
                    İstanbul Kağıthane Z Ofis operasyon merkezimizde bulunan kalibrasyon ve test laboratuvarımızda her ekipman, sete çıkmadan önce titizlikle kontrol edilmekte; sıfır hata prensibiyle prodüksiyon ekiplerine ulaştırılmaktadır.
                  </p>
                  <h4 className="text-white font-bold pt-2">Vizyonumuz & Ayrıcalıklarımız:</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                    <li>Arri, Red, Sony CineAlta serisi üst düzey kamera gövdeleri ve Cooke/Zeiss sinema lensleri.</li>
                    <li>Deneyimli teknik ekibimizle sete doğrudan teslimat ve yerinde destek.</li>
                    <li>Şeffaf, dijital ve hızlı sözleşme yönetim altyapısı.</li>
                  </ul>
                </>
              )}

              {legalModal === 'kvkk' && (
                <>
                  <p className="text-xs text-slate-400">6698 Sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) Uyarınca Aydınlatma Metni</p>
                  <p>
                    <b>Veri Sorumlusu:</b> {COMPANY_DETAILS.name} ("Aqua Medya") olarak, kiralama talepleri, üyelik kayıtları ve müşteri ilişkileri yönetimi süreçlerinde elde ettiğimiz kişisel verilerinizin gizliliğine ve güvenliğine azami önem veriyoruz.
                  </p>
                  <h4 className="text-white font-bold pt-1">İşlenen Kişisel Verileriniz ve Amaçları:</h4>
                  <p>
                    Adınız-soyadınız, cep telefonu numaranız, e-posta adresiniz ve teslimat lokasyon bilginiz; ekipman kiralama sözleşmelerinin düzenlenmesi, faturalandırma yapılması, set teslimatlarının organize edilmesi ve operasyonel bildirimlerin (SMS/E-posta) sağlanması amacıyla 6698 sayılı Kanun’un 5. maddesi kapsamında işlenmektedir.
                  </p>
                  <h4 className="text-white font-bold pt-1">Verilerin Aktarılması:</h4>
                  <p>
                    Kişisel verileriniz, kanuni yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşları (vergi daireleri, adli makamlar) dışında üçüncü şahıslara ticari amaçla satılmaz veya devredilmez.
                  </p>
                  <h4 className="text-white font-bold pt-1">Haklarınız:</h4>
                  <p>
                    KVKK'nın 11. maddesi uyarınca dilediğiniz zaman şirketimize başvurarak verilerinizin silinmesini, düzeltilmesini veya işlenip işlenmediğini öğrenme hakkına sahipsiniz. İletişim: <span className="text-cyan-400 font-bold">{COMPANY_DETAILS.email}</span>.
                  </p>
                </>
              )}

              {legalModal === 'cookie' && (
                <>
                  <p>
                    <b>{COMPANY_DETAILS.name}</b> web sitemizde ve portalımızda kullanıcı deneyiminizi kolaylaştırmak, oturum güvenliğinizi sağlamak ve operasyonel verimliliği artırmak amacıyla çerezler (cookies) ve yerel depolama (localStorage) teknolojileri kullanılmaktadır.
                  </p>
                  <h4 className="text-white font-bold pt-1">Kullanılan Çerez Türleri:</h4>
                  <ul className="list-disc pl-5 space-y-2 text-slate-400">
                    <li>
                      <b className="text-white">Zorunlu / Teknik Çerezler:</b> Üye girişi yapıldığında oturumunuzun açık kalmasını sağlayan JWT token ve yetkilendirme anahtarlarıdır. Bu çerezler olmadan kiralama talebi ve yönetim paneli kullanılamaz.
                    </li>
                    <li>
                      <b className="text-white">İşlevsel Tercihler:</b> Kiralama sepetinizdeki seçili ekipmanların ve onay bildirimlerinizin tarayıcıda hatırlanması için kullanılır.
                    </li>
                  </ul>
                  <p className="pt-2">
                    Sitemizde üçüncü taraf reklam veya hedefleme çerezleri <b>kullanılmamaktadır</b>. Dilediğiniz zaman tarayıcı ayarlarınızdan çerezleri temizleyebilir veya engelleyebilirsiniz.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#070a12] flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YOUTUBE SAYFA İÇİ VİDEO MODALI */}
      {activeVideoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setActiveVideoModal(null)}
        >
          <div 
            className="bg-[#0b0f19] border border-purple-500/40 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#070a12]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {activeVideoModal.title} - Video
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-600 transition font-bold text-sm"
              >
                ✕
              </button>
            </div>

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


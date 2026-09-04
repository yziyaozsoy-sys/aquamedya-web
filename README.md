# Aqua Medya - Prodüksiyon Ekipman Kiralama Web Sitesi

Bu proje iki parçadan oluşur:
- `backend/`  -> Node.js + Express API (veri, fotoğraf yükleme, personel girişi)
- `frontend/` -> React + Vite + Tailwind (kullanıcı arayüzü)

---

## 🖥️ ÖNEMLİ: Komutları NEREDE çalıştırmalısın?

Bu komutları **Node.js REPL** (yani `node` yazıp açtığın `>` ekranı) içinde ÇALIŞTIRMA!
Bunun yerine normal bir terminal / komut istemi (cmd, PowerShell, Terminal.app) kullan.

- Eğer ekranında `>` işareti varsa ve `.exit` yazınca çıkabiliyorsan, o Node REPL'dir. Çık.
- Normal terminalde satır genelde şuna benzer: `C:\Users\Yusuf>` (Windows) veya `kullanici@bilgisayar ~ %` (Mac)

---

## 1) Node.js kurulumunu doğrula

Terminalde (Node REPL DEĞİL) şunu çalıştır:

```
node -v
npm -v
```

İkisi de bir versiyon numarası göstermeli (örn. v20.11.0). Göstermiyorsa Node.js'i https://nodejs.org adresinden LTS sürümünü indirip kur.

---

## 2) Backend'i çalıştır

```
cd aqua-medya/backend
```

Windows'ta:
```
copy .env.example .env
```
Mac/Linux'ta:
```
cp .env.example .env
```

Sonra:
```
npm install
npm start
```

Terminalde şunu görmelisin:
```
✅ Aqua Medya Backend http://localhost:4000 üzerinde çalışıyor
```

Bu terminali AÇIK BIRAK, kapatma.

---

## 3) Frontend'i çalıştır (YENİ bir terminal penceresi aç)

```
cd aqua-medya/frontend
```

Windows'ta:
```
copy .env.example .env
```
Mac/Linux'ta:
```
cp .env.example .env
```

Sonra:
```
npm install
npm run dev
```

Terminalde şuna benzer bir çıktı göreceksin:
```
  VITE v5.x.x  ready in 400 ms
  ➜  Local:   http://localhost:5173/
```

O adresi (http://localhost:5173) tarayıcında aç. Site çalışıyor olmalı! ✅

---

## 🔑 Varsayılan Personel Giriş Bilgileri

- Kullanıcı adı: `admin`
- Şifre: `aqua2026`

Bunları değiştirmek için `backend/.env` dosyasını aç, `STAFF_USERNAME` ve `STAFF_PASSWORD` değerlerini güncelle, backend'i yeniden başlat (Ctrl+C sonra `npm start`).

---

## 🩹 Sık Karşılaşılan Hatalar

**"npm should be run outside of the Node.js REPL"**
→ Node REPL içindesin. `.exit` yaz veya Ctrl+D'ye bas, sonra normal terminale geç.

**"cd is not recognized" veya "Unexpected identifier"**
→ Aynı sorun, Node REPL içindesin.

**"npm install" çok uzun sürüyor veya hata veriyor**
→ İnternet bağlantını kontrol et, sonra tekrar dene: `npm install`

**Frontend açılıyor ama veriler gelmiyor / "Network Error"**
→ Backend'in çalıştığından emin ol (2. adım). `frontend/.env` içindeki `VITE_API_URL` değerinin `http://localhost:4000` olduğunu kontrol et.

**"Port already in use" (4000 veya 5173 kullanılıyor)**
→ Başka bir uygulama o portu kullanıyor olabilir. `backend/.env` içinde PORT değerini değiştir (örn. 4001) veya diğer uygulamayı kapat.

---

## 🌍 Sonraki Adım: İnternete Yayınlama

Yerelde çalıştığını doğruladıktan sonra:
- **Backend** → Render.com veya Railway.app (ücretsiz plan mevcut)
- **Frontend** → Vercel.com veya Netlify.com (ücretsiz, GitHub ile bağlanıp otomatik deploy)
- Domain (örn. aquamedya.com.tr) DNS ayarları ile frontend'e yönlendirilir.

Bu adımda destek istersen, hangi platformu seçtiğini söyle, adım adım ekran görüntüsü seviyesinde talimat hazırlarım.

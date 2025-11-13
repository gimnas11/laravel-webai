# Panduan Deploy Laravel WebAI

## ⚠️ Vercel TIDAK Cocok untuk Laravel

Vercel tidak mendukung Laravel dengan baik karena Laravel membutuhkan server PHP tradisional, sedangkan Vercel fokus pada serverless/static sites.

## ✅ Platform yang Cocok untuk Laravel

### Opsi 1: Railway (PALING MUDAH & GRATIS) ⭐ RECOMMENDED

1. **Daftar di Railway:**
   - Buka https://railway.app
   - Login dengan GitHub (gratis)

2. **Buat Project:**
   - Klik "New Project"
   - Pilih "Deploy from GitHub repo"
   - Pilih repository `gimnas11/laravel-webai`

3. **Setup Database:**
   - Di project, klik "New" → "Database" → "Add MySQL" (gratis)
   - Railway akan otomatis membuat database

4. **Environment Variables:**
   Railway akan otomatis detect environment variables. Tambahkan:
   ```
   APP_NAME=Laravel WebAI
   APP_ENV=production
   APP_KEY=[generate dengan: php artisan key:generate]
   APP_DEBUG=false
   APP_URL=https://your-app.railway.app
   
   DB_CONNECTION=mysql
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_DATABASE=${{MySQL.MYSQLDATABASE}}
   DB_USERNAME=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   
   OPENAI_API_KEY=sk-xxxxx
   
   SESSION_DRIVER=database
   CACHE_DRIVER=database
   QUEUE_CONNECTION=database
   ```

5. **Deploy:**
   - Railway akan otomatis deploy
   - Setelah deploy, jalankan migration:
     - Klik "Deployments" → "View Logs"
     - Atau buat custom command: `php artisan migrate --force`

---

### Opsi 2: Render (GRATIS)

1. **Daftar di Render:**
   - Buka https://render.com
   - Login dengan GitHub (gratis)

2. **Buat Web Service:**
   - Klik "New" → "Web Service"
   - Connect repository `gimnas11/laravel-webai`
   - Build Command: `composer install --no-dev && npm install && npm run build`
   - Start Command: `php artisan serve --host=0.0.0.0 --port=$PORT`

3. **Setup Database:**
   - Klik "New" → "PostgreSQL" (gratis)
   - Copy connection string

4. **Environment Variables:**
   Tambahkan semua environment variables seperti di atas

---

### Opsi 3: Fly.io (GRATIS)

1. **Install Fly CLI:**
   ```bash
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Deploy:**
   ```bash
   fly launch
   ```

---

## 🚀 Rekomendasi: Gunakan Railway

Railway adalah pilihan TERMUDAH untuk deploy Laravel:
- ✅ Gratis tier tersedia
- ✅ Auto-detect Laravel
- ✅ Database MySQL gratis included
- ✅ Auto-deploy dari GitHub
- ✅ Mudah setup environment variables

## 📝 Langkah Deploy di Railway (Step-by-Step)

1. Buka https://railway.app
2. Login dengan GitHub
3. Klik "New Project"
4. Pilih "Deploy from GitHub repo"
5. Pilih `gimnas11/laravel-webai`
6. Railway akan otomatis detect dan deploy
7. Tambahkan database: Klik "New" → "Database" → "Add MySQL"
8. Tambahkan environment variables (lihat di atas)
9. Setelah deploy, jalankan migration via Railway dashboard

---

## 🔧 Setup Environment Variables di Railway

Setelah project dibuat di Railway:

1. Klik project → "Variables" tab
2. Tambahkan semua environment variables
3. Untuk database, Railway menyediakan variables otomatis:
   - `${{MySQL.MYSQLHOST}}`
   - `${{MySQL.MYSQLPORT}}`
   - `${{MySQL.MYSQLDATABASE}}`
   - `${{MySQL.MYSQLUSER}}`
   - `${{MySQL.MYSQLPASSWORD}}`

---

## ✅ Checklist

- [ ] Pilih platform (Railway recommended)
- [ ] Connect GitHub repository
- [ ] Setup database
- [ ] Tambahkan semua environment variables
- [ ] Generate APP_KEY
- [ ] Deploy
- [ ] Run migration
- [ ] Test aplikasi


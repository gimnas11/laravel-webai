# Cara Menjalankan Project G Chat

## ✅ Status Setup
- ✅ Database SQLite sudah dibuat
- ✅ Migrasi sudah dijalankan
- ✅ Dependencies sudah terinstall

## 🚀 Cara Menjalankan (Development Mode)

### Opsi 1: Menggunakan 2 Terminal Terpisah (Recommended)

**Terminal 1 - Laravel Server:**
```bash
php artisan serve
```
Server akan berjalan di: `http://localhost:8000`

**Terminal 2 - Vite Dev Server:**
```bash
npm run dev
```
Vite akan berjalan di: `http://localhost:5173` (atau port lain jika 5173 sudah digunakan)

**Akses aplikasi di:** `http://localhost:8000`

---

### Opsi 2: Menggunakan Composer Script (Semua dalam 1 Terminal)

Laravel sudah menyediakan script untuk menjalankan semua server sekaligus:

```bash
composer dev
```

Ini akan menjalankan:
- Laravel server (port 8000)
- Queue worker
- Log viewer (Pail)
- Vite dev server

**Akses aplikasi di:** `http://localhost:8000`

---

## 📝 Catatan Penting

1. **Pastikan XAMPP MySQL tidak perlu dijalankan** jika menggunakan SQLite (default)
2. **Jika ingin menggunakan MySQL**, edit file `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=laravel_webai
   DB_USERNAME=root
   DB_PASSWORD=
   ```
   Lalu buat database di phpMyAdmin dan jalankan:
   ```bash
   php artisan migrate
   ```

3. **Build untuk Production:**
   ```bash
   npm run build
   php artisan serve
   ```

---

## 🎯 Langkah-langkah Quick Start

1. **Buka Terminal 1:**
   ```bash
   cd C:\xampp\htdocs\laravel-webai
   php artisan serve
   ```

2. **Buka Terminal 2 (PowerShell baru):**
   ```bash
   cd C:\xampp\htdocs\laravel-webai
   npm run dev
   ```

3. **Buka browser:**
   - Buka: `http://localhost:8000`
   - Register akun baru atau login

---

## ⚠️ Troubleshooting

**Jika port 8000 sudah digunakan:**
```bash
php artisan serve --port=8001
```

**Jika Vite port sudah digunakan:**
Vite akan otomatis menggunakan port berikutnya (5174, 5175, dll)

**Jika ada error "Class not found":**
```bash
composer dump-autoload
```

**Jika assets tidak muncul:**
```bash
npm run build
```


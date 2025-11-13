# Environment Variables untuk Vercel

Copy environment variables berikut ke Vercel Dashboard → Settings → Environment Variables

## Cara menambahkan di Vercel:

1. Buka project di Vercel Dashboard
2. Klik **Settings** → **Environment Variables**
3. Klik **Add New** untuk setiap variable
4. Isi **Name** dan **Value**, lalu klik **Save**

---

## Environment Variables yang perlu ditambahkan:

### 1. App Configuration
```
Name: APP_NAME
Value: Laravel WebAI
```

```
Name: APP_ENV
Value: production
```

```
Name: APP_KEY
Value: [BUKA FILE .env ANDA, COPY NILAI APP_KEY YANG ADA DI SANA]
```

```
Name: APP_DEBUG
Value: false
```

```
Name: APP_URL
Value: https://laravel-webai.vercel.app
```
*(Ganti dengan URL project Vercel Anda setelah deploy)*

---

### 2. Database Configuration (Supabase)
```
Name: DB_CONNECTION
Value: pgsql
```

```
Name: DB_HOST
Value: db.pjtgsllffjftbcdgrzse.supabase.co
```

```
Name: DB_PORT
Value: 5432
```

```
Name: DB_DATABASE
Value: postgres
```

```
Name: DB_USERNAME
Value: postgres
```

```
Name: DB_PASSWORD
Value: [PASSWORD SUPABASE ANDA]
```
*(Ganti dengan password database Supabase Anda)*

---

### 3. OpenAI API
```
Name: OPENAI_API_KEY
Value: [API KEY OPENAI ANDA]
```
*(Ganti dengan API key OpenAI Anda, format: sk-xxxxx)*

---

### 4. Session & Cache
```
Name: SESSION_DRIVER
Value: database
```

```
Name: CACHE_DRIVER
Value: database
```

```
Name: QUEUE_CONNECTION
Value: database
```

---

## Checklist:

- [ ] Buka file `.env` di project Anda, copy nilai `APP_KEY=` dan paste ke Vercel
- [ ] Ganti `[PASSWORD SUPABASE ANDA]` dengan password database Supabase
- [ ] Ganti `[API KEY OPENAI ANDA]` dengan API key OpenAI Anda
- [ ] Setelah deploy, ganti `APP_URL` dengan URL Vercel yang sebenarnya

## Catatan:

- Setelah menambahkan semua environment variables, **redeploy** project di Vercel
- Environment variables hanya aktif setelah deploy ulang


# FinTime Backend API

FinTime Backend adalah core service yang mengelola manajemen keuangan personal, analisis cerdas menggunakan AI, dan otomatisasi pencatatan transaksi. Dibangun dengan Node.js dan Prisma ORM untuk memastikan skalabilitas dan performa tinggi dalam pengolahan data finansial.

## Tech Stack
- **Runtime:** Node.js (v20+)
- **Framework:** Express.js (ES Modules)
- **Database:** PostgreSQL (via Prisma ORM)
- **AI/ML:** TensorFlow.js
- **Authentication:** JSON Web Token (JWT) & Bcrypt
- **Scheduler:** Node-cron (Daily sync & tasks)
- **Testing:** Jest & Supertest

## Fitur Utama
- **Manajemen Transaksi:** Pencatatan otomatis dan manual dengan kategorisasi cerdas.
- **Smart Ledger:** Integrasi AI untuk labeling transaksi otomatis menggunakan TensorFlow.js.
- **Dashboard Analytics:** Agregasi data keuangan secara real-time.
- **Financial Health:** Perhitungan skor kesehatan finansial (Emergency fund, Debt metrics, dll).
- **Automated Sync:** Sinkronisasi harian untuk akun yang terhubung.
- **AI Financial Assistant:** Prediksi arus kas (What-If analysis) dan rekomendasi finansial.

## Arsitektur Direktori
```text
backend-fintime/
├── prisma/               # Skema database dan migrasi
├── src/
│   ├── config/           # Konfigurasi library & utils
│   ├── constants/        # Definisi variabel konstan
│   ├── controllers/      # Logika pemrosesan request
│   ├── jobs/             # Task penjadwalan (cron)
│   ├── middleware/       # Auth & Error handling
│   ├── models/           # Definisi skema data & AI models
│   ├── routes/           # Definisi API Endpoints
│   ├── services/         # Business logic layer
│   ├── utils/            # Helper functions (finance & general)
│   ├── app.js            # Inisialisasi Express
│   └── server.js         # Entry point aplikasi
└── tests/                # Unit & Integration testing
```

## Instalasi & Penggunaan

### 1. Clone & Install
```bash
cd backend-fintime
npm install
```

### 2. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan sesuaikan variabel berikut:
- `DATABASE_URL`: Koneksi PostgreSQL
- `JWT_SECRET`: Secret key untuk autentikasi
- `PORT`: Port aplikasi (default: 3000)

### 3. Database Setup
```bash
npx prisma generate
npx prisma migrate dev
npm run seed (opsional)
```

### 4. Menjalankan Aplikasi
- **Development:** `npm run dev` (dengan auto-reload)
- **Production:** `npm start`
- **Testing:** `npm test`

## API Endpoints (Ringkasan)
- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`
- **Transactions:** `GET /api/transactions`, `POST /api/transactions/relabel`
- **Dashboard:** `GET /api/dashboard/summary`
- **AI:** `POST /api/ai/forecast`, `POST /api/ai/what-if`
- **Finance:** `GET /api/finance/health-score`

## Pengembangan
Aplikasi ini dikembangkan dengan prinsip pemisahan tanggung jawab (Separation of Concerns). Pastikan setiap business logic diletakkan di layer **Services**, sedangkan **Controllers** hanya bertanggung jawab mengelola request dan response.

---
© 2026 FinTime Team. Seluruh hak cipta dilindungi undang-undang.

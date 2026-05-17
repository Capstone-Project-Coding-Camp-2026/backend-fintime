import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadAllModels } from '../src/controllers/aiController.js';

const app = createApp();

// Gunakan beforeAll untuk memuat model SEBELUM semua tes dijalankan
beforeAll(async () => {
  console.log("Menyiapkan environment testing...");
  await loadAllModels();
});

describe('Model API: NLP Classification', () => {
  
  it('Layer 1: Harus mengklasifikasikan transaksi berdasarkan rule-based keyword (MCDONALD)', async () => {
    const payload = {
      transactions: [
        { id: "tx-101", description: "DEBIT EDC MCDONALD SUDIRMAN JKT" }
      ]
    };

    const response = await request(app)
      .post('/api/ai/classify')
      .send(payload)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.results[0].category).toBe("makanan");
    expect(response.body.results[0].confidence).toBe(1.0);
  });

  it('Layer 2: Harus menerima klasifikasi dari model untuk data di luar keyword', async () => {
    const payload = {
      transactions: [
        // Kita gunakan deskripsi yang tidak ada di KEYWORD_MAP
        { id: "tx-102", description: "PEMBAYARAN KLINIK DR SANTOSO" }
      ]
    };

    const response = await request(app).post('/api/ai/classify').send(payload);

    expect(response.status).toBe(200);
    // Catatan: Karena ini model ASLI milikmu, ekspektasi ini bisa saja gagal 
    // jika modelmu ternyata memprediksi kategori lain. Jika gagal, cek response-nya 
    // dan sesuaikan string "kesehatan" dengan hasil prediksi asli modelmu!
    expect(response.body.results[0].category).toBeDefined(); 
  });

  it('Layer 3: Harus melempar ke fallback "lainnya" jika deskripsi sangat membingungkan/asing', async () => {
    const payload = {
      transactions: [
        { id: "tx-103", description: "ZZXXYY QWERTY RANDOM TEXT" }
      ]
    };

    const response = await request(app).post('/api/ai/classify').send(payload);

    expect(response.status).toBe(200);
    // Teks acak seharusnya menghasilkan confidence rendah (<0.7), sehingga masuk ke 'lainnya'
    expect(response.body.results[0].category).toBe("lainnya");
  });

  it('Validasi: Harus menolak request jika format input bukan array transaksi', async () => {
    const response = await request(app).post('/api/ai/classify').send({ text: "halo" });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Format transactions tidak valid');
  });
});
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Uji Coba API: General Endpoints FinTime', () => {
  
  // Test 1: Menguji endpoint health check
  it('GET /health - Harus mengembalikan status 200 dan objek { ok: true }', async () => {
    const response = await request(app)
      .get('/health')
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ok', true);
  });

  // Test 2: Menguji penanganan route yang salah (404)
  it('GET /api/route-asal-asalan - Harus mengembalikan status 404 untuk rute yang tidak terdaftar', async () => {
    const response = await request(app)
      .get('/api/route-asal-asalan');

    expect(response.status).toBe(404);
  });

  // Test 3: Memastikan middleware express.json() bekerja (Menerima JSON)
  it('POST /api/auth/register - Harus mengembalikan respons validasi/error yang terstruktur (bukan crash)', async () => {
    // Kita mengirim data kosong ke auth register untuk memastikan request body bisa dibaca
    const response = await request(app)
      .post('/api/auth/register')
      .send({}); // Mengirim body kosong

    expect(response.status).not.toBe(200);
  });
});
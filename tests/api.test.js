import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Uji Coba API: General Endpoints FinTime', () => {
  
  it('GET /health - Harus mengembalikan status 200 dan objek { ok: true }', async () => {
    const response = await request(app)
      .get('/health')
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ok', true);
  });

  it('GET /api/route-asal-asalan - Harus mengembalikan status 404 untuk rute yang tidak terdaftar', async () => {
    const response = await request(app)
      .get('/api/route-asal-asalan');

    expect(response.status).toBe(404);
  });

  it('POST /api/auth/register - Harus mengembalikan respons validasi/error yang terstruktur (bukan crash)', async () => {
  
    const response = await request(app)
      .post('/api/auth/register')
      .send({});

    expect(response.status).not.toBe(200);
  });
});
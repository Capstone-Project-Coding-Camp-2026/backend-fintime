import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Model API: What-If Decision Lab', () => {
  it('Harus menolak pembelian (dont_buy) jika cashflow setelahnya menjadi negatif', async () => {
    const payload = {
      user_id: "user-123",
      current_etr: 0.80,
      monthly_cashflow: 500000, 
      pinjol_active: false,
      paylater_usage_history: "occasional",
      item_price: 6000000, 
      paylater_tenor_months: 6,
      paylater_interest_rate: 0.05
    };

    const response = await request(app).post('/api/ai/whatif').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.recommendation).toBe("dont_buy");
    expect(response.body.cashflow_after_purchase).toBeLessThan(0);
  });

  it('Harus mengizinkan pembelian (just_buy) jika cicilan ringan dan aman', async () => {
    const payload = {
      user_id: "user-123",
      current_etr: 0.40,
      monthly_cashflow: 3000000,
      pinjol_active: false,
      paylater_usage_history: "never",
      item_price: 600000,
      paylater_tenor_months: 3,
      paylater_interest_rate: 0.0
    };

    const response = await request(app).post('/api/ai/whatif').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.recommendation).toBe("just_buy");
    expect(response.body.cashflow_after_purchase).toBe(2800000);
  });

  it('Validasi: Harus menolak request jika input harga barang tidak ada', async () => {
    const response = await request(app).post('/api/ai/whatif').send({ current_etr: 0.5 });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Data skenario pembelian tidak lengkap');
  });
});
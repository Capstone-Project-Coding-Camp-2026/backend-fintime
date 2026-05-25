import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Model API: What-If Lab Isolation Testing', () => {
  it('Harus berhasil melakukan prediksi dan mencetak JSON output asli', async () => {
    const payload = {
      user_profile: {
        age: 25,
        total_income: 8000000,
        monthly_expenses: 4000000,
        current_savings: 12000000,
        has_emergency_fund: 1,
        emergency_fund_months: 3,
        has_kpr: 0,
        has_vehicle_credit: 0,
        pinjol_active: 0,
        total_debt: 0,
        credit_card_utilization: 0.15,
        financial_literacy_score: 85,
        employment_type: "permanent",
        city_tier: "tier_1",
        paylater_usage_history: "never",
        impulse_spending_tendency: "low"
      },
      simulation: {
        item_price: 3000000,
        available_cash: 4000000,
        paylater_interest_rate: 0.02,
        paylater_tenor_months: 6
      }
    };

    const response = await request(app)
      .post('/api/ai/whatif')
      .send(payload)
      .set('Accept', 'application/json');

    // Menampilkan hasil komparasi JSON di konsol pengujian
    console.log("\n=======================================================");
    console.log("DEBUG OUTPUT JSON RESMI DARI MODEL");
    console.log("=======================================================");
    console.log(JSON.stringify(response.body, null, 2));
    console.log("=======================================================\n");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('recommendation');
    expect(response.body).toHaveProperty('confidence');
  });
});
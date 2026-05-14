const request = require('supertest');
const app = require('../src/app'); 

describe('Testing API Endpoints FinTime', () => {
    
    // Test 1: Pastikan server merespons dengan benar
    it('Harus mengembalikan status OK saat mengakses /health', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    // Test 2: Simulasi kirim data ke endpoint AI Forecast
    it('Endpoint /api/ai/forecast harus merespons data prediksi (Simulasi)', async () => {
        const mockData = {
            monthly_data: [
                {
                    bulan: "2024-01",
                    monthly_income: 5000000,
                    total_expense: 3000000,
                    expense_housing: 1000000,
                    expense_food: 1500000,
                    expense_transport: 500000,
                    expense_entertainment: 0,
                    expense_health: 0,
                    expense_education: 0,
                    savings_capacity: 2000000,
                    current_total_balance: 10000000,
                    expense_to_income_ratio: 0.6,
                    savings_rate: 0.4
                }
            ]
        };

        const res = await request(app)
            .post('/api/ai/forecast')
            .send(mockData); // Mengirim data JSON

        // Karena model TFJS belum ada, kita ekspektasikan error 500 yang sudah kita set di try-catch
        expect(res.statusCode).toEqual(500); 
        expect(res.body).toHaveProperty('error', 'TFJS Forecast Error');
    });
});
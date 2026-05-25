// src/controllers/mockController.js

export const simulateOtp = (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Email wajib diisi untuk pengiriman OTP.' 
            });
        }

        res.status(200).json({
            status: 'success',
            message: `OTP berhasil dikirim ke ${email} (Simulated)`
        });
    } catch (error) {
        next(error);
    }
};

export const generateMockTransactions = (req, res, next) => {
    try {
        const { source_type = 'all' } = req.query;
        const transactionCount = Math.floor(Math.random() * (500 - 300 + 1)) + 300;
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 12); 
        
        const templates = [
            { desc: 'DEBIT EDC MCDONALD SUDIRMAN JKT', type: 'debit', method: 'debit', src: 'BCA' },
            { desc: 'PYMNT PLN TOKEN 403821', type: 'debit', method: 'debit', src: 'Mandiri' },
            { desc: 'TRANSFER KE GOPAY 0812345678', type: 'transfer', method: 'debit', src: 'BCA' },
            { desc: 'GOFOOD AYAM GEPREK BENSU', type: 'debit', method: 'ewallet', src: 'GoPay' },
            { desc: 'NETFLIX SUBSCRIPTION', type: 'debit', method: 'ewallet', src: 'OVO' },
            { desc: 'GAJI BULANAN', type: 'credit', method: 'transfer', src: 'BCA' }
        ];

        let generatedTransactions = [];

        for (let i = 0; i < transactionCount; i++) {
            const template = templates[Math.floor(Math.random() * templates.length)];
            const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
            
            let amount = Math.floor(Math.random() * 300000) + 15000;
            if (template.desc.includes('GAJI')) amount = Math.floor(Math.random() * 5000000) + 5000000;

            generatedTransactions.push({
                date_time: randomDate.toISOString(),
                description: template.desc,
                amount: amount,
                category_label: null,
                transaction_type: template.type,
                payment_method: template.method,
                source: template.src
            });
        }

        generatedTransactions.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));

        res.status(200).json({
            status: 'success',
            count: generatedTransactions.length,
            data: generatedTransactions
        });
    } catch (error) {
        next(error); 
    }
};
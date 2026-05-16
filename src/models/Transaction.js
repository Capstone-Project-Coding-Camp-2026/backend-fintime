const mongoose = require('mongoose');

// Schema untuk Transaction
const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  dateTime: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  categoryLabel: {
    type: String,
    enum: [
      'perumahan',      // Housing
      'makanan',       // Food
      'transport',     // Transport
      'hiburan',       // Entertainment
      'kesehatan',     // Health
      'pendidikan',     // Education
      'belanja',       // Shopping
      'tagihan',       // Bills
      'gaji',          // Salary
      'investasi',     // Investment
      'freelance',      // Freelance
      'hadiah',         // Gift
      'lainnya'         // Other (default untuk confidence rendah)
    ],
    default: null
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  transactionType: {
    type: String,
    enum: ['debit', 'credit', 'transfer'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['tunai', 'debit', 'paylater', 'ewallet', 'credit'],
    default: 'tunai'
  },
  source: {
    type: String,
    enum: ['bca', 'mandiri', 'bni', 'btn', 'bri', 'cimb', 'permata', 'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja', 'lainnya'],
    default: 'lainnya'
  },
  isLabelled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index untuk query bulanan
transactionSchema.index({ userId: 1, dateTime: -1 });

// Virtual untuk computed fields
transactionSchema.virtual('isExpense').get(function() {
  return this.transactionType === 'debit';
});

transactionSchema.virtual('isIncome').get(function() {
  return this.transactionType === 'credit';
});

// Pre-save hook untuk update timestamp
transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
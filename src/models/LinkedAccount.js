const mongoose = require('mongoose');

// Schema untuk LinkedAccount (Bank & eWallet yang terhubung)
const linkedAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['bank', 'ewallet'],
    required: true
  },
  provider: {
    type: String,
    required: true,
    enum: [
      // Banks
      'bca', 'mandiri', 'bni', 'btn', 'bri', 'cimb', 'permata', 'lainnya_bank',
      // eWallets
      'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja', 'bacara', 'jago', 'lainnya_ewallet'
    ]
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true,
    default: ''
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'IDR'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSynced: {
    type: Date,
    default: null
  },
  apiToken: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Index untuk query
linkedAccountSchema.index({ userId: 1, provider: 1 });

// Virtual untuk icon dan warna
linkedAccountSchema.virtual('icon').get(function() {
  const icons = {
    bca: '🏦', mandiri: '🏦', bni: '🏦', btn: '🏦', bri: '🏦', cimb: '🏦', permata: '🏦',
    lainnya_bank: '🏦',
    gopay: '🟢', ovo: '🟣', dana: '🔵', shopeepay: '🟠', linkaja: '🔴',
    bacara: '💙', jago: '🟡', lainnya_ewallet: '💳'
  };
  return icons[this.provider] || '💳';
});

linkedAccountSchema.virtual('color').get(function() {
  const colors = {
    bca: '#009BDE', mandiri: '#C68B1E', bni: '#CC6232', btn: '#006B3F',
    bri: '#CC0000', cimb: '#0047AB', permata: '#006F49',
    lainnya_bank: '#7bafc4',
    gopay: '#00AA13', ovo: '#500772', dana: '#0047AB',
    shopeepay: '#FF6600', linkaja: '#CC0000',
    bacara: '#009BDE', jago: '#F4C200', lainnya_ewallet: '#7bafc4'
  };
  return colors[this.provider] || '#7bafc4';
});

// Virtual untuk label provider
linkedAccountSchema.virtual('providerLabel').get(function() {
  const labels = {
    bca: 'BCA', mandiri: 'Mandiri', bni: 'BNI', btn: 'BTN',
    bri: 'BRI', cimb: 'CIMB Niaga', permata: 'Permata Bank',
    lainnya_bank: 'Bank Lainnya',
    gopay: 'GoPay', ovo: 'OVO', dana: 'DANA',
    shopeepay: 'ShopeePay', linkaja: 'LinkAja',
    bacara: 'Blu', jago: 'Jago', lainnya_ewallet: 'eWallet Lainnya'
  };
  return labels[this.provider] || this.provider;
});

// Method untuk calculate total balance
linkedAccountSchema.statics.calculateTotalBalance = async function(userId) {
  const accounts = await this.find({ userId, isActive: true });
  return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
};

// Pre-save hook
linkedAccountSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const LinkedAccount = mongoose.model('LinkedAccount', linkedAccountSchema);

module.exports = LinkedAccount;
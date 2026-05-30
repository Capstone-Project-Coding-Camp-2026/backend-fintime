
/**
 * kategori diperluas menjadi 18 kategori agar sinkron dengan Frontend
 */
export const TRANSACTION_CATEGORIES = [
  // --- KATEGORI PENGELUARAN (Dianggap Expense) ---
  'perumahan',
  'makanan',
  'transport',
  'hiburan',
  'kesehatan',
  'pendidikan',
  'belanja',
  'tagihan',
  'investasi',
  'lainnya',
  'tidak_diketahui',
  'transfer_keluarga',
  'transfer_sosial',

  // --- KATEGORI PEMASUKAN (Credit) ---
  'gaji',
  'freelance',
  'hadiah',

  // --- KATEGORI NON-EXPENSE (Pengecualian) ---
  'topup_ewallet',
  'transfer_internal',
]

// Kategori yang TIDAK dihitung sebagai expense
export const NON_EXPENSE_CATEGORIES = ['topup_ewallet', 'transfer_internal']


export const CATEGORY_MAPPING = {
  // Mapping dari format Category_N (output model lama)
  Category_0: 'makanan',
  Category_1: 'transport',
  Category_2: 'hiburan',
  Category_3: 'belanja',
  Category_4: 'tagihan',
  Category_5: 'kesehatan',
  Category_6: 'pendidikan',
  Category_7: 'lainnya',
  Category_8: 'transfer_keluarga',
  Category_9: 'transfer_sosial',
  Category_10: 'tidak_diketahui',
  Category_11: 'topup_ewallet',
  Category_12: 'transfer_internal',
  // Alias yang mungkin dikirim AI
  food: 'makanan',
  transportation: 'transport',
  entertainment: 'hiburan',
  shopping: 'belanja',
  bills: 'tagihan',
  health: 'kesehatan',
  education: 'pendidikan',
  others: 'lainnya',
  other: 'lainnya',
  family_transfer: 'transfer_keluarga',
  social_transfer: 'transfer_sosial',
  unknown: 'tidak_diketahui',
  ewallet_topup: 'topup_ewallet',
  internal_transfer: 'transfer_internal',
  salary: 'gaji',
  investment: 'investasi',
  gift: 'hadiah',
  housing: 'perumahan',
}

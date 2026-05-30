/**
 * Mengimplementasikan 4 layer klasifikasi
 * Layer 1: Rule-based keyword matching (langsung, tanpa AI)
 * Layer 2: NLP via AI API (FastAPI /predict/classify)
 * Layer 3: Fallback ke 'lainnya' jika confidence < 0.7
 * Layer 4: Re-labelling oleh user (di frontend)
 */
import { classifyTransactionAI } from './aiApiService.js'
import { TRANSACTION_CATEGORIES, NON_EXPENSE_CATEGORIES } from '../constants/transactionCategories.js'

const CONFIDENCE_THRESHOLD = 0.7
const FALLBACK_LABEL = 'lainnya'

// Layer 1 — Rule-based keyword matching 
const KEYWORD_RULES = {
  // Topup e-wallet
  topup_ewallet: [
    'TRANSFER KE GOPAY', 'TOP UP OVO', 'TRF KE DANA', 'TOPUP GOPAY',
    'TOP UP GOPAY', 'TRANSFER KE OVO', 'TRANSFER KE DANA', 'ISI SALDO GOPAY',
    'ISI SALDO OVO', 'TRANSFER KE SHOPEEPAY', 'TOPUP OVO', 'TOPUP DANA',
    'TRF GOPAY', 'TRF OVO', 'TRF DANA', 'LINKAJA', 'SHOPEEPAY TOP',
  ],
  // Transfer internal
  transfer_internal: [
    'TRANSFER KE REKENING SENDIRI', 'TRF ANTAR REKENING', 'PINDAH DANA',
    'SETORAN TUNAI', 'SETOR TUNAI',
  ],
  // Makanan
  makanan: [
    'MCDONALD', 'MCDONALDS', 'KFC', 'GRABFOOD', 'GOFOOD', 'SHOPEEFOOD',
    'RESTORAN', 'WARUNG', 'KOPI', 'CAFE', 'COFFEE', 'PIZZA', 'BURGER',
    'STARBUCKS', 'BAKSO', 'MIE AYAM', 'INDOMIE', 'NASI', 'AYAM',
    'SEAFOOD', 'CATERING', 'FOOD', 'MAKAN', 'MINUMAN', 'DRINK',
    'HOKBEN', 'RICHEESE', 'JOLLIBEE', 'DOMINOS', 'SUBWAY', 'A&W',
  ],
  // Transport
  transport: [
    'GRAB', 'GOJEK', 'PERTAMINA', 'KRL', 'MRT', 'TRAVELOKA', 'PARKIR',
    'TOL', 'TIKET KERETA', 'TIKET PESAWAT', 'TRANSJAKARTA', 'OJOL',
    'TAXI', 'BENSIN', 'SPBU', 'SHELL', 'VIVO', 'COMMUTER', 'LRT',
    'DAMRI', 'BUS', 'AIRPORT', 'BANDARA', 'TERMINAL',
  ],
  // Hiburan
  hiburan: [
    'NETFLIX', 'SPOTIFY', 'BIOSKOP', 'XXI', 'CGV', 'STEAM', 'GYM',
    'KARAOKE', 'YOUTUBE PREMIUM', 'DISNEY', 'VIDIO', 'MOLA', 'MAIN',
    'GAME', 'PLAYSTATION', 'XBOX', 'DOTA', 'MOBILE LEGEND', 'FITNESS',
    'KOLAM RENANG', 'BILYAR', 'BOWLING', 'ESCAPE ROOM',
  ],
  // Belanja
  belanja: [
    'SHOPEE', 'TOKOPEDIA', 'LAZADA', 'BUKALAPAK', 'UNIQLO', 'INDOMARET',
    'ALFAMART', 'MALL', 'CARREFOUR', 'HYPERMART', 'SUPERMARKET', 'MINIMARKET',
    'BLIBLI', 'ZALORA', 'H&M', 'ZARA', 'IKEA', 'ACE HARDWARE',
  ],
  // Tagihan
  tagihan: [
    'PLN', 'TELKOMSEL', 'INDIHOME', 'BPJS', 'PDAM', 'IURAN RT',
    'TAGIHAN', 'BAYAR LISTRIK', 'BAYAR AIR', 'BAYAR INTERNET',
    'PASCAL', 'SPEEDY', 'BIZNET', 'FIRST MEDIA', 'MYREPUBLIC',
    'AXIS', 'XL', 'SIMPATI', 'AS', 'TELKOM', 'BOLT', 'SMARTFREN',
  ],
  // Kesehatan
  kesehatan: [
    'APOTEK', 'APOTIK', 'K24', 'HALODOC', 'RUMAH SAKIT', 'RS ', 'KLINIK',
    'GUARDIAN', 'DOKTER', 'OBAT', 'LAB', 'LABORATORIUM', 'WATSONS',
    'CENTURY', 'KIMIA FARMA', 'ALODOKTER', 'SEHATQ',
  ],
  // Pendidikan
  pendidikan: [
    'RUANGGURU', 'COURSERA', 'UDEMY', 'UANG KULIAH', 'SPP', 'BIMBEL',
    'BIMBINGAN BELAJAR', 'SEKOLAH', 'KAMPUS', 'UNIVERSITAS', 'INSTITUTE',
    'SMARTNATION', 'SKILL ACADEMY', 'DICODING', 'HACKTIV', 'PURWADHIKA',
  ],
}

/**
 * Layer 1: Rule-based keyword matching
 */
function keywordMatch(description) {
  const textUpper = description.toUpperCase()

  for (const [category, keywords] of Object.entries(KEYWORD_RULES)) {
    for (const kw of keywords) {
      if (textUpper.includes(kw)) {
        return {
          category,
          confidence: 1.0,
          source: 'keyword',
        }
      }
    }
  }

  return null
}

// Fungsi utama: classifyDescription
// Menjalankan Layer 1 → Layer 2 → Layer 3

/**
 * Klasifikasi deskripsi transaksi
 * @param {string} description
 * @returns {{ category: string, confidence: number, source: string, isLabelled: boolean }}
 */
export async function classifyDescription(description) {
  if (!description || typeof description !== 'string') {
    return {
      category: FALLBACK_LABEL,
      confidence: 0,
      source: 'fallback',
      isLabelled: false,
    }
  }

  // Layer 1: Keyword matching
  const keywordResult = keywordMatch(description)
  if (keywordResult) {
    return {
      ...keywordResult,
      isLabelled: true,
    }
  }

  // Layer 2: AI API (FastAPI)
  try {
    const aiResult = await classifyTransactionAI(description)

    if (aiResult.success && aiResult.predicted_category) {
      const confidence = aiResult.confidence ?? 0
      const category = aiResult.predicted_category

      // Layer 3: Fallback jika confidence < threshold
      if (confidence < CONFIDENCE_THRESHOLD || category === FALLBACK_LABEL) {
        return {
          category: FALLBACK_LABEL,
          confidence,
          source: 'fallback',
          isLabelled: false, // perlu re-label oleh user
        }
      }

      return {
        category,
        confidence,
        source: 'ai_api',
        isLabelled: true,
      }
    }
  } catch (err) {
    console.warn('[NLP] AI API gagal, fallback ke lainnya:', err.message)
  }

  // Layer 3: Fallback
  return {
    category: FALLBACK_LABEL,
    confidence: 0,
    source: 'fallback',
    isLabelled: false,
  }
}

/**
 * Cek apakah deskripsi cocok dengan label_rules user
 * @param {string} description
 * @param {Array} labelRules - Array rule dari User.labelRules: [{match, category}]
 * @returns {{ category: string, confidence: number, source: string } | null}
 */
export function applyLabelRules(description, labelRules) {
  if (!Array.isArray(labelRules) || labelRules.length === 0) return null
  if (!description) return null

  const textLower = description.toLowerCase().trim()

  for (const rule of labelRules) {
    if (rule.match && textLower.includes(rule.match.toLowerCase())) {
      return {
        category: rule.category,
        confidence: 1.0,
        source: 'label_rule',
        isLabelled: true,
      }
    }
  }

  return null
}

/**
 * Proses utama klasifikasi
 * 1. Cek label_rules user
 * 2. Jika tidak cocok → NLP (Layer 1 → 2 → 3)
 * @param {string} description
 * @param {Array} labelRules - label_rules milik user
 */
export async function classifyWithRules(description, labelRules = []) {
  // Step 1: Cek label_rules user
  const ruleResult = applyLabelRules(description, labelRules)
  if (ruleResult) {
    return ruleResult
  }

  // Step 2: Jalankan NLP (Layer 1 → 2 → 3)
  return await classifyDescription(description)
}

export { TRANSACTION_CATEGORIES, NON_EXPENSE_CATEGORIES, CONFIDENCE_THRESHOLD, FALLBACK_LABEL }

//node prisma/seed.js lalu npx prisma db push  (jika ingin dicoba di db local)
import prisma from '../src/lib/prisma.js'

async function main() {
  await prisma.learning.createMany({
    data: [
      // =========================================
      // BAD CONDITION
      // =========================================

      {
        id: 'cmpuzrwaa0000tn88302kxxst',
        title: 'Kenapa Dana Darurat Lebih Penting Dari Investasi?',
        content:
          'Saat kondisi finansial belum stabil, prioritas utama bukan keuntungan besar, tetapi keamanan finansial. Dana darurat membantu kamu menghadapi kebutuhan mendadak tanpa harus berutang atau menjual aset.',
        targetCondition: 'bad',
        category: 'tabungan',
        sourceUrl:
          'https://www.dbs.id/digibank/id/id/articles/dana-darurat-vs-investasi-mana-yang-harus-didahulukan',
      },

      {
        id: 'cmpuzrwab0001tn88ztofsmn9',
        title: 'Cara Mengurangi Impulse Buying',
        content:
          'Impulse buying sering membuat pengeluaran terasa kecil padahal jika dikumpulkan bisa sangat besar. Coba tunggu 24 jam sebelum membeli sesuatu yang tidak direncanakan.',
        targetCondition: 'bad',
        category: 'budgeting',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/6-cara-agar-tidak-terjebak',
      },

      {
        id: 'cmpuzrwab0002tn88turszo0z',
        title: 'Mulai Nabung Tidak Harus Menunggu Gaji Besar',
        content:
          'Kebiasaan menabung lebih penting daripada nominal besar di awal. Konsistensi kecil yang dilakukan terus-menerus akan membantu membangun fondasi finansial yang lebih sehat.',
        targetCondition: 'bad',
        category: 'tabungan',
        sourceUrl:
          'https://www.dbs.id/digibank/id/id/articles/tips-cara-menyisihkan-gaji-untuk-memulai-investasi-reksadana-saham',
      },

      // =========================================
      // NORMAL CONDITION
      // =========================================

      {
        id: 'cmpuzrwab0003tn88zrm1yzu8',
        title: 'Efek Compound Interest untuk Anak Muda',
        content:
          'Semakin cepat mulai investasi, semakin besar efek compounding yang bisa didapat. Konsistensi investasi kecil dalam jangka panjang sering memberikan hasil lebih baik dibanding menunggu modal besar.',
        targetCondition: 'normal',
        category: 'investasi',
        sourceUrl:
          'https://www.dbs.id/digibank/id/id/articles/makin-cuan-investasi-deposito-dengan-strategi-compound-interest',
      },

      {
        id: 'cmpuzrwab0004tn88yniqyom0',
        title: 'Diversifikasi Membantu Mengurangi Risiko',
        content:
          'Menyimpan seluruh uang dalam satu jenis aset dapat meningkatkan risiko finansial. Diversifikasi membantu menjaga kestabilan portofolio ketika kondisi pasar berubah.',
        targetCondition: 'normal',
        category: 'investasi',
        sourceUrl:
          'https://www.dbs.id/digibank/id/id/articles/konsep-diversifikasi-jenis-dan-manfaatnya-dalam-investasi',
      },

      {
        id: 'cmpuzrwab0005tn880tpj5vlh',
        title: 'Mulai Persiapan Pensiun Lebih Awal',
        content:
          'Persiapan pensiun bukan hanya untuk usia tua. Memulai lebih awal memberikan waktu lebih panjang bagi aset untuk berkembang.',
        targetCondition: 'normal',
        category: 'pensiun',
        sourceUrl:
          'https://www.dbs.com/newsroom/Bagaimana_Cara_Gen_Z_dan_Millenial_Menyiapkan_Dana_Pensiun_Sejak_Dini_Ini_Tips_dari_Pakar_Bank_DBS_Indonesia',
      },

      // =========================================
      // GOOD CONDITION
      // =========================================

      {
        id: 'cmpuzrwab0006tn88cukwk9qs',
        title: 'Membangun Financial Freedom Sejak Muda',
        content:
          'Tujuan finansial bukan hanya memiliki banyak uang, tetapi memiliki kebebasan dalam menentukan pilihan hidup dan masa depan.',
        targetCondition: 'good',
        category: 'pensiun',
        sourceUrl:
          'https://www.dbs.id/digibank/id/id/articles/strategi-sukses-finansial-freedom-dari-investasi-multi-income',
      },

      {
        id: 'cmpuzrwab0007tn88dfjfz5ld',
        title: 'Lifestyle Inflation Bisa Menghambat Pertumbuhan Aset',
        content:
          'Pendapatan yang meningkat tidak selalu berarti kekayaan meningkat. Jika pengeluaran ikut naik terlalu cepat, pertumbuhan aset dapat melambat.',
        targetCondition: 'good',
        category: 'budgeting',
        sourceUrl: 'https://www.heygotrade.com/id/blog/lifestyle-inflation-adalah/',
      },

      {
        id: 'cmpuzrwab0008tn88ewutk09w',
        title: 'Passive Income Membantu Stabilitas Finansial',
        content:
          'Membangun sumber penghasilan tambahan dapat membantu memperkuat kondisi finansial dan memberikan fleksibilitas lebih besar di masa depan.',
        targetCondition: 'good',
        category: 'investasi',
        sourceUrl:
          'https://www.dbs.id/id/treasures/articles/tips-wujudkan-dana-pasif-saat-pensiun-apa-langkahnya',
      },

      // =========================================
      // ALL CONDITION
      // =========================================

      {
        id: 'cmpuzrwab0009tn88j01caexh',
        title: 'Kenapa Financial Literacy Penting?',
        content:
          'Memahami dasar-dasar finansial membantu seseorang mengambil keputusan keuangan yang lebih baik dan menghindari risiko finansial di masa depan.',
        targetCondition: 'all',
        category: 'budgeting',
        sourceUrl: 'https://www.dbs.id/id/treasures-id/articles/buat-rencana-finansial-sekarang',
      },

      {
        id: 'cmpuzrwab000atn88q42zyvz0',
        title: 'Konsistensi Lebih Penting Dari Kesempurnaan',
        content:
          'Membangun kebiasaan finansial sehat tidak harus langsung sempurna. Perubahan kecil yang dilakukan secara konsisten akan memberikan dampak besar dalam jangka panjang.',
        targetCondition: 'all',
        category: 'tabungan',
        sourceUrl:
          'https://www.dbs.id/digibank/id/id/articles/kekuatan-kekayaan-dini-membangun-momentum-di-babak-awal-perjalanan-finansial-anda',
      },
    ],
  })

  console.log('✅ Financial learning seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

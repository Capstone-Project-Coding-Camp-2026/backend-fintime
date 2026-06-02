import prisma from '../src/lib/prisma.js'

async function main() {
  await prisma.learning.deleteMany({}) // Clear old data to prevent ID conflicts
  await prisma.learning.createMany({
    data: [
      {
        id: 'cmpuzrwaa0000tn88302kxxst',
        title: 'Kenapa Dana Darurat Lebih Penting Dari Investasi?',
        titleEn: 'Why Emergency Funds Are More Important Than Investments?',
        content: 'Saat kondisi finansial belum stabil, prioritas utama bukan keuntungan besar, tetapi keamanan finansial. Dana darurat membantu kamu menghadapi kebutuhan mendadak tanpa harus berutang atau menjual aset.',
        contentEn: 'When your finances are unstable, the top priority is financial security, not huge profits. An emergency fund helps you face sudden needs without having to go into debt or sell assets.',
        targetCondition: 'bad',
        category: 'tabungan',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/dana-darurat-vs-investasi-mana-yang-harus-didahulukan',
      },
      {
        id: 'cmpuzrwab0001tn88ztofsmn9',
        title: 'Cara Mengurangi Impulse Buying',
        titleEn: 'How to Reduce Impulse Buying',
        content: 'Impulse buying sering membuat pengeluaran terasa kecil padahal jika dikumpulkan bisa sangat besar. Coba tunggu 24 jam sebelum membeli sesuatu yang tidak direncanakan.',
        contentEn: 'Impulse buying often makes expenses feel small, but when accumulated, they can be huge. Try waiting 24 hours before buying something unplanned.',
        targetCondition: 'bad',
        category: 'budgeting',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/6-cara-agar-tidak-terjebak',
      },
      {
        id: 'cmpuzrwab0002tn88turszo0z',
        title: 'Mulai Nabung Tidak Harus Menunggu Gaji Besar',
        titleEn: 'You Don\'t Have to Wait for a Big Salary to Start Saving',
        content: 'Kebiasaan menabung lebih penting daripada nominal besar di awal. Konsistensi kecil yang dilakukan terus-menerus akan membantu membangun fondasi finansial yang lebih sehat.',
        contentEn: 'The habit of saving is more important than a large starting amount. Small consistencies applied continuously will help build a healthier financial foundation.',
        targetCondition: 'bad',
        category: 'tabungan',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/tips-cara-menyisihkan-gaji-untuk-memulai-investasi-reksadana-saham',
      },
      {
        id: 'cmpuzrwab0003tn88zrm1yzu8',
        title: 'Efek Compound Interest untuk Anak Muda',
        titleEn: 'The Effect of Compound Interest for Young People',
        content: 'Semakin cepat mulai investasi, semakin besar efek compounding yang bisa didapat. Konsistensi investasi kecil dalam jangka panjang sering memberikan hasil lebih baik dibanding menunggu modal besar.',
        contentEn: 'The sooner you start investing, the bigger the compounding effect. Consistent small investments in the long run often yield better results than waiting for big capital.',
        targetCondition: 'normal',
        category: 'investasi',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/makin-cuan-investasi-deposito-dengan-strategi-compound-interest',
      },
      {
        id: 'cmpuzrwab0004tn88yniqyom0',
        title: 'Diversifikasi Membantu Mengurangi Risiko',
        titleEn: 'Diversification Helps Reduce Risks',
        content: 'Menyimpan seluruh uang dalam satu jenis aset dapat meningkatkan risiko finansial. Diversifikasi membantu menjaga kestabilan portofolio ketika kondisi pasar berubah.',
        contentEn: 'Keeping all your money in one type of asset increases financial risk. Diversification helps maintain portfolio stability when market conditions change.',
        targetCondition: 'normal',
        category: 'investasi',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/konsep-diversifikasi-jenis-dan-manfaatnya-dalam-investasi',
      },
      {
        id: 'cmpuzrwab0005tn880tpj5vlh',
        title: 'Mulai Persiapan Pensiun Lebih Awal',
        titleEn: 'Start Retirement Preparation Early',
        content: 'Persiapan pensiun bukan hanya untuk usia tua. Memulai lebih awal memberikan waktu lebih panjang bagi aset untuk berkembang.',
        contentEn: 'Retirement preparation isn\'t just for old age. Starting early gives your assets more time to grow.',
        targetCondition: 'normal',
        category: 'pensiun',
        sourceUrl: 'https://www.dbs.com/newsroom/Bagaimana_Cara_Gen_Z_dan_Millenial_Menyiapkan_Dana_Pensiun_Sejak_Dini_Ini_Tips_dari_Pakar_Bank_DBS_Indonesia',
      },
      {
        id: 'cmpuzrwab0006tn88cukwk9qs',
        title: 'Membangun Financial Freedom Sejak Muda',
        titleEn: 'Building Financial Freedom from a Young Age',
        content: 'Tujuan finansial bukan hanya memiliki banyak uang, tetapi memiliki kebebasan dalam menentukan pilihan hidup dan masa depan.',
        contentEn: 'Financial goals are not just about having a lot of money, but having the freedom to determine life choices and the future.',
        targetCondition: 'good',
        category: 'pensiun',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/strategi-sukses-finansial-freedom-dari-investasi-multi-income',
      },
      {
        id: 'cmpuzrwab0007tn88dfjfz5ld',
        title: 'Lifestyle Inflation Bisa Menghambat Pertumbuhan Aset',
        titleEn: 'Lifestyle Inflation Can Hinder Asset Growth',
        content: 'Pendapatan yang meningkat tidak selalu berarti kekayaan meningkat. Jika pengeluaran ikut naik terlalu cepat, pertumbuhan aset dapat melambat.',
        contentEn: 'Increasing income doesn\'t always mean increasing wealth. If expenses rise too fast, asset growth may slow down.',
        targetCondition: 'good',
        category: 'budgeting',
        sourceUrl: 'https://www.heygotrade.com/id/blog/lifestyle-inflation-adalah/',
      },
      {
        id: 'cmpuzrwab0008tn88ewutk09w',
        title: 'Passive Income Membantu Stabilitas Finansial',
        titleEn: 'Passive Income Helps Financial Stability',
        content: 'Membangun sumber penghasilan tambahan dapat membantu memperkuat kondisi finansial dan memberikan fleksibilitas lebih besar di masa depan.',
        contentEn: 'Building additional income streams can help strengthen your finances and provide greater flexibility in the future.',
        targetCondition: 'good',
        category: 'investasi',
        sourceUrl: 'https://www.dbs.id/id/treasures/articles/tips-wujudkan-dana-pasif-saat-pensiun-apa-langkahnya',
      },
      {
        id: 'cmpuzrwab0009tn88j01caexh',
        title: 'Kenapa Financial Literacy Penting?',
        titleEn: 'Why is Financial Literacy Important?',
        content: 'Memahami dasar-dasar finansial membantu seseorang mengambil keputusan keuangan yang lebih baik dan menghindari risiko finansial di masa depan.',
        contentEn: 'Understanding financial basics helps individuals make better financial decisions and avoid future financial risks.',
        targetCondition: 'all',
        category: 'budgeting',
        sourceUrl: 'https://www.dbs.id/id/treasures-id/articles/buat-rencana-finansial-sekarang',
      },
      {
        id: 'cmpuzrwab000atn88q42zyvz0',
        title: 'Konsistensi Lebih Penting Dari Kesempurnaan',
        titleEn: 'Consistency is More Important Than Perfection',
        content: 'Membangun kebiasaan finansial sehat tidak harus langsung sempurna. Perubahan kecil yang dilakukan secara konsisten akan memberikan dampak besar dalam jangka panjang.',
        contentEn: 'Building healthy financial habits doesn\'t have to be perfect right away. Small changes made consistently will have a huge impact in the long run.',
        targetCondition: 'all',
        category: 'tabungan',
        sourceUrl: 'https://www.dbs.id/digibank/id/id/articles/kekuatan-kekayaan-dini-membangun-momentum-di-babak-awal-perjalanan-finansial-anda',
      }
    ]
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

export const createMockTransactions = () => {
  const transactionCount = Math.floor(Math.random() * (500 - 300 + 1)) + 300;

  const endDate = new Date();
  const startDate = new Date();

  startDate.setMonth(endDate.getMonth() - 12);

  const templates = [
    {
      desc: "DEBIT EDC MCDONALD SUDIRMAN JKT",
      type: "debit",
      method: "debit",
      src: "bca",
    },
    {
      desc: "PYMNT PLN TOKEN 403821",
      type: "debit",
      method: "debit",
      src: "mandiri",
    },
    {
      desc: "TRANSFER KE GOPAY 0812345678",
      type: "transfer",
      method: "debit",
      src: "bca",
    },
    {
      desc: "GOFOOD AYAM GEPREK BENSU",
      type: "debit",
      method: "ewallet",
      src: "gopay",
    },
    {
      desc: "NETFLIX SUBSCRIPTION",
      type: "debit",
      method: "ewallet",
      src: "ovo",
    },
    {
      desc: "GAJI BULANAN",
      type: "credit",
      method: "transfer",
      src: "bca",
    },
  ];

  const generatedTransactions = [];

  for (let i = 0; i < transactionCount; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];

    const randomDate = new Date(
      startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime()),
    );

    let amount = Math.floor(Math.random() * 300000) + 15000;

    if (template.desc.includes("GAJI")) {
      amount = Math.floor(Math.random() * 5000000) + 5000000;
    }

    generatedTransactions.push({
      dateTime: randomDate.toISOString(),
      description: template.desc,
      amount,
      categoryLabel: null,
      transactionType: template.type,
      paymentMethod: template.method,
      source: template.src,
    });
  }

  generatedTransactions.sort(
    (a, b) => new Date(a.dateTime) - new Date(b.dateTime),
  );

  return generatedTransactions;
};

import {
  CATEGORY_MAPPING,
  TRANSACTION_CATEGORIES,
} from "../../constants/transactionCategories.js";

export { TRANSACTION_CATEGORIES };

export const mapCategory = (predictedCategory) => {
  if (!predictedCategory) {
    return "lainnya";
  }

  // coba langsung dari mapping
  if (CATEGORY_MAPPING[predictedCategory]) {
    return CATEGORY_MAPPING[predictedCategory];
  }

  const cleanCategory = predictedCategory.toLowerCase().trim();

  // coba dari mapping dengan lowercase
  if (CATEGORY_MAPPING[cleanCategory]) {
    return CATEGORY_MAPPING[cleanCategory];
  }

  // coba langsung jika sudah dalam format yang valid
  if (TRANSACTION_CATEGORIES.includes(cleanCategory)) {
    return cleanCategory;
  }

  return "lainnya";
};


import {
  CATEGORY_MAPPING,
  TRANSACTION_CATEGORIES,
} from "../../constants/transactionCategories.js";

export const mapCategory = (predictedCategory) => {
  if (!predictedCategory) {
    return "lainnya";
  }

  if (CATEGORY_MAPPING[predictedCategory]) {
    return CATEGORY_MAPPING[predictedCategory];
  }

  const cleanCategory = predictedCategory.toLowerCase().trim();

  if (TRANSACTION_CATEGORIES.includes(cleanCategory)) {
    return cleanCategory;
  }

  return "lainnya";
};

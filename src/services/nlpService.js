import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';

let classifyModel = null;
let tokenizer = null;
let inferenceConfig = null;
let labelMap = null;

// Paths (using relative paths from project root)
const tokenizerPath = './src/models/tfjs/classify/tokenizer.json';
const configPath = './src/models/tfjs/classify/inference_config.json';
const labelsPath = './src/models/tfjs/classify/labels.json';

export function initNlpService(model) {
  classifyModel = model;
  
  // Load configuration files
  if (fs.existsSync(tokenizerPath)) {
    tokenizer = JSON.parse(fs.readFileSync(tokenizerPath, 'utf8'));
  } else {
    console.error("Tokenizer config file not found:", tokenizerPath);
  }

  if (fs.existsSync(configPath)) {
    inferenceConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.error("Inference config file not found:", configPath);
  }

  if (fs.existsSync(labelsPath)) {
    labelMap = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  } else {
    console.error("Labels map file not found:", labelsPath);
  }
}

/**
 * Normalizes input text and extracts character n-grams.
 */
function extractNgrams(text, minLen = 2, maxLen = 5) {
  // Lowercase, collapse whitespace, trim
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const ngrams = [];
  
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i <= normalized.length - len; i++) {
      ngrams.push(normalized.substring(i, i + len));
    }
  }
  return ngrams;
}

/**
 * Vectorizes raw text using TF-L2 representation based on tokenizer vocabulary.
 */
export function vectorize(text) {
  if (!tokenizer) {
    throw new Error("NLP Service not initialized. Tokenizer not loaded.");
  }

  const vocab = tokenizer.word_index;
  const inputDim = tokenizer.input_dim || 22454;
  const minLen = tokenizer.ngram_min || 2;
  const maxLen = tokenizer.ngram_max || 5;

  const ngrams = extractNgrams(text, minLen, maxLen);
  
  // Count frequency of each n-gram
  const counts = {};
  for (const ngram of ngrams) {
    if (vocab.hasOwnProperty(ngram)) {
      const idx = vocab[ngram];
      counts[idx] = (counts[idx] || 0) + 1;
    }
  }

  // Calculate sublinear TF: 1 + ln(count) for count > 0
  const values = {};
  let sumOfSquares = 0;
  for (const idx in counts) {
    const count = counts[idx];
    const tfVal = 1 + Math.log(count);
    values[idx] = tfVal;
    sumOfSquares += tfVal * tfVal;
  }

  // L2 Normalization
  const norm = Math.sqrt(sumOfSquares);
  const vector = new Float32Array(inputDim);
  if (norm > 0) {
    for (const idx in values) {
      vector[parseInt(idx)] = values[idx] / norm;
    }
  }

  return tf.tensor2d([vector], [1, inputDim]);
}

/**
 * Classifies a single transaction description.
 */
export async function classifyTransaction(description) {
  if (!inferenceConfig || !labelMap) {
    throw new Error("NLP Service not initialized. Configs not loaded.");
  }

  const keywordRules = inferenceConfig.keyword_rules || {};
  const threshold = inferenceConfig.confidence_threshold || 0.7;
  const fallbackLabel = inferenceConfig.fallback_label || 'lainnya';

  const textUpper = description.toUpperCase();

  // Layer 1: Rule-based Keyword Matching
  for (const [category, keywords] of Object.entries(keywordRules)) {
    for (const kw of keywords) {
      if (textUpper.includes(kw)) {
        return {
          category: category,
          confidence: 1.0,
          source: 'keyword'
        };
      }
    }
  }

  // Layer 2: Model Prediction
  if (!classifyModel) {
    // If model is not loaded yet, return fallback
    return {
      category: fallbackLabel,
      confidence: 0.0,
      source: 'fallback'
    };
  }

  let inputTensor = null;
  let prediction = null;
  try {
    inputTensor = vectorize(description);
    prediction = classifyModel.predict(inputTensor);
    const probabilities = await prediction.array();
    const probRow = probabilities[0];
    
    const maxConfidence = Math.max(...probRow);
    const classIdx = probRow.indexOf(maxConfidence);
    let category = labelMap.idx2label[classIdx] || fallbackLabel;

    // Layer 3: Fallback if confidence < threshold
    if (maxConfidence < threshold) {
      return {
        category: fallbackLabel,
        confidence: maxConfidence,
        source: 'fallback'
      };
    }

    return {
      category: category,
      confidence: maxConfidence,
      source: 'model'
    };
  } catch (error) {
    console.error("Error during model prediction:", error);
    return {
      category: fallbackLabel,
      confidence: 0.0,
      source: 'fallback'
    };
  } finally {
    if (inputTensor) inputTensor.dispose();
    if (prediction) prediction.dispose();
  }
}

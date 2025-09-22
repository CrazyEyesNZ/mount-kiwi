// js/data-service.js - REAL FIRESTORE DATA SERVICE

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toTitleCase } from "./utils.js";

// In-memory cache for historical data
const historyData = {};

/**
 * Load historical product data from Firestore into historyData cache.
 * Normalises keys to handle different casing (lower, upper, title).
 */
export async function loadHistory() {
  try {
    console.log('📊 Loading historical data from Firestore...');
    const snapshot = await getDocs(collection(db, "product_history"));
    
    snapshot.docs.forEach((doc) => {
      const d = doc.data();
      const productType = (d["PRODUCT TYPE"] || d.productType || "").toString().trim();
      const variety     = (d["VARIETY"]     || d.variety     || "").toString().trim();
      const colour      = (d["COLOUR"]      || d.colour      || "").toString().trim();
      const size        = (d["SIZE"]        || d.size        || "").toString().trim();

      // Build key variants
      const baseKey  = `${productType}|${variety}|${colour}|${size}`;
      const lowerKey = baseKey.toLowerCase();
      const upperKey = baseKey.toUpperCase();
      const titleKey = [
        toTitleCase(productType),
        toTitleCase(variety),
        toTitleCase(colour),
        toTitleCase(size)
      ].join("|");

      // Store in cache under all variants
      historyData[baseKey]  = d;
      historyData[lowerKey] = d;
      historyData[upperKey] = d;
      historyData[titleKey] = d;
    });

    console.log(`📊 Historical data loaded: ${snapshot.size} records`);
  } catch (err) {
    console.error("❌ Error loading historical data:", err);
  }
}

/**
 * Fetch the current product catalog from Firestore.
 * @returns {Promise<Array>} Array of { id, ...docData }
 */
export async function fetchProducts() {
  try {
    console.log('📦 Fetching products from Firestore...');
    const snapshot = await getDocs(collection(db, "products"));
    
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Fetched ${products.length} products from Firestore:`, products);
    
    // Fixed validation to match your actual Firestore structure
    products.forEach(product => {
      // Use 'type' as the name if 'name' doesn't exist
      if (!product.name && product.type) {
        product.name = product.type;
      } else if (!product.name) {
        console.warn(`⚠️ Product ${product.id} missing both 'name' and 'type' fields`);
      }
      
      // Extract sizes from varieties if not at top level
      if (!product.sizes || !Array.isArray(product.sizes)) {
        if (product.varieties && Array.isArray(product.varieties) && product.varieties[0]?.sizes) {
          product.sizes = product.varieties[0].sizes; // Use sizes from first variety
        } else {
          product.sizes = ["One Size"]; // Default fallback
        }
      }
      
      if (!product.varieties || !Array.isArray(product.varieties)) {
        console.warn(`⚠️ Product ${product.id} missing 'varieties' array`);
      }
    });
    
    return products;
  } catch (err) {
    console.error("❌ Error fetching products from Firestore:", err);
    console.error("🔍 Make sure your Firestore 'products' collection exists and has the correct structure");
    return [];
  }
}

// Expose history cache for tooltips/other modules
export { historyData };
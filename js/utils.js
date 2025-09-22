// assets/js/utils.js - Complete file with all functions

/**
 * Formats a Date object or date string to New Zealand standard (DD/MM/YYYY).
 * @param {string|Date} dateInput - ISO string or Date instance
 * @returns {string}
 */
export function formatDateToNZ(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a timestamp or Date instance into a localized date-time string.
 * @param {string|Date|number|Object} dateInput - Date, timestamp, or Firestore timestamp
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '';
  
  let date;
  
  // Handle Firestore Timestamp objects
  if (dateInput && typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else {
    date = new Date(dateInput);
  }
  
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleString('en-NZ', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Convert a colour name to a sanitized filename for swatches.
 * E.g. "Dark Blue" -> "darkblue.png"
 * @param {string} colour
 * @returns {string}
 */
export function colourToPictureFileName(colour) {
  return colour
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    + ".png";
}

/**
 * Convert a string into Title Case.
 * E.g. "dark blue" -> "Dark Blue"
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate the expected product image filename based on product type,
 * variety, and optional colour.
 * @param {string} productType  - e.g. "Beanies", "Jackets"
 * @param {string} varietyName  - e.g. "Koru Beanie", "Alpine Jacket"
 * @param {string|null} colourName - e.g. "Charcoal" or null
 * @returns {string}
 */
export function varietyToPictureFileName(productType, varietyName, colourName) {
  // Normalize productType to match filenames
  let fileProductType = productType;
  if (productType === "Beanies") fileProductType = "Beanie";
  else if (productType === "Jackets") fileProductType = "Jacket";
  else if (productType === "Shawls") fileProductType = "Shawl";
  else if (productType === "Weekenders") fileProductType = "Weekender";
  else if (productType === "House Socks") fileProductType = "House Socks";
  else if (productType === "Kids Jackets") fileProductType = "Kids Jacket";
  else if (productType === "Coastal") fileProductType = "Coastal";

  // Remove common suffixes from varietyName and clean it
  const suffixesToRemove = [
    ' Beanie', ' Beanies', ' Jacket', ' Jackets', ' Shawl', ' Shawls',
    ' Weekender', ' Weekenders', ' Coastal', ' House Socks', ' House Sock',
    ' Kids Jacket', ' Kids Jackets'
  ];
  
  let cleanVariety = varietyName;
  suffixesToRemove.forEach(suffix => {
    if (cleanVariety.endsWith(suffix)) {
      cleanVariety = cleanVariety.slice(0, -suffix.length);
    }
  });

  // Replace forward slashes with spaces
  cleanVariety = cleanVariety.replace(/\//g, ' ');

  // Determine if we include colour in filename
  const hasColour = colourName && colourName.trim() !== '' && colourName.toLowerCase() !== 'base';
  
  if (hasColour) {
    const cleanColour = colourName.replace(/\//g, ' ');
    return `${fileProductType}-${cleanVariety}-${cleanColour}.png`;
  }

  return `${fileProductType}-${cleanVariety}.png`;
}

// ==== Order colour (shared across pages) ====
const MK_LEFT_CLASSES = [
  'mk-left-red', 'mk-left-blue', 'mk-left-green', 'mk-left-yellow',
  'mk-left-orange', 'mk-left-purple', 'mk-left-teal', 'mk-left-pink',
  'mk-left-brown', 'mk-left-cyan',
];

function __mkHashId(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

const ORDER_COLOR_CLASSES = [
  'order-color-red',
  'order-color-blue',
  'order-color-green',
  'order-color-orange',
  'order-color-purple',
  'order-color-teal',
  'order-color-pink',
  'order-color-brown',
  'order-color-cyan',
  'order-color-lime'
];

/**
 * Deterministically assign a CSS class to an order based on its ID
 */
export function orderColorClass(orderId) {
  if (!orderId) return ORDER_COLOR_CLASSES[0];
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash << 5) - hash + orderId.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  const index = Math.abs(hash) % ORDER_COLOR_CLASSES.length;
  return ORDER_COLOR_CLASSES[index];
}


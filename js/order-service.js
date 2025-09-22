// js/order-service.js

// Local storage keys
const ORDER_STORAGE_KEY = "mk_order";
const NOTES_STORAGE_KEY = "mk_notes";

// Per-order namespacing
let storageSuffix = ''; // e.g., _abc123 (pending order id)

// In-memory state
let currentOrder = {};
let orderNotes   = {};
let productOrder = [];

// Store product metadata for rendering
let productMetadata = {};

function keyWithSuffix(base) { return `${base}${storageSuffix}`; }

// Call this as soon as you know the pending order id
export function setOrderStorageSuffix(id) {
  storageSuffix = id ? `_${id}` : '';
  reloadOrderFromStorage();
}

export function reloadOrderFromStorage() {
  try {
    currentOrder = JSON.parse(localStorage.getItem(keyWithSuffix(ORDER_STORAGE_KEY))) || {};
  } catch { currentOrder = {}; }
  try {
    orderNotes = JSON.parse(localStorage.getItem(keyWithSuffix(NOTES_STORAGE_KEY))) || {};
  } catch { orderNotes = {}; }

  // If the UI is already mounted, refresh it
  if (typeof updateOrderUI === 'function') updateOrderUI();
  if (typeof renderCurrentOrder === 'function') renderCurrentOrder();
}

/**
 * Get the current order state
 * @returns {Object} Current order object
 */
export function getCurrentOrder() {
  return { ...currentOrder };
}

/**
 * Set product metadata for order rendering
 * @param {Object} metadata - Object with product information
 */
export function setProductMetadata(metadata) {
  productMetadata = metadata;
}

/**
 * Persist in-memory state to localStorage
 */
function persistState() {
  localStorage.setItem(keyWithSuffix(ORDER_STORAGE_KEY), JSON.stringify(currentOrder));
  localStorage.setItem(keyWithSuffix(NOTES_STORAGE_KEY), JSON.stringify(orderNotes));
}

/**
 * Clean up currentOrder object by removing entries with 0 quantities
 */
function cleanupOrder() {
  const keysToRemove = [];
  for (const [key, qty] of Object.entries(currentOrder)) {
    if (qty <= 0) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => delete currentOrder[key]);
  if (keysToRemove.length > 0) {
    persistState();
  }
}

/**
 * Get saved note for a given key
 * @param {string} key
 * @returns {string|null}
 */
export function getNoteForKey(key) {
  return orderNotes[key] || null;
}

/**
 * Save a note for a given key
 * @param {string} key
 * @param {string} note
 */
export function saveNoteForKey(key, note) {
  orderNotes[key] = note;
  persistState();
}

/**
 * Clear all notes
 */
export function clearAllNotes() {
  orderNotes = {};
  persistState();
}

/**
 * Add or update an order line
 * @param {string} key - composite key identifying the product line (productId|variety|colour|size)
 * @param {number} qty - quantity to set (if <=0, removes the line)
 */
export function addToOrder(key, qty) {
  if (qty > 0) {
    currentOrder[key] = qty;
  } else {
    delete currentOrder[key]; // Remove instead of setting to 0
  }
  cleanupOrder(); // Clean up any other zero entries
  persistState();
  updateOrderUI();
  renderCurrentOrder();
  // Notify listeners to refresh totals
  document.dispatchEvent(new CustomEvent('orderUpdated'));
}

/**
 * Remove an order line entirely
 * @param {string} key
 */
export function removeFromOrder(key) {
  if (currentOrder[key] != null) {
    delete currentOrder[key];
    clearInputField(key);
    cleanupOrder();
    persistState();
    updateOrderUI();
    renderCurrentOrder();
    document.dispatchEvent(new CustomEvent('orderUpdated'));
  }
}

/**
 * Remove multiple order lines
 * @param {Array<string>} keys
 */
export function removeFromOrderMultiple(keys) {
  let hasChanges = false;
  keys.forEach(key => {
    if (currentOrder[key] != null) {
      delete currentOrder[key];
      clearInputField(key);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    cleanupOrder();
    persistState();
    updateOrderUI();
    renderCurrentOrder();
    document.dispatchEvent(new CustomEvent('orderUpdated'));
  }
}

/**
 * Clear the corresponding input field in the product panel
 * @param {string} key - Order key in format "productId|variety|colour|size"
 */
function clearInputField(key) {
  const [productId, variety, colour, size] = key.split("|");
  
  // Find the corresponding input field
  const section = document.querySelector(`[data-product-id="${productId}"]`);
  if (!section) return;
  
  // Find the row that matches this variety and colour
  const rows = section.querySelectorAll('.colour-row');
  for (const row of rows) {
    const varietyEl = row.querySelector('.variety-name');
    const colourEl = row.querySelector('.colour-text');
    
    if (!varietyEl || !colourEl) continue;
    
    const rowVariety = varietyEl.textContent.trim();
    const rowColour = colourEl.textContent.trim();
    
    if (rowVariety === variety && rowColour === colour) {
      // Find the input for this size and reset it to 0
      const input = row.querySelector(`input[data-size="${size}"]`);
      if (input) {
        input.value = 0;
      }
      break;
    }
  }
}

/**
 * Compute total items (sum of quantities)
 * @returns {number}
 */
function getItemCount() {
  return Object.values(currentOrder).reduce((sum, v) => sum + v, 0);
}

/**
 * Compute total lines (distinct keys)
 * @returns {number}
 */
function getLineCount() {
  return Object.keys(currentOrder).length;
}

/**
 * Update the order summary UI (#orderItemCount, #orderLineCount)
 */
function updateOrderUI() {
  const itemCt = getItemCount();
  const lineCt = getLineCount();
  
  // Update status area counts only - don't replace entire statusArea
  const statusCounts = document.querySelector("#statusArea .status-counts");
  if (statusCounts) {
    statusCounts.innerHTML = `
      <span id="orderItemCount">${itemCt} items</span>
      <span id="orderLineCount">${lineCt} lines</span>
    `;
  }
  
  // Update the counts in the current order panel
  const itemEl = document.querySelector("#currentOrder #orderItemCount");
  const lineEl = document.querySelector("#currentOrder #orderLineCount");
  if (itemEl) itemEl.textContent = `${itemCt} items`;
  if (lineEl) lineEl.textContent = `${lineCt} lines`;
}

/**
 * Render the current order grouped by product type
 */
function renderCurrentOrder() {
  const orderPanel = document.getElementById("currentOrder");
  if (!orderPanel) return;

  // Only render positive-qty lines
  const activeItems = Object.entries(currentOrder).filter(([k, q]) => q > 0);

  // Keep existing header + any success messages
  const header = orderPanel.querySelector("h2");
  const successMessages = orderPanel.querySelector("#successMessages");
  orderPanel.innerHTML = "";
  if (header) orderPanel.appendChild(header);
  if (successMessages) orderPanel.appendChild(successMessages);

  if (activeItems.length === 0) {
    const empty = document.createElement("div");
    empty.innerHTML = '<p style="color:#666;font-style:italic;padding:20px;text-align:center;">No items in current order</p>';
    orderPanel.appendChild(empty);
    return;
  }

  if (!Array.isArray(productOrder)) productOrder = [];

  // ---- group by product type ----
  const grouped = {};
  for (const [key, qty] of activeItems) {
    const [productId, variety, colour, size] = key.split("|");
    const product = productMetadata[productId];
    if (!product) continue;

    const productType = product.type || product.productType || productId;
    const itemKey = `${variety}|${colour}`;

    if (!grouped[productType]) {
      let orderIndex = 0;
      if (productOrder?.length) {
        const idx = productOrder.indexOf(productId);
        orderIndex = idx >= 0 ? idx : 999;
      }
      grouped[productType] = {
        productId,
        productOrder: orderIndex,
        items: {},
        sizeTotals: {}
      };
    }

    if (!grouped[productType].items[itemKey]) {
      grouped[productType].items[itemKey] = {
        variety, colour,
        sizes: {},
        keys: []
      };
    }

    grouped[productType].items[itemKey].sizes[size] = qty;
    grouped[productType].items[itemKey].keys.push(key);

    grouped[productType].sizeTotals[size] =
      (grouped[productType].sizeTotals[size] || 0) + qty;
  }

  // sort product types by left-panel order, then alpha
  const sortedProductTypes = Object.entries(grouped)
    .sort(([, a], [, b]) => {
      const ao = typeof a.productOrder === 'number' ? a.productOrder : 999;
      const bo = typeof b.productOrder === 'number' ? b.productOrder : 999;
      return ao === bo ? (a.productId || '').localeCompare(b.productId || '') : ao - bo;
    });

  const sizeOrder = { 'One Size':0,'S':1,'S/M':1.5,'M':2,'L':3,'XL':4,'XXL':5,'3XL':6,'4XL':7,'5XL':8 };

  // ---- render groups ----
  for (const [productType, data] of sortedProductTypes) {
    const groupSection = document.createElement("div");
    groupSection.className = "order-group";

    const groupHeader = document.createElement("div");
    groupHeader.className = "order-group-header";
    groupHeader.dataset.targetProduct = data.productId; // scroll target

    let totalItems = 0;
    for (const [, itemData] of Object.entries(data.items)) {
      totalItems += Object.values(itemData.sizes).reduce((s, n) => s + n, 0);
    }

    const badges = Object.entries(data.sizeTotals)
      .sort(([a],[b]) => (sizeOrder[a]||999) - (sizeOrder[b]||999))
      .map(([size, qty]) => `<span class="size-badge">${qty}×${size}</span>`)
      .join('') + `<span class="size-badge">${totalItems} items</span>`;

    groupHeader.innerHTML = `
      <span class="group-title">${productType.toUpperCase()}</span>
      <span class="group-stats">${badges}</span>
    `;
    groupSection.appendChild(groupHeader);

    // lines under this product
    for (const itemData of Object.values(data.items)) {
      const itemEl = document.createElement("div");
      itemEl.className = "order-item";
      itemEl.dataset.targetProduct = data.productId; // always section header

      const sizeList = Object.entries(itemData.sizes)
        .sort(([a],[b]) => (sizeOrder[a]||999) - (sizeOrder[b]||999))
        .map(([size, qty]) => `${size}(${qty})`)
        .join(', ');

      const itemTotal = Object.values(itemData.sizes).reduce((s, n) => s + n, 0);

      itemEl.innerHTML = `
        <div class="item-details">
          <span class="item-name">${itemData.variety} - ${itemData.colour}: ${sizeList}</span>
        </div>
        <div class="item-actions">
          <span class="item-total">${itemTotal}</span>
          <button class="remove-item-group" data-keys="${itemData.keys.join(',')}">×</button>
        </div>
      `;
      groupSection.appendChild(itemEl);
    }

    orderPanel.appendChild(groupSection);
  }

  addOrderStyles();

  // remove buttons
  orderPanel.querySelectorAll(".remove-item-group").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const keys = (btn.dataset.keys || '').split(',').filter(Boolean);
      if (keys.length) removeFromOrderMultiple(keys);
    });
  });

  // delegated click → scroll to section header (like nav)
  if (!orderPanel.dataset.hasClickHandler) {
    orderPanel.addEventListener("click", (e) => {
      const row = e.target.closest(".order-item, .order-group-header");
      if (!row || e.target.closest("button")) return;

      const pid = row.dataset.targetProduct;
      if (!pid) return;

      const section = document.querySelector(`[data-product-id="${pid}"]`);
      if (!section) return;

      const productPanel = document.getElementById("productPanel");
      if (productPanel) {
        const panelRect = productPanel.getBoundingClientRect();
        const targetRect = section.getBoundingClientRect();
        const scrollTop = productPanel.scrollTop + targetRect.top - panelRect.top - 10;

        productPanel.scrollTo({
          top: scrollTop,
          behavior: "smooth"
        });
      } else {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    orderPanel.dataset.hasClickHandler = "true";
  }
}


/**
 * Add CSS styles for the current order display
 */
function addOrderStyles() {
  if (document.getElementById("orderStyles")) return;
  
  const style = document.createElement("style");
  style.id = "orderStyles";
  style.textContent = `
    .order-group {
      margin-bottom: 16px;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .order-group-header {
      background: var(--secondary);
      color: white;
      padding: 6px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .group-title {
      font-weight: 600;
    }
    
    .group-stats {
      font-size: 0.75rem;
      opacity: 0.9;
    }
    
    .order-item {
      background: white;
      border: 1px solid var(--border);
      border-top: none;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .order-item:last-child {
      border-bottom: 1px solid var(--border);
    }
    
    .item-details {
      display: flex;
      align-items: center;
      flex: 1;
    }
    
    .item-name {
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .item-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .item-total {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text);
      min-width: 20px;
      text-align: right;
    }
    
    .remove-item-group {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .remove-item-group:hover {
      background: #c82333;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Get totals per size for a given product section
 * @param {string} productId
 * @returns {Object} Map of size -> total quantity
 */
export function getSectionTotals(productId) {
  const totals = {};
  for (const [key, qty] of Object.entries(currentOrder)) {
    const parts = key.split("|");
    if (parts[0] !== productId) continue;
    const size = parts[3]; // Changed from parts[2] to parts[3] for 4-part key
    totals[size] = (totals[size] || 0) + qty;
  }
  return totals;
}

/**
 * Initialise order service: bind input changes and set initial UI state
 */
export function initOrderService() {
  // Ensure productOrder is initialized
  if (!productOrder) {
    productOrder = [];
  }
  
  // Clean up any stale data on init
  cleanupOrder();
  
  updateOrderUI();
  renderCurrentOrder();

  // Bind input changes to order updates
  document.addEventListener("input", (e) => {
    if (e.target.matches(".size-input")) {
      const input = e.target;
      const row = input.closest(".colour-row");
      if (!row) return;
      
      // Extract product information from the row
      const section = input.closest(".product-section");
      if (!section) return;
      
      const productId = section.dataset.productId;
      const varietyEl = row.querySelector(".variety-name");
      const colourEl = row.querySelector(".colour-text");
      const size = input.dataset.size;
      
      if (!varietyEl || !colourEl || !size) return;
      
      const variety = varietyEl.textContent.trim();
      const colour = colourEl.textContent.trim();
      const qty = parseInt(input.value) || 0;
      
      // Create order key: productId|variety|colour|size
      const key = `${productId}|${variety}|${colour}|${size}`;
      
      addToOrder(key, qty);
    }
  });
}
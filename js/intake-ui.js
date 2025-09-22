// intake-ui.js
// Mount Kiwi — Intake page UI
// Requires: utils.js, order-model.js

import { formatDateTime, formatDateToNZ, orderColorClass } from './utils.js';
import { subscribePendingOrders, subscribeAcceptedOrders, acceptOrder } from './order-model.js';
import { primeOrderContext} from './preorder-overlay.js'; // NEW


/* --------------------------- DOM references --------------------------- */
const els = {
  statPending: document.getElementById('stat-pending'),
  statProcessing: document.getElementById('stat-processing'),
  statCompleted: document.getElementById('stat-completed'),
  pendingList: document.getElementById('pending-list'),
  processingList: document.getElementById('processing-list'), // optional on page
};

/* --------------------------- Helpers ---------------------------------- */

// Coerce Firestore Timestamp / ISO string / Date → Date or null
function toDateSafe(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  // Firestore Timestamp-like
  if (typeof v === 'object' && typeof v.seconds === 'number') {
    return new Date(v.seconds * 1000);
  }
  return null;
}

// Items can be either an array of { key, qty } OR an object of nested sizes.
function countLinesAndItems(items) {
  if (!items) return { lines: 0, totalItems: 0 };

  if (Array.isArray(items)) {
    const lines = items.length;
    const totalItems = items.reduce((sum, it) => sum + (Number(it?.qty) || 0), 0);
    return { lines, totalItems };
  }

  if (typeof items === 'object') {
    let lines = 0;
    let totalItems = 0;
    for (const productKey of Object.keys(items)) {
      const sizes = items[productKey];
      if (sizes && typeof sizes === 'object') {
        const sizeKeys = Object.keys(sizes);
        lines += sizeKeys.length;
        for (const s of sizeKeys) totalItems += Number(sizes[s]) || 0;
      }
    }
    return { lines, totalItems };
  }

  return { lines: 0, totalItems: 0 };
}

// Normalize docs from subscribe* into { id, data }
function normalizeDoc(d) {
  if (d && d.data && typeof d.data === 'object') return { id: d.id, data: d.data };
  const { id, ...rest } = d || {};
  return { id, data: rest };
}

/* --------------------------- Card rendering --------------------------- */

function renderPendingOrderCard(docId, data) {
  const meta = data?.meta ?? {};
  const items = data?.items;

  const created   = toDateSafe(meta.orderDate) ?? toDateSafe(data?.timestamps?.created);
  const submitted = toDateSafe(data?.timestamps?.submitted);
  const shipDate  = toDateSafe(meta.shipDate);

  const { lines, totalItems } = countLinesAndItems(items);
  const code = (data?.code || data?.id || docId || '').toString().slice(-6);
  const name = meta.name || 'Order';

  const orderDateText   = created   ? formatDateTime(created)   : '—';
  const submittedText   = submitted ? formatDateTime(submitted) : '';

  return `
  <div class="osu-pending-item osu-submitted intake-order ${orderColorClass(docId)}" data-order-id="${docId}">
    <div class="osu-col">
      <div class="osu-title">
        <div class="title-main">
          <strong>${name} - ${totalItems} items, ${lines} lines</strong>
          <div class="status-badges">
            <span class="status-badge submitted">SUBMITTED</span>
            ${submittedText ? `<span class="status-timestamp">${submittedText}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="osu-sub">
        Order: ${orderDateText}<br>
        Ship: ${shipDate ? formatDateToNZ(shipDate) : '—'} • ${meta.shipMethod || '—'}<br>
        ID: #${code}
      </div>
    </div>

    <div class="osu-actions">
      <div class="osu-cta-col">
        <button class="osu-btn osu-cta btn-accept" data-accept="${docId}" aria-label="Accept ${name}">
          Accept
        </button>
      </div>
    </div>
  </div>
  `;
}

/* --------------------------- List rendering --------------------------- */

function bindAcceptHandlers(container) {
  container.querySelectorAll('[data-accept]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-accept');
      const orderCard = e.currentTarget.closest('.osu-pending-item');

      const statusBadge = orderCard.querySelector('.status-badge');
      const originalText = statusBadge.textContent;
      statusBadge.textContent = 'ACCEPTING';
      statusBadge.className = 'status-badge accepting';

      // FIX: Change from .status-info to .status-badges
      const statusBadges = orderCard.querySelector('.status-badges');
      const acceptStamp = document.createElement('span');
      acceptStamp.className = 'status-timestamp accepting';
      acceptStamp.textContent = 'Processing...';
      if (statusBadges) {
        statusBadges.appendChild(acceptStamp);
      }

      btn.disabled = true;
      btn.textContent = 'Accepting...';
      btn.style.opacity = '0.6';

      try {
        await acceptOrder(id);

        statusBadge.textContent = 'ACCEPTED';
        statusBadge.className = 'status-badge locked';

        if (acceptStamp) {
          acceptStamp.textContent = `Accepted ${formatDateTime(new Date())}`;
          acceptStamp.className = 'status-timestamp';
        }

        orderCard.classList.remove('osu-submitted');
        orderCard.classList.add('osu-locked');

        btn.textContent = 'Accepted';
        btn.className = 'osu-btn view';
        btn.style.background = '#28a745';
        btn.style.opacity = '1';

        setTimeout(() => {
          orderCard.style.transition = 'all 0.5s ease';
          orderCard.style.opacity = '0';
          orderCard.style.transform = 'translateX(100%)';
          orderCard.style.height = '0';
          orderCard.style.marginBottom = '0';
          orderCard.style.paddingTop = '0';
          orderCard.style.paddingBottom = '0';

          setTimeout(() => {
            if (orderCard.parentNode) {
              orderCard.parentNode.removeChild(orderCard);
              const remaining = container.querySelectorAll('.osu-pending-item').length;
              if (remaining === 0) renderPendingOrdersList([]);
            }
          }, 500);
        }, 2000);
      } catch (err) {
        console.error('Accept failed', err);
        statusBadge.textContent = originalText;
        statusBadge.className = 'status-badge submitted';
        if (acceptStamp && acceptStamp.parentNode) {
          acceptStamp.parentNode.removeChild(acceptStamp);
        }
        btn.disabled = false;
        btn.textContent = 'Accept';
        btn.style.opacity = '1';
        alert('Failed to accept this order. Please try again.');
      }
    });
  });
}

function renderPendingOrdersList(rawList) {
  const container = els.pendingList;
  if (!container) return;

  const list = (rawList || []).map(normalizeDoc);

  if (list.length === 0) {
    // Just clear the container - no empty state message
    container.innerHTML = '';
    container.className = 'osu-pending intake-pending-list';
    if (els.statPending) els.statPending.textContent = '0';
    return;
  }

  // Add the intake-pending-list class to match the CSS above
  container.className = 'osu-pending intake-pending-list';
  container.innerHTML = list.map(({ id, data }) => renderPendingOrderCard(id, data)).join('');
  bindAcceptHandlers(container);

  if (els.statPending) els.statPending.textContent = String(list.length);
}

/* ---- NEW: render processing (accepted/processing) if container exists ---- */

function renderProcessingList(rawList) {
  // Update the stat tile
  if (els.statProcessing) els.statProcessing.textContent = String((rawList || []).length);

  const container = els.processingList;
  if (!container) return; // Page may not include a processing list; stat tile still updated

  // Normalize + sort by ship date (ascending)
  const list = (rawList || [])
    .map(normalizeDoc)
    .sort((a, b) => new Date(a.data?.meta?.shipDate || 0) - new Date(b.data?.meta?.shipDate || 0));

  if (list.length === 0) {
    container.className = 'osu-pending intake-processing-list';
    container.innerHTML = `
      <div class="empty-state" style="padding:24px;color:#666;text-align:center;">
        No accepted/processing orders.
      </div>
    `;
    return;
  }

  // Render cards with stacked View and Print buttons
  container.className = 'osu-pending intake-processing-list';
  container.innerHTML = list.map(({ id, data }) => {
    const m = data?.meta || {};
    const ship = m.shipDate ? formatDateToNZ(toDateSafe(m.shipDate)) : '—';
    const method = m.shipMethod || '—';
    const name = m.name || 'Order';

    return `
      <div class="osu-pending-item osu-locked intake-order" data-order-id="${id}">
        <div class="osu-col">
          <div class="osu-title">
            <strong>${name}</strong>
            <div class="status-info">
              <span class="status-badge locked">LOCKED</span>
            </div>
          </div>
          <div class="osu-sub">Ship: ${ship} • ${method}</div>
        </div>
        <div class="osu-actions">
          <div class="osu-cta-col stacked-buttons">
            <button
              class="osu-btn view"
              data-view="${id}"
              data-meta='${JSON.stringify(m).replace(/'/g, "&apos;")}'
              data-items='${JSON.stringify(data?.items || {}).replace(/'/g, "&apos;")}'
            >View</button>
            <button
              class="osu-btn print"
              data-print="${id}"
              data-meta='${JSON.stringify(m).replace(/'/g, "&apos;")}'
              data-items='${JSON.stringify(data?.items || {}).replace(/'/g, "&apos;")}'
            >Print</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach the click handlers AFTER rendering
  bindViewHandlers(container);
  bindPrintHandlers(container);
}

// Print handlers - add this function right after renderProcessingList
function bindPrintHandlers(container) {
  container.querySelectorAll('[data-print]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-print');
      const meta = JSON.parse(btn.getAttribute('data-meta') || '{}');
      const items = JSON.parse(btn.getAttribute('data-items') || '{}');
      
      // Simple print for now - you can enhance this later
      printOrderSimple(id, meta, items);
    });
  });
}

function printOrderSimple(id, meta, items) {
  const { lines, totalItems } = countLinesAndItems(items);
  const code = id.toString().slice(-6);
  const orderDate = meta.orderDate ? formatDateTime(toDateSafe(meta.orderDate)) : '—';
  const shipDate = meta.shipDate ? formatDateToNZ(toDateSafe(meta.shipDate)) : '—';
  
  // Generate organized product sections grouped by product type, variety, and color
  let productSectionsHtml = '';
  
  if (Array.isArray(items)) {
    // Handle array format: { key, qty }
    const variantGroups = {};
    items.forEach(item => {
      const key = item.key || 'Unknown';
      const groupKey = extractFullVariantKey(key); // Now includes color/style
      const size = extractSizeFromKey(key);
      
      if (!variantGroups[groupKey]) {
        variantGroups[groupKey] = [];
      }
      variantGroups[groupKey].push({ 
        fullName: key,
        size: size, 
        qty: item.qty || 0 
      });
    });
    
    for (const [variantKey, items] of Object.entries(variantGroups)) {
      productSectionsHtml += generateVariantSection(variantKey, items);
    }
  } else if (typeof items === 'object') {
    // Handle object format: { productKey: { size: quantity } }
    const variantGroups = {};
    
    for (const [productKey, sizes] of Object.entries(items)) {
      if (sizes && typeof sizes === 'object') {
        const groupKey = extractFullVariantKey(productKey);
        
        if (!variantGroups[groupKey]) {
          variantGroups[groupKey] = [];
        }
        
        for (const [size, qty] of Object.entries(sizes)) {
          if (qty > 0) {
            variantGroups[groupKey].push({
              fullName: productKey,
              size: size,
              qty: qty || 0
            });
          }
        }
      }
    }
    
    for (const [variantKey, items] of Object.entries(variantGroups)) {
      if (items.length > 0) {
        productSectionsHtml += generateVariantSection(variantKey, items);
      }
    }
  }

  if (!productSectionsHtml) {
    productSectionsHtml = '<div class="no-items">No items found in this order</div>';
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order #${code} - ${meta.name || 'Order'}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.4;
        }
        
        .header {
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .company-name {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #2c3e50;
        }
        
        .order-title {
          font-size: 20px;
          color: #34495e;
          margin-bottom: 15px;
        }
        
        .order-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
        }
        
        .info-section h3 {
          margin: 0 0 10px 0;
          color: #2c3e50;
          font-size: 16px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .info-section p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .products-section {
          margin-top: 20px;
        }
        
        .product-variety {
          /* keep each section together and shrink the gap to the next header */
          break-inside: avoid;
          margin: 6px 0 8px 0; /* was ~15–20px – smaller gap below the table */
        }

        .variety-header {
          /* align left edge with the table and sit closer to it */
          margin: 0;                 /* no default h4 margins */
          padding: 6px 8px 4px 0;    /* remove left padding so it lines up with the table edge */
          background: #2c3e50;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-radius: 4px 4px 0 0;
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.2;
        }
        
        .product-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        
        .size-table {
          width: 100%;
          border-collapse: collapse;
          margin: 2px 0 0 0;
          border-radius: 0 0 4px 4px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          table-layout: fixed; /* Forces column widths */
        }
        
        .size-table td {
          border: 1px solid #ddd;
          padding: 3px 4px;
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          height: 12px;
          vertical-align: middle;
        }
        
        .size-cell {
          background: #ecf0f1;
          color: #2c3e50;
          font-weight: bold;
          width: 36px; /* Fixed narrow width */
        }
        
        .qty-cell {
          background: white;
          color: #27ae60;
          font-weight: bold;
          font-size: 16px;
          width: 36px; /* Fixed narrow width */
        }
        
        .blank-cell {
          background: white;
          border-left: 1px solid #ddd;
          width: calc((100% - 72px) / 5); /* Equally divide remaining space */
        }
        
        .summary {
          margin-top: 30px;
          padding: 20px;
          background: #e8f5e8;
          border-radius: 8px;
          border-left: 5px solid #27ae60;
        }
        
        .summary h3 {
          margin: 0 0 15px 0;
          color: #27ae60;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }
        
        .summary-item {
          text-align: center;
        }
        
        .summary-number {
          font-size: 24px;
          font-weight: bold;
          color: #27ae60;
          display: block;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .no-items {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        @media print {
          body { 
            margin: 0; 
            padding: 15px;
          }
          .header {
            margin-bottom: 20px;
            padding-bottom: 15px;
          }
          .product-variety {
            break-inside: avoid;
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">MOUNT KIWI</div>
        <div class="order-title">${meta.name || 'Order'} - #${code}</div>
      </div>
      
      <div class="order-info">
        <div class="info-section">
          <h3>Order Details</h3>
          <p><strong>Order Date:</strong> ${orderDate}</p>
          <p><strong>Ship Date:</strong> ${shipDate}</p>
          <p><strong>Ship Method:</strong> ${meta.shipMethod || '—'}</p>
          <p><strong>Order ID:</strong> #${code}</p>
        </div>
        <div class="info-section">
          <h3>Summary</h3>
          <p><strong>Total Items:</strong> ${totalItems}</p>
          <p><strong>Product Lines:</strong> ${lines}</p>
          <p><strong>Status:</strong> LOCKED</p>
          <p><strong>Printed:</strong> ${formatDateTime(new Date())}</p>
        </div>
      </div>

      <div class="products-section">
        ${productSectionsHtml}
      </div>

      <div class="summary">
        <h3>Order Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-number">${totalItems}</span>
            <span class="summary-label">Total Items</span>
          </div>
          <div class="summary-item">
            <span class="summary-number">${lines}</span>
            <span class="summary-label">Product Lines</span>
          </div>
          <div class="summary-item">
            <span class="summary-number">${Object.keys(items || {}).length}</span>
            <span class="summary-label">Varieties</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    
    // Close window after printing - multiple fallback methods
    
    // Method 1: afterprint event (works in some browsers)
    printWindow.addEventListener('afterprint', () => {
      printWindow.close();
    });
    
    // Method 2: Timeout fallback (works when afterprint doesn't)
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    }, 1000);
    
    // Method 3: Focus change detection (when user returns to main window)
    window.addEventListener('focus', function closeOnFocus() {
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
        window.removeEventListener('focus', closeOnFocus);
      }, 500);
    });
  };
}

function generateVariantSection(variantKey, items) {
  // Sort sizes in logical order (S, M, L, XL, XXL, etc.)
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', 'One Size'];
  
  const sortedItems = items.sort((a, b) => {
    const aIndex = sizeOrder.indexOf(a.size);
    const bIndex = sizeOrder.indexOf(b.size);
    
    if (aIndex === -1 && bIndex === -1) return a.size.localeCompare(b.size);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const sizeRows = sortedItems
  .filter(item => item.qty > 0) // Only show sizes with quantities > 0
  .map(item => `
    <tr>
      <td class="size-cell">${item.size}</td>
      <td class="qty-cell">${item.qty}</td>
      <td class="blank-cell">&nbsp;</td>
      <td class="blank-cell">&nbsp;</td>
      <td class="blank-cell">&nbsp;</td>
      <td class="blank-cell">&nbsp;</td>
      <td class="blank-cell">&nbsp;</td>
    </tr>
  `).join('');

  if (!sizeRows) {
    return ''; // Don't show variants with no quantities
  }

  // Calculate total quantity for this variant
  const totalQty = sortedItems
    .filter(item => item.qty > 0)
    .reduce((sum, item) => sum + item.qty, 0);

  // Get the icon for this product type
  const icon = getProductTypeIcon(variantKey);
  
  // Format header with icon, full variant info and total count
  const headerText = `${icon} ${variantKey} (${totalQty})`;

  return `
    <div class="product-variety">
      <h4 class="variety-header">${headerText}</h4>
      <table class="size-table">
        ${sizeRows}
      </table>
    </div>
  `;
}

function getProductTypeIcon(variantKey) {
  // Extract the product type from the variant key and return appropriate icon HTML
  const productType = variantKey.split(' - ')[0];
  
  // Base URL for your GitHub icons
  const baseIconUrl = 'https://crazyeyesnz.github.io/mount-kiwi/assets/icons/';
  
  // Map product types to icon filenames (based on your GitHub structure)
  let iconName = '';
  switch (productType) {
    case 'JACKETS':
      iconName = 'jackets.png';
      break;
    case 'BEANIES':
      iconName = 'beanies.png';
      break;
    case 'COASTAL':
      iconName = 'coastal.png';
      break;
    case 'STATION':
      iconName = 'station.png';
      break;
    case 'VEST':
      iconName = 'vest.png';
      break;
    case 'SHAWLS':
      iconName = 'shawls.png';
      break;
    case 'RAIN JACKET':
      iconName = 'rain-jacket.png';
      break;
    case 'WEEKENDER':
      iconName = 'weekender.png';
      break;
    case 'KIDS JACKET':
      iconName = 'kids-jacket.png';
      break;
    case 'SHERPA BEANIE':
      iconName = 'sherpabeanie.png';
      break;
    case 'KORU BEANIE':
      iconName = 'koru-beanie.png';
      break;
    case 'WOODVILLE STITCH':
      iconName = 'woodville-stitch.png';
      break;
    case 'HOUSE SOCKS':
      iconName = 'house-socks.png';
      break;
    default:
      iconName = 'progress.png'; // Default fallback
  }
  
  return `<img src="${baseIconUrl}${iconName}" alt="${productType}" class="product-icon">`;
}

function extractFullVariantKey(productKey) {
  // Extract the full variant key from product keys like:
  // "JACKETS|GLACIER|BASE|S" → "JACKETS - GLACIER - BASE"
  // "JACKETS|WHISTLER|GREY|M" → "JACKETS - WHISTLER - GREY"
  
  if (!productKey) return 'UNKNOWN';
  
  // Handle pipe-separated format
  if (productKey.includes('|')) {
    const parts = productKey.split('|');
    if (parts.length >= 3) {
      // Take first three parts: product type, variety, color/style
      const productType = parts[0].trim().toUpperCase();
      const variety = parts[1].trim().toUpperCase();
      const color = parts[2].trim().toUpperCase();
      return `${productType} - ${variety} - ${color}`;
    } else if (parts.length >= 2) {
      // Fallback if only two parts
      const productType = parts[0].trim().toUpperCase();
      const variety = parts[1].trim().toUpperCase();
      return `${productType} - ${variety}`;
    }
  }
  
  // Handle dash-separated format (fallback)
  let baseName = productKey.split(' - ')[0].trim();
  baseName = baseName.split(' (')[0].trim();
  return baseName.toUpperCase();
}


function extractSizeFromKey(productKey) {
  // Extract size from product keys like:
  // "JACKETS|GLACIER|BASE|S" → "S"
  // "JACKETS|GLACIER|BASE|XL" → "XL"
  
  if (!productKey) return 'One Size';
  
  // Handle pipe-separated format
  if (productKey.includes('|')) {
    const parts = productKey.split('|');
    if (parts.length >= 4) {
      // Take the last part as the size
      return parts[parts.length - 1].trim();
    }
  }
  
  return 'One Size';
}
/* --------------------------- Live subscriptions --------------------------- */

function initSubscriptions() {
  subscribePendingOrders((list) => {
    try {
      renderPendingOrdersList(list || []);
    } catch (e) {
      console.error('Render pending failed', e);
    }
  });

  if (typeof subscribeAcceptedOrders === 'function') {
    subscribeAcceptedOrders((list) => {
      try {
        renderProcessingList(list || []);
      } catch (e) {
        console.error('Render processing failed', e);
      }
    });
  }
}

/* --------------------------- Boot ------------------------------------- */

export function initIntakePage() {
  if (!els.pendingList) {
    console.warn('intake-ui: #pending-list not found in DOM.');
  }
  initSubscriptions();
}

function bindViewHandlers(container) {
  container.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id    = btn.getAttribute('data-view');
      const meta  = JSON.parse(btn.getAttribute('data-meta')  || '{}');
      const items = JSON.parse(btn.getAttribute('data-items') || '{}');

      // EXACTLY like Orders overlay "View":
      // 1) prime shared context
      primeOrderContext({
        id,
        meta,
        items,
        isNew: false,
        isViewOnly: true
      });

      // 2) hand off to Orders page which renders locked/read-only
      window.location.href = 'orders.html';
    });
  });
}



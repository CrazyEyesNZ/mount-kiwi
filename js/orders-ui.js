// /js/orders-ui.js
// Orders page: overlay handoff, product render, nav, Current Order panel,
// live saving, status/meta, Submit button, shipment selector, populate/reset.

import { fetchProducts, loadHistory } from './data-service.js';
import { updatePendingOrder, submitDraftOrder, subscribeDraftAndPendingOrders } from './order-model.js';
import { renderProducts } from './render-products.js';
import { ensureOrderContext } from './preorder-overlay.js';
import { initOrderService, setOrderStorageSuffix, setViewOnlyMode } from './order-service.js';
import { buildNavigation, initScrollTracking } from './navigation.js';
import { initModals } from './modals.js';
import { attachHistoryTooltips } from './tooltips.js';

/* -------- overlay helpers (Order Setup modal) -------- */
function openOrderOverlay() {
  document.body.classList.add('modal-open');
  const el = document.getElementById('orderOverlay');
  if (el) el.style.display = 'flex';
}
function closeOrderOverlay() {
  document.body.classList.remove('modal-open');
  const el = document.getElementById('orderOverlay');
  if (el) el.style.display = 'none';
}
function hardCloseOrderSetupOverlay() {
  document.body.classList.remove('modal-open');
  const el = document.getElementById('order-setup-overlay');
  if (el) el.remove();
}
export { openOrderOverlay, closeOrderOverlay };

/* -------- state -------- */
let currentPendingId = null;
let currentMeta = {};           // we keep a local copy so we can update ship method etc.
let isReviewMode = false;
let isViewOnlyMode = false;
let isBulkPopulating = false;
let headerObserver = null;

/* -------- small utils -------- */
const nz = (d) => {
  const dt = (typeof d === 'string') ? new Date(d) : (d instanceof Date ? d : new Date());
  return dt.toLocaleDateString('en-NZ', { year: 'numeric', month: 'short', day: 'numeric' });
};
function zeroAllInputs() { document.querySelectorAll('.size-input').forEach(i => { i.value = '0'; }); }
function clearLocalDrafts() { try {} catch {} }
export function updateCounts({ total = 0, lines = 0 } = {}) {
  const itemsEl = document.getElementById('orderItemCount');
  const linesEl = document.getElementById('orderLineCount');
  if (itemsEl) itemsEl.textContent = `${total} ${total === 1 ? 'item' : 'items'}`;
  if (linesEl) linesEl.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'}`;
}

/* -------- status area -------- */
function setStatusMeta(meta) {
  const metaEl = document.getElementById('statusMeta');
  if (!metaEl) return;
  const orderDate = meta?.orderDate ? nz(meta.orderDate) : nz(new Date());
  const shipDate  = meta?.shipDate ? nz(meta.shipDate) : '—';
  const shipType  = meta?.shipMethod || '—';
  const name      = meta?.name || '—';
  metaEl.innerHTML = `
    <span class="meta-pill"><strong>Order Date:</strong> ${orderDate}</span>
    <span class="meta-pill"><strong>Shipment Type:</strong> ${shipType}</span>
    <span class="meta-pill"><strong>Shipment Date:</strong> ${shipDate}</span>
    <span class="meta-pill"><strong>Order Name:</strong> ${name}</span>
  `;
  if (!metaEl.querySelector('#statusSummary')) {
    const pill = document.createElement('span');
    pill.id = 'statusSummary';
    pill.className = 'meta-pill';
    metaEl.appendChild(pill);
  }
}

function setStatusSummary(text) {
  const pill = document.getElementById('statusSummary');
  if (pill) pill.textContent = text || '';
}

/* -------- items normalization + collect / populate -------- */
function normalizeItemsToArray(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items.filter(i => i && typeof i.key === 'string' && (i.qty || 0) > 0);

  const arr = [];
  const walk = (prefix, obj) => {
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v && typeof v === 'object') walk(`${prefix}${prefix ? '|' : ''}${k}`, v);
      else {
        const qty = Number(v) || 0;
        if (qty > 0) arr.push({ key: `${prefix}|${k}`, qty });
      }
    });
  };
  if (typeof items === 'object') walk('', items);
  return arr;
}

export function collectOrderData() {
  const items = [];
  const seenLines = new Set();
  let total = 0;

  document.querySelectorAll('.colour-row').forEach(row => {
    const section = row.closest('[data-product-id]');
    if (!section) return;

    const productId = section.dataset.productId;
    const getVarietyText = () => {
      const v = row.querySelector('.variety-name') || row.querySelector('.item-name') ||
                row.querySelector('.product-name') || row.querySelector('.name');
      return v ? v.textContent.trim() : '';
    };
    const getColourText = () => {
      const c = row.querySelector('.colour-text') || row.querySelector('[data-colour-name]');
      return c ? c.textContent.trim() : '';
    };

    const variety = getVarietyText();
    const colour  = getColourText();

    row.querySelectorAll('.size-input').forEach(input => {
      const qty = parseInt(input.value, 10) || 0;
      if (qty <= 0) return;
      const size = input.dataset.size || input.name || '';
      const key = `${productId}|${variety}|${colour}|${size}`;
      items.push({ key, qty });
      total += qty;
      seenLines.add(`${productId}|${variety}|${colour}`);
    });
  });

  return { items, total, lines: seenLines.size };
}

export function populateFromItems(items) {
  const arr = normalizeItemsToArray(items);
  isBulkPopulating = true;

  // A: zero non-zero inputs; fire input so panel drops stale lines
  document.querySelectorAll('.size-input').forEach(input => {
    if (input.value !== '0') {
      input.value = '0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // B: apply new items and fire the same logic as user edits
  for (const { key, qty } of arr) {
    const [productId, varietyRaw, colourRaw, size] = String(key).split('|');
    const variety = (varietyRaw || '').trim();
    const colour  = (colourRaw  || '').trim();

    const section = document.querySelector(`[data-product-id="${productId}"]`);
    if (!section) continue;

    const rows = Array.from(section.querySelectorAll('.colour-row'));
    const getVarietyText = (row) => {
      const v = row.querySelector('.variety-name') || row.querySelector('.item-name') ||
                row.querySelector('.product-name') || row.querySelector('.name');
      return v ? v.textContent.trim() : '';
    };
    const getColourText = (row) => {
      const c = row.querySelector('.colour-text') || row.querySelector('[data-colour-name]');
      return c ? c.textContent.trim() : '';
    };

    let target = rows.find(row => {
      const vtxt = getVarietyText(row);
      const ctxt = getColourText(row);
      const varietyOk = !variety || vtxt === variety;
      return varietyOk && ctxt === colour;
    }) || rows.find(row => getColourText(row) === colour);

    if (!target) continue;

    const input = target.querySelector(`input.size-input[data-size="${size}"]`)
               || target.querySelector(`input.size-input`);
    if (!input) continue;

    input.value = String(qty);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  isBulkPopulating = false;

  // C: recount once and (if not review) persist once
  try {
    const r = collectOrderData();
    updateCounts({ total: r.total, lines: r.lines });
    if (!isReviewMode && currentPendingId) {
      updatePendingOrder(currentPendingId, { items: r.items, total: r.total });
    }
  } catch {}
}

/* -------- Submit action -------- */
async function onSubmitClick() {
  if (isReviewMode) {
    alert('You are viewing a combined Review. Switch to a specific order to submit.');
    return;
  }

  const payload = collectOrderData();
  if (payload.total === 0) {
    alert('Cannot submit an empty order. Please add some items first.');
    return;
  }

  // Ship method is chosen in the OVERLAY (not on this page)
  const picked = currentMeta?.shipMethod;
  if (!picked) {
    alert('Please choose AIR or SEA in the Orders overlay first.');
    return;
  }

  const ok = confirm(
    `Submit this order to Intake?\n\nShipment: ${picked}\nItems: ${payload.total}\nLines: ${payload.lines}`
  );
  if (!ok) return;

  try {
    if (currentPendingId) {
      await updatePendingOrder(currentPendingId, {
        meta: { ...(currentMeta || {}), shipMethod: picked },
        items: payload.items,
        total: payload.total,
      });
    }

    await submitDraftOrder(currentPendingId);
    console.log('[Submit] Success:', { id: currentPendingId, ...payload, shipMethod: picked });
    window.location.href = 'intake.html';
  } catch (err) {
    console.error('Submit error:', err);
    alert('Could not submit the order: ' + (err?.message || err));
  }
}

/* -------- main init -------- */
export async function initOrdersPage() {
  try {
    const ctx = await ensureOrderContext();
    hardCloseOrderSetupOverlay();
    currentPendingId = ctx.id;
    isReviewMode = Boolean(ctx.mergedItems);
    isViewOnlyMode = Boolean(ctx.isViewOnly);
    currentMeta = { ...(ctx?.meta || {}) };

    if (!isReviewMode && !isViewOnlyMode) {
      setOrderStorageSuffix(currentPendingId);
    }

    // Set view-only mode in order service so it can render appropriately
    setViewOnlyMode(isViewOnlyMode);

    try { await loadHistory(); } catch {}

    const products = await fetchProducts();
    renderProducts(products);

    initOrderService();
    buildNavigation(products);
    initScrollTracking();
   
    // controls right under the title (only when editable)
    if (!isReviewMode && !isViewOnlyMode) {
      // Wire up submit button
      const submitBtn = document.querySelector('#submitOrderBtn');
      if (submitBtn) {
        submitBtn.addEventListener('click', onSubmitClick);
        
        // Enable/disable submit button based on order contents and shipment method
        const updateSubmitButton = () => {
          const { total } = collectOrderData();
          const hasShipMethod = currentMeta?.shipMethod || false;
          submitBtn.disabled = total === 0 || !hasShipMethod;
        };
        
        // Initial check
        updateSubmitButton();
        
        // Update when order changes
        document.addEventListener('orderUpdated', updateSubmitButton);
      }
    }

    try { initModals(); } catch {}
    try { attachHistoryTooltips(); } catch {}

    setStatusMeta(currentMeta);

    const applySummaryIfAny = () => {
      let summaryText = ctx?.familySummary?.text || '';
      if (isViewOnlyMode) summaryText = 'Viewing locked order (read-only)';
      setStatusSummary(summaryText);
    };

    if (ctx.isNew) {
      clearLocalDrafts();
      zeroAllInputs();
      updateCounts({ total: 0, lines: 0 });
      try { await updatePendingOrder(currentPendingId, { items: {}, total: 0 }); } catch {}
      applySummaryIfAny();
    } else if (ctx.mergedItems) {
      populateFromItems(ctx.mergedItems);
      try {
        if (ctx.familySummary) updateCounts({ total: ctx.familySummary.totalItems, lines: ctx.familySummary.totalLines });
        else { const { total, lines } = collectOrderData(); updateCounts({ total, lines }); }
      } catch {}
      applySummaryIfAny();
    } else if (isViewOnlyMode && ctx.items) {
      populateFromItems(ctx.items);
      const { total, lines } = collectOrderData();
      updateCounts({ total, lines });

      setTimeout(() => {
        document.querySelectorAll('.size-input').forEach(input => {
          input.disabled = true;
          input.style.backgroundColor = '#f8f9fa';
          input.style.color = '#6c757d';
          input.style.cursor = 'not-allowed';
        });
      }, 100);

      applySummaryIfAny();
    } else {
      const unsub = subscribeDraftAndPendingOrders(list => {
        const found = list.find(o => o.id === currentPendingId);
        if (!found) return;
        populateFromItems(found.items || {});
        const { total, lines } = collectOrderData();
        updateCounts({ total, lines });
        unsub && unsub();
      });
      applySummaryIfAny();
    }

    // live save (skip for view-only)
    document.addEventListener('input', async (e) => {
      if (!e.target.matches('.size-input') || !currentPendingId) return;
      if (isBulkPopulating || isReviewMode || isViewOnlyMode) return;

      let n = parseInt(e.target.value, 10);
      if (isNaN(n) || n < 0) n = 0;
      if (String(n) !== e.target.value) e.target.value = String(n);

      const { items, total, lines } = collectOrderData();
      updateCounts({ total, lines });

      try { await updatePendingOrder(currentPendingId, { items, total }); }
      catch (err) { console.error('Error updating pending order:', err); }
    });

    if (isViewOnlyMode) {
      addViewOnlyIndicator();
      
      // Hide submit button for locked orders
      const submitBtn = document.querySelector('#submitOrderBtn');
      if (submitBtn) {
        submitBtn.style.display = 'none';
      }
    }

  } catch (err) {
    console.error('Orders page init failed:', err);
  }
}

/* -------- view-only indicator -------- */
function addViewOnlyIndicator() {
  const statusArea = document.getElementById('statusArea');
  if (statusArea) {
    statusArea.style.background = 'linear-gradient(90deg, #17a2b8, #138496)';
    statusArea.style.position = 'relative';
  }
}
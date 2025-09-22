// preorder-overlay.js
// Mount Kiwi — Order Setup Overlay (Draft/Pending/Accepted list + New Order form)

import {
  createDraftOrder,
  subscribeDraftAndPendingOrders,
  subscribeAcceptedOrders,
  deletePendingOrder,
} from './order-model.js';

import { formatDateToNZ, formatDateTime, orderColorClass } from './utils.js';

let orderContext = null;

export function primeOrderContext(ctx) {
  orderContext = ctx && typeof ctx === 'object' ? ctx : null;
  
  // If this is for cross-page navigation (has isViewOnly), persist it
  if (orderContext && orderContext.isViewOnly) {
    try {
      sessionStorage.setItem('mk-view-context', JSON.stringify(orderContext));
    } catch (e) {
      console.warn('Could not save view context to sessionStorage:', e);
    }
  }
  
  return orderContext;
}

export function openLockedOrderViewer(ctx = {}) {
  const c = ctx.id ? ctx : (orderContext || {});

  const existing = document.getElementById('mk-order-viewer');
  if (existing?.parentNode) existing.parentNode.removeChild(existing);

  const div = document.createElement('div');
  div.id = 'mk-order-viewer';
  div.innerHTML = `
    <div class="mkov-backdrop"></div>
    <div class="mkov-panel" role="dialog" aria-modal="true" aria-labelledby="mkov-title">
      <div class="mkov-head">
        <h3 id="mkov-title">Order — View Only</h3>
        <button class="mkov-close" aria-label="Close">✕</button>
      </div>
      <div class="mkov-body">
        <div class="mkov-row"><strong>Name:</strong><span>${c.meta?.name || 'Order'}</span></div>
        <div class="mkov-row"><strong>Ship:</strong><span>${c.meta?.shipDate || '—'} • ${c.meta?.shipMethod || '—'}</span></div>
        <div class="mkov-row"><strong>Status:</strong><span class="status-badge locked">LOCKED</span></div>
      </div>
      <div class="mkov-actions"><button class="mkov-close primary">Close</button></div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #mk-order-viewer{position:fixed;inset:0;z-index:10000}
    #mk-order-viewer .mkov-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45)}
    #mk-order-viewer .mkov-panel{position:relative;margin:4vh auto;background:#fff;max-width:720px;max-height:88vh;border-radius:12px;
      box-shadow:0 20px 60px rgba(0,0,0,.25);padding:18px;display:flex;flex-direction:column;overflow:auto}
    .mkov-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .mkov-close{border:none;background:#eee;border-radius:8px;padding:6px 10px;cursor:pointer}
    .mkov-close.primary{background:#8b7355;color:#fff}
    .mkov-body{display:flex;flex-direction:column;gap:8px}
    .mkov-row{display:flex;gap:8px}
    .mkov-row strong{min-width:90px}
    .status-badge.locked{background:#eef0f2;color:#495057;border:1px solid #c9ced3;padding:2px 6px;border-radius:6px}
    .mkov-actions{display:flex;justify-content:flex-end;margin-top:12px}
  `;
  div.appendChild(style);

  function close() {
    if (div && div.parentNode) div.parentNode.removeChild(div);
  }
  div.querySelectorAll('.mkov-close').forEach(b => b.addEventListener('click', close));
  div.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  document.body.appendChild(div);
}


// ===== at top of file =====
const USE_CLASSIC_CARDS = true;


/* ------------------------------- helpers -------------------------------- */

/** Normalize any items shape to a canonical array: [{ key, qty }] */
function normalizeItemsToArray(items) {
  if (!items) return [];
  if (Array.isArray(items)) {
    return items.filter(i => i && typeof i.key === 'string' && (i.qty || 0) > 0);
  }
  if (typeof items === 'object') {
    const keys = Object.keys(items);
    // Flat keyed object: { "Product|Variety|Colour|Size": qty }
    if (keys.every(k => k.includes('|') && typeof items[k] === 'number')) {
      return keys
        .filter(k => (items[k] || 0) > 0)
        .map(k => ({ key: k, qty: items[k] }));
    }
    // Legacy nested format: { productId: { size: qty } }
    const out = [];
    for (const [productId, bySize] of Object.entries(items)) {
      if (!bySize || typeof bySize !== 'object') continue;
      for (const [size, qtyRaw] of Object.entries(bySize)) {
        const qty = parseInt(qtyRaw, 10) || 0;
        if (qty > 0) out.push({ key: `${productId}|?|?|${size}`, qty });
      }
    }
    return out;
  }
  return [];
}

/** Return { totalItems, totalLines } with 1 line per unique productId|variety|colour */
function summarizeItems(items) {
  const arr = normalizeItemsToArray(items);
  const lineSet = new Set();
  let total = 0;
  for (const it of arr) {
    total += (it.qty || 0);
    const parts = String(it.key).split('|');
    if (parts.length >= 3) lineSet.add(parts.slice(0, 3).join('|'));
  }
  return { totalItems: total, totalLines: lineSet.size };
}

// Distinct left-border colors (primary first, then secondary/tertiary)
// Add/remove colors freely; the mapping is deterministic per order id.
const MK_LEFT_CLASSES = [
  'mk-left-red',    // primary
  'mk-left-blue',
  'mk-left-green',
  'mk-left-yellow',
  'mk-left-orange', // secondary
  'mk-left-purple',
  'mk-left-teal',   // tertiary
  'mk-left-pink',
  'mk-left-brown',
  'mk-left-cyan',
];

/* --------------------------------- UI ----------------------------------- */

export function ensureOrderContext() {
  return new Promise((resolve) => {
    // First check if we have a primed context
    if (orderContext?.id) return resolve(orderContext);
    
    // Check for persisted view-only context from navigation
    try {
      const saved = sessionStorage.getItem('mk-view-context');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.isViewOnly) {
          sessionStorage.removeItem('mk-view-context'); // Clean up
          orderContext = parsed;
          return resolve(orderContext);
        }
      }
    } catch (e) {
      console.warn('Could not load view context from sessionStorage:', e);
    }

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'order-setup-overlay';
    overlay.innerHTML = `
      <div class="osu-backdrop"></div>
      <div class="osu-panel" role="dialog" aria-modal="true" aria-labelledby="osu-title">
        <h2 id="osu-title">Order Setup</h2>

        <form id="osu-form" novalidate>
          <div class="osu-grid">
            <label>
              <span>Order Date</span>
              <input id="osu-order-date" type="text" readonly>
            </label>

            <label>
              <span>Shipment Type</span>
              <div class="ship-method-buttons">
                <button type="button" class="ship-method-btn" data-method="AIR">AIR</button>
                <button type="button" class="ship-method-btn" data-method="SEA">SEA</button>
              </div>
            </label>

            <label>
              <span>Shipment Date</span>
              <input id="osu-ship-date" type="date" required>
            </label>

            <label>
              <span>Order Name (optional)</span>
              <input id="osu-name" type="text" placeholder="e.g. Nikki — Sept export">
              <button type="submit" id="osu-start" class="osu-btn primary">New Order</button>
            </label>
          </div>
        </form>

        <div class="osu-divider"></div>

        <section class="osu-live">
          <h3>Live Orders</h3>
          <div id="osu-pending-list" class="osu-pending">Loading…</div>
        </section>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    function closeOverlay() {
      document.body.classList.remove('modal-open');
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    // Prefill form
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const orderDateEl = overlay.querySelector('#osu-order-date');
    const shipDateEl  = overlay.querySelector('#osu-ship-date');
    const nameEl      = overlay.querySelector('#osu-name');
    const form        = overlay.querySelector('#osu-form');

    orderDateEl.value = formatDateToNZ(today);
    shipDateEl.min    = `${yyyy}-${mm}-${dd}`;
    shipDateEl.value  = shipDateEl.min;

    // Handle AIR/SEA button selection
    let selectedMethod = null;
    const methodButtons = overlay.querySelectorAll('.ship-method-btn');
    const submitBtn = overlay.querySelector('#osu-start');

    methodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        methodButtons.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        selectedMethod = btn.dataset.method;
        
        // Enable submit button if method is selected
        submitBtn.disabled = false;
      });
    });

    // Initially disable submit button
    submitBtn.disabled = true;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedMethod || !shipDateEl.value) {
        alert('Please select shipment type and date.');
        return;
      }

      // Create a new DRAFT order (not pending yet)
      const meta = {
        orderDate: new Date().toISOString(),
        shipDate: shipDateEl.value,
        shipMethod: selectedMethod,
        name: nameEl.value || `Order ${new Date().toLocaleDateString()}`,
      };

      createDraftOrder(meta, { items: {}, total: 0 })
        .then(({ id }) => {
          orderContext = { id, meta, isNew: true };
          closeOverlay();
          resolve(orderContext);
        })
        .catch(err => {
          console.error('Failed to create draft order:', err);
          alert('Could not create order: ' + err.message);
        });
    });

    // Close on ESC
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeOverlay();
    });

    // Live orders list (drafts + pending + accepted/processing for read-only)
    const list = overlay.querySelector('#osu-pending-list');

    let draftAndPending = [];
    let acceptedOrders = [];

    // Subscribe to drafts & pending
    const unsubA = subscribeDraftAndPendingOrders(orders => {
      draftAndPending = Array.isArray(orders) ? orders : [];
      renderAllOrders();
    });

    // Subscribe to accepted/processing
    const unsubB = subscribeAcceptedOrders(orders => {
      acceptedOrders = Array.isArray(orders) ? orders : [];
      renderAllOrders();
    });

    // Clean up subscriptions if overlay is removed
    const observer = new MutationObserver(() => {
      if (!document.body.contains(overlay)) {
        try { typeof unsubA === 'function' && unsubA(); } catch {}
        try { typeof unsubB === 'function' && unsubB(); } catch {}
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });

    /* ---------------------------- render helpers ---------------------------- */

    function createDeleteButton(orderId) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'osu-btn danger';
      btn.textContent = 'Delete';
      btn.addEventListener('click', async () => {
        if (!deletePendingOrder) {
          alert('Delete not available — missing deletePendingOrder().');
          return;
        }
        const ok = confirm('Delete this empty order? This cannot be undone.');
        if (!ok) return;
        try {
          await deletePendingOrder(orderId);
        } catch (err) {
          console.error('Delete failed:', err);
          alert('Could not delete the order.');
        }
      });
      return btn;
    }

    function renderCompactResumeRow(order, container, { canDelete = false } = {}) {
      const { totalItems, totalLines } = summarizeItems(order.items || {});
      const name         = order.meta?.name || '(Untitled)';
      const itemsSummary = `${totalItems} items, ${totalLines} lines`;
      const createdText  = order.meta?.orderDate ? formatDateTime(order.meta.orderDate) : '—';
      const shipText     = `${formatDateToNZ(order.meta?.shipDate)} • ${order.meta?.shipMethod || '—'}`;

      const leftCls = orderColorClass(order.id);

      const el = document.createElement('div');
      el.className = `osu-pending-item ${leftCls}`;
      el.innerHTML = `
        <div class="osu-col">
          <div class="osu-title">
            <strong>${name} - ${itemsSummary}</strong>
            <span class="mk-badge-wrap"><span class="mk-badge mk-badge-draft">DRAFT</span></span>
          </div>
          <div class="osu-sub">Order: ${createdText}</div>
          <div class="osu-sub">Ship: ${shipText}</div>
        </div>
        <div class="osu-actions">
          ${canDelete ? '<button class="osu-btn danger" data-action="delete">Delete</button>' : ''}
          <button class="osu-btn osu-cta" data-action="resume">Resume</button>
        </div>
      `;

      if (canDelete) {
        el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
          if (confirm('Delete this order?')) await deletePendingOrder(order.id);
        });
      }
      el.querySelector('[data-action="resume"]').addEventListener('click', () => {
        orderContext = { id: order.id, meta: order.meta, isNew: false };
        closeOverlay();
        resolve(orderContext);
      });

      container.appendChild(el);
    }

    function renderFullOrderCard(order, container, { canDelete = false } = {}) {
      const { totalItems, totalLines } = summarizeItems(order.items || {});
      const itemsSummary = `${totalItems} items, ${totalLines} lines`;

      const orderDateText = order.meta?.orderDate
        ? formatDateTime(new Date(order.meta.orderDate))
        : (order.timestamps?.created
            ? formatDateTime(order.timestamps.created.toDate?.() || order.timestamps.created)
            : '—');

      const shipDateText = order.meta?.shipDate
        ? formatDateToNZ(order.meta.shipDate)
        : '—';
      const shipMethod = order.meta?.shipMethod || '—';

      // Status logic
      const isDraft     = order.status === 'draft';
      const isSubmitted = order.status === 'pending';
      const isAccepted  = order.status === 'accepted' || order.status === 'processing';
      const isCompleted = order.status === 'completed' || order.status === 'shipped';

      // Button logic
      let buttonText = 'Resume';
      let buttonClass = 'osu-btn osu-cta';
      let buttonAction = 'resume';

      if (isSubmitted)  { buttonText = 'Edit';  buttonClass = 'osu-btn edit';  buttonAction = 'edit'; }
      if (isAccepted || isCompleted) { buttonText = 'View'; buttonClass = 'osu-btn view'; buttonAction = 'view'; }

      // Status badge + timestamp - FIXED LAYOUT
      let statusBadgeHtml = '';
      if (isDraft) {
        statusBadgeHtml = `<span class="status-badge draft">DRAFT</span>`;
      } else if (isSubmitted) {
        const t = order.timestamps?.submitted ? formatDateTime(order.timestamps.submitted) : '';
        statusBadgeHtml = `
          <span class="status-badge submitted">SUBMITTED</span>
          ${t ? `<span class="status-timestamp">${t}</span>` : ''}
        `;
      } else if (isAccepted) {
        const t = order.timestamps?.accepted ? formatDateTime(order.timestamps.accepted) : '';
        statusBadgeHtml = `
          <span class="status-badge locked">LOCKED</span>
          ${t ? `<span class="status-timestamp">${t}</span>` : ''}
        `;
      } else if (isCompleted) {
        const completedTime = order.timestamps?.completed || order.timestamps?.shipped;
        const t = completedTime ? formatDateTime(completedTime) : '';
        statusBadgeHtml = `
          <span class="status-badge completed">${order.status.toUpperCase()}</span>
          ${t ? `<span class="status-timestamp">${t}</span>` : ''}
        `;
      }

      // Main wrapper
      const div = document.createElement('div');
      div.className = `osu-pending-item ${orderColorClass(order.id)}`;
      if (isDraft)     div.classList.add('osu-draft');
      if (isSubmitted) div.classList.add('osu-submitted');
      if (isAccepted)  div.classList.add('osu-locked');

      // FIXED HTML STRUCTURE - badges inline with title
      div.innerHTML = `
        <div class="osu-col">
          <div class="osu-title">
            <div class="title-main">
              <strong>${order.meta?.name || '(Untitled)'} - ${itemsSummary}</strong>
              <div class="status-badges">${statusBadgeHtml}</div>
            </div>
          </div>
          <div class="osu-sub">Order: ${orderDateText}</div>
          <div class="osu-sub">Ship: ${shipDateText} • ${shipMethod}</div>
        </div>
        <div class="osu-actions">
          ${canDelete ? '<span class="osu-actions-slot" data-slot="delete"></span>' : ''}
          <div class="osu-cta-col">
            <button class="${buttonClass}" data-action="${buttonAction}">${buttonText}</button>
          </div>
        </div>
      `;

      if (canDelete) {
        const slot = div.querySelector('[data-slot="delete"]');
        slot.replaceWith(createDeleteButton(order.id));
      }

      const button = div.querySelector(`[data-action="${buttonAction}"]`);
      if (button) {
        if (buttonAction === 'resume' || buttonAction === 'edit') {
          button.addEventListener('click', () => {
            orderContext = { id: order.id, meta: order.meta, isNew: false };
            closeOverlay();
            resolve(orderContext);
          });
        } else if (buttonAction === 'view') {
          button.addEventListener('click', () => {
            orderContext = {
              id: order.id,
              meta: order.meta,
              items: order.items,
              isNew: false,
              isViewOnly: true,
            };
            closeOverlay();
            resolve(orderContext);
          });
        }
      }

      container.appendChild(div);
    }

    function renderAllOrders() {
      // Combine: drafts+pending and accepted/processing
      const all = [...draftAndPending, ...acceptedOrders];

      if (!all.length) {
        list.textContent = 'No orders found.';
        return;
      }
      list.innerHTML = '';

      // Sort by status group then ship date
      const statusRank = { draft: 0, pending: 1, accepted: 2, processing: 2, completed: 3, shipped: 3 };
      all.sort((a, b) => {
        const sa = statusRank[a.status] ?? 9;
        const sb = statusRank[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        const da = new Date(a.meta?.shipDate || 0).getTime();
        const db = new Date(b.meta?.shipDate || 0).getTime();
        return da - db;
      });

      for (const ord of all) {
        // Drafts render compact with delete; others full
        if (ord.status === 'draft') {
          renderCompactResumeRow(ord, list, { canDelete: true });
        } else {
          renderFullOrderCard(ord, list, { canDelete: false });
        }
      }
    }
  });
}

/* ----------------------------- styles (once) ----------------------------- */
(function ensureStyles(){
  if (document.getElementById('osu-styles')) return;
  const s = document.createElement('style');
  s.id = 'osu-styles';
  s.textContent = `
    #order-setup-overlay{position:fixed;inset:0;z-index:9999}
    .osu-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45)}
    .osu-panel{
      position:relative;
      margin:2vh auto;
      background:#fff;
      max-width:820px;
      max-height:90vh;
      border-radius:12px;
      box-shadow:0 20px 60px rgba(0,0,0,.25);
      padding:20px;
      display:flex;
      flex-direction:column;
      overflow:hidden;
    }
    .osu-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px 0 6px}
    .osu-grid label{display:flex;flex-direction:column;font-size:.9rem}
    .osu-grid input,.osu-grid select{padding:8px;border:1px solid var(--border,#d3d3d3);border-radius:8px;font-size:.95rem;font-family:inherit}
    .osu-grid input[type="date"]{font-size:.95rem;font-family:inherit}
    .osu-grid input[type="date"]::-webkit-datetime-edit{font:inherit}
    .osu-actions-top{display:flex;justify-content:flex-end;gap:10px;margin-top:10px;flex-shrink:0}
    .osu-actions-top button{padding:8px 14px;border-radius:10px;border:1px solid #bbb;background:#eee;cursor:pointer}
    .osu-actions-top .primary{background:#8b7355;color:white;border:none}
    .osu-actions-top .primary:hover{background:#4e4035;color:white}
    .osu-divider{height:1px;background:var(--border,#e2e2e2);margin:16px 0;flex-shrink:0}
    .osu-live{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden}
    .osu-live h3{margin:0 0 8px;font-size:1rem;flex-shrink:0}
    .osu-pending{
      display:flex;
      flex-direction:column;
      gap:8px;
      flex:1;
      overflow-y:auto;
      overflow-x:hidden;
      max-height:none;
      -webkit-overflow-scrolling:touch;
      padding-right:4px;
    }
    .osu-pending::-webkit-scrollbar{width:6px}
    .osu-pending::-webkit-scrollbar-track{background:#f1f1f1;border-radius:3px}
    .osu-pending::-webkit-scrollbar-thumb{background:#c1c1c1;border-radius:3px}
    .osu-pending::-webkit-scrollbar-thumb:hover{background:#a8a8a8}
    .osu-pending-item{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border,#e2e2e2);border-radius:10px;padding:10px;margin-bottom:8px;background:#fff;flex-shrink:0}
    .osu-col{display:flex;flex-direction:column;gap:2px}
    .osu-title{font-size:.95rem}
    .osu-sub{font-size:.85rem;color:#555}
    .osu-review{border-left:4px solid #8b7355;background:#f5f2ee}
    .osu-hanging{margin-left:30px;border-left:3px solid #8b7355;background:#faf9f7}
    .osu-compact{padding:8px}
    .osu-actions{display:flex;align-items:center;gap:10px}
    .osu-cta-col{display:flex;gap:8px}
    .osu-btn{padding:6px 10px;border-radius:8px;border:none;background:#8b7355;color:white;cursor:pointer;
      font-size:0.85rem;transition:all 0.2s ease}
    .osu-btn:hover{background:#4e4035;color:white}
    .osu-btn.danger{background:#b14d4d}
    .osu-btn.danger:hover{background:#7e2b2b}
    .osu-btn.locked{background:#6c757d !important;color:#ffffff !important;cursor:not-allowed !important;opacity:0.8 !important}
    .osu-btn.locked:hover{background:#6c757d !important;color:#ffffff !important;transform:none !important}
    .osu-btn.locked::before{content:"🔒 ";font-size:0.8em}
    .osu-cta{min-width:104px;text-align:center}
    .osu-cta-col .osu-cta{width:104px}
    
    @media (max-width:640px) {
      .osu-panel{margin:1vh auto;max-height:95vh;padding:16px}
      .osu-grid{grid-template-columns:1fr;gap:10px}
    }
      /* left border per status */
/* ---- Left border palette (distinct, readable) ---- */
.mk-left-red    { border-left: 4px solid #e03131; }
.mk-left-blue   { border-left: 4px solid #1c7ed6; }
.mk-left-green  { border-left: 4px solid #2b8a3e; }
.mk-left-yellow { border-left: 4px solid #e0a800; }
.mk-left-orange { border-left: 4px solid #f76707; }
.mk-left-purple { border-left: 4px solid #7048e8; }
.mk-left-teal   { border-left: 4px solid #0ca678; }
.mk-left-pink   { border-left: 4px solid #d6336c; }
.mk-left-brown  { border-left: 4px solid #795548; }
.mk-left-cyan   { border-left: 4px solid #1098ad; }

/* ---- Badge styles (all on first line) ---- */
.mk-badge-wrap { margin-left: 8px; white-space: nowrap; }
.mk-badge {
  display: inline-block;
  font-size: 11px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
  vertical-align: middle;
}

/* Distinct outlines:
   - DRAFT: dashed outline, warm background
   - SUBMITTED: solid outline, cool background
   - LOCKED: solid outline, neutral background */
.mk-badge-draft {
  background: #fff5d6;
  color: #7a5f00;
  border: 1px dashed #e3c45c;   /* <-- dashed outline */
}
.mk-badge-submitted {
  background: #e6fbff;
  color: #0b7285;
  border: 1px solid #9be1ec;     /* solid outline */
}
.mk-badge-locked {
  background: #eef0f2;
  color: #495057;
  border: 1px solid #c9ced3;     /* solid outline */
}

/* Timestamp next to badge */
.mk-stamp { font-size: 11px; color: #666; margin-left: 6px; }

  `;
  document.head.appendChild(s);
})();
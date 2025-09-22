// shipping-ui.js
// Mount Kiwi — Shipping page UI

import { formatDateToNZ, formatDateTime, orderColorClass } from './utils.js';
import {
  subscribeAcceptedOrders,
  subscribeCompletedOrders, // includes completed + shipped; we'll filter shipped
  markShipped,             // updates status to 'shipped' with timestamps + carrier
} from './order-model.js';

/* --------------------------- DOM refs --------------------------- */
const els = {
  readyList:   document.getElementById('shipping-list'),   // "Ready to ship" container
  shippedList: document.getElementById('shipped-list'),    // "Shipped" history container (optional)
  statReady:   document.getElementById('stat-ready'),      // optional count tiles
  statShipped: document.getElementById('stat-shipped'),
};

/* --------------------------- Helpers --------------------------- */

function toDateInputValue(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function byShipDateAsc(a, b) {
  const da = new Date(a?.meta?.shipDate || 0).getTime();
  const db = new Date(b?.meta?.shipDate || 0).getTime();
  return da - db;
}

/* --------------------------- Rendering --------------------------- */

function renderReadyToShip(list) {
  const container = els.readyList;
  if (!container) return;

  const ready = (list || [])
    .filter(o => o && (o.status === 'accepted' || o.status === 'processing'))
    .sort(byShipDateAsc);

  if (els.statReady) els.statReady.textContent = String(ready.length);

  if (ready.length === 0) {
    container.innerHTML = `
      <div class="empty" style="padding:24px;color:#666;text-align:center;">
        No orders ready to ship.
      </div>`;
    return;
  }

  container.innerHTML = '';
  for (const order of ready) {
    const shipDateTxt = order.meta?.shipDate ? formatDateToNZ(order.meta.shipDate) : '—';
    const method = order.meta?.shipMethod || '—';
    const createdTxt = order.meta?.orderDate
      ? formatDateTime(order.meta.orderDate)
      : (order.timestamps?.created ? formatDateTime(order.timestamps.created) : '—');

    const card = document.createElement('div');
    card.className = `osu-pending-item ${orderColorClass(order.id)}`;
    card.innerHTML = `
      <div class="osu-col">
        <div class="osu-title">
          <strong>${order.meta?.name || '(Untitled)'}</strong>
          <span class="mk-badge-wrap"><span class="mk-badge mk-badge-locked">LOCKED</span></span>
        </div>
        <div class="osu-sub">Order: ${createdTxt}</div>
        <div class="osu-sub">Ship: ${shipDateTxt} • ${method}</div>
        <div class="osu-sub">ID: #${String(order.id).slice(-6)}</div>
      </div>

      <div class="osu-actions" style="gap:8px; align-items:flex-end;">
        <div class="ship-form">
          <label style="display:block; font-size:.8rem; color:#444; margin-bottom:4px;">Carrier</label>
          <input type="text" class="ship-carrier" placeholder="e.g. DHL" style="width:160px; padding:6px 8px; border:1px solid var(--border,#d3d3d3); border-radius:6px;" />
        </div>

        <div class="ship-form">
          <label style="display:block; font-size:.8rem; color:#444; margin-bottom:4px;">Shipped Date</label>
          <input type="date" class="ship-date" style="padding:6px 8px; border:1px solid var(--border,#d3d3d3); border-radius:6px;" />
        </div>

        <div class="osu-cta-col">
          <button class="osu-btn osu-cta btn-ship">Ship</button>
        </div>
      </div>
    `;

    // Prefill shipped date to today
    const dateInput = card.querySelector('.ship-date');
    dateInput.value = toDateInputValue(new Date());
    dateInput.min   = toDateInputValue(new Date(2000, 0, 1));

    // Wire the Ship button
    card.querySelector('.btn-ship').addEventListener('click', async () => {
      const carrier = String(card.querySelector('.ship-carrier').value || '').trim();
      const dateVal = card.querySelector('.ship-date').value;
      if (!dateVal) {
        alert('Please choose a shipped date.');
        return;
      }
      const shippedDate = new Date(dateVal + 'T00:00:00');

      // optimistic UI
      const btn = card.querySelector('.btn-ship');
      btn.disabled = true;
      btn.textContent = 'Shipping...';
      btn.style.opacity = '0.7';

      try {
        await markShipped(order.id, { carrier, shippedDate });
        // The subscription will re-render and remove this card from Ready.
      } catch (e) {
        console.error('markShipped failed', e);
        alert('Failed to mark as shipped. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Ship';
        btn.style.opacity = '1';
      }
    });

    container.appendChild(card);
  }
}

function renderShipped(list) {
  const container = els.shippedList;
  if (!container) return;

  // We receive completed + shipped; keep only shipped
  const shipped = (list || [])
    .filter(o => o && o.status === 'shipped')
    .sort((a, b) => {
      const da = new Date(a?.timestamps?.shipped || 0).getTime();
      const db = new Date(b?.timestamps?.shipped || 0).getTime();
      return db - da; // newest first
    });

  if (els.statShipped) els.statShipped.textContent = String(shipped.length);

  if (shipped.length === 0) {
    container.innerHTML = `
      <div class="empty" style="padding:24px;color:#666;text-align:center;">
        Nothing shipped yet.
      </div>`;
    return;
  }

  container.innerHTML = '';
  for (const order of shipped) {
    const shipDateTxt = order.meta?.shipDate ? formatDateToNZ(order.meta.shipDate) : '—';
    const method = order.meta?.shipMethod || '—';
    const shippedTxt = order.timestamps?.shipped ? formatDateTime(order.timestamps.shipped) : '—';

    const card = document.createElement('div');
    card.className = `osu-pending-item ${orderColorClass(order.id)}`;
    card.innerHTML = `
      <div class="osu-col">
        <div class="osu-title">
          <strong>${order.meta?.name || '(Untitled)'}</strong>
          <span class="mk-badge-wrap"><span class="mk-badge mk-badge-locked">LOCKED</span> <span class="mk-stamp">${shippedTxt}</span></span>
        </div>
        <div class="osu-sub">Ship: ${shipDateTxt} • ${method}</div>
        <div class="osu-sub">ID: #${String(order.id).slice(-6)}</div>
      </div>
      <div class="osu-actions">
        <button class="osu-btn view" disabled>Shipped</button>
      </div>
    `;
    container.appendChild(card);
  }
}

/* --------------------------- Live wires --------------------------- */


export function initShippingPage() {
  // start your live subscriptions here:
  const unsubA = subscribeAcceptedOrders(list => {
    try { renderReadyToShip(list || []); } catch (e) { console.error(e); }
  });

  const unsubB = subscribeCompletedOrders(list => {
    try { renderShipped(list || []); } catch (e) { console.error(e); }
  });

  // optional cleanup
  window.addEventListener('beforeunload', () => {
    try { unsubA && unsubA(); } catch {}
    try { unsubB && unsubB(); } catch {}
  });
}


document.addEventListener('DOMContentLoaded', initShippingPage);

/* ---------------------- Minimal inline styles ---------------------- */
/* You can move these to styles.css if you prefer. */
const styleId = 'shipping-ui-inline';
if (!document.getElementById(styleId)) {
  const st = document.createElement('style');
  st.id = styleId;
  st.textContent = `
    .ship-form input[type="text"],
    .ship-form input[type="date"] {
      font: inherit;
      background: #fff;
    }
  `;
  document.head.appendChild(st);
}

// progress-ui.js
// Mount Kiwi — Progress dashboard

import {
  fetchAllOrders,
  subscribeDraftAndPendingOrders,
  subscribeAcceptedOrders,
  subscribeCompletedOrders,
} from './order-model.js';

import {
  formatDateToNZ,
  formatDateTime,
  orderColorClass,  // <- shared left-border colour
} from './utils.js';

/* ---------------------------- DOM Refs ---------------------------- */

const els = {
  // Overview tiles (from progress.html)
  overview: {
    pending:   document.getElementById('overview-pending'),
    accepted:  document.getElementById('overview-accepted'),
    completed: document.getElementById('overview-completed'),
    shipped:   document.getElementById('overview-shipped'),
  },
  // Containers
  tableContainer:   document.getElementById('progress-table-container'),
  timelineContainer:document.getElementById('activity-timeline'),
};

/* ---------------------------- Helpers ---------------------------- */

// Count total item qty for an order (supports array or object items)
function countTotalItems(order) {
  const items = order?.items;
  if (!items) return 0;

  if (Array.isArray(items)) {
    // [{ id, sizes: { S: n, M: n, ... }, ... }]
    return items.reduce((sum, it) =>
      sum + Object.values(it?.sizes || {}).reduce((s, n) => s + (n || 0), 0), 0);
  }
  // { "Product|Variety|Colour": { size: qty, ... }, ... }  OR { productId: { size: qty } }
  return Object.values(items).reduce((sum, sizes) =>
    sum + Object.values(sizes || {}).reduce((s, n) => s + (n || 0), 0), 0);
}

// Estimate completion percent if order.items has a completed map per line (safe fallback)
function estimatePercentComplete(order) {
  const items = order?.items;
  if (!items) return 0;

  // If array form with "completed" maps, compute by qty
  if (Array.isArray(items)) {
    let done = 0, total = 0;
    for (const it of items) {
      const sizes = it?.sizes || {};
      const comp  = it?.completed || {};
      for (const [size, qty] of Object.entries(sizes)) {
        const q = Number(qty) || 0;
        total += q;
        done  += Math.min(q, Number(comp[size] || 0));
      }
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  // Object form: no explicit "completed" map available → show 0 (or infer later)
  return 0;
}

function byShipDateAsc(a, b) {
  const da = new Date(a?.meta?.shipDate || 0).getTime();
  const db = new Date(b?.meta?.shipDate || 0).getTime();
  return da - db;
}

function sortForTable(all) {
  // Pending → Accepted/Processing → Completed → Shipped, then ship date
  const rank = { pending: 0, accepted: 1, processing: 1, completed: 2, shipped: 3 };
  return [...all].sort((a, b) => {
    const ra = rank[a?.status] ?? 9;
    const rb = rank[b?.status] ?? 9;
    if (ra !== rb) return ra - rb;
    return byShipDateAsc(a, b);
  });
}

/* ------------------------ Overview rendering ------------------------ */

function computeOverviewStats(orders) {
  const stats = { pending: 0, accepted: 0, completed: 0, shipped: 0, totalItems: 0 };
  for (const o of orders) {
    if (!o) continue;
    if (o.status === 'pending')   stats.pending++;
    if (o.status === 'accepted' || o.status === 'processing') stats.accepted++;
    if (o.status === 'completed') stats.completed++;
    if (o.status === 'shipped')   stats.shipped++;
    stats.totalItems += countTotalItems(o);
  }
  return stats;
}

function renderOverview(stats) {
  if (els.overview.pending)   els.overview.pending.querySelector('.card-number').textContent   = String(stats.pending);
  if (els.overview.accepted)  els.overview.accepted.querySelector('.card-number').textContent  = String(stats.accepted);
  if (els.overview.completed) els.overview.completed.querySelector('.card-number').textContent = String(stats.completed);
  if (els.overview.shipped)   els.overview.shipped.querySelector('.card-number').textContent   = String(stats.shipped);
}

/* ------------------------- Table rendering ------------------------- */

function renderTable(orders) {
  if (!els.tableContainer) return;

  const list = sortForTable(orders);
  if (!list.length) {
    els.tableContainer.innerHTML = `
      <div class="empty" style="padding:20px;color:#666;text-align:center;">
        No orders yet.
      </div>`;
    return;
  }

  const table = document.createElement('table');
  table.className = 'progress-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Order</th>
        <th>Ship</th>
        <th>Status</th>
        <th>Items</th>
        <th style="min-width:160px;">Progress</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  list.forEach((o) => {
    const tr = document.createElement('tr');

    // ✅ Add consistent left-border colour based on order.id
    tr.className = orderColorClass(o.id);

    const name   = o?.meta?.name || '(Untitled)';
    const ship   = o?.meta?.shipDate ? formatDateToNZ(o.meta.shipDate) : '—';
    const method = o?.meta?.shipMethod || '—';
    const items  = countTotalItems(o);
    const pct    = estimatePercentComplete(o);

    tr.innerHTML = `
      <td>
        <div class="order-main">
          <div class="order-name">${name}</div>
          <div class="order-sub">Created: ${
            o?.meta?.orderDate ? formatDateTime(o.meta.orderDate)
              : (o?.timestamps?.created ? formatDateTime(o.timestamps.created) : '—')
          }</div>
        </div>
      </td>
      <td>${ship} • ${method}</td>
      <td>${o?.status?.toUpperCase?.() || '—'}</td>
      <td>${items}</td>
      <td>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <span>${pct}%</span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  els.tableContainer.innerHTML = '';
  els.tableContainer.appendChild(table);
}

/* ---------------------- Activity Timeline UI ----------------------- */

function pushActivity(list, when, type, text) {
  if (!when) return;
  list.push({
    time: when?.toDate?.() ? when.toDate() : new Date(when),
    type,
    text,
  });
}

function renderTimeline(orders) {
  if (!els.timelineContainer) return;

  const activities = [];
  for (const o of orders) {
    const idTail = String(o.id || '').slice(-6);
    const name   = o?.meta?.name || 'Order';
    const ts     = o?.timestamps || {};

    pushActivity(activities, ts.created,   'created',   `#${idTail} (${name}) was created`);
    pushActivity(activities, ts.submitted, 'submitted', `#${idTail} (${name}) was submitted`);
    pushActivity(activities, ts.accepted,  'accepted',  `#${idTail} (${name}) was accepted`);
    pushActivity(activities, ts.completed, 'completed', `#${idTail} (${name}) was completed`);
    pushActivity(activities, ts.shipped,   'shipped',   `#${idTail} (${name}) was shipped`);
  }

  activities.sort((a, b) => a.time - b.time);

  if (!activities.length) {
    els.timelineContainer.innerHTML = `
      <div class="empty" style="padding:16px;color:#666;">No activity yet.</div>`;
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'timeline';

  for (const a of activities) {
    const item = document.createElement('div');
    item.className = `timeline-item timeline-${a.type}`;
    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-body">
        <div class="timeline-time">${formatDateTime(a.time)}</div>
        <div class="timeline-text">${a.text}</div>
      </div>
    `;
    wrap.appendChild(item);
  }

  els.timelineContainer.innerHTML = '';
  els.timelineContainer.appendChild(wrap);
}

/* ------------------------------ Init ------------------------------ */

export async function initProgressPage() {
  if (!els.tableContainer) return;

  // 1) Initial load for table + overview + timeline
  let all = [];
  try {
    all = await fetchAllOrders();
    renderTable(all);
    renderOverview(computeOverviewStats(all));
    renderTimeline(all);
  } catch (err) {
    console.error('Progress: initial load failed', err);
    els.tableContainer.innerHTML = `
      <div class="error" style="padding:16px;color:#b14d4d;">
        Failed to load progress data.
      </div>`;
  }

  // 2) Live updates from the three status groups to keep things fresh
  const mergeAndRender = (partials = []) => {
    // merge by id
    const byId = new Map();
    for (const o of all) byId.set(o.id, o);
    for (const chunk of partials) {
      for (const o of (chunk || [])) byId.set(o.id, o);
    }
    all = Array.from(byId.values());
    renderTable(all);
    renderOverview(computeOverviewStats(all));
    renderTimeline(all);
  };

  // pending + drafts (for overview; drafts may be 0 here if you only push pending)
  const unsubA = subscribeDraftAndPendingOrders((list) => {
    const pendingOnly = (list || []).filter(o => o.status === 'pending');
    mergeAndRender([pendingOnly]);
  });

  // accepted/processing
  const unsubB = subscribeAcceptedOrders((list) => {
    mergeAndRender([list || []]);
  });

  // completed/shipped
  const unsubC = subscribeCompletedOrders((list) => {
    mergeAndRender([list || []]);
  });

  // Optional: clean up on navigation
  window.addEventListener('beforeunload', () => {
    try { unsubA && unsubA(); } catch {}
    try { unsubB && unsubB(); } catch {}
    try { unsubC && unsubC(); } catch {}
  });
}

/* ----------------------- Auto-boot if present ---------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Only boot if the progress page container exists
  const containerExists = document.getElementById('progress-table-container');
  if (containerExists) initProgressPage();
});

/* ---------------------- Minimal page styles ------------------------ */
/* You can move these to styles.css if preferred */

const styleTagId = 'progress-ui-inline-styles';
if (!document.getElementById(styleTagId)) {
  const st = document.createElement('style');
  st.id = styleTagId;
  st.textContent = `
    .progress-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--border); }
    .progress-table th, .progress-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; }
    .order-main .order-name { font-weight: 600; }
    .order-main .order-sub { font-size: .85rem; color: #666; }

    .progress-bar { height: 8px; background: #eee; border-radius: 6px; overflow: hidden; margin-bottom: 6px; }
    .progress-fill { height: 100%; background: var(--accent); }

    .timeline { display: grid; gap: 10px; }
    .timeline-item { display: grid; grid-template-columns: 16px 1fr; gap: 10px; align-items: start; }
    .timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); margin-top: 4px; }
    .timeline-time { font-size: .85rem; color: #666; }
    .timeline-text { font-size: .95rem; }

    /* Make left-border colour show on table rows too */
    tr.mk-left-red, tr.mk-left-blue, tr.mk-left-green, tr.mk-left-yellow,
    tr.mk-left-orange, tr.mk-left-purple, tr.mk-left-teal, tr.mk-left-pink,
    tr.mk-left-brown, tr.mk-left-cyan { border-left-width: 4px; border-left-style: solid; }
  `;
  document.head.appendChild(st);
}

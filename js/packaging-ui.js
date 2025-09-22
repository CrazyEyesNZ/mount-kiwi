// packaging-ui.js
// Mount Kiwi — Packaging page UI

import { formatDateTime, formatDateToNZ, orderColorClass } from './utils.js';
import {
  subscribeAcceptedOrders,
  subscribeCompletedOrders,
} from './order-model.js';

/* --------------------------- DOM refs --------------------------- */
const els = {
  processingList: document.getElementById('packaging-processing'),
  completedList: document.getElementById('packaging-completed'),
};

/* --------------------------- Helpers --------------------------- */

function renderProcessingList(orders) {
  if (!els.processingList) return;
  els.processingList.innerHTML = '';

  if (!orders.length) {
    els.processingList.innerHTML = `<div class="empty">No orders currently in packaging.</div>`;
    return;
  }

  orders.forEach(order => {
    const box = document.createElement('div');

    // ✅ add the per-order colour class
    box.className = `osu-pending-item osu-locked ${orderColorClass(order.id)}`;

    const created = order.meta?.orderDate
      ? formatDateTime(order.meta.orderDate)
      : (order.timestamps?.created ? formatDateTime(order.timestamps.created) : '—');

    const ship = `${formatDateToNZ(order.meta?.shipDate)} • ${order.meta?.shipMethod || '—'}`;

    box.innerHTML = `
      <div class="osu-col">
        <div class="osu-title">
          <strong>${order.meta?.name || '(Untitled)'}</strong>
        </div>
        <div class="osu-sub">Order: ${created}</div>
        <div class="osu-sub">Ship: ${ship}</div>
      </div>
      <div class="osu-actions">
        <button class="osu-btn view">View</button>
      </div>
    `;

    // view-only for packaging
    box.querySelector('.view').addEventListener('click', () => {
      // TODO: navigate to detail view if you have one
      console.log('View order', order.id);
    });

    els.processingList.appendChild(box);
  });
}

function renderCompletedList(orders) {
  if (!els.completedList) return;
  els.completedList.innerHTML = '';

  if (!orders.length) {
    els.completedList.innerHTML = `<div class="empty">No completed/shipped orders yet.</div>`;
    return;
  }

  orders.forEach(order => {
    const box = document.createElement('div');

    // ✅ add the per-order colour class
    box.className = `osu-pending-item osu-completed ${orderColorClass(order.id)}`;

    const completed = order.timestamps?.completed
      ? formatDateTime(order.timestamps.completed)
      : (order.timestamps?.shipped ? formatDateTime(order.timestamps.shipped) : '—');

    const ship = `${formatDateToNZ(order.meta?.shipDate)} • ${order.meta?.shipMethod || '—'}`;

    box.innerHTML = `
      <div class="osu-col">
        <div class="osu-title">
          <strong>${order.meta?.name || '(Untitled)'}</strong>
        </div>
        <div class="osu-sub">Completed: ${completed}</div>
        <div class="osu-sub">Ship: ${ship}</div>
      </div>
      <div class="osu-actions">
        <button class="osu-btn view">View</button>
      </div>
    `;

    box.querySelector('.view').addEventListener('click', () => {
      console.log('View completed order', order.id);
    });

    els.completedList.appendChild(box);
  });
}

/* --------------------------- Init --------------------------- */

export function initPackagingPage() {
  // live feed: accepted/processing
  subscribeAcceptedOrders(list => {
    try {
      renderProcessingList(list || []);
    } catch (e) {
      console.error('renderProcessingList failed', e);
    }
  });

  // live feed: completed/shipped
  subscribeCompletedOrders(list => {
    try {
      renderCompletedList(list || []);
    } catch (e) {
      console.error('renderCompletedList failed', e);
    }
  });
}

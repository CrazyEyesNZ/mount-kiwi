// js/order-model.js — Single-collection model (orders)
// Status: 'draft' | 'pending' | 'accepted' | 'processing' | 'completed' | 'shipped'

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const ORDERS = 'orders';
const ordersCol = collection(db, ORDERS);

/* ----------------------------- helpers ----------------------------- */

function withTSMerge(existingTS = {}) {
  return { ...existingTS };
}

function normalizeNewOrder(meta = {}, payload = {}) {
  return {
    status: 'draft',
    meta: {
      orderDate: meta.orderDate || new Date().toISOString(),
      shipDate: meta.shipDate || null,
      shipMethod: meta.shipMethod || null,
      name: meta.name || '',
    },
    // Can be object map or array; keep what you pass
    items: payload.items || {},
    total: payload.total || 0,
    history: payload.history || [],
    timestamps: { created: serverTimestamp() },
  };
}

/* -------------------------- create / update ------------------------- */

export async function createDraftOrder(meta = {}, payload = {}) {
  const data = normalizeNewOrder(meta, payload);
  const ref = await addDoc(ordersCol, data);
  return { id: ref.id };
}

export async function submitOrder(id) {
  const ref = doc(db, ORDERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');
  const data = snap.data() || {};
  await updateDoc(ref, {
    status: 'pending',
    timestamps: { ...withTSMerge(data.timestamps), submitted: serverTimestamp() },
  });
}

// Back-compat alias used in some HTML files
export const submitDraftOrder = submitOrder;

export async function acceptOrder(id) {
  const ref = doc(db, ORDERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');
  const data = snap.data() || {};
  
  // Use regular Date for history entries, serverTimestamp for top-level timestamps
  const now = new Date();
  
  await updateDoc(ref, {
    status: 'accepted',
    timestamps: { ...withTSMerge(data.timestamps), accepted: serverTimestamp() },
    history: [...(data.history || []), { event: 'accepted', at: now }], // Use regular Date here
  });
}

export async function startProcessing(id) {
  const ref = doc(db, ORDERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');
  const data = snap.data() || {};
  await updateDoc(ref, {
    status: 'processing',
    timestamps: withTSMerge(data.timestamps),
  });
}

export async function completeOrder(id) {
  const ref = doc(db, ORDERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');
  const data = snap.data() || {};
  
  const now = new Date();
  
  await updateDoc(ref, {
    status: 'completed',
    timestamps: { ...withTSMerge(data.timestamps), completed: serverTimestamp() },
    history: [...(data.history || []), { event: 'completed', at: now }], // Use regular Date
  });
}

export async function markShipped(id, shipment = {}) {
  const ref = doc(db, ORDERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');
  const data = snap.data() || {};
  
  const shippedDate = shipment.shippedDate instanceof Date
    ? shipment.shippedDate
    : new Date(shipment.shippedDate || Date.now());
  
  await updateDoc(ref, {
    status: 'shipped',
    'meta.carrier': shipment.carrier || data?.meta?.carrier || '',
    timestamps: { ...withTSMerge(data.timestamps), shipped: shippedDate },
    history: [
      ...(data.history || []),
      { event: 'shipped', at: shippedDate, carrier: shipment.carrier || '' }, // Use regular Date
    ],
  });
}

/** Delete a draft/pending order (used by overlay “Delete”). */
export async function deletePendingOrder(id) {
  const ref = doc(db, ORDERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() || {};
  if (data.status === 'draft' || data.status === 'pending') {
    await deleteDoc(ref);
  } else {
    throw new Error(`Cannot delete order with status ${data.status}`);
  }
}

/* ----------------------------- queries ----------------------------- */

export async function fetchAllOrders() {
  const snap = await getDocs(ordersCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// DRAFT only (used by some UIs)
export function subscribeDraftOrders(callback) {
  const qy = query(ordersCol, where('status', '==', 'draft'), orderBy('meta.shipDate', 'asc'));
  return onSnapshot(qy, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// PENDING only (packaging.html expects this name)
export function subscribePendingOrders(callback) {
  const qy = query(ordersCol, where('status', '==', 'pending'), orderBy('meta.shipDate', 'asc'));
  return onSnapshot(qy, s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// Replace the three subscribe functions with these "no-index" versions.
// They query without orderBy (no composite index needed) and then sort in JS.

export function subscribeDraftAndPendingOrders(callback) {
  const qy = query(ordersCol, where('status', 'in', ['draft', 'pending']));
  return onSnapshot(qy, s => {
    const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a,b) => new Date(a?.meta?.shipDate||0) - new Date(b?.meta?.shipDate||0));
    callback(list);
  });
}

export function subscribeAcceptedOrders(callback) {
  const qy = query(ordersCol, where('status', 'in', ['accepted', 'processing']));
  return onSnapshot(qy, s => {
    const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a,b) => new Date(a?.meta?.shipDate||0) - new Date(b?.meta?.shipDate||0));
    callback(list);
  });
}

export function subscribeCompletedOrders(callback) {
  const qy = query(ordersCol, where('status', 'in', ['completed', 'shipped']));
  return onSnapshot(qy, s => {
    const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
    // If completed timestamp missing, push to end
    list.sort((a,b) => new Date(b?.timestamps?.completed||0) - new Date(a?.timestamps?.completed||0));
    callback(list);
  });
}


// Update a draft or pending order's items/total (compat for old API)
export async function updatePendingOrder(orderId, data = {}) {
  if (!orderId) throw new Error('updatePendingOrder: orderId is required');
  const ref = doc(db, ORDERS, orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');

  const prev = snap.data() || {};
  await updateDoc(ref, {
    items: data.items ?? prev.items ?? {},
    total: data.total ?? prev.total ?? 0,
    timestamps: {
      ...withTSMerge(prev.timestamps),
      updated: serverTimestamp(),
    },
  });
}


/* --------------------------- generic helpers --------------------------- */

export async function getOrder(id) {
  const ref = doc(db, ORDERS, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveOrder(id, partial) {
  const ref = doc(db, ORDERS, id);
  await setDoc(ref, partial, { merge: true });
}

/**
 * Update progress for a product inside an order.
 * Works whether `items` is an array (preferred) or an object map.
 */
export async function updateProgress(orderId, productKeyOrId, updates = {}, note = '') {
  const ref = doc(db, ORDERS, orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');
  const order = snap.data();

  const applyToItem = (item) => {
    item.completed = { ...(item.completed || {}), ...(updates.completed || {}) };
    item.adjustments = { ...(item.adjustments || {}), ...(updates.adjustments || {}) };
    return item;
  };

  if (Array.isArray(order.items)) {
    const idx =
      order.items.findIndex(i => i.id === productKeyOrId || i.name === productKeyOrId);
    if (idx === -1) throw new Error('Product not found in order');
    order.items[idx] = applyToItem({ ...order.items[idx] });
  } else if (order.items && typeof order.items === 'object') {
    const sizes = order.items[productKeyOrId] || {};
    order.items[productKeyOrId] = {
      ...(order.items[productKeyOrId] || {}),
      ...sizes,
      ...((updates.completed || {})), // simple merge for object form
    };
  }

  order.history = [
    ...(order.history || []),
    { event: 'update', at: new Date(), product: productKeyOrId, updates, note }, // Use regular Date
  ];
  order.timestamps = { ...(order.timestamps || {}), updated: new Date() }; // Use regular Date

  await setDoc(ref, order);
}

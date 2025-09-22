// assets/js/analytics-ui.js

import { fetchAllOrders } from './order-model.js';
import { formatDateTime, formatDateToNZ } from './utils.js';

/**
 * Initializes the Analytics dashboard by loading all orders,
 * computing key metrics, and rendering them into the DOM.
 */
export async function initAnalyticsDashboard() {
  const container = document.getElementById('analytics-dashboard');
  container.innerHTML = `<h1>Loading analytics...</h1>`;

  try {
    // Fetch all orders (pending, accepted, completed)
    const allOrders = await fetchAllOrders();

    // Metrics
    const totalOrders    = allOrders.length;
    const pendingCount   = allOrders.filter(o => o.status === 'pending').length;
    const acceptedCount  = allOrders.filter(o => o.status === 'accepted').length;
    const completedCount = allOrders.filter(o => o.status === 'completed').length;

    // Avg completion time (hrs)
    const times = allOrders
      .filter(o => o.status === 'completed' && o.timestamps.accepted && o.timestamps.completed)
      .map(o => (o.timestamps.completed.toDate() - o.timestamps.accepted.toDate()) / (3600000));
    const avgTime = times.length
      ? (times.reduce((sum, t) => sum + t, 0) / times.length).toFixed(2)
      : 'N/A';

    // Render
    container.innerHTML = `
      <div class="analytics-metrics">
        <div class="metric-card"><h2>Total Orders</h2><p>${totalOrders}</p></div>
        <div class="metric-card"><h2>Pending</h2><p>${pendingCount}</p></div>
        <div class="metric-card"><h2>Accepted</h2><p>${acceptedCount}</p></div>
        <div class="metric-card"><h2>Completed</h2><p>${completedCount}</p></div>
        <div class="metric-card"><h2>Avg Completion Time (hrs)</h2><p>${avgTime}</p></div>
      </div>
      <section id="charts"><!-- Chart.js placeholders --></section>
    `;

  } catch (err) {
    console.error('Analytics load error:', err);
    container.innerHTML = `<p class="error">Unable to load analytics.</p>`;
  }
}
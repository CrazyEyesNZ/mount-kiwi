// js/main.js

// Import shared modules from the same folder
import './firebase-config.js';
import './data-service.js';
import './order-model.js';
import './utils.js';
import { initOrdersPage }       from './orders-ui.js';
import { initPackagingPage }    from './packaging-ui.js';
import { initProgressPage }     from './progress-ui.js';
import { initShippingPage }     from './shipping-ui.js';
import { initAnalyticsDashboard } from './analytics-ui.js';
import { initIntakePage } from './intake-ui.js';

// Run the correct initializer based on the current page
window.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();

  switch (page) {
    case 'orders.html':
      initOrdersPage();
      break;
    case 'packaging.html':
      initPackagingPage();
      break;
    case 'progress.html':
      initProgressPage();
      break;
    case 'shipping.html':
      initShippingPage();
      break;
    case 'analytics.html':
      initAnalyticsDashboard();
      break;
      case 'intake.html':
  initIntakePage();
  break;

    case '':
    case 'index.html':
      // Redirect root to orders page
      window.location.replace('orders.html');
      break;
    default:
      console.warn(`No initializer for page: ${page}`);
  }
});

// Declare storage for historical data
const historyData = {};

// Initialize Firebase & Firestore
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sofix-8957d.firebaseapp.com",
  projectId: "sofix-8957d",
  storageBucket: "sofix-8957d.appspot.com",
  messagingSenderId: "156447440286",
  appId: "1:156447440286:web:e3ebbbf9b52ce7e4b4aa8f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enhanced loadHistory function with proper key normalization
function loadHistory() {
  return db.collection('product_history').get()
    .then(snapshot => {
      console.log('⚡️ Loaded history docs:', snapshot.size);
      
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        
        // Extract fields exactly as they appear in Firestore
        const productType = (d['PRODUCT TYPE'] || d.PRODUCT_TYPE || d.productType || '').toString().trim();
        const variety = (d['VARIETY'] || d.variety || '').toString().trim();
        const colour = (d['COLOUR'] || d.COLOUR || d.colour || '').toString().trim();
        const size = (d['SIZE'] || d.size || '').toString().trim();
        
        // Create multiple key variations to handle case mismatches
        const baseKey = `${productType}|${variety}|${colour}|${size}`;
        const lowerKey = `${productType.toLowerCase()}|${variety.toLowerCase()}|${colour.toLowerCase()}|${size.toLowerCase()}`;
        const upperKey = `${productType.toUpperCase()}|${variety.toUpperCase()}|${colour.toUpperCase()}|${size.toUpperCase()}`;
        
        // Store under all possible key variations
        historyData[baseKey] = d;
        historyData[lowerKey] = d;
        historyData[upperKey] = d;
        
        // Also try title case variations
        const titleKey = `${toTitleCase(productType)}|${toTitleCase(variety)}|${toTitleCase(colour)}|${toTitleCase(size)}`;
        historyData[titleKey] = d;
      });
      
      console.log('🗝️ Total historyData keys created:', Object.keys(historyData).length);
      console.log('🗝️ Sample original keys:', Object.keys(historyData).filter(k => k.includes('JACKETS')).slice(0, 3));
    })
    .catch(err => {
      console.error('Error loading historical data:', err);
    });
}

// Helper function for title case
function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

// Enhanced attachHistoryTooltips function with improved positioning and "no data" handling
function attachHistoryTooltips() {
  const inputs = document.querySelectorAll('.quantity-input');
  console.log('🎯 attachHistoryTooltips called, inputs found:', inputs.length);
  
  let matchedCount = 0;
  
  inputs.forEach(input => {
    const type = (input.dataset.type || '').toString().trim();
    const variety = (input.dataset.variety || '').toString().trim();
    const colour = (input.dataset.colour || '').toString().trim();
    const size = (input.dataset.size || '').toString().trim();
    
    // Try multiple key variations for matching
    const keyVariations = [
      `${type}|${variety}|${colour}|${size}`,
      `${type.toLowerCase()}|${variety.toLowerCase()}|${colour.toLowerCase()}|${size.toLowerCase()}`,
      `${type.toUpperCase()}|${variety.toUpperCase()}|${colour.toUpperCase()}|${size.toUpperCase()}`,
      `${toTitleCase(type)}|${toTitleCase(variety)}|${toTitleCase(colour)}|${toTitleCase(size)}`
    ];
    
    let hist = null;
    let matchedKey = null;
    
    // Try each key variation until we find a match
    for (const key of keyVariations) {
      if (historyData[key]) {
        hist = historyData[key];
        matchedKey = key;
        break;
      }
    }
    
    // Create tooltip for ALL inputs (with or without data)
    const tooltip = document.createElement('div');
    tooltip.className = 'historic-tooltip';
    
    if (hist) {
      matchedCount++;
      console.log(`✅ Tooltip match found for "${matchedKey}"`);
      
      // Build compact tooltip content - one line per item
      const tooltipItems = [
        { label: 'Sold 24', value: hist['SOLD 24'] || hist['S0LD 24'] || '—' },
        { label: 'Stock', value: hist['STOCK ON HAND'] || '—' },
        { label: 'AIR', value: hist['AIR'] || '—' },
        { label: 'SEA (Dec)', value: hist['SEA (DEC 24)'] || '—' },
        { label: 'Forecast 25', value: hist['SALES FORCAST 25'] || hist['SALES_FORCAST 25'] || '—' },
        { label: 'SEA (Apr)', value: hist['SEA (APR 25)'] || '—' },
        { label: 'SEA (May)', value: hist['SEA (MAY 25)'] || '—' },
        { label: 'AIR (May)', value: hist['AIR (MAY 25)'] || '—' },
        { label: 'AIR 2', value: hist['AIR 2'] || '—' },
        { label: 'AIR 3', value: hist['AIR 3'] || '—' },
        { label: 'WEB', value: hist['WEB'] || '—' }
      ];
      
      // Compact format: Label: Value on each line
      tooltip.innerHTML = tooltipItems
        .map(item => `<div><strong>${item.label}:</strong> ${item.value}</div>`)
        .join('');
    } else {
      // Show "No data available" for products without historical data
      tooltip.innerHTML = `
        <div style="text-align: center; color: #a49080; font-style: italic;">
          <strong>No Historical Data</strong><br>
          <span style="font-size: 0.8em;">${variety} ${colour} ${size}</span>
        </div>
      `;
      tooltip.classList.add('no-data');
    }

    const parent = input.parentElement;
    parent.style.position = 'relative';
    parent.appendChild(tooltip);

    // Show/hide tooltip with smart positioning
    input.addEventListener('mouseenter', () => { 
      positionTooltip(tooltip, input);
      tooltip.style.opacity = '1'; 
    });
    input.addEventListener('mouseleave', () => { 
      tooltip.style.opacity = '0'; 
    });
  });
  
  console.log(`🎯 Tooltip matching complete: ${matchedCount}/${inputs.length} matched`);
}

// Smart tooltip positioning function
function positionTooltip(tooltip, input) {
  // Reset positioning
  tooltip.style.left = '';
  tooltip.style.right = '';
  tooltip.style.top = '';
  tooltip.style.bottom = '';
  tooltip.style.transform = '';
  
  const inputRect = input.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default: position to the right, center-aligned
  let leftPosition = '100%';
  let topPosition = '50%';
  let transform = 'translateY(-50%)';
  
  // Check if tooltip would go off the right edge
  if (inputRect.right + tooltipRect.width + 10 > viewportWidth) {
    // Position to the left instead
    leftPosition = 'auto';
    tooltip.style.right = '100%';
  }
  
  // Check if tooltip would go off the top or bottom
  const tooltipTop = inputRect.top + inputRect.height / 2 - tooltipRect.height / 2;
  const tooltipBottom = tooltipTop + tooltipRect.height;
  
  if (tooltipTop < 10) {
    // Too close to top - align with top of input
    topPosition = '0';
    transform = 'translateY(0)';
  } else if (tooltipBottom > viewportHeight - 10) {
    // Too close to bottom - align with bottom of input
    topPosition = 'auto';
    tooltip.style.bottom = '0';
    transform = 'translateY(0)';
  }
  
  // Apply positioning
  if (leftPosition !== 'auto') {
    tooltip.style.left = leftPosition;
  }
  if (topPosition !== 'auto') {
    tooltip.style.top = topPosition;
  }
  tooltip.style.transform = transform;
  tooltip.style.marginLeft = leftPosition === '100%' ? '8px' : '';
  tooltip.style.marginRight = tooltip.style.right === '100%' ? '8px' : '';
}

// Add debug function to help troubleshoot
function debugTooltipMatching() {
  console.log('🔍 DEBUGGING TOOLTIP MATCHING:');
  
  // Show some history keys
  const historyKeys = Object.keys(historyData).slice(0, 10);
  console.log('📊 Sample history keys:', historyKeys);
  
  // Show some input keys
  const inputs = document.querySelectorAll('.quantity-input');
  const inputKeys = Array.from(inputs).slice(0, 10).map(input => {
    const type = input.dataset.type || '';
    const variety = input.dataset.variety || '';
    const colour = input.dataset.colour || '';
    const size = input.dataset.size || '';
    return `${type}|${variety}|${colour}|${size}`;
  });
  console.log('🎯 Sample input keys:', inputKeys);
  
  // Check for exact matches
  const matches = inputKeys.filter(key => historyData[key]);
  console.log('✅ Direct matches found:', matches.length);
}

window.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loadingState');
  if (loadingState) {
    loadingState.style.display = 'block';
  }

  // 1) Load historical data first
  loadHistory()
    // 2) Then load current product catalog
    .then(() => db.collection('products').get())
    .then(snapshot => {
      if (loadingState) loadingState.style.display = 'none';
      if (snapshot.empty) {
        document.getElementById('productPanel').innerHTML = '<div class="empty-state"><h4>No products found</h4></div>';
        return;
      }
      // Render UI
      renderProducts(snapshot.docs);
      // Attach tooltips based on loaded history
      attachHistoryTooltips();
      // Add debug function to window for manual testing
      window.debugTooltipMatching = debugTooltipMatching;
      // Initialize scroll-tracking for navigation
      initScrollTracking();
    })
    .catch(err => {
      console.error('Error during initialization:', err);
      if (loadingState) loadingState.style.display = 'none';
      document.getElementById('productPanel').innerHTML = '<div class="empty-state"><h4>Error loading data</h4></div>';
    });
});

function createQuantityInput(productType, varietyName, colour, size) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = 0;
  input.max = 9999;
  input.className = 'quantity-input';
  input.dataset.type = productType;
  input.dataset.variety = varietyName;
  input.dataset.colour = colour;
  input.dataset.size = size;
  input.placeholder = '0';
  input.style.width = '50px';
  input.style.textAlign = 'center';

  input.addEventListener('input', function() {
    const v = parseInt(this.value, 10) || 0;
    this.classList.toggle('has-value', v > 0);
  });
  input.addEventListener('change', function() {
    const v = parseInt(this.value, 10) || 0;
    if (v > 0) {
      addToOrder({ type: productType, variety: varietyName, colour, size, quantity: v });
    } else {
      removeOrderLine(productType, varietyName, colour, size);
    }
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const next = this.closest('div').nextElementSibling?.querySelector('.quantity-input');
      next?.focus();
    }
  });

  return input;
}

// Global state
let currentOrder = [];
let activeNoteContext = null;
let orderNotes = new Map(); // Store notes by product key
let orderDirty = false; // Track if order has unsaved changes

// Utilities
function colourToSwatchFileName(colour) {
  return colour.toLowerCase().replace(/[^a-z0-9]/g, '') + '.png';
}

function createSwatch(colour) {
  const img = document.createElement('img');
  img.src = `assets/colours/${colourToSwatchFileName(colour)}`;
  img.alt = colour;
  img.className = 'colour-swatch';
  img.onerror = function() {
    // Fallback to colored div if image not found
    const div = document.createElement('div');
    div.className = 'colour-swatch';
    div.style.backgroundColor = getColourFallback(colour);
    this.parentNode.replaceChild(div, this);
  };
  return img;
}

function getColourFallback(colour) {
  const fallbacks = {
    'Base': '#8B7355',
    'Brown': '#8B4513',
    'Charcoal': '#36454F',
    'Black': '#000000',
    'Blue': '#4A90E2',
    'Grey': '#808080',
    'Cherry': '#DE3163',
    'Ocean': '#006994',
    'Berry': '#8E4585',
    'Green': '#228B22',
    'New Orange': '#FF6B35',
    'Brown Mix': '#A0522D',
    'Petrol': '#005F73',
    'Multi': '#FF6B6B',
    'Mixed': '#96CEB4',
    'New Green': '#00C851',
    'Oat': '#F5DEB3'
  };
  return fallbacks[colour] || '#cccccc';
}

// Helper functions to determine layout type
function isMultiSize(varieties) {
  return varieties.some(variety => variety.sizes.length > 1);
}

function isMultiColor(variety) {
  return variety.colours.length > 1 || variety.colours[0] !== 'Base';
}

function getAllSizes(varieties) {
  // Get all unique sizes from all varieties, maintaining order
  const allSizes = [];
  varieties.forEach(variety => {
    variety.sizes.forEach(size => {
      if (!allSizes.includes(size)) {
        allSizes.push(size);
      }
    });
  });
  return allSizes;
}

// Order management functions
function getProductKey(type, variety, colour) {
  return `${type}|${variety}|${colour}`;
}

function getLineKey(type, variety, colour, size) {
  return `${type}|${variety}|${colour}|${size}`;
}

function findOrderLine(type, variety, colour, size) {
  return currentOrder.find(line => 
    line.type === type && 
    line.variety === variety && 
    line.colour === colour && 
    line.size === size
  );
}

function addToOrder(lineData) {
  const { type, variety, colour, size, quantity } = lineData;
  
  if (quantity <= 0) {
    // Remove line if quantity is 0 or negative
    removeOrderLine(type, variety, colour, size);
    return;
  }

  // Find existing line
  const existingLineIndex = currentOrder.findIndex(line => 
    line.type === type && 
    line.variety === variety && 
    line.colour === colour && 
    line.size === size
  );

  const productKey = getProductKey(type, variety, colour);
  const note = orderNotes.get(productKey) || '';

  const orderLine = {
    type,
    variety,
    colour,
    size,
    quantity: parseInt(quantity),
    note,
    addedAt: new Date().toISOString()
  };

  if (existingLineIndex >= 0) {
    // Update existing line
    currentOrder[existingLineIndex] = orderLine;
  } else {
    // Add new line
    currentOrder.push(orderLine);
  }

  orderDirty = true;
  renderSummary();
  updateRowIndicators();
  updateOrderCounts();
  showSuccessFeedback(`Added ${quantity} x ${variety} ${colour} ${size}`);
}

function removeOrderLine(type, variety, colour, size) {
  const initialLength = currentOrder.length;
  currentOrder = currentOrder.filter(line => 
    !(line.type === type && 
      line.variety === variety && 
      line.colour === colour && 
      line.size === size)
  );
  
  if (currentOrder.length < initialLength) {
    orderDirty = true;
    renderSummary();
    updateRowIndicators();
    updateOrderCounts();
  }
}

function clearRowQuantities(type, variety, colour) {
  // Remove all lines for this product combination
  const initialLength = currentOrder.length;
  currentOrder = currentOrder.filter(line => 
    !(line.type === type && 
      line.variety === variety && 
      line.colour === colour)
  );
  
  if (currentOrder.length < initialLength) {
    orderDirty = true;
    renderSummary();
    updateRowIndicators();
    updateOrderCounts();
    
    // Clear input fields
    const inputs = document.querySelectorAll(`[data-product="${getProductKey(type, variety, colour)}"] .quantity-input`);
    inputs.forEach(input => {
      input.value = '';
      input.classList.remove('has-value');
    });
    
    showSuccessFeedback(`Cleared ${variety} ${colour}`);
  }
}

function updateRowIndicators() {
  document.querySelectorAll('.colour-row, .compact-row').forEach(row => {
    const productKey = row.dataset.product;
    if (!productKey) return;
    
    const [type, variety, colour] = productKey.split('|');
    const rowLines = currentOrder.filter(line => 
      line.type === type && 
      line.variety === variety && 
      line.colour === colour
    );
    
    const totalQty = rowLines.reduce((sum, line) => sum + line.quantity, 0);
    
    // Update row total indicator
    let totalIndicator = row.querySelector('.row-total');
    if (!totalIndicator) {
      totalIndicator = document.createElement('div');
      totalIndicator.className = 'row-total';
      row.querySelector('.action-buttons').appendChild(totalIndicator);
    }
    
    if (totalQty > 0) {
      totalIndicator.textContent = totalQty;
      totalIndicator.classList.add('has-items');
    } else {
      totalIndicator.textContent = '';
      totalIndicator.classList.remove('has-items');
    }
    
    // Update input values and styling
    const inputs = row.querySelectorAll('.quantity-input');
    inputs.forEach(input => {
      const size = input.dataset.size;
      const existingLine = findOrderLine(type, variety, colour, size);
      
      if (existingLine) {
        input.value = existingLine.quantity;
        input.classList.add('has-value');
      } else {
        if (input.value === '' || input.value === '0') {
          input.classList.remove('has-value');
        }
      }
    });
  });
}

function updateOrderCounts() {
  const totalItems = currentOrder.reduce((sum, line) => sum + line.quantity, 0);
  const totalLines = currentOrder.length;
  
  // Update header counts
  const itemCountEl = document.getElementById('orderItemCount');
  const lineCountEl = document.getElementById('orderLineCount');
  
  if (itemCountEl) {
    itemCountEl.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
  }
  if (lineCountEl) {
    lineCountEl.textContent = `${totalLines} line${totalLines !== 1 ? 's' : ''}`;
  }
}

// Updated renderSummary function with totals
function renderSummary() {
  const panel = document.getElementById('summaryPanel');
  
  // Calculate totals first
  const totalItems = currentOrder.reduce((sum, line) => sum + line.quantity, 0);
  const totalLines = currentOrder.length;
  
  let html = `
    <div class="summary-header">
      <h3 class="summary-title">Current Order</h3>
      <div class="summary-totals">
        <div><strong>${totalItems}</strong> items</div>
        <div><strong>${totalLines}</strong> lines</div>
      </div>
    </div>
  `;
  
  if (currentOrder.length === 0) {
    html += `
      <div class="empty-state">
        <h4>No items added yet</h4>
        <p>Select products and quantities to build your order</p>
      </div>
    `;
  } else {
    // Group by product type for better organization
    const groupedOrder = {};
    currentOrder.forEach(line => {
      if (!groupedOrder[line.type]) {
        groupedOrder[line.type] = {};
      }
      
      const productKey = `${line.variety}|${line.colour}`;
      if (!groupedOrder[line.type][productKey]) {
        groupedOrder[line.type][productKey] = {
          variety: line.variety,
          colour: line.colour,
          note: line.note,
          sizes: []
        };
      }
      
      groupedOrder[line.type][productKey].sizes.push({
        size: line.size,
        quantity: line.quantity
      });
    });
    
    Object.keys(groupedOrder).forEach(type => {
      // Calculate total for this product type
      const typeTotal = Object.keys(groupedOrder[type]).reduce((typeSum, productKey) => {
        const product = groupedOrder[type][productKey];
        const productTotal = product.sizes.reduce((productSum, size) => productSum + size.quantity, 0);
        return typeSum + productTotal;
      }, 0);
      
      html += `<div style="margin-bottom: 16px;">`;
      
      // Updated header with total count and visual styling
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; background: linear-gradient(135deg, #8b7355, #a0875a); border-radius: 6px; color: white;">
          <h4 style="color: white; font-size: 0.9rem; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${type}</h4>
          <div style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
            ${typeTotal} items
          </div>
        </div>
      `;
      
      Object.keys(groupedOrder[type]).forEach(productKey => {
        const product = groupedOrder[type][productKey];
        
        // Sort sizes in a logical order
        const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'S/M', 'L/XL', 'One', 'One Size'];
        product.sizes.sort((a, b) => {
          const aIndex = sizeOrder.indexOf(a.size);
          const bIndex = sizeOrder.indexOf(b.size);
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
        
        // Create size display string: S(1), M(2), XL(1)
        const sizesDisplay = product.sizes.map(s => 
          `<span class="size">${s.size}</span>(${s.quantity})`
        ).join(', ');
        
        // Calculate total for this specific product
        const productTotal = product.sizes.reduce((sum, size) => sum + size.quantity, 0);
        
        // Only show color if it's not "Base"
        const colorDisplay = product.colour === 'Base' ? '' : ` – ${product.colour}`;
        
        html += `
          <div class="summary-line">
            <div style="flex: 1;">
              <strong>${product.variety}${colorDisplay}:</strong>
              <div class="sizes">${sizesDisplay}</div>
              ${product.note ? `<div class="note">${product.note}</div>` : ''}
            </div>
            <div style="font-size: 0.8rem; color: #8b7355; font-weight: 600; margin-left: 8px;">
              ${productTotal}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    });
    
    // Add overall total summary at the bottom
    if (Object.keys(groupedOrder).length > 1) {
      html += `
        <div style="border-top: 2px solid #d4c5b4; padding-top: 12px; margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f5f2ee; padding: 8px 12px; border-radius: 6px; font-weight: 600; color: #2c2826;">
            <span>ORDER TOTAL:</span>
            <span style="color: #8b7355; font-size: 1.1rem;">${totalItems} items</span>
          </div>
        </div>
      `;
    }
  }
  
  panel.innerHTML = html;
}

// Modal controls for notes
function openNoteModal(context) {
  activeNoteContext = context;
  const productKey = getProductKey(context.type, context.variety, context.colour);
  const existingNote = orderNotes.get(productKey) || '';
  
  document.getElementById('noteText').value = existingNote;
  document.getElementById('noteCharCount').textContent = existingNote.length;
  document.getElementById('modalOverlay').style.display = 'flex';
  
  // Focus on textarea
  setTimeout(() => {
    document.getElementById('noteText').focus();
  }, 100);
}

function closeNoteModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  activeNoteContext = null;
}

function saveNote() {
  if (!activeNoteContext) return;
  
  const note = document.getElementById('noteText').value.trim();
  const productKey = getProductKey(
    activeNoteContext.type, 
    activeNoteContext.variety, 
    activeNoteContext.colour
  );
  
  if (note) {
    orderNotes.set(productKey, note);
  } else {
    orderNotes.delete(productKey);
  }
  
  // Update existing order lines with this note
  currentOrder.forEach(line => {
    if (line.type === activeNoteContext.type && 
        line.variety === activeNoteContext.variety && 
        line.colour === activeNoteContext.colour) {
      line.note = note;
    }
  });
  
  // Update note button appearance
  const noteBtn = document.querySelector(`[data-product="${productKey}"] .note-btn`);
  if (noteBtn) {
    if (note) {
      noteBtn.classList.add('has-note');
      noteBtn.title = `Note: ${note}`;
    } else {
      noteBtn.classList.remove('has-note');
      noteBtn.title = 'Add note';
    }
  }
  
  closeNoteModal();
  renderSummary();
  orderDirty = true;
  
  showSuccessFeedback(note ? 'Note saved' : 'Note removed');
}

// Success feedback
function showSuccessFeedback(message) {
  // Remove existing feedback
  const existing = document.querySelector('.success-feedback');
  if (existing) {
    existing.remove();
  }
  
  const feedback = document.createElement('div');
  feedback.className = 'success-feedback';
  feedback.textContent = message;
  
  const summaryPanel = document.getElementById('summaryPanel');
  summaryPanel.insertBefore(feedback, summaryPanel.firstChild);
  
  setTimeout(() => feedback.classList.add('show'), 10);
  setTimeout(() => {
    feedback.classList.remove('show');
    setTimeout(() => feedback.remove(), 300);
  }, 2000);
}

// Generate product navigation icons
function generateProductNavigation(products) {
  const nav = document.getElementById('productNavigation');
  nav.innerHTML = '';

  products.forEach(doc => {
    const navIcon = document.createElement('div');
    navIcon.className = 'nav-icon';
    navIcon.dataset.tooltip = doc.id;
    navIcon.dataset.section = `section-${doc.id.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Create icon image
    const iconImg = document.createElement('img');
    iconImg.src = `assets/icons/${doc.id.replace(/\s+/g, '')}.png`;
    iconImg.alt = doc.id;
    iconImg.onerror = function() {
      // Fallback to text icon if image not found
      this.style.display = 'none';
      const textIcon = document.createElement('div');
      textIcon.textContent = doc.id.substring(0, 2).toUpperCase();
      textIcon.style.color = 'white';
      textIcon.style.fontWeight = 'bold';
      textIcon.style.fontSize = '0.8rem';
      navIcon.appendChild(textIcon);
    };
    
    navIcon.appendChild(iconImg);
    
    // Add click handler to scroll to section
    navIcon.addEventListener('click', () => {
      scrollToSection(navIcon.dataset.section);
      updateActiveNavIcon(navIcon);
    });
    
    nav.appendChild(navIcon);
  });
}

// Track if we're programmatically scrolling
let isProgrammaticScroll = false;
let scrollTimeout = null;

// Scroll to specific section
function scrollToSection(sectionId) {
  const panel   = document.getElementById('productPanel');
  const section = document.getElementById(sectionId);
  if (!panel || !section) return;

  const headerEl = section.querySelector('.type-header');
  const firstRow = section.querySelector('.section-content > *');
  if (!headerEl || !firstRow) return;

  // Get the panel's position
  const panelRect = panel.getBoundingClientRect();
  const firstRowRect = firstRow.getBoundingClientRect();
  
  // Calculate where to scroll so the first row is visible below the sticky header
  const scrollOffset = (firstRowRect.top - panelRect.top) + panel.scrollTop - headerEl.offsetHeight;

  // Set flag to prevent scroll tracking from interfering
  isProgrammaticScroll = true;
  
  panel.scrollTo({
    top: scrollOffset,
    behavior: 'smooth'
  });

  // Keep the flag active for the duration of the smooth scroll
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    isProgrammaticScroll = false;
    
    // Double-check the active icon after scroll completes
    const icon = document.querySelector(`.nav-icon[data-section="${sectionId}"]`);
    if (icon) updateActiveNavIcon(icon);
  }, 800); // Longer timeout to ensure smooth scroll completes

  // Force the highlight to the clicked icon
  const icon = document.querySelector(`.nav-icon[data-section="${sectionId}"]`);
  if (icon) updateActiveNavIcon(icon);
}


// Update active navigation icon
function updateActiveNavIcon(activeIcon) {
  // Remove active class from all icons
  document.querySelectorAll('.nav-icon').forEach(icon => {
    icon.classList.remove('active');
  });
  
  // Add active class to clicked icon
  activeIcon.classList.add('active');
}

// Auto-update active navigation based on scroll position
function initScrollTracking() {
  const productPanel = document.getElementById('productPanel');
  const sections = document.querySelectorAll('.product-section');
  const navIcons = document.querySelectorAll('.nav-icon');
  
  productPanel.addEventListener('scroll', () => {
    const scrollTop = productPanel.scrollTop;
    let activeSection = null;
    
    // Find which section is currently in view
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      
      if (scrollTop >= sectionTop - 100 && scrollTop < sectionTop + sectionHeight - 100) {
        activeSection = section;
      }
    });
    
    if (activeSection) {
      const activeSectionId = activeSection.id;
      
      // Update nav icon active state
      navIcons.forEach(icon => {
        icon.classList.remove('active');
        if (icon.dataset.section === activeSectionId) {
          icon.classList.add('active');
        }
      });
    }
  });
}


function renderProducts(products) {
  const container = document.getElementById('productPanel');
  container.innerHTML = '';

  // Master list of all possible sizes (controls column order)
  const masterSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'S/M', 'L/XL', 'One', 'One Size'];

  // Build the top‐bar icons for navigation
  generateProductNavigation(products);

  // Loop through each Firestore document (product type)
  products.forEach(doc => {
    const data = doc.data();

    // Filter the master list down to only sizes used by this product
    const sizeList = masterSizes.filter(sz =>
      data.varieties.some(v => v.sizes.includes(sz))
    );

    // Create the wrapping section and give it an ID for scrolling
    const section = document.createElement('div');
    section.className = 'product-section';
    section.id = `section-${doc.id.toLowerCase().replace(/\s+/g, '-')}`;

    // ─── Section Header ───
    const typeHeader = document.createElement('div');
    typeHeader.className = 'type-header';
    typeHeader.style.display = 'grid';
    typeHeader.style.gridTemplateColumns = `200px repeat(${sizeList.length}, 60px) 120px`;
    typeHeader.style.alignItems = 'center';
    typeHeader.style.backgroundColor = '#7a6748';
    typeHeader.style.color = '#fff';
    typeHeader.style.padding = '8px';

    // Icon + Title container
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.gap = '8px';

    // Create and append the icon (with PNG + fallback)
    const iconEl = createTypeHeaderIcon(doc.id);
    titleContainer.appendChild(iconEl);

    // Create and append the product name
    const title = document.createElement('span');
    title.textContent = doc.id;
    title.style.fontSize = '1rem';
    title.style.fontWeight = '600';
    titleContainer.appendChild(title);

    typeHeader.appendChild(titleContainer);

    // Size column headers
    sizeList.forEach(sz => {
      const cell = document.createElement('div');
      cell.textContent = sz;
      cell.style.textAlign = 'center';
      cell.style.fontSize = '0.85rem';
      cell.style.fontWeight = '600';
      typeHeader.appendChild(cell);
    });

    // Actions header column
    const actionsCol = document.createElement('div');
    actionsCol.textContent = 'Actions';
    actionsCol.style.textAlign = 'center';
    actionsCol.style.fontSize = '0.85rem';
    actionsCol.style.fontWeight = '600';
    typeHeader.appendChild(actionsCol);

    section.appendChild(typeHeader);

    // ─── Section Content ───
    const contentContainer = document.createElement('div');
    contentContainer.className = 'section-content';

    data.varieties.forEach(variety => {
      if (variety.colours.length > 1) {
        // Multiple colours → one row per colour
        variety.colours.forEach(colour => {
          const row = createColorRow(doc.id, variety, colour, sizeList);
          contentContainer.appendChild(row);
        });
      } else {
        // Single colour → compact row
        const colour = variety.colours[0];
        const row = createCompactRow(doc.id, variety, colour, sizeList);
        contentContainer.appendChild(row);
      }
    });

    section.appendChild(contentContainer);
    container.appendChild(section);
  });

  // After rendering, attach tooltips again (since DOM has been rebuilt)
  setTimeout(() => {
    attachHistoryTooltips();
  }, 100);

  // Finally, update any row indicators (e.g. highlighting non-zero quantities)
  updateRowIndicators();
}

function createTypeHeaderIcon(productId) {
  const icon = document.createElement('div');
  icon.className = 'type-icon';

  const iconImg = document.createElement('img');
  iconImg.src    = `assets/icons/${productId.replace(/\s+/g, '')}.png`;
  iconImg.width  = 24;
  iconImg.height = 24;

  iconImg.onerror = function() {
    this.style.display = 'none';
    const txt = document.createElement('div');
    txt.textContent   = productId.substring(0, 2).toUpperCase();
    txt.style.cssText = 'color: #fff; font-weight: bold; font-size: 0.8rem;';
    icon.appendChild(txt);
  };

  icon.appendChild(iconImg);
  return icon;
}

function createColorRow(productType, variety, colour, sizeList) {
  const row = document.createElement('div');
  row.className = 'colour-row';
  row.dataset.product = getProductKey(productType, variety.name, colour);

  row.style.display = 'grid';
  row.style.gridTemplateColumns = `200px repeat(${sizeList.length}, 60px) 120px`;
  row.style.gap = '8px';
  row.style.alignItems = 'center';

  // Label with swatch + name
  const label = document.createElement('div');
  label.className = 'colour-label';
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.gap = '8px';
  label.appendChild(createSwatch(colour));
  const nameSpan = document.createElement('span');
  nameSpan.textContent = `${variety.name} – ${colour}`;
  label.appendChild(nameSpan);
  row.appendChild(label);

  // Input cells or dashes
  const inputs = {};
  sizeList.forEach(sz => {
    const cell = document.createElement('div');
    cell.style.textAlign = 'center';
    if (variety.sizes.includes(sz)) {
      const input = createQuantityInput(productType, variety.name, colour, sz);
      inputs[sz] = input;
      cell.appendChild(input);
    } else {
      cell.innerHTML = '<span style="color: #ccc;">—</span>';
    }
    row.appendChild(cell);
  });

  // Note + Clear buttons
  const actionButtons = createActionButtons(productType, variety, colour, inputs);
  row.appendChild(actionButtons);

  return row;
}

function createCompactRow(productType, variety, colour, sizeList) {
  const row = document.createElement('div');
  row.className = 'compact-row';
  row.dataset.product = getProductKey(productType, variety.name, colour);

  row.style.display = 'grid';
  row.style.gridTemplateColumns = `200px repeat(${sizeList.length}, 60px) 120px`;
  row.style.gap = '8px';
  row.style.alignItems = 'center';

  // Variety name only
  const label = document.createElement('div');
  label.className = 'variety-label';
  label.style.fontWeight = '500';
  label.style.color = '#2c2826';
  label.textContent = variety.name;
  row.appendChild(label);

  // Input cells or dashes
  const inputs = {};
  sizeList.forEach(sz => {
    const cell = document.createElement('div');
    cell.style.display = 'flex';
    cell.style.justifyContent = 'center';
    if (variety.sizes.includes(sz)) {
      const input = createQuantityInput(productType, variety.name, colour, sz);
      inputs[sz] = input;
      cell.appendChild(input);
    } else {
      cell.innerHTML = '<span style="color: #ccc;">—</span>';
    }
    row.appendChild(cell);
  });

  // Note button only
  const actionButtons = createActionButtons(productType, variety, colour, inputs);
  row.appendChild(actionButtons);

  return row;
}

function createActionButtons(productType, variety, colour, inputs) {
  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';
  actionButtons.style.display = 'flex';
  actionButtons.style.alignItems = 'center';
  actionButtons.style.gap = '6px';
  actionButtons.style.justifyContent = 'center';

  const productKey = getProductKey(productType, variety.name, colour);

  // Note button
  const noteBtn = document.createElement('button');
  noteBtn.className = 'note-btn';
  noteBtn.textContent = 'Note';
  noteBtn.title = 'Add note';
  
  // Check if note exists
  const existingNote = orderNotes.get(productKey);
  if (existingNote) {
    noteBtn.classList.add('has-note');
    noteBtn.title = `Note: ${existingNote}`;
  }
  
  noteBtn.addEventListener('click', () => {
    openNoteModal({
      type: productType,
      variety: variety.name,
      colour
    });
  });
  actionButtons.appendChild(noteBtn);

  // Clear row button
  const clearBtn = document.createElement('button');
  clearBtn.className = 'clear-row-btn';
  clearBtn.textContent = 'Clear';
  clearBtn.title = 'Clear all quantities for this product';
  clearBtn.addEventListener('click', () => {
    if (confirm(`Clear all quantities for ${variety.name} ${colour === 'Base' ? '' : colour}?`)) {
      clearRowQuantities(productType, variety.name, colour);
    }
  });
  actionButtons.appendChild(clearBtn);

  return actionButtons;
}

// Load products and initialize
window.addEventListener('DOMContentLoaded', () => {
  // Show loading state
  const loadingState = document.getElementById('loadingState');
  if (loadingState) {
    loadingState.innerHTML = `
      <h4>Loading product catalog...</h4>
      <div style="margin-top: 16px;">
        <div style="width: 40px; height: 40px; border: 4px solid #e8e0d6; border-top: 4px solid #8b7355; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
    `;
    loadingState.style.display = 'block';
  }
  
  // Load products from Firestore
  db.collection('products').get()
    .then(snapshot => {
      if (loadingState) {
        loadingState.style.display = 'none';
      }
      
      if (snapshot.empty) {
        console.warn('No products found in Firestore');
        const productPanel = document.getElementById('productPanel');
        productPanel.innerHTML = `
          <div class="empty-state">
            <h4>No products found in database</h4>
            <p>Please check Firestore configuration</p>
          </div>
        `;
        return;
      }
      
      renderProducts(snapshot.docs);
      
      // Initialize scroll tracking for navigation
      setTimeout(() => {
        initScrollTracking();
      }, 100);
    })
    .catch(error => {
      console.error('Error loading products:', error);
      if (loadingState) {
        loadingState.style.display = 'none';
      }
      
      const productPanel = document.getElementById('productPanel');
      productPanel.innerHTML = `
        <div class="empty-state">
          <h4>⚠️ Error Loading Products</h4>
          <p style="color: #c17a3a; margin: 8px 0;">Failed to load products from database</p>
          <p style="font-size: 0.9rem; color: #706856;">Please check your connection and try again</p>
          <button onclick="location.reload()" style="margin-top: 12px; padding: 8px 16px; background-color: #8b7355;">Try Again</button>
        </div>
      `;
    });

  // Initialize summary
  renderSummary();
  updateOrderCounts();

  // Modal event listeners
  document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
  document.getElementById('cancelNoteBtn').addEventListener('click', closeNoteModal);
  
  // Character counter for note textarea
  const noteText = document.getElementById('noteText');
  const charCount = document.getElementById('noteCharCount');
  
  if (noteText && charCount) {
    noteText.addEventListener('input', function() {
      const count = this.value.length;
      charCount.textContent = count;
      
      // Change color when approaching limit
      if (count > 450) {
        charCount.style.color = '#c17a3a';
      } else if (count > 400) {
        charCount.style.color = '#a6682e';
      } else {
        charCount.style.color = '#a49080';
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNoteModal();
    }
    
    // Toggle shortcuts help with '?' key
    if (e.key === '?' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      const help = document.getElementById('shortcutsHelp');
      if (help) {
        help.style.display = help.style.display === 'none' ? 'block' : 'none';
      }
    }
    
    // Quick save with Ctrl+S
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      // Future: trigger manual save
      console.log('Manual save triggered');
    }
  });
  
  // Close modal by clicking overlay
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closeNoteModal();
    }
  });
  
  // Auto-hide keyboard shortcuts help after 10 seconds
  setTimeout(function() {
    const help = document.getElementById('shortcutsHelp');
    if (help && help.style.display === 'block') {
      help.style.display = 'none';
    }
  }, 10000);
});

window.addEventListener('beforeprint', () => {
  document.querySelectorAll('.section-content').forEach(el => {
    el.classList.remove('collapsed');
    el.style.display = 'block';
  });
});

// optional: restore collapse state afterward
window.addEventListener('afterprint', () => {
  // if you want to re‑collapse sections that were closed before print,
  // you'd need to track which ones were collapsed and re‑add the class/inline style here.
});

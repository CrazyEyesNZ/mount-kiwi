// Utility function to convert names to file-friendly format
function nameToFileName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Utility function to convert colour names to swatch filenames
function colourToSwatchFileName(colour) {
  return colour.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '') + '.png';
}

// Global state
let currentSelection = {
  type: null,
  variety: null,
  color: null
};
let orders = [];
let overlayData = {};

// DOM elements
let typesGrid, varietiesSection, varietiesGrid, varietiesPlaceholder, colorsSection, colorsGrid, colorsPlaceholder;
let ordersList, sizeOverlay, sizesGrid, selectedTypeTitle, selectedVarietyTitle;

// Initialize when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  typesGrid = document.getElementById('types-grid');
  varietiesSection = document.getElementById('varieties-section');
  varietiesGrid = document.getElementById('varieties-grid');
  varietiesPlaceholder = document.getElementById('varieties-placeholder');
  colorsSection = document.getElementById('colors-section');
  colorsGrid = document.getElementById('colors-grid');
  colorsPlaceholder = document.getElementById('colors-placeholder');
  ordersList = document.getElementById('orders-list');
  sizeOverlay = document.getElementById('size-overlay');
  sizesGrid = document.getElementById('sizes-grid');
  selectedTypeTitle = document.getElementById('selected-type-title');
  selectedVarietyTitle = document.getElementById('selected-variety-title');

  // Check if all elements exist
  if (!typesGrid || !varietiesSection || !varietiesGrid || !colorsSection || !colorsGrid || !ordersList) {
    console.error('Missing DOM elements. Check HTML structure.');
    return;
  }

  // Initialize interface
  renderProductTypes();
  setupDropZone();
  renderOrders();
  
  // Load saved orders
  loadSavedOrders();
  
  // Set up navigation
  setActiveButton();
  setupNavigationHandlers();
});

// Load saved (non-submitted) orders back into the interface
async function loadSavedOrders() {
  // Only load saved orders if we don't already have orders in memory
  if (orders.length > 0) {
    console.log('Orders already exist in memory, skipping auto-load');
    return;
  }

  try {
    const doc = await db.collection('orders').doc('mountKiwi').get();
    if (doc.exists) {
      const data = doc.data();
      const savedOrders = data.savedOrders || [];
      
      if (savedOrders.length > 0) {
        // Restore the orders array
        orders = savedOrders;
        renderOrders();
        console.log(`Loaded ${savedOrders.length} saved orders`);
      }
    }
  } catch (error) {
    console.error('Error loading saved orders:', error);
  }
}

// Render product type icons
function renderProductTypes() {
  typesGrid.innerHTML = '';
  productData.forEach((prod, index) => {
    const typeCard = document.createElement('div');
    typeCard.className = 'type-card';
    typeCard.onclick = () => selectProductType(index);
    
    // Explicitly ensure product type cards are not draggable
    typeCard.draggable = false;
    
    const iconPath = `Icons/${nameToFileName(prod.type)}.png`;
    typeCard.innerHTML = `
      <img src="${iconPath}" alt="${prod.type}" class="type-icon" onerror="this.style.display='none'" draggable="false">
      <div class="type-name">${prod.type}</div>
    `;
    
    typesGrid.appendChild(typeCard);
  });
}

// Select product type and show varieties
function selectProductType(typeIndex) {
  currentSelection.type = typeIndex;
  currentSelection.variety = null;
  currentSelection.color = null;
  
  // Update active state
  document.querySelectorAll('.type-card').forEach((card, i) => {
    card.classList.toggle('active', i === typeIndex);
  });
  
  const selectedType = productData[typeIndex];
  if (selectedTypeTitle) {
    selectedTypeTitle.textContent = selectedType.type;
  }
  
  // Show varieties section, hide varieties placeholder
  if (varietiesSection) {
    varietiesSection.style.display = 'block';
  }
  if (varietiesPlaceholder) {
    varietiesPlaceholder.style.display = 'none';
  }
  
  // Reset colors section to placeholder
  if (colorsSection) {
    colorsSection.style.display = 'none';
  }
  if (colorsPlaceholder) {
    colorsPlaceholder.style.display = 'block';
  }
  
  renderVarieties(selectedType);
}

// Render varieties for selected type
function renderVarieties(type) {
  if (!varietiesGrid) {
    console.error('Varieties grid element not found');
    return;
  }
  
  varietiesGrid.innerHTML = '';
  
  type.varieties.forEach((variety, index) => {
    const varietyCard = document.createElement('div');
    varietyCard.className = 'variety-card';
    varietyCard.onclick = () => selectVariety(index);
    
    // Check if variety has only one color - if so, make it draggable
    const hasOnlyOneColor = variety.colours.length === 1;
    if (hasOnlyOneColor) {
      varietyCard.draggable = true;
      varietyCard.dataset.varietyIndex = index;
      varietyCard.classList.add('draggable-variety');
      
      // Set up drag events for single-color varieties
      varietyCard.addEventListener('dragstart', handleVarietyDragStart);
      varietyCard.addEventListener('dragend', handleVarietyDragEnd);
    } else {
      // Explicitly ensure multi-color varieties are not draggable
      varietyCard.draggable = false;
      varietyCard.classList.add('multi-color-variety');
    }
    
    let imageSrc = `Icons/${nameToFileName(type.type)}.png`; // Default fallback to type icon
    
    // Set variety image path based on product type
    if (type.type === 'Jackets') {
      imageSrc = `Pictures/${variety.name}.png`;
    } else if (type.type === 'Shawls') {
      imageSrc = `Pictures/Shawl ${variety.name}.png`;
    } else if (type.type === 'House Socks') {
      imageSrc = `Pictures/House Socks - ${variety.name}.png`;
    } else {
      // For all other product types, use the variety name directly
      imageSrc = `Pictures/${variety.name}.png`;
    }
    
    varietyCard.innerHTML = `
      <img src="${imageSrc}" alt="${variety.name}" class="variety-image" 
           onerror="this.src='Icons/${nameToFileName(type.type)}.png'" 
           draggable="false">
      <div class="variety-name">${variety.name}</div>
    `;
    
    varietiesGrid.appendChild(varietyCard);
  });
}

// Select variety and show colors
function selectVariety(varietyIndex) {
  currentSelection.variety = varietyIndex;
  currentSelection.color = null;
  
  // Update active state
  document.querySelectorAll('.variety-card').forEach((card, i) => {
    card.classList.toggle('active', i === varietyIndex);
  });
  
  const selectedType = productData[currentSelection.type];
  const selectedVariety = selectedType.varieties[varietyIndex];
  
  if (selectedVarietyTitle) {
    selectedVarietyTitle.textContent = `${selectedVariety.name}`;
  }
  
  // Show colors section, hide placeholder
  if (colorsSection) {
    colorsSection.style.display = 'block';
  }
  if (colorsPlaceholder) {
    colorsPlaceholder.style.display = 'none';
  }
  
  renderColors(selectedVariety);
}

// Render colors for selected variety
function renderColors(variety) {
  if (!colorsGrid) {
    console.error('Colors grid element not found');
    return;
  }
  
  colorsGrid.innerHTML = '';
  
  variety.colours.forEach((color, index) => {
    const colorCard = document.createElement('div');
    colorCard.className = 'color-card';
    colorCard.draggable = true;
    colorCard.dataset.colorIndex = index;
    
    // Set up drag events
    colorCard.addEventListener('dragstart', handleDragStart);
    colorCard.addEventListener('dragend', handleDragEnd);
    
    // Get colour swatch filename
    const colourSwatchFileName = colourToSwatchFileName(color);
    
    colorCard.innerHTML = `
      <div class="color-sample">
        <img src="Colours/${colourSwatchFileName}" alt="${color}" class="color-swatch-img" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
             draggable="false">
        <div class="color-fallback" style="display: none;">${color.substring(0, 2)}</div>
      </div>
      <div class="color-name">${color}</div>
    `;
    
    colorsGrid.appendChild(colorCard);
  });
}

// Handle drag start for variety cards (single color only)
function handleVarietyDragStart(e) {
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  
  // Store drag data for variety
  const varietyIndex = parseInt(e.target.dataset.varietyIndex);
  const dragData = {
    type: currentSelection.type,
    variety: varietyIndex,
    color: 0, // Always use the first (and only) color
    isVarietyDrag: true
  };
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
}

// Handle drag end for variety cards
function handleVarietyDragEnd(e) {
  e.target.classList.remove('dragging');
}

// Handle drag start
function handleDragStart(e) {
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  
  // Store drag data
  const colorIndex = parseInt(e.target.dataset.colorIndex);
  const dragData = {
    type: currentSelection.type,
    variety: currentSelection.variety,
    color: colorIndex
  };
  e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
}

// Handle drag end
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}

// Setup drop zone for orders panel
function setupDropZone() {
  const dropZone = document.getElementById('orders-panel');
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      openSizeOverlay(dragData);
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
  });
}

// Open size and quantity selection overlay
function openSizeOverlay(dragData) {
  const type = productData[dragData.type];
  const variety = type.varieties[dragData.variety];
  const color = variety.colours[dragData.color];
  
  // Store overlay data
  overlayData = {
    type: type.type,
    variety: variety.name,
    color: color,
    sizes: variety.sizes,
    selectedSizes: {}
  };
  
  // Update overlay content
  let overlayTitle;
  if (dragData.isEdit) {
    overlayTitle = `Edit Order: ${type.type} - ${variety.name}`;
  } else if (dragData.isVarietyDrag) {
    overlayTitle = `${type.type} - ${variety.name} (${color})`;
  } else {
    overlayTitle = `${type.type} - ${variety.name}`;
  }
  document.getElementById('overlay-title').textContent = overlayTitle;
  
  // Set product image based on product type
  let imageSrc = `Icons/${nameToFileName(type.type)}.png`; // Default fallback
  
  if (type.type === 'Jackets') {
    imageSrc = `Pictures/${variety.name}.png`;
  } else if (type.type === 'Shawls') {
    imageSrc = `Pictures/Shawl ${variety.name}.png`;
  } else if (type.type === 'House Socks') {
    imageSrc = `Pictures/House Socks - ${variety.name}.png`;
  } else {
    // For all other product types
    imageSrc = `Pictures/${variety.name}.png`;
  }
  
  const overlayImage = document.getElementById('overlay-image');
  overlayImage.src = imageSrc;
  overlayImage.draggable = false;
  overlayImage.onerror = () => {
    overlayImage.src = `Icons/${nameToFileName(type.type)}.png`;
  };
  
  // Set product details
  document.getElementById('overlay-product-details').innerHTML = `
    <h4>${type.type}</h4>
    <p><strong>Variety:</strong> ${variety.name}</p>
    <p><strong>Colour:</strong> ${color}</p>
  `;
  
  // Render sizes
  renderSizes();
  
  // Show overlay
  sizeOverlay.style.display = 'flex';
}

// Render sizes with quantity controls
function renderSizes() {
  sizesGrid.innerHTML = '';
  
  overlayData.sizes.forEach(size => {
    // Check if this item already exists in orders
    const existingOrder = orders.find(order => 
      order.type === overlayData.type &&
      order.variety === overlayData.variety &&
      order.colour === overlayData.color &&
      order.size === size
    );
    
    const currentQuantity = existingOrder ? existingOrder.quantity : 0;
    
    const sizeItem = document.createElement('div');
    sizeItem.className = 'size-item';
    sizeItem.dataset.size = size;
    
    sizeItem.innerHTML = `
      <div class="size-label">${size}</div>
      <div class="quantity-control">
        <div class="quantity-slider" data-size="${size}" data-quantity="${currentQuantity}">
          <div class="slider-track"></div>
        </div>
        <div class="quantity-value">${currentQuantity}</div>
      </div>
    `;
    
    // Set up quantity slider
    const slider = sizeItem.querySelector('.quantity-slider');
    const quantityValue = sizeItem.querySelector('.quantity-value');
    
    // Update slider visual
    updateSliderVisual(slider, currentQuantity);
    
    // Add click handler for selection
    sizeItem.addEventListener('click', () => {
      document.querySelectorAll('.size-item').forEach(item => {
        item.classList.remove('selected');
      });
      sizeItem.classList.add('selected');
    });
    
    // Add click-to-edit functionality on quantity value
    quantityValue.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Create input field
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '50';
      input.value = quantityValue.textContent;
      input.style.width = '40px';
      input.style.textAlign = 'center';
      input.style.border = '1px solid #667eea';
      input.style.borderRadius = '3px';
      input.style.fontSize = '1.1rem';
      input.style.fontWeight = '600';
      
      // Replace quantity value with input
      quantityValue.style.display = 'none';
      quantityValue.parentNode.insertBefore(input, quantityValue.nextSibling);
      
      // Focus and select all text after a small delay to ensure DOM is ready
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
      
      // Handle input completion
      const finishEdit = () => {
        const newValue = Math.max(0, Math.min(50, parseInt(input.value) || 0));
        quantityValue.textContent = newValue;
        quantityValue.style.display = 'block';
        input.remove();
        
        // Update slider and data
        slider.dataset.quantity = newValue;
        updateSliderVisual(slider, newValue);
        overlayData.selectedSizes[size] = newValue;
      };
      
      input.addEventListener('blur', finishEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          finishEdit();
        } else if (e.key === 'Escape') {
          quantityValue.style.display = 'block';
          input.remove();
        }
      });
    });
    
    // Add slider drag functionality with position-based starting
    let isDragging = false;
    let startX = 0;
    let startQuantity = currentQuantity;
    
    slider.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      
      // Calculate starting quantity based on click position
      const sliderRect = slider.getBoundingClientRect();
      const clickX = e.clientX - sliderRect.left;
      const sliderWidth = sliderRect.width;
      const clickPercentage = Math.max(0, Math.min(1, clickX / sliderWidth));
      const maxQuantity = 50;
      
      startQuantity = Math.round(clickPercentage * maxQuantity);
      
      // Update display immediately
      slider.dataset.quantity = startQuantity;
      quantityValue.textContent = startQuantity;
      updateSliderVisual(slider, startQuantity);
      overlayData.selectedSizes[size] = startQuantity;
      
      slider.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const sensitivity = 3; // pixels per quantity unit
      const newQuantity = Math.max(0, Math.min(50, startQuantity + Math.floor(deltaX / sensitivity)));
      
      slider.dataset.quantity = newQuantity;
      quantityValue.textContent = newQuantity;
      updateSliderVisual(slider, newQuantity);
      
      // Store in overlayData
      overlayData.selectedSizes[size] = newQuantity;
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        slider.style.cursor = 'pointer';
      }
    });
    
    // Initialize selected sizes
    if (currentQuantity > 0) {
      overlayData.selectedSizes[size] = currentQuantity;
      sizeItem.classList.add('selected');
    }
    
    sizesGrid.appendChild(sizeItem);
  });
}

// Update slider visual appearance
function updateSliderVisual(slider, quantity) {
  const maxQuantity = 50;
  const percentage = Math.min(100, (quantity / maxQuantity) * 100);
  slider.style.setProperty('--width', `${percentage}%`);
  
  // Inside updateSliderVisual
  const style = document.createElement('style');
  style.textContent = `
    .quantity-slider[data-quantity="${quantity}"]::before {
      width: ${percentage}%;
    }
  `;
  document.head.appendChild(style);
}

// Close overlay
function closeOverlay() {
  sizeOverlay.style.display = 'none';
  overlayData = {};
}

// Add selected items to orders
function addToOrders() {
  const hasSelections = Object.values(overlayData.selectedSizes).some(qty => qty > 0);
  const isEditingExistingOrder = orders.some(order => 
    order.type === overlayData.type &&
    order.variety === overlayData.variety &&
    order.colour === overlayData.color
  );
  
  // Allow proceeding if editing existing order (even with all 0s to remove it)
  // or if there are selections for new orders
  if (!hasSelections && !isEditingExistingOrder) {
    alert('Please select at least one size with quantity > 0');
    return;
  }
  
  // Process each selected size
  Object.entries(overlayData.selectedSizes).forEach(([size, quantity]) => {
    // Check if order already exists
    const existingOrderIndex = orders.findIndex(order => 
      order.type === overlayData.type &&
      order.variety === overlayData.variety &&
      order.colour === overlayData.color &&
      order.size === size
    );
    
    if (existingOrderIndex >= 0) {
      // Update existing order (including setting to 0)
      orders[existingOrderIndex].quantity = quantity;
    } else if (quantity > 0) {
      // Only create new order if quantity > 0
      orders.push({
        id: orders.length + 1,
        type: overlayData.type,
        variety: overlayData.variety,
        colour: overlayData.color,
        size: size,
        quantity: quantity,
        status: 'Pending',
        viewed: false
      });
    }
  });
  
  // Remove orders with 0 quantity
  orders = orders.filter(order => order.quantity > 0);
  
  renderOrders();
  closeOverlay();
  
  // Auto-save after any change
  autoSaveOrders();
}

// Update grand total display
function updateGrandTotal() {
  const grandTotalElement = document.getElementById('grand-total');
  if (!grandTotalElement) return;
  
  const totalQuantity = orders.reduce((total, order) => total + order.quantity, 0);
  grandTotalElement.textContent = `Total: ${totalQuantity}`;
}

// Render active orders
function renderOrders() {
  if (!ordersList) {
    console.error('Orders list element not found');
    return;
  }
  
  ordersList.innerHTML = '';
  
  // Update grand total
  updateGrandTotal();
  
  // Update submit button state
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = orders.length === 0;
  }
  
  if (orders.length === 0) {
    return; // No message when empty - just empty list
  }
  
  // Group orders by product type, variety, and color
  const groupedOrders = {};
  
  orders.forEach(order => {
    const key = `${order.type}-${order.variety}-${order.colour}`;
    if (!groupedOrders[key]) {
      groupedOrders[key] = {
        type: order.type,
        variety: order.variety,
        colour: order.colour,
        status: order.status,
        sizes: []
      };
    }
    groupedOrders[key].sizes.push({
      size: order.size,
      quantity: order.quantity
    });
  });
  
  // Sort orders alphabetically by type, then variety, then colour
  const sortedOrders = Object.values(groupedOrders).sort((a, b) => {
    // First sort by type
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    // Then by variety
    if (a.variety !== b.variety) {
      return a.variety.localeCompare(b.variety);
    }
    // Finally by colour
    return a.colour.localeCompare(b.colour);
  });
  
  // Render sorted orders
  sortedOrders.forEach(groupedOrder => {
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item';
    orderItem.style.cursor = 'pointer';
    
    // Add click handler to edit order
    orderItem.addEventListener('click', () => {
      editOrder(groupedOrder.type, groupedOrder.variety, groupedOrder.colour);
    });
    
    // Get image path based on product type
    let imageSrc = `Icons/${nameToFileName(groupedOrder.type)}.png`; // Default fallback
    
    if (groupedOrder.type === 'Jackets') {
      imageSrc = `Pictures/${groupedOrder.variety}.png`;
    } else if (groupedOrder.type === 'Shawls') {
      imageSrc = `Pictures/Shawl ${groupedOrder.variety}.png`;
    } else if (groupedOrder.type === 'House Socks') {
      imageSrc = `Pictures/House Socks - ${groupedOrder.variety}.png`;
    } else {
      // For all other product types
      imageSrc = `Pictures/${groupedOrder.variety}.png`;
    }
    
    // Create size/quantity display
    const sizesDisplay = groupedOrder.sizes
      .map(s => `<span class="size-letter">${s.size}</span>: ${s.quantity}`)
      .join(', ');
    
    // Calculate total quantity
    const totalQty = groupedOrder.sizes.reduce((total, s) => total + s.quantity, 0);
    
    // Get colour swatch filename
    const colourSwatchFileName = colourToSwatchFileName(groupedOrder.colour);
    
    orderItem.innerHTML = `
      <img src="${imageSrc}" alt="${groupedOrder.variety}" class="order-image" 
           onerror="this.src='Icons/${nameToFileName(groupedOrder.type)}.png'" 
           draggable="false">
      <div class="order-details">
        <div class="order-product-name">${groupedOrder.type} ${groupedOrder.variety}</div>
        <div class="order-colour">
          <div class="colour-swatch" style="background-image: url('Colours/${colourSwatchFileName}');" 
               onerror="this.style.backgroundColor='#ccc';"></div>
          <strong>Colour:</strong> ${groupedOrder.colour}
        </div>
        <div class="order-sizes"><strong>Sizes:</strong> ${sizesDisplay}</div>
        <div class="order-total"><strong>Total:</strong> ${totalQty}</div>
      </div>
      <div class="order-status status-${groupedOrder.status.toLowerCase()}">${groupedOrder.status}</div>
    `;
    
    ordersList.appendChild(orderItem);
  });
}

// Edit an existing order by clicking on it
function editOrder(orderType, orderVariety, orderColour) {
  // Find the product type index
  const typeIndex = productData.findIndex(type => type.type === orderType);
  if (typeIndex === -1) {
    console.error('Product type not found:', orderType);
    return;
  }
  
  // Find the variety index within the type
  const varietyIndex = productData[typeIndex].varieties.findIndex(variety => variety.name === orderVariety);
  if (varietyIndex === -1) {
    console.error('Variety not found:', orderVariety);
    return;
  }
  
  // Find the color index within the variety
  const colorIndex = productData[typeIndex].varieties[varietyIndex].colours.findIndex(color => color === orderColour);
  if (colorIndex === -1) {
    console.error('Color not found:', orderColour);
    return;
  }
  
  // Create drag data and open overlay
  const dragData = {
    type: typeIndex,
    variety: varietyIndex,
    color: colorIndex,
    isEdit: true
  };
  
  openSizeOverlay(dragData);
}

// Auto-save functionality
let autoSaveTimeout = null;

// Debounced auto-save function (waits 1 second after last change)
function autoSaveOrders() {
  // Clear any existing timeout
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  // Set new timeout
  autoSaveTimeout = setTimeout(async () => {
    try {
      const timestamp = firebase.firestore.Timestamp.now();

      // Always save, even if empty (to clear removed orders)
      let ordersWithTimestamp = [];
      
      if (orders.length > 0) {
        // Add timestamp to each order and mark as saved
        ordersWithTimestamp = orders.map(order => ({
          ...order,
          timestamp: timestamp,
          status: 'Saved'
        }));
      }

      // Get existing data
      const doc = await db.collection('orders').doc('mountKiwi').get();
      const existingData = doc.exists ? doc.data() : {};

      // Update the savedOrders array (even if empty)
      await db.collection('orders').doc('mountKiwi').set({
        ...existingData,
        savedOrders: ordersWithTimestamp
      });

      // Show subtle auto-save indicator
      showAutoSaveIndicator();

    } catch (err) {
      console.error("Error auto-saving orders:", err);
      showMessage("Auto-save failed ❌", "error");
    }
  }, 1000); // Wait 1 second after last change
}

// Show a subtle auto-save indicator
function showAutoSaveIndicator() {
  // Create or update the auto-save indicator
  let indicator = document.getElementById('auto-save-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'auto-save-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      z-index: 9999;
      background: rgba(81, 207, 102, 0.9);
      color: white;
      box-shadow: 0 2px 8px rgba(81, 207, 102, 0.3);
      transition: all 0.3s ease;
      opacity: 0;
    `;
    indicator.innerHTML = '💾 Auto-saved';
    document.body.appendChild(indicator);
  }
  
  // Show the indicator
  indicator.style.opacity = '1';
  
  // Hide after 2 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
  }, 2000);
}

// Submit orders (moves them to submitted and clears active orders)
async function submitOrders() {
  if (orders.length === 0) {
    alert("No orders to submit.");
    return;
  }

  // Confirm submission
  if (!confirm(`Submit ${orders.length} orders? This will move them to submitted orders and clear your active orders.`)) {
    return;
  }

  try {
    const timestamp = firebase.firestore.Timestamp.now();

    // Add timestamp and mark as submitted
    const ordersWithTimestamp = orders.map(order => ({
      ...order,
      timestamp: timestamp,
      status: 'Submitted',
      submittedAt: timestamp
    }));

    // Get existing data
    const doc = await db.collection('orders').doc('mountKiwi').get();
    const existingData = doc.exists ? doc.data() : {};
    const existingSubmitted = existingData.submittedOrders || [];

    // Add to submitted orders and clear saved orders
    await db.collection('orders').doc('mountKiwi').set({
      ...existingData,
      submittedOrders: [...existingSubmitted, ...ordersWithTimestamp],
      savedOrders: [] // Clear saved orders
    });

    // Clear active orders from interface
    orders = [];
    renderOrders();

    // Show success message
    showMessage(`${ordersWithTimestamp.length} orders submitted successfully! 🚀`, "success");

  } catch (err) {
    console.error("Error submitting orders:", err);
    showMessage("Failed to submit orders ❌", "error");
  }
}

// Submit orders (moves them to submitted and clears active orders)
async function submitOrders() {
  if (orders.length === 0) {
    alert("No orders to submit.");
    return;
  }

  // Confirm submission
  if (!confirm(`Submit ${orders.length} orders? This will move them to submitted orders and clear your active orders.`)) {
    return;
  }

  try {
    const timestamp = firebase.firestore.Timestamp.now();

    // Add timestamp and mark as submitted
    const ordersWithTimestamp = orders.map(order => ({
      ...order,
      timestamp: timestamp,
      status: 'Submitted',
      submittedAt: timestamp
    }));

    // Get existing data
    const doc = await db.collection('orders').doc('mountKiwi').get();
    const existingData = doc.exists ? doc.data() : {};
    const existingSubmitted = existingData.submittedOrders || [];

    // Add to submitted orders and clear saved orders
    await db.collection('orders').doc('mountKiwi').set({
      ...existingData,
      submittedOrders: [...existingSubmitted, ...ordersWithTimestamp],
      savedOrders: [] // Clear saved orders
    });

    // Clear active orders from interface
    orders = [];
    renderOrders();

    // Show success message
    showMessage(`${ordersWithTimestamp.length} orders submitted successfully! 🚀`, "success");

  } catch (err) {
    console.error("Error submitting orders:", err);
    showMessage("Failed to submit orders ❌", "error");
  }
}

// Utility function to show messages
function showMessage(message, type) {
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    ${type === 'success' ? 
      'background: linear-gradient(45deg, #51cf66, #40c057); color: white;' : 
      'background: linear-gradient(45deg, #ff6b6b, #ee5a52); color: white;'
    }
  `;
  messageEl.textContent = message;
  
  document.body.appendChild(messageEl);
  
  // Remove after 3 seconds
  setTimeout(() => {
    messageEl.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => messageEl.remove(), 300);
  }, 3000);
}

// Set active state based on current page
function setActiveButton() {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    const href = btn.getAttribute('href');
    if (href && href === currentPage) {
      btn.classList.add('active');
    }
  });
}

// Setup navigation button handlers
function setupNavigationHandlers() {
  // Handle disabled button clicks
  document.querySelectorAll('.nav-btn.disabled').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('This feature is coming soon!');
    });
  });
}

// Make functions globally available
window.submitOrders = submitOrders;
window.closeOverlay = closeOverlay;
window.addToOrders = addToOrders;

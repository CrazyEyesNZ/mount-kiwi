// js/render-products.js

import { colourToPictureFileName, varietyToPictureFileName } from "./utils.js";
import { getSectionTotals, setProductMetadata, removeFromOrderMultiple, getCurrentOrder } from "./order-service.js";

// Global variables to store product data
let globalProductSizes = {};

/**
 * Add or remove highlighting for inputs with values above 0
 */
function updateInputHighlighting(input) {
  const value = parseInt(input.value) || 0;
  if (value > 0) {
    input.classList.add('has-value');
  } else {
    input.classList.remove('has-value');
  }
}

/**
 * Recalculate section totals
 */
function recalcSectionTotals(productId) {
  const section = document.querySelector(`[data-product-id="${productId}"]`);
  if (!section) return;
  const sizes = globalProductSizes[productId];
  if (!sizes) return;
  
  const totals = sizes.reduce((acc, sz) => (acc[sz] = 0, acc), {});
  section.querySelectorAll('.size-input').forEach(inp => {
    const sz = inp.dataset.size;
    totals[sz] = (totals[sz] || 0) + (parseInt(inp.value) || 0);
  });
  sizes.forEach(sz => {
    const cell = section.querySelector(`.totals-row div[data-size="${sz}"]`);
    if (cell) cell.textContent = totals[sz];
  });
}

/**
 * Load saved quantities from localStorage and populate input fields
 */
function loadSavedQuantities() {
  const savedOrder = getCurrentOrder(); // ← per-order draft now
  const updatedSections = new Set();

  for (const [key, qty] of Object.entries(savedOrder)) {
    const [productId, variety, colour, size] = key.split("|");
    
    // Find the corresponding input field
    const section = document.querySelector(`[data-product-id="${productId}"]`);
    if (!section) continue;
    
    // Find the row that matches this variety and colour
    const rows = section.querySelectorAll('.colour-row');
    for (const row of rows) {
      const varietyEl = row.querySelector('.variety-name');
      const colourEl = row.querySelector('.colour-text');
      
      if (!varietyEl || !colourEl) continue;
      
      const rowVariety = varietyEl.textContent.trim();
      const rowColour = colourEl.textContent.trim();
      
      if (rowVariety === variety && rowColour === colour) {
        // Find the input for this size
        const input = row.querySelector(`input[data-size="${size}"]`);
        if (input) {
          input.value = qty;
          // Add highlighting to loaded values
          updateInputHighlighting(input);
          updatedSections.add(productId);
        }
        break;
      }
    }
  }
  
  // Recalculate totals for sections that had saved quantities
  updatedSections.forEach(productId => {
    recalcSectionTotals(productId);
  });
}

/**
 * Render the full product catalog into the #productPanel container
 * @param {Array<Object>} products - array of product objects from Firestore
 */
export function renderProducts(products) {
  const panel = document.getElementById("productPanel");
  panel.innerHTML = "";

  const productSizes = {};
  const metadata = {};

  products.forEach((product) => {
    // Store product metadata for order service
    metadata[product.id] = product;
    
    const section = document.createElement("div");
    section.classList.add("product-section");
    section.id = product.id;
    section.dataset.productId = product.id;
    section.dataset.sectionId = product.id;

    const rawSizes = (product.sizes && product.sizes.length)
      ? product.sizes
      : (product.varieties && product.varieties.length && product.varieties[0].sizes)
        ? product.varieties[0].sizes
        : [];

    const sizes = rawSizes.length ? rawSizes : ["One Size"];
    productSizes[product.id] = sizes;

    // Aligned grid columns - both header and data rows use the same layout
    const dataRowCols = [
      '50px',    // Picture/Icon (reduced from 60px for smaller 40px images)
      '120px',   // Variety name/Title part 1
      '35px',    // Swatch/Title part 2 (reduced from 32px for smaller 25px swatches)
      '80px',    // Colour text/Title part 3
      ...sizes.map(() => '60px')
    ].join(' ');

    // Header uses the same column structure as data rows for alignment
    const headerCols = dataRowCols;

    // Section header
    const header = document.createElement("div");
    header.classList.add("section-header");
    header.style.gridTemplateColumns = headerCols;

    const icon = document.createElement("img");
    icon.classList.add("icon");
    const iconName = product.id.replace(/\s+/g, '');
    icon.src = `assets/icons/${iconName}.png`;
    icon.alt = product.name;

    // Split the title and product type - position product type to the right of icon
    const titleContainer = document.createElement("div");
    titleContainer.style.gridColumn = "2 / 5"; // Span across columns 2-4
    titleContainer.style.display = "flex";
    titleContainer.style.flexDirection = "column";
    titleContainer.style.justifyContent = "center";
    titleContainer.style.alignItems = "flex-start"; // Left align

    const titlePart1 = document.createElement("div");
    titlePart1.classList.add("title");
    titlePart1.textContent = product.name;
    titlePart1.style.fontSize = "1rem";
    titlePart1.style.fontWeight = "600";
    titlePart1.style.lineHeight = "1.2";

    const titlePart2 = document.createElement("div");
    titlePart2.classList.add("product-type");
    titlePart2.textContent = product.type || product.productType || "";
    titlePart2.style.fontSize = "0.85rem";
    titlePart2.style.fontWeight = "400";
    titlePart2.style.opacity = "0.9";
    titlePart2.style.lineHeight = "1";

    titleContainer.append(titlePart1, titlePart2);

    header.append(icon, titleContainer);

    // Size headers
    sizes.forEach((sz) => {
      const lbl = document.createElement("div");
      lbl.classList.add("size-label");
      lbl.textContent = sz;
      lbl.style.textAlign = "center";
      lbl.style.fontSize = "0.9rem";
      lbl.style.fontWeight = "500";
      header.append(lbl);
    });

    section.append(header);

    // Rows
    const varieties = product.varieties || [];
    varieties.forEach((variety) => {
      (variety.colours || []).forEach((colourName) => {
        const row = document.createElement("div");
        row.classList.add("colour-row");
        row.style.gridTemplateColumns = dataRowCols;

        const productPicture = document.createElement("img");
        productPicture.classList.add("product-picture");

        let pictureFileName = varietyToPictureFileName(product.id, variety.name, colourName);
        productPicture.src = `assets/pictures/${pictureFileName}`;
        productPicture.alt = variety.name;

        let fallbackAttempt = 0;
        productPicture.onerror = function () {
          fallbackAttempt++;

          if (fallbackAttempt === 1) {
            // Show tooltip for missing image
            const tooltip = document.createElement("div");
            tooltip.className = "image-tooltip";
            tooltip.textContent = `Missing: ${pictureFileName}`;
            tooltip.style.position = "absolute";
            tooltip.style.background = "#c0392b";
            tooltip.style.color = "white";
            tooltip.style.padding = "4px 8px";
            tooltip.style.fontSize = "0.75rem";
            tooltip.style.borderRadius = "4px";
            tooltip.style.top = "100%";
            tooltip.style.left = "50%";
            tooltip.style.transform = "translateX(-50%)";
            tooltip.style.whiteSpace = "nowrap";
            tooltip.style.zIndex = "10";
            tooltip.style.display = "none";

            const container = productPicture.parentElement;
            container.style.position = "relative";
            container.appendChild(tooltip);

            productPicture.addEventListener("mouseenter", () => {
              tooltip.style.display = "block";
            });
            productPicture.addEventListener("mouseleave", () => {
              tooltip.style.display = "none";
            });

            pictureFileName = varietyToPictureFileName(product.id, variety.name, null);
            this.src = `assets/pictures/${pictureFileName}`;
            return;
          }

          if (fallbackAttempt === 2) {
            const iconName = product.id.replace(/\s+/g, '');
            this.src = `assets/icons/${iconName}.png`;
            this.alt = product.name + " icon";
            this.onerror = null;
          }
        };

        const nameEl = document.createElement("div");
        nameEl.classList.add("variety-name");
        nameEl.textContent = variety.name;

        const swatch = document.createElement("img");
        swatch.classList.add("colour-swatch");
        swatch.src = `assets/colours/${colourToPictureFileName(colourName)}`;
        swatch.alt = colourName;

        const colourText = document.createElement("div");
        colourText.classList.add("colour-text");
        colourText.textContent = colourName;

        row.append(productPicture, nameEl, swatch, colourText);

        sizes.forEach((sz) => {
          const input = document.createElement("input");
          input.type = "number";
          input.classList.add("size-input");
          input.value = 0;
          input.min = 0;
          input.dataset.size = sz;
          
          // Add event listeners for highlighting and totals
          input.addEventListener('input', () => {
            updateInputHighlighting(input); // Add highlighting
            recalcSectionTotals(product.id);
          });
          
          // Also check on blur to handle manual typing
          input.addEventListener('blur', () => {
            updateInputHighlighting(input);
          });
          
          row.append(input);
        });

        section.append(row);
      });
    });

    // Totals row
    const totalsRow = document.createElement("div");
    totalsRow.classList.add("totals-row");
    totalsRow.style.gridTemplateColumns = dataRowCols;

    // Empty cells before size totals to maintain alignment
    totalsRow.appendChild(document.createElement("div")); // Picture column
    totalsRow.appendChild(document.createElement("div")); // Name column
    totalsRow.appendChild(document.createElement("div")); // Swatch column
    
    const label = document.createElement("div");
    label.classList.add("label");
    label.textContent = "Totals";
    totalsRow.append(label);

    sizes.forEach((sz) => {
      const cell = document.createElement("div");
      cell.dataset.size = sz;
      cell.textContent = 0;
      cell.style.textAlign = "center"; // Center the totals
      totalsRow.append(cell);
    });

    section.append(totalsRow);
    panel.append(section);
  });

  // Store globally accessible reference
  globalProductSizes = productSizes;

  // Pass product metadata to order service
  setProductMetadata(metadata, products);

  // Load saved quantities from localStorage and populate input fields
  loadSavedQuantities();

  document.addEventListener('orderUpdated', () => {
    products.forEach(p => recalcSectionTotals(p.id));
  });
}
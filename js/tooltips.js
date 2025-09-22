// js/tooltips.js

import { historyData } from "./data-service.js";

/**
 * Attach hover tooltips to each size input based on historical data
 */
export function attachHistoryTooltips() {
  document.querySelectorAll(".size-input[data-key]").forEach((input) => {
    const key = input.dataset.key;
    if (!key) return;

    // Try exact and lowercase key variants
    const record = historyData[key] || historyData[key.toLowerCase()];
    if (!record) return;

    // Create tooltip element
    const tooltip = document.createElement("div");
    tooltip.className = "history-tooltip";
    const date = record.date || record.Date || record.DATE || "";
    const qty = record.quantity || record.Quantity || record.qty || "";
    tooltip.textContent = qty && date
      ? `Last ordered: ${qty} on ${formatDate(date)}`
      : JSON.stringify(record);

    // Positioning - attach to input's parent row for better positioning
    const row = input.closest('.colour-row');
    if (!row) return;
    
    row.style.position = "relative";
    tooltip.style.display = "none";
    tooltip.style.position = "absolute";
    tooltip.style.top = "-35px"; // Above the row
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.padding = "6px 10px";
    tooltip.style.background = "var(--secondary)";
    tooltip.style.color = "white";
    tooltip.style.border = "1px solid var(--accent)";
    tooltip.style.borderRadius = "4px";
    tooltip.style.zIndex = "100";
    tooltip.style.fontSize = "0.75rem";
    tooltip.style.whiteSpace = "nowrap";
    tooltip.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    
    // Add arrow pointing down
    const arrow = document.createElement("div");
    arrow.style.position = "absolute";
    arrow.style.top = "100%";
    arrow.style.left = "50%";
    arrow.style.transform = "translateX(-50%)";
    arrow.style.width = "0";
    arrow.style.height = "0";
    arrow.style.borderLeft = "5px solid transparent";
    arrow.style.borderRight = "5px solid transparent";
    arrow.style.borderTop = "5px solid var(--secondary)";
    tooltip.appendChild(arrow);

    row.appendChild(tooltip);

    // Show/hide on input hover (more precise than row hover)
    input.addEventListener("mouseenter", () => {
      tooltip.style.display = "block";
    });
    input.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
    
    // Also show on input focus for accessibility
    input.addEventListener("focus", () => {
      tooltip.style.display = "block";
    });
    input.addEventListener("blur", () => {
      tooltip.style.display = "none";
    });
  });
}

/**
 * Format ISO date strings to local date
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}
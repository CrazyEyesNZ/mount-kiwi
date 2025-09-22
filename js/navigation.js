// js/navigation.js

// Tracks whether a scroll was initiated programmatically (via nav click)
let isProgrammaticScroll = false;
let scrollTimeout = null;

/**
 * Build sidebar navigation icons based on product sections
 * @param {Array} products - array of product objects with `id` and `name`
 */
export function buildNavigation(products) {
  const nav = document.getElementById("productNavigation");
  nav.innerHTML = "";

  products.forEach((prod) => {
    const btn = document.createElement("button");
    btn.classList.add("nav-icon");
    btn.setAttribute("aria-label", prod.name || prod.id); // This is used for the tooltip
    btn.dataset.target = prod.id;
    btn.title = prod.name || prod.id; // Fallback browser tooltip

    // Use image icon like the original implementation
    const img = document.createElement("img");
    const iconName = prod.id.replace(/\s+/g, '');
    img.src = `assets/icons/${iconName}.png`;
    img.alt = prod.name || prod.id;
    btn.appendChild(img);

    // Scroll to section on click
    btn.addEventListener("click", () => {
      const targetEl = document.getElementById(prod.id);
      if (!targetEl) {
        console.warn(`Navigation target not found: ${prod.id}`);
        return;
      }

      isProgrammaticScroll = true;
      
      // Scroll the product panel to show the target section
      const productPanel = document.getElementById("productPanel");
      if (productPanel) {
        const panelRect = productPanel.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const scrollTop = productPanel.scrollTop + targetRect.top - panelRect.top - 10; // 10px offset
        
        productPanel.scrollTo({
          top: scrollTop,
          behavior: "smooth"
        });
      } else {
        // Fallback to basic scrollIntoView
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      
      // Update active state immediately
      document.querySelectorAll(".nav-icon").forEach((navBtn) => {
        navBtn.classList.remove("active");
      });
      btn.classList.add("active");
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isProgrammaticScroll = false;
      }, 800);
    });

    nav.appendChild(btn);
  });
}

/**
 * Watch manual scroll events to update active nav icon
 */
export function initScrollTracking() {
  const panel = document.getElementById("productPanel");
  if (!panel) return;

  panel.addEventListener("scroll", () => {
    if (isProgrammaticScroll) return;

    const sections = panel.querySelectorAll("[data-section-id]");
    let activeId = null;
    const panelRect = panel.getBoundingClientRect();
    const scrollTop = panel.scrollTop;

    // Find the section that's currently most visible at the top
    for (const sec of sections) {
      const rect = sec.getBoundingClientRect();
      const sectionTop = scrollTop + rect.top - panelRect.top;
      
      // If this section's top is within a reasonable range of the scroll position
      if (sectionTop <= scrollTop + 50) {
        activeId = sec.dataset.sectionId;
      } else {
        break;
      }
    }

    if (activeId) {
      document.querySelectorAll(".nav-icon").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.target === activeId);
      });
    }
  });
}
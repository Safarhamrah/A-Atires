const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const bookingForm = document.getElementById("bookingForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");

let heroInventoryForm;
let heroInventoryInput;
let inventorySearchForm;
let inventorySearchInput;
let inventoryStatus;
let inventoryResults;
let inventorySection;
let bookInventoryMatch;
let inventoryFrame;
let loadInventoryFrame;

const fallbackInventory = [
  { sku: "SKU-1001", brand: "Michelin", tireSize: "205/55R16", quantity: 24, location: "Downtown Office", alert: "OK" },
  { sku: "SKU-1002", brand: "Bridgestone", tireSize: "225/45R17", quantity: 8, location: "Warehouse North", alert: "Low Stock" },
  { sku: "SKU-1003", brand: "Goodyear", tireSize: "195/65R15", quantity: 15, location: "Westside Branch", alert: "OK" },
  { sku: "SKU-1004", brand: "Pirelli", tireSize: "215/60R16", quantity: 5, location: "Eastside Hub", alert: "Low Stock" },
  { sku: "SKU-1005", brand: "Continental", tireSize: "235/40R18", quantity: 30, location: "South Distribution Center", alert: "OK" },
  { sku: "SKU-1006", brand: "Hankook", tireSize: "185/60R15", quantity: 12, location: "Tech Campus", alert: "OK" },
  { sku: "SKU-1007", brand: "Yokohama", tireSize: "225/50R17", quantity: 6, location: "Retail Store - Midtown", alert: "Low Stock" },
  { sku: "SKU-1008", brand: "Dunlop", tireSize: "245/45R18", quantity: 18, location: "Customer Service Center", alert: "OK" },
  { sku: "SKU-1009", brand: "Falken", tireSize: "215/55R17", quantity: 9, location: "Logistics HQ", alert: "Low Stock" },
  { sku: "SKU-1010", brand: "Kumho", tireSize: "205/60R16", quantity: 20, location: "Training Facility", alert: "OK" },
  { sku: "SKU-1011", brand: "Firestone", tireSize: "195/60R15", quantity: 7, location: "Regional Office - Atlanta", alert: "Low Stock" },
  { sku: "SKU-1012", brand: "Nexen", tireSize: "225/65R17", quantity: 14, location: "Production Plant", alert: "OK" },
  { sku: "SKU-1013", brand: "Toyo", tireSize: "215/50R17", quantity: 11, location: "R&D Center", alert: "OK" },
  { sku: "SKU-1014", brand: "BFGoodrich", tireSize: "235/55R18", quantity: 4, location: "Satellite Office - Denver", alert: "Low Stock" },
  { sku: "SKU-1015", brand: "General Tire", tireSize: "205/70R15", quantity: 16, location: "Call Center - Phoenix", alert: "OK" },
];

let inventoryRecords = [];
let inventorySource = "preview";
let activeInventoryQuery = "";

if (year) {
  year.textContent = new Date().getFullYear();
}

function injectInventoryStyles() {
  if (document.getElementById("inventoryDynamicStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "inventoryDynamicStyles";
  style.textContent = `
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .has-inventory-search .hero-grid{grid-template-columns:1fr;justify-items:center;text-align:center;gap:28px;padding-block:66px 46px}
    .has-inventory-search .hero-copy{width:min(980px,100%)}
    .has-inventory-search .hero-copy h1,.has-inventory-search .hero-copy p{margin-left:auto;margin-right:auto}
    .has-inventory-search .hero-copy p{margin-top:26px}
    .has-inventory-search .hero-actions,.has-inventory-search .hero-phone{justify-content:center}
    .has-inventory-search .trust-panel{grid-template-columns:repeat(3,minmax(0,1fr));width:min(880px,100%);align-self:auto}
    .inventory-search{width:100%}
    .hero-search{max-width:880px;margin:34px auto 0}
    .search-shell{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;min-height:68px;padding:8px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#fff;box-shadow:0 24px 55px rgba(0,0,0,.28)}
    .search-shell svg{width:24px;height:24px;margin-left:18px;fill:none;stroke:#09182d;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
    .search-shell input{width:100%;min-height:52px;padding:0;border:0;border-radius:0;background:#fff;color:#06101f;font-size:clamp(1rem,2vw,1.18rem);font-weight:700;outline:none;box-shadow:none}
    .search-shell input:focus{border:0;box-shadow:none}
    .search-shell button{min-height:52px;padding:0 24px;border:0;border-radius:999px;background:#f7c600;color:#06101f;font-size:.95rem;font-weight:900;cursor:pointer}
    .search-examples{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}
    .search-examples button{min-height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(255,255,255,.09);color:rgba(255,255,255,.84);font-size:.82rem;font-weight:800;cursor:pointer}
    .inventory-section{background:#f3f6fa;padding:92px 0}
    .inventory-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:24px;margin-bottom:26px}
    .inventory-head .section-heading{margin-bottom:0}
    .inventory-search-panel{margin-bottom:20px}
    .inventory-search-panel .search-shell{border-color:#dce3eb;box-shadow:0 18px 42px rgba(9,24,45,.1)}
    .inventory-results-top{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:12px 0 20px}
    .inventory-status{margin:0;color:#5e6875;font-weight:800}
    .inventory-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
    .inventory-actions .btn{min-height:44px;padding-inline:16px;font-size:.86rem}
    .inventory-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
    .inventory-card,.inventory-empty{min-width:0;padding:22px;border:1px solid #dce3eb;border-radius:8px;background:#fff;box-shadow:0 14px 35px rgba(9,24,45,.08)}
    .inventory-card h3,.inventory-empty h3{margin:0;color:#06101f;font-size:1.22rem;line-height:1.2}
    .inventory-card-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .inventory-pill{display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;background:#f3f6fa;color:#0d2442;font-size:.78rem;font-weight:900}
    .inventory-pill.is-low{background:rgba(247,198,0,.18);color:#7a5700}
    .inventory-pill.is-ok{background:rgba(26,136,73,.12);color:#146b3a}
    .inventory-stock{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin-top:18px;padding:14px;border-radius:8px;background:#06101f;color:#fff}
    .inventory-stock span{color:rgba(255,255,255,.7);font-size:.78rem;font-weight:900;text-transform:uppercase}
    .inventory-stock strong{color:#ffd83d;font-size:1.5rem;line-height:1}
    .inventory-detail{margin:14px 0 0;color:#5e6875;font-size:.93rem;font-weight:700;line-height:1.45}
    .inventory-card-actions{display:flex;gap:10px;margin-top:18px}
    .inventory-card-actions .btn{min-height:42px;flex:1;padding-inline:12px;font-size:.82rem}
    .inventory-empty{grid-column:1/-1;display:grid;gap:14px}
    .inventory-empty p{max-width:760px;margin:0;color:#5e6875;font-weight:700}
    .inventory-live-view{display:grid;gap:18px;margin-top:28px;padding:24px;border:1px solid #dce3eb;border-radius:8px;background:#fff;box-shadow:0 22px 55px rgba(6,16,31,.16)}
    .inventory-live-view h3{margin:0;color:#06101f;font-size:1.25rem}
    .inventory-live-view p{margin:4px 0 0;color:#5e6875;font-weight:700}
    .inventory-frame-load{width:fit-content}
    .inventory-live-view iframe{width:100%;min-height:540px;border:1px solid #dce3eb;border-radius:8px;background:#fff}
    .inventory-live-view iframe[hidden]{display:none}
    .footer-grid{grid-template-columns:1fr auto auto auto}
    .footer-credit{text-align:right}
    .site-footer .footer-credit a{display:inline;color:#f7c600}
    @media (max-width:980px){.has-inventory-search .trust-panel{max-width:760px}.inventory-head{grid-template-columns:1fr}.inventory-results{grid-template-columns:repeat(2,minmax(0,1fr))}.inventory-results-top{align-items:flex-start;flex-direction:column}.inventory-actions{justify-content:flex-start}}
    @media (max-width:680px){.has-inventory-search .hero-grid{padding-block:36px 24px;gap:18px}.has-inventory-search .hero-copy h1{font-size:clamp(1.95rem,9vw,2.55rem)}.has-inventory-search .hero-copy p{margin-top:18px;font-size:1rem}.hero-search{margin-top:22px}.search-shell{grid-template-columns:auto minmax(0,1fr);gap:10px;min-height:auto;padding:10px;border-radius:18px}.search-shell svg{width:21px;height:21px;margin-left:8px}.search-shell input{min-height:46px;font-size:1rem}.search-shell button{grid-column:1/-1;width:100%;min-height:48px}.search-examples{display:none}.has-inventory-search .hero-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:22px}.has-inventory-search .hero-actions .btn:nth-child(3){grid-column:1/-1}.has-inventory-search .trust-panel{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:6px}.has-inventory-search .trust-badge{padding:10px 8px;border-left-width:3px}.has-inventory-search .trust-badge span{font-size:.62rem;line-height:1.15}.has-inventory-search .trust-badge strong{font-size:.82rem}.inventory-section{padding:64px 0}.inventory-results{grid-template-columns:1fr}.inventory-head{align-items:stretch}.inventory-head .btn,.inventory-frame-load,.inventory-actions,.inventory-card-actions{width:100%}.inventory-actions,.inventory-card-actions{flex-direction:column}.inventory-live-view{padding:16px}.inventory-live-view iframe{min-height:420px}.footer-grid{grid-template-columns:1fr}.footer-credit{text-align:left}}
  `;
  document.head.appendChild(style);
}

function injectFooterCredit() {
  const footerGrid = document.querySelector(".footer-grid");
  if (!footerGrid || footerGrid.querySelector(".footer-credit")) {
    return;
  }

  const credit = document.createElement("p");
  credit.className = "footer-credit";
  credit.innerHTML =
    'Designed and created by <a href="https://noahtech.ca" target="_blank" rel="noopener noreferrer">Noah Tech</a>';
  footerGrid.appendChild(credit);
}

function inventorySearchMarkup(formId, inputId, placeholder, buttonText, withChips = false) {
  return `
    <form class="inventory-search ${formId === "heroInventorySearch" ? "hero-search" : "inventory-search-panel"}" id="${formId}" role="search" aria-label="Search tire availability">
      <label class="sr-only" for="${inputId}">Search tire availability</label>
      <div class="search-shell">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35" /><circle cx="11" cy="11" r="7" /></svg>
        <input id="${inputId}" type="search" autocomplete="off" placeholder="${placeholder}" />
        <button type="submit">${buttonText}</button>
      </div>
      ${withChips ? '<div class="search-examples" aria-label="Example searches"><button type="button" data-search-chip="225/65R17">225/65R17</button><button type="button" data-search-chip="Michelin">Michelin</button><button type="button" data-search-chip="SKU-1001">SKU-1001</button></div>' : ""}
    </form>
  `;
}

function injectInventoryUi() {
  document.body.classList.add("has-inventory-search");
  injectInventoryStyles();

  if (nav && !nav.querySelector('a[href="#inventory"]')) {
    const link = document.createElement("a");
    link.href = "#inventory";
    link.textContent = "Inventory";
    const servicesLink = nav.querySelector('a[href="#services"]');
    if (servicesLink) {
      servicesLink.insertAdjacentElement("afterend", link);
    } else {
      nav.prepend(link);
    }
  }

  const heroCopy = document.querySelector(".hero-copy");
  if (heroCopy && !document.getElementById("heroInventorySearch")) {
    const intro = heroCopy.querySelector("p") || heroCopy.querySelector("h1");
    intro?.insertAdjacentHTML(
      "afterend",
      inventorySearchMarkup("heroInventorySearch", "heroInventoryInput", "Search tire size, brand, or SKU", "Search Inventory", true)
    );
  }

  const heroActions = document.querySelector(".hero-actions");
  if (heroActions && !heroActions.querySelector('a[href="#inventory"]')) {
    const viewInventory = document.createElement("a");
    viewInventory.className = "btn btn-secondary";
    viewInventory.href = "#inventory";
    viewInventory.textContent = "View Inventory";
    heroActions.appendChild(viewInventory);
  }

  if (!document.getElementById("inventory")) {
    const section = document.createElement("section");
    section.className = "section inventory-section";
    section.id = "inventory";
    section.setAttribute("aria-labelledby", "inventory-title");
    section.innerHTML = `
      <div class="container">
        <div class="inventory-head">
          <div class="section-heading">
            <h2 id="inventory-title">Search Tire Availability</h2>
            <p>Find matching tire sizes, brands, SKUs, and current stock from the connected A&amp;A Tires inventory.</p>
          </div>
          <a class="btn btn-dark" href="https://airtable.com/appejU4ScV5Gi8rMt/shrH4e4r8hqGDZc4D" target="_blank" rel="noopener noreferrer">Open Full Inventory</a>
        </div>
        ${inventorySearchMarkup("inventorySearchForm", "inventorySearchInput", "Try 225/65R17, Bridgestone, or SKU-1012", "Check Stock")}
        <div class="inventory-results-top">
          <p class="inventory-status" id="inventoryStatus" role="status" aria-live="polite">Loading tire inventory...</p>
          <div class="inventory-actions">
            <a class="btn btn-primary" href="#booking" id="bookInventoryMatch">Book Matching Tire</a>
            <a class="btn btn-outline" href="tel:+14035980258">Call to Confirm</a>
          </div>
        </div>
        <div class="inventory-results" id="inventoryResults" aria-live="polite"></div>
        <div class="inventory-live-view">
          <div>
            <h3>Connected Airtable Inventory</h3>
            <p>Live stock table for A&amp;A Tires inventory management.</p>
          </div>
          <button class="btn btn-outline inventory-frame-load" id="loadInventoryFrame" type="button">Load Airtable Table</button>
          <iframe id="inventoryFrame" title="A&A Tires Airtable inventory" loading="lazy" data-src="https://airtable.com/embed/appejU4ScV5Gi8rMt/shrH4e4r8hqGDZc4D/tbl1Uo93RVAf8bNMt/viwAsp3nyG1Tfrv1U?viewControls=on" hidden></iframe>
        </div>
      </div>
    `;
    const quickStrip = document.querySelector(".quick-strip");
    if (quickStrip) {
      quickStrip.insertAdjacentElement("afterend", section);
    } else {
      document.querySelector("main")?.prepend(section);
    }
  }
}

function refreshInventoryElements() {
  heroInventoryForm = document.getElementById("heroInventorySearch");
  heroInventoryInput = document.getElementById("heroInventoryInput");
  inventorySearchForm = document.getElementById("inventorySearchForm");
  inventorySearchInput = document.getElementById("inventorySearchInput");
  inventoryStatus = document.getElementById("inventoryStatus");
  inventoryResults = document.getElementById("inventoryResults");
  inventorySection = document.getElementById("inventory");
  bookInventoryMatch = document.getElementById("bookInventoryMatch");
  inventoryFrame = document.getElementById("inventoryFrame");
  loadInventoryFrame = document.getElementById("loadInventoryFrame");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compactSearch(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeInventoryRecord(record) {
  return {
    id: record.id || record.sku || record.SKU || "",
    sku: record.sku || record.SKU || "",
    brand: record.brand || record.Brand || "",
    tireSize: record.tireSize || record["Tire Size"] || "",
    quantity: Number(record.quantity ?? record["Current Stock Quantity"] ?? 0),
    location: record.location || record.Location || "",
    alert: record.alert || record["Low Stock Alert"] || "",
    supplier: record.supplier || record.Supplier || "",
  };
}

function recordMatches(record, query) {
  const needle = compactSearch(query);
  const haystack = compactSearch([record.sku, record.brand, record.tireSize, record.quantity, record.location, record.alert, record.supplier].join(" "));
  return haystack.includes(needle);
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function syncInventoryInputs(query) {
  if (heroInventoryInput) heroInventoryInput.value = query;
  if (inventorySearchInput) inventorySearchInput.value = query;
}

function getInventoryMatches(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return inventoryRecords.slice(0, 6);
  return inventoryRecords.filter((record) => recordMatches(record, trimmedQuery));
}

function renderInventory(query = "") {
  if (!inventoryResults || !inventoryStatus) return;

  const trimmedQuery = query.trim();
  const matches = getInventoryMatches(trimmedQuery);
  const sourceLabel = inventorySource === "airtable" ? "live Airtable inventory" : "inventory preview";
  activeInventoryQuery = trimmedQuery;

  if (!inventoryRecords.length) {
    inventoryStatus.textContent = "Inventory is loading. You can still call the shop to confirm stock.";
    inventoryResults.innerHTML = "";
    return;
  }

  inventoryStatus.textContent = trimmedQuery
    ? `${pluralize(matches.length, "match")} for "${trimmedQuery}" from ${sourceLabel}.`
    : `Showing ${pluralize(Math.min(matches.length, inventoryRecords.length), "featured tire")} from ${sourceLabel}.`;

  if (!matches.length) {
    inventoryResults.innerHTML = `
      <div class="inventory-empty">
        <h3>No exact match found</h3>
        <p>Call A&amp;A TIRES LTD or request a booking and the shop can confirm nearby sizes, alternatives, or incoming stock.</p>
        <div class="inventory-card-actions">
          <a class="btn btn-primary" href="tel:+14035980258">Call Now</a>
          <a class="btn btn-outline" href="#booking" data-inventory-book data-inventory-summary="Customer searched inventory for: ${escapeHtml(trimmedQuery)}">Request Help</a>
        </div>
      </div>
    `;
    return;
  }

  inventoryResults.innerHTML = matches
    .slice(0, 9)
    .map((record) => {
      const isLow = String(record.alert).toLowerCase().includes("low");
      const summary = `${record.brand} ${record.tireSize} (${record.sku}) - ${record.quantity} in stock`;
      return `
        <article class="inventory-card">
          <h3>${escapeHtml(record.brand)} ${escapeHtml(record.tireSize)}</h3>
          <div class="inventory-card-meta">
            <span class="inventory-pill">${escapeHtml(record.sku)}</span>
            <span class="inventory-pill ${isLow ? "is-low" : "is-ok"}">${escapeHtml(record.alert || "Available")}</span>
          </div>
          <div class="inventory-stock"><span>Current stock</span><strong>${escapeHtml(record.quantity)}</strong></div>
          <p class="inventory-detail">${escapeHtml(record.location || "A&A Tires inventory")}</p>
          <div class="inventory-card-actions">
            <a class="btn btn-primary" href="#booking" data-inventory-book data-inventory-size="${escapeHtml(record.tireSize)}" data-inventory-summary="${escapeHtml(summary)}">Book</a>
            <a class="btn btn-outline" href="tel:+14035980258">Call</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function runInventorySearch(query, shouldScroll = false) {
  const cleanQuery = query.trim();
  syncInventoryInputs(cleanQuery);
  renderInventory(cleanQuery);
  if (shouldScroll && inventorySection) {
    inventorySection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadInventory() {
  try {
    const response = await fetch("/api/inventory", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Inventory API unavailable");
    const payload = await response.json();
    inventoryRecords = (payload.records || []).map(normalizeInventoryRecord);
    inventorySource = payload.source === "airtable" ? "airtable" : "preview";
  } catch (error) {
    inventoryRecords = fallbackInventory.map(normalizeInventoryRecord);
    inventorySource = "preview";
  }
  renderInventory(activeInventoryQuery);
}

function fillBookingFromInventory(summary, tireSize = "") {
  if (!bookingForm) return;

  const tireSizeInput = bookingForm.querySelector('[name="tireSize"]');
  const serviceSelect = bookingForm.querySelector('[name="service"]');
  const notesInput = bookingForm.querySelector('[name="notes"]');

  if (tireSizeInput instanceof HTMLInputElement && tireSize) tireSizeInput.value = tireSize;
  if (serviceSelect instanceof HTMLSelectElement) serviceSelect.value = "New tires";
  if (notesInput instanceof HTMLTextAreaElement) notesInput.value = `Inventory inquiry: ${summary}`;
}

function bindInventoryEvents() {
  heroInventoryForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    runInventorySearch(heroInventoryInput?.value || "", true);
  });

  inventorySearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    runInventorySearch(inventorySearchInput?.value || "", true);
  });

  document.querySelectorAll("[data-search-chip]").forEach((chip) => {
    chip.addEventListener("click", () => runInventorySearch(chip.getAttribute("data-search-chip") || "", true));
  });

  document.addEventListener("click", (event) => {
    const bookingLink = event.target instanceof Element ? event.target.closest("[data-inventory-book]") : null;
    if (!bookingLink) return;

    const summary =
      bookingLink.getAttribute("data-inventory-summary") ||
      `Customer searched inventory for: ${activeInventoryQuery || "tire availability"}`;
    const tireSize = bookingLink.getAttribute("data-inventory-size") || activeInventoryQuery;
    fillBookingFromInventory(summary, tireSize);
  });

  bookInventoryMatch?.addEventListener("click", () => {
    const query = activeInventoryQuery || inventorySearchInput?.value || heroInventoryInput?.value || "tire availability";
    fillBookingFromInventory(`Customer searched inventory for: ${query}`, query);
  });

  if (inventoryFrame instanceof HTMLIFrameElement && loadInventoryFrame) {
    loadInventoryFrame.addEventListener("click", () => {
      if (!inventoryFrame.src) inventoryFrame.src = inventoryFrame.dataset.src || "";
      inventoryFrame.hidden = false;
      loadInventoryFrame.hidden = true;
    });
  }
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation");
    }
  });
}

if (bookingForm && formMessage) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    formMessage.textContent =
      "Thank you! A&A TIRES LTD will contact you shortly to confirm your appointment.";
    bookingForm.reset();
  });
}

injectInventoryUi();
injectFooterCredit();
refreshInventoryElements();
bindInventoryEvents();
loadInventory();

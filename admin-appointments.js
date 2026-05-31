const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const year = document.getElementById("year");
const loginForm = document.getElementById("adminLoginForm");
const filterForm = document.getElementById("adminFilterForm");
const adminMessage = document.getElementById("adminMessage");
const adminPanel = document.getElementById("adminPanel");
const tableWrap = document.getElementById("appointmentsTableWrap");
const logoutButton = document.getElementById("adminLogoutButton");
const STATUS_OPTIONS = ["Pending", "Confirmed", "Completed", "Cancelled"];

if (year) {
  year.textContent = new Date().getFullYear();
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setAdminMessage(message, type = "success") {
  if (!adminMessage) return;

  adminMessage.textContent = message;
  adminMessage.classList.toggle("is-error", type === "error");
  adminMessage.classList.toggle("is-success", type !== "error");
}

function getStoredPassword() {
  return sessionStorage.getItem("aaAdminPassword") || "";
}

function setStoredPassword(password) {
  sessionStorage.setItem("aaAdminPassword", password);
}

function clearStoredPassword() {
  sessionStorage.removeItem("aaAdminPassword");
}

function formatVehicle(appointment) {
  return [appointment.vehicle_year, appointment.vehicle_make, appointment.vehicle_model].filter(Boolean).join(" ") || "Not provided";
}

function statusSelect(appointment) {
  return `
    <select data-status-select data-id="${escapeHtml(appointment.id)}" aria-label="Update status for ${escapeHtml(appointment.booking_reference)}">
      ${STATUS_OPTIONS.map(
        (status) => `<option ${appointment.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`
      ).join("")}
    </select>
  `;
}

function renderAppointments(appointments) {
  if (!tableWrap) return;

  if (!appointments.length) {
    tableWrap.innerHTML = '<div class="empty-state">No appointments match the current filters.</div>';
    return;
  }

  tableWrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Customer</th>
          <th>Service</th>
          <th>Vehicle</th>
          <th>Preferred</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${appointments
          .map(
            (appointment) => `
              <tr>
                <td><strong>${escapeHtml(appointment.booking_reference)}</strong></td>
                <td>
                  ${escapeHtml(appointment.customer_name)}<br />
                  <a href="tel:${escapeHtml(appointment.phone)}">${escapeHtml(appointment.phone)}</a><br />
                  ${appointment.email ? `<a href="mailto:${escapeHtml(appointment.email)}">${escapeHtml(appointment.email)}</a>` : "No email"}
                </td>
                <td>${escapeHtml(appointment.service_type)}</td>
                <td>
                  ${escapeHtml(formatVehicle(appointment))}<br />
                  <small>${escapeHtml(appointment.tire_size || "No tire size")}</small>
                </td>
                <td>${escapeHtml(appointment.preferred_date)}<br />${escapeHtml(appointment.preferred_time)}</td>
                <td>${statusSelect(appointment)}</td>
                <td>${escapeHtml(appointment.notes || "")}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function apiRequest(path, options = {}) {
  const password = getStoredPassword();
  const response = await fetch(path, {
    ...options,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "x-admin-password": password,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Admin request failed");
  }

  return payload;
}

async function loadAppointments() {
  if (!filterForm || !tableWrap) return;

  tableWrap.innerHTML = '<div class="empty-state">Loading appointments...</div>';
  const formData = new FormData(filterForm);
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (value) params.set(key, value);
  }

  const payload = await apiRequest(`/api/admin/appointments?${params.toString()}`);
  renderAppointments(payload.appointments || []);
  adminPanel.hidden = false;
  logoutButton.hidden = false;
}

async function handleLogin(event) {
  event.preventDefault();

  if (!loginForm) return;

  const password = new FormData(loginForm).get("password");

  if (!password) {
    setAdminMessage("Enter the admin password.", "error");
    return;
  }

  setStoredPassword(String(password));
  setAdminMessage("Loading appointments...");

  try {
    await loadAppointments();
    setAdminMessage("Appointments loaded.");
  } catch (error) {
    clearStoredPassword();
    setAdminMessage(error.message || "Unable to load appointments.", "error");
  }
}

async function handleFilter(event) {
  event.preventDefault();
  setAdminMessage("Refreshing appointments...");

  try {
    await loadAppointments();
    setAdminMessage("Appointments refreshed.");
  } catch (error) {
    setAdminMessage(error.message || "Unable to refresh appointments.", "error");
  }
}

async function handleStatusChange(event) {
  const select = event.target instanceof Element ? event.target.closest("[data-status-select]") : null;

  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const id = select.getAttribute("data-id");
  const status = select.value;
  select.disabled = true;
  setAdminMessage("Updating appointment status...");

  try {
    await apiRequest("/api/admin/appointments", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    setAdminMessage("Appointment status updated.");
  } catch (error) {
    setAdminMessage(error.message || "Unable to update status.", "error");
  } finally {
    select.disabled = false;
  }
}

logoutButton?.addEventListener("click", () => {
  clearStoredPassword();
  adminPanel.hidden = true;
  logoutButton.hidden = true;
  setAdminMessage("Signed out.");
});

loginForm?.addEventListener("submit", handleLogin);
filterForm?.addEventListener("submit", handleFilter);
tableWrap?.addEventListener("change", handleStatusChange);

if (getStoredPassword()) {
  adminPanel.hidden = false;
  logoutButton.hidden = false;
  loadAppointments().catch((error) => {
    clearStoredPassword();
    setAdminMessage(error.message || "Unable to restore admin session.", "error");
  });
}

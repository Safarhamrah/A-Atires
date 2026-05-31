const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const year = document.getElementById("year");
const lookupForm = document.getElementById("appointmentLookupForm");
const lookupMessage = document.getElementById("lookupMessage");
const appointmentResult = document.getElementById("appointmentResult");

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

function setLookupMessage(message, type = "success") {
  if (!lookupMessage) return;

  lookupMessage.textContent = message;
  lookupMessage.classList.toggle("is-error", type === "error");
  lookupMessage.classList.toggle("is-success", type !== "error");
}

function formatVehicle(appointment) {
  return [appointment.vehicle_year, appointment.vehicle_make, appointment.vehicle_model].filter(Boolean).join(" ") || "Not provided";
}

function renderAppointment(appointment) {
  if (!appointmentResult) return;

  const fields = [
    ["Booking reference", appointment.booking_reference],
    ["Service type", appointment.service_type],
    ["Preferred date", appointment.preferred_date],
    ["Preferred time", appointment.preferred_time],
    ["Vehicle information", formatVehicle(appointment)],
    ["Tire size", appointment.tire_size || "Not provided"],
    ["Status", appointment.status || "Pending"],
    ["Notes", appointment.notes || "None"],
  ];

  appointmentResult.innerHTML = `
    <div class="result-heading">
      <h2>Appointment Details</h2>
      <span class="status-pill" data-status="${escapeHtml(appointment.status || "Pending")}">${escapeHtml(appointment.status || "Pending")}</span>
    </div>
    <dl class="appointment-meta">
      ${fields
        .map(
          ([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `
        )
        .join("")}
    </dl>
  `;
}

async function handleLookupSubmit(event) {
  event.preventDefault();

  if (!lookupForm || lookupForm.dataset.submitting === "true") {
    return;
  }

  const submitButton = lookupForm.querySelector('button[type="submit"]');
  const originalText = submitButton?.textContent || "Check Appointment";
  lookupForm.dataset.submitting = "true";
  lookupForm.setAttribute("aria-busy", "true");
  setLookupMessage("");

  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
    submitButton.textContent = "Checking...";
  }

  try {
    const formData = new FormData(lookupForm);
    const response = await fetch("/api/check-appointment", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "No appointment was found for that reference and phone number.");
    }

    renderAppointment(payload.appointment);
    setLookupMessage("Appointment found.");
  } catch (error) {
    setLookupMessage(error.message || "No appointment was found for that reference and phone number.", "error");
  } finally {
    delete lookupForm.dataset.submitting;
    lookupForm.removeAttribute("aria-busy");

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}

lookupForm?.addEventListener("submit", handleLookupSubmit);

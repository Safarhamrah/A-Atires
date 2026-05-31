const crypto = require("crypto");

const OWNER_EMAIL = "aandatires18@gmail.com";
const OWNER_NAME = "A&A Tires Ltd";
const BOOKING_REFERENCE_PREFIX = "AA";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestBuckets = new Map();

const PUBLIC_APPOINTMENT_FIELDS = [
  "booking_reference",
  "service_type",
  "vehicle_year",
  "vehicle_make",
  "vehicle_model",
  "tire_size",
  "preferred_date",
  "preferred_time",
  "status",
  "notes",
  "created_at",
].join(",");

const ADMIN_APPOINTMENT_FIELDS = [
  "id",
  "booking_reference",
  "customer_name",
  "phone",
  "email",
  "service_type",
  "vehicle_year",
  "vehicle_make",
  "vehicle_model",
  "tire_size",
  "preferred_date",
  "preferred_time",
  "status",
  "notes",
  "created_at",
  "updated_at",
].join(",");

const VALID_STATUSES = new Set(["Pending", "Confirmed", "Completed", "Cancelled"]);

class ApiError extends Error {
  constructor(statusCode, message, expose = true) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendMethodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, { ok: false, error: "Method not allowed" });
}

function handleOptions(req, res, methods) {
  if (req.method !== "OPTIONS") {
    return false;
  }

  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 204, {});
  return true;
}

function handleApiError(res, error) {
  const statusCode = error.statusCode || 500;
  const message =
    error.expose || statusCode < 500
      ? error.message
      : "The booking service is temporarily unavailable. Please call A&A Tires directly.";

  if (statusCode >= 500) {
    console.error(error);
  }

  sendJson(res, statusCode, { ok: false, error: message });
}

function readJson(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body || "{}"));
    } catch {
      throw new ApiError(400, "Invalid JSON request body");
    }
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;

      if (rawBody.length > 1024 * 1024) {
        reject(new ApiError(413, "Request body is too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        reject(new ApiError(400, "Invalid JSON request body"));
      }
    });

    req.on("error", reject);
  });
}

function sanitizeText(value, maxLength = 200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeNotes(value, maxLength = 2000) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizePhoneForMatch(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeEmail(value) {
  const email = sanitizeText(value, 254).toLowerCase();

  if (!email) {
    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Please enter a valid email address");
  }

  return email;
}

function parseVehicle(value) {
  const vehicle = sanitizeText(value, 160);

  if (!vehicle) {
    return {};
  }

  const yearMatch = vehicle.match(/\b(19|20)\d{2}\b/);
  const vehicleYear = yearMatch ? yearMatch[0] : "";
  const withoutYear = vehicle.replace(vehicleYear, "").replace(/[,-]/g, " ").replace(/\s+/g, " ").trim();
  const [vehicleMake = "", ...modelParts] = withoutYear.split(" ").filter(Boolean);

  return {
    vehicle_year: vehicleYear,
    vehicle_make: vehicleMake,
    vehicle_model: modelParts.join(" "),
  };
}

function firstValue(payload, keys) {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
      return payload[key];
    }
  }

  return "";
}

function validateAppointmentPayload(payload) {
  const parsedVehicle = parseVehicle(payload.vehicle);
  const appointment = {
    customer_name: sanitizeText(firstValue(payload, ["customer_name", "fullName", "name"]), 120),
    phone: sanitizeText(firstValue(payload, ["phone"]), 60),
    email: normalizeEmail(firstValue(payload, ["email"])),
    service_type: sanitizeText(firstValue(payload, ["service_type", "service"]), 80),
    vehicle_year: sanitizeText(firstValue(payload, ["vehicle_year"]) || parsedVehicle.vehicle_year, 20),
    vehicle_make: sanitizeText(firstValue(payload, ["vehicle_make"]) || parsedVehicle.vehicle_make, 80),
    vehicle_model: sanitizeText(firstValue(payload, ["vehicle_model"]) || parsedVehicle.vehicle_model, 100),
    tire_size: sanitizeText(firstValue(payload, ["tire_size", "tireSize"]), 60),
    preferred_date: sanitizeText(firstValue(payload, ["preferred_date", "preferredDate"]), 20),
    preferred_time: sanitizeText(firstValue(payload, ["preferred_time", "preferredTime"]), 20),
    notes: sanitizeNotes(firstValue(payload, ["notes"]), 2000),
    status: "Pending",
  };

  const missingFields = [];

  if (!appointment.customer_name) missingFields.push("customer_name");
  if (!appointment.phone) missingFields.push("phone");
  if (!appointment.service_type) missingFields.push("service_type");
  if (!appointment.preferred_date) missingFields.push("preferred_date");
  if (!appointment.preferred_time) missingFields.push("preferred_time");

  if (missingFields.length) {
    throw new ApiError(400, `Missing required field${missingFields.length > 1 ? "s" : ""}: ${missingFields.join(", ")}`);
  }

  if (!normalizePhoneForMatch(appointment.phone)) {
    throw new ApiError(400, "Please enter a valid phone number");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment.preferred_date)) {
    throw new ApiError(400, "Preferred date must use YYYY-MM-DD format");
  }

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(appointment.preferred_time)) {
    throw new ApiError(400, "Preferred time must use HH:MM format");
  }

  return appointment;
}

function isHoneypotSubmission(payload) {
  return Boolean(sanitizeText(payload.company_name || payload.website || "", 120));
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(req) {
  const key = getClientIp(req);
  const now = Date.now();
  const bucket = requestBuckets.get(key) || [];
  const activeHits = bucket.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (activeHits.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new ApiError(429, "Too many booking attempts. Please wait a few minutes or call A&A Tires directly.");
  }

  activeHits.push(now);
  requestBuckets.set(key, activeHits);
}

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceRoleKey) {
    throw new ApiError(500, "Server missing Supabase environment variables");
  }

  return { url, serviceRoleKey };
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY || "";

  if (!apiKey) {
    throw new ApiError(500, "Server missing Resend environment variable");
  }

  return {
    apiKey,
    from: process.env.RESEND_FROM_EMAIL || "A&A Tires <onboarding@resend.dev>",
  };
}

function ensureBookingConfiguration() {
  getSupabaseConfig();
  getResendConfig();
}

async function supabaseRequest(path, options = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const requestUrl = new URL(`${url}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") {
      requestUrl.searchParams.set(key, value);
    }
  }

  const response = await fetch(requestUrl, {
    method: options.method || "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new ApiError(
      response.status,
      `Database request failed (${response.status})`,
      response.status < 500
    );
    error.details = errorText;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function generateBookingReference() {
  return `${BOOKING_REFERENCE_PREFIX}-${crypto.randomInt(10000, 100000)}`;
}

async function createAppointmentWithReference(appointment) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bookingReference = generateBookingReference();

    try {
      const rows = await supabaseRequest("appointments", {
        method: "POST",
        body: {
          ...appointment,
          booking_reference: bookingReference,
        },
      });

      return rows[0];
    } catch (error) {
      const isDuplicate = error.statusCode === 409 || String(error.details || "").includes("duplicate");

      if (!isDuplicate || attempt === 4) {
        throw error;
      }
    }
  }

  throw new ApiError(500, "Unable to generate a unique booking reference");
}

function formatVehicle(appointment) {
  return [appointment.vehicle_year, appointment.vehicle_make, appointment.vehicle_model].filter(Boolean).join(" ") || "Not provided";
}

function appointmentEmailText(appointment) {
  return [
    "New appointment request for A&A Tires Ltd.",
    "",
    `Booking reference: ${appointment.booking_reference}`,
    `Customer name: ${appointment.customer_name}`,
    `Phone number: ${appointment.phone}`,
    `Email: ${appointment.email || "Not provided"}`,
    `Service type: ${appointment.service_type}`,
    `Vehicle: ${formatVehicle(appointment)}`,
    `Tire size: ${appointment.tire_size || "Not provided"}`,
    `Preferred date: ${appointment.preferred_date}`,
    `Preferred time: ${appointment.preferred_time}`,
    `Notes: ${appointment.notes || "None"}`,
    "Status: Pending",
  ].join("\n");
}

function appointmentEmailHtml(appointment) {
  const rows = [
    ["Booking reference", appointment.booking_reference],
    ["Customer name", appointment.customer_name],
    ["Phone number", appointment.phone],
    ["Email", appointment.email || "Not provided"],
    ["Service type", appointment.service_type],
    ["Vehicle", formatVehicle(appointment)],
    ["Tire size", appointment.tire_size || "Not provided"],
    ["Preferred date", appointment.preferred_date],
    ["Preferred time", appointment.preferred_time],
    ["Notes", appointment.notes || "None"],
    ["Status", "Pending"],
  ]
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:8px 12px;border-bottom:1px solid #dce3eb;color:#09182d;">${escapeHtml(label)}</th><td style="padding:8px 12px;border-bottom:1px solid #dce3eb;color:#101722;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#101722;">
      <h2 style="margin:0 0 12px;color:#09182d;">New Appointment Request - A&amp;A Tires</h2>
      <p style="margin:0 0 18px;">A customer submitted a new tire service appointment request.</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px;border:1px solid #dce3eb;">${rows}</table>
    </div>
  `;
}

function customerConfirmationText(appointment) {
  return [
    "Your appointment request has been received.",
    "A&A Tires will contact you to confirm your appointment.",
    "",
    `Booking reference: ${appointment.booking_reference}`,
    `Service type: ${appointment.service_type}`,
    `Preferred date: ${appointment.preferred_date}`,
    `Preferred time: ${appointment.preferred_time}`,
    "",
    "A&A Tires Ltd",
    "105 Burnt Lake Trail, Red Deer County, Alberta",
    "(403) 598-0258",
  ].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(message) {
  const { apiKey, from } = getResendConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      reply_to: message.replyTo || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new ApiError(response.status, `Email request failed (${response.status})`, false);
    error.details = errorText;
    throw error;
  }

  return response.json();
}

async function sendAppointmentEmails(appointment) {
  await sendEmail({
    to: OWNER_EMAIL,
    subject: "New Appointment Request - A&A Tires",
    text: appointmentEmailText(appointment),
    html: appointmentEmailHtml(appointment),
    replyTo: appointment.email || undefined,
  });

  if (appointment.email) {
    await sendEmail({
      to: appointment.email,
      subject: "A&A Tires Appointment Request Received",
      text: customerConfirmationText(appointment),
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#101722;"><p>Your appointment request has been received. A&amp;A Tires will contact you to confirm.</p><p><strong>Booking reference:</strong> ${escapeHtml(appointment.booking_reference)}</p><p><strong>Service:</strong> ${escapeHtml(appointment.service_type)}</p><p><strong>Preferred time:</strong> ${escapeHtml(appointment.preferred_date)} at ${escapeHtml(appointment.preferred_time)}</p></div>`,
    });
  }
}

async function findAppointmentForCustomer(bookingReference, phone) {
  const reference = sanitizeText(bookingReference, 40).toUpperCase();
  const phoneDigits = normalizePhoneForMatch(phone);

  if (!reference || !phoneDigits) {
    throw new ApiError(400, "Booking reference and phone number are required");
  }

  const rows = await supabaseRequest("appointments", {
    query: {
      select: `${PUBLIC_APPOINTMENT_FIELDS},phone`,
      booking_reference: `eq.${reference}`,
      limit: "1",
    },
  });
  const appointment = rows[0];

  if (!appointment || normalizePhoneForMatch(appointment.phone) !== phoneDigits) {
    throw new ApiError(404, "No appointment was found for that booking reference and phone number");
  }

  delete appointment.phone;
  return appointment;
}

function getQueryValue(req, name) {
  if (req.query && req.query[name] !== undefined) {
    return Array.isArray(req.query[name]) ? req.query[name][0] : req.query[name];
  }

  const url = new URL(req.url || "/", "http://localhost");
  return url.searchParams.get(name) || "";
}

async function listAppointments(req) {
  const date = sanitizeText(getQueryValue(req, "date"), 20);
  const status = sanitizeText(getQueryValue(req, "status"), 30);
  const query = {
    select: ADMIN_APPOINTMENT_FIELDS,
    order: "preferred_date.asc,preferred_time.asc,created_at.desc",
    limit: "200",
  };

  if (date) query.preferred_date = `eq.${date}`;
  if (status) query.status = `eq.${status}`;

  return supabaseRequest("appointments", { query });
}

async function updateAppointmentStatus(id, status) {
  const appointmentId = sanitizeText(id, 80);
  const nextStatus = sanitizeText(status, 30);

  if (!/^[0-9a-fA-F-]{36}$/.test(appointmentId)) {
    throw new ApiError(400, "Valid appointment id is required");
  }

  if (!VALID_STATUSES.has(nextStatus)) {
    throw new ApiError(400, "Invalid appointment status");
  }

  const rows = await supabaseRequest("appointments", {
    method: "PATCH",
    query: {
      id: `eq.${appointmentId}`,
    },
    body: {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    },
  });

  if (!rows[0]) {
    throw new ApiError(404, "Appointment not found");
  }

  return rows[0];
}

function requireAdmin(req) {
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminPassword) {
    throw new ApiError(503, "Admin access is not configured");
  }

  const authHeader = req.headers.authorization || "";
  const bearerPassword = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const providedPassword = req.headers["x-admin-password"] || bearerPassword;

  if (!providedPassword || providedPassword !== adminPassword) {
    throw new ApiError(401, "Invalid admin password");
  }
}

function publicAppointment(appointment) {
  return {
    booking_reference: appointment.booking_reference,
    service_type: appointment.service_type,
    vehicle_year: appointment.vehicle_year,
    vehicle_make: appointment.vehicle_make,
    vehicle_model: appointment.vehicle_model,
    tire_size: appointment.tire_size,
    preferred_date: appointment.preferred_date,
    preferred_time: appointment.preferred_time,
    status: appointment.status,
    notes: appointment.notes,
    created_at: appointment.created_at,
  };
}

module.exports = {
  ApiError,
  checkRateLimit,
  createAppointmentWithReference,
  ensureBookingConfiguration,
  findAppointmentForCustomer,
  handleApiError,
  handleOptions,
  isHoneypotSubmission,
  listAppointments,
  publicAppointment,
  readJson,
  requireAdmin,
  sendAppointmentEmails,
  sendJson,
  sendMethodNotAllowed,
  updateAppointmentStatus,
  validateAppointmentPayload,
  generateBookingReference,
};

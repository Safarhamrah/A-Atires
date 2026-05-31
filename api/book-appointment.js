const {
  checkRateLimit,
  createAppointmentWithReference,
  ensureBookingConfiguration,
  generateBookingReference,
  handleApiError,
  handleOptions,
  isHoneypotSubmission,
  publicAppointment,
  readJson,
  sendAppointmentEmails,
  sendJson,
  sendMethodNotAllowed,
  validateAppointmentPayload,
} = require("./_appointments");

module.exports = async function bookAppointmentHandler(req, res) {
  if (handleOptions(req, res, ["POST", "OPTIONS"])) {
    return;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST", "OPTIONS"]);
    return;
  }

  try {
    const payload = await readJson(req);

    if (isHoneypotSubmission(payload)) {
      sendJson(res, 200, {
        ok: true,
        booking_reference: generateBookingReference(),
        message:
          "Thank you. Your appointment request has been received. A&A Tires will contact you to confirm your appointment.",
      });
      return;
    }

    checkRateLimit(req);

    const appointmentData = validateAppointmentPayload(payload);
    ensureBookingConfiguration();
    const appointment = await createAppointmentWithReference(appointmentData);

    await sendAppointmentEmails(appointment);

    sendJson(res, 200, {
      ok: true,
      booking_reference: appointment.booking_reference,
      appointment: publicAppointment(appointment),
      message:
        "Thank you. Your appointment request has been received. A&A Tires will contact you to confirm your appointment.",
    });
  } catch (error) {
    handleApiError(res, error);
  }
};

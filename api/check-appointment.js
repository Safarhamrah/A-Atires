const {
  findAppointmentForCustomer,
  handleApiError,
  handleOptions,
  readJson,
  sendJson,
  sendMethodNotAllowed,
} = require("./_appointments");

module.exports = async function checkAppointmentHandler(req, res) {
  if (handleOptions(req, res, ["POST", "OPTIONS"])) {
    return;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST", "OPTIONS"]);
    return;
  }

  try {
    const payload = await readJson(req);
    const appointment = await findAppointmentForCustomer(payload.booking_reference, payload.phone);

    sendJson(res, 200, {
      ok: true,
      appointment,
    });
  } catch (error) {
    handleApiError(res, error);
  }
};

const {
  handleApiError,
  handleOptions,
  listAppointments,
  readJson,
  requireAdmin,
  sendJson,
  sendMethodNotAllowed,
  updateAppointmentStatus,
} = require("../_appointments");

module.exports = async function adminAppointmentsHandler(req, res) {
  if (handleOptions(req, res, ["GET", "PATCH", "OPTIONS"])) {
    return;
  }

  if (!["GET", "PATCH"].includes(req.method)) {
    sendMethodNotAllowed(res, ["GET", "PATCH", "OPTIONS"]);
    return;
  }

  try {
    requireAdmin(req);

    if (req.method === "GET") {
      const appointments = await listAppointments(req);
      sendJson(res, 200, { ok: true, appointments });
      return;
    }

    const payload = await readJson(req);
    const appointment = await updateAppointmentStatus(payload.id, payload.status);

    sendJson(res, 200, {
      ok: true,
      appointment,
    });
  } catch (error) {
    handleApiError(res, error);
  }
};

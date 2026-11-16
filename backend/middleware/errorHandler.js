/**
 * Express error-handling middleware.
 * Returns consistent JSON error responses.
 */
export function errorHandler(err, req, res, _next) {
  console.error("Error:", err.message);

  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);

  if (status === 413) {
    return res.status(413).json({
      error: "File too large",
      details: "Vehicle photo must be 5 MB or smaller",
    });
  }

  if (status === 404) {
    return res.status(404).json({
      error: "Not found",
      details: err.message,
    });
  }

  if (status >= 400 && status < 500) {
    return res.status(status).json({
      error: err.message || "Request rejected",
    });
  }

  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
}

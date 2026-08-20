/**
 * Express error-handling middleware.
 * Returns consistent JSON error responses.
 */
export function errorHandler(err, req, res, _next) {
  console.error("Error:", err.message);

  // Distinguish 404 vs 500
  if (err.status === 404) {
    return res.status(404).json({
      error: "Not found",
      details: err.message,
    });
  }

  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
}

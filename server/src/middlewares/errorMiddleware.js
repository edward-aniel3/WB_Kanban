import { isTransientError, wakeDatabase } from "../config/db.js";

// Seconds advertised to clients via the Retry-After header while the
// database is waking from auto-pause.
const DB_WAKING_RETRY_AFTER_SECONDS = 30;

/**
 * Central error handler. Must be mounted after all routes.
 *
 * Transient database errors (e.g. the database waking from auto-pause) are
 * answered with 503 + Retry-After and code "DB_WAKING" so clients can poll
 * /api/v1/health and replay the request. The server itself never replays
 * business operations: writes are non-idempotent and must not be retried
 * automatically. Non-transient errors keep the generic 500 contract.
 */
const dbWakingErrorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (!isTransientError(err)) {
    console.error("Unhandled error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }

  console.warn(
    `Transient database error on ${req.method} ${req.originalUrl} (${
      err.code || err.number || err.message
    }); triggering wake.`
  );

  // Fire-and-forget: concurrent requests share one wake attempt.
  wakeDatabase();

  return res.status(503)
    .set("Retry-After", String(DB_WAKING_RETRY_AFTER_SECONDS))
    .json({
      success: false,
      code: "DB_WAKING",
      message: "Database is waking up. Please retry shortly.",
    });
};

export default dbWakingErrorHandler;

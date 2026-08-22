import { Router } from "express";
import { poolPromise, wakeDatabase } from "../../config/db.js";

const router = Router();

// Small bounded retry so warm-up pings survive a database resume already in
// progress. SELECT 1 is read-only and idempotent, so repeating it is safe.
const HEALTH_MAX_ATTEMPTS = 3;
const HEALTH_RETRY_DELAY_MS = 1000;

// Advertised to clients while the database is waking from auto-pause.
const DB_WAKING_RETRY_AFTER_SECONDS = 30;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET /api/v1/health - liveness/readiness probe; must not require auth
router.get("/health", async (req, res) => {
  try {
    const pool = await poolPromise;

    let result;

    for (let attempt = 1; attempt <= HEALTH_MAX_ATTEMPTS; attempt++) {
      try {
        result = await pool.request().query("SELECT 1 AS dbStatus");
        break;
      } catch (error) {
        if (attempt === HEALTH_MAX_ATTEMPTS) throw error;
        await sleep(HEALTH_RETRY_DELAY_MS);
      }
    }

    res.json({
      success: true,
      database: "connected",
      message: "wb-kanban API is running",
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    // Kick off the shared single-flight wake and tell clients to poll again.
    wakeDatabase();

    return res.status(503)
      .set("Retry-After", String(DB_WAKING_RETRY_AFTER_SECONDS))
      .json({
        success: false,
        code: "DB_WAKING",
        message: "Database is waking up. Please retry shortly.",
      });
  }
});

export default router;

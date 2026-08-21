import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 1433),

  options: {
    encrypt: true,
    trustServerCertificate: false,
  },

  pool: {
    max: 10,
    min: 0,
    // 5 minutes: keeps pooled connections available through short idle gaps,
    // then releases them so the database can reach zero sessions and qualify
    // for auto-pause.
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 300000),
  },
};

// The database uses auto-pause (Azure SQL serverless), so the first connection
// may fail transiently while the database resumes. Retries are bounded and
// cover only transient errors; config errors (bad credentials, unknown
// database) fail fast. Write operations are never retried automatically.
const TRANSIENT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  // tedious reports its own connect/login timeouts as ETIMEOUT
  "ETIMEOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "ESOCKET",
]);

const TRANSIENT_ERROR_NUMBERS = new Set([
  4060, 40197, 40501, 40613, 40914, 49918, 49919, 49920, 10928, 10929, 233,
  10053, 10054, 10060, 1205,
]);

const TRANSIENT_MESSAGE_KEYWORDS = ["transient", "busy", "resuming", "scaling"];

const isTransientError = (error) => {
  if (!error) return false;

  if (TRANSIENT_ERROR_CODES.has(error.code)) return true;
  if (error.number && TRANSIENT_ERROR_NUMBERS.has(error.number)) return true;

  const message = String(error.message || "").toLowerCase();
  return TRANSIENT_MESSAGE_KEYWORDS.some((keyword) => message.includes(keyword));
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const maxRetries = parsePositiveInt(process.env.DB_CONNECT_MAX_RETRIES, 10);
const baseDelayMs = parsePositiveInt(process.env.DB_CONNECT_RETRY_DELAY_MS, 2000);
const maxDelayMs = 15000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry() {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // A failed connect leaves the pool unusable, so each attempt gets a fresh one.
      return await new sql.ConnectionPool(dbConfig).connect();
    } catch (error) {
      lastError = error;

      if (!isTransientError(error)) {
        console.error(
          "Non-transient database connection error, aborting:",
          error.code || error.number || error.message
        );
        throw error;
      }

      if (attempt === maxRetries) break;

      // Exponential backoff with jitter to avoid synchronized reconnects.
      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitteredDelayMs = Math.round(delayMs * (0.5 + Math.random() * 0.5));

      console.warn(
        `Database connection attempt ${attempt}/${maxRetries} failed (${
          error.code || error.number || error.message
        }). Retrying in ${jitteredDelayMs}ms...`
      );

      await sleep(jitteredDelayMs);
    }
  }

  console.error(`Database connection failed after ${maxRetries} attempts.`);
  throw lastError;
}

const poolPromise = connectWithRetry().then((pool) => {
  console.log("Connected to Azure SQL Database");
  return pool;
});

// Single-flight wake for runtime auto-pause recovery. When a request hits a
// paused database, the error middleware calls this; concurrent callers share
// the same attempt instead of starting parallel retry loops (thundering herd).
let wakeAttempt = null;
const WAKE_COOLDOWN_MS = 10000;

const wakeDatabase = () => {
  if (!wakeAttempt) {
    wakeAttempt = (async () => {
      try {
        // Probe with a dedicated connection; the main pool reconnects lazily
        // once the database is awake.
        const probePool = await connectWithRetry();
        await probePool.close();
        console.log("Database is awake");
        return true;
      } finally {
        // Brief cooldown so a burst of failures does not loop instantly,
        // while still allowing a fresh wake if the database pauses again.
        setTimeout(() => {
          wakeAttempt = null;
        }, WAKE_COOLDOWN_MS);
      }
    })();
  }
  return wakeAttempt;
};

export { sql, poolPromise, wakeDatabase, isTransientError };
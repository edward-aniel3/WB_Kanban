import axios from "axios";
import { message } from "antd";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Database wake handling (auto-pause) -------------------------------------
// When the server answers 503 with code "DB_WAKING", the database is waking
// from auto-pause. We show a notice, poll the health endpoint until it is
// back, then replay the original request once. The original operation was
// never executed by the database (the failure happened while connecting), so
// replaying it is safe.
const WAKE_POLL_INTERVAL_MS = 3000;
const WAKE_POLL_MAX_WAIT_MS = 90000;
const WAKE_NOTICE_THROTTLE_MS = 10000;

let lastWakeNoticeAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForDatabase = async () => {
  const baseURL = (axiosInstance.defaults.baseURL || "").replace(/\/+$/, "");
  const healthUrl = `${baseURL}/v1/health`;
  const deadline = Date.now() + WAKE_POLL_MAX_WAIT_MS;

  // Raw axios on purpose: health polling must not re-enter the interceptor.
  while (Date.now() < deadline) {
    try {
      const res = await axios.get(healthUrl, { withCredentials: true });
      if (res.data?.success) return true;
    } catch {
      // Still waking; keep polling until the deadline.
    }
    await sleep(WAKE_POLL_INTERVAL_MS);
  }
  return false;
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isDbWaking =
      error.response?.status === 503 &&
      error.response?.data?.code === "DB_WAKING";

    if (!isDbWaking || !config || config._retriedAfterWake) {
      return Promise.reject(error);
    }

    // Mark before awaiting so parallel requests each replay only once.
    config._retriedAfterWake = true;

    if (Date.now() - lastWakeNoticeAt > WAKE_NOTICE_THROTTLE_MS) {
      lastWakeNoticeAt = Date.now();
      message.info("Database is waking up. This may take a moment…");
    }

    const isAwake = await waitForDatabase();
    if (!isAwake) {
      return Promise.reject(
        new Error("The database did not come back online in time. Please try again.")
      );
    }

    return axiosInstance.request(config);
  }
);

export default axiosInstance;

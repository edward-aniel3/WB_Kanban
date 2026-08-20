import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./api/auth/authRoute.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.get("/api/v1/health", async (req, res) => {
  try {
    const { poolPromise } = await import("./config/db.js");

    const pool = await poolPromise;

    const result = await pool
      .request()
      .query("SELECT GETDATE() AS CurrentTime");

    res.json({
      success: true,
      database: "connected",
      currentTime: result.recordset[0].CurrentTime,
      message: "wb-kanban API is running"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database query failed",
    });
  }
});

export default app;
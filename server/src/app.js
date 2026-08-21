import express from "express";
import cors from "./config/cors.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./api/auth/authRoute.js";
import employeeRoutes from "./api/employees/employeesRoute.js";
import ticketRoutes from "./api/tickets/ticketsRoute.js";
import healthRoutes from "./api/health/healthRoute.js";
import dbWakingErrorHandler from "./middlewares/errorMiddleware.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors);

// Health check is mounted before the API routers on purpose: ticketRoutes
// applies authMiddleware to everything mounted under /api, which would
// otherwise shadow this endpoint. Warm-up probes must not require a token.
app.use("/api/v1", healthRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api", ticketRoutes);

// Central error handler must be registered after all routes.
app.use(dbWakingErrorHandler);

export default app;
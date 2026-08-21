import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import authorize from "../../middlewares/roleMiddleware.js";
import {
  getTickets,
  createTicketHandler,
  getTicket,
  getTicketHistoryHandler,
  updateTicketHandler,
  updateTicketStatusHandler,
  assignTicketHandler,
  deleteTicketHandler,
} from "./ticketsController.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/tickets - List all tickets with filtering, sorting, pagination
router.get("/tickets", getTickets);

// POST /api/tickets - Create a new ticket
router.post("/tickets", createTicketHandler);

// GET /api/tickets/:id/history - Get ticket history (must be before /tickets/:id)
router.get("/tickets/:id/history", getTicketHistoryHandler);

// GET /api/tickets/:id - Get a single ticket
router.get("/tickets/:id", getTicket);

// PUT /api/tickets/:id - Update ticket details
router.put("/tickets/:id", updateTicketHandler);

// PATCH /api/tickets/:id/status - Update ticket status
router.patch("/tickets/:id/status", updateTicketStatusHandler);

// PATCH /api/tickets/:id/assign - Assign/unassign ticket
router.patch("/tickets/:id/assign", assignTicketHandler);

// DELETE /api/tickets/:id - Delete ticket (Supervisor only)
router.delete("/tickets/:id", authorize("Supervisor"), deleteTicketHandler);

export default router;

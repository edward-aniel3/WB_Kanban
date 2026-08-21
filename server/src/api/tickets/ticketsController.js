import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  updateTicketStatus,
  assignTicket,
  deleteTicket,
} from "./ticketServices.js";
import { getEmployeeByTeamMemberId } from "../employees/employeesServices.js";
import { createTicketLog, getTicketHistory } from "./ticketLogServices.js";

const VALID_STATUSES = ["Backlog", "To Do", "In Progress", "In Review", "Done"];
const VALID_PRIORITIES = ["Low", "Medium", "High"];

/**
 * GET /api/tickets
 * List all tickets with filtering, sorting, and pagination
 */
const getTickets = async (req, res) => {
  try {
    const { status, priority, assignee, unassigned, search, sortBy, sortDir, skip, take } = req.query;

    const tickets = await getAllTickets({
      status,
      priority,
      assignee: assignee ? parseInt(assignee) : undefined,
      unassigned,
      search,
      sortBy,
      sortDir,
      skip,
      take,
    });

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * POST /api/tickets
 * Create a new ticket
 */
const createTicketHandler = async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo } = req.body || {};

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must be between 3 and 255 characters.",
      });
    }

    // Validate description
    if (description !== undefined && description !== null && typeof description === "string" && description.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Description must not exceed 5000 characters.",
      });
    }

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`,
      });
    }

    // Validate priority
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}.`,
      });
    }

    // Validate assignee (must be a valid team member or null)
    if (assignedTo !== undefined && assignedTo !== null) {
      const assignee = await getEmployeeByTeamMemberId(assignedTo);
      if (!assignee) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignee. Must be a valid team member.",
        });
      }
    }

    const ticket = await createTicket({
      title: title.trim(),
      description: description || null,
      status: status || "Backlog",
      priority: priority || "Medium",
      assignedTo: assignedTo || null,
      createdBy: req.user.userId,
    });

    // Log ticket creation
    await createTicketLog({
      ticketId: ticket.ticketId,
      changeBy: req.user.userId,
      actionType: "created",
      fromStatus: "",
      toStatus: ticket.status,
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully.",
      data: { ticket },
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * GET /api/tickets/:id/history
 * Get ticket history (all logs for a ticket)
 */
const getTicketHistoryHandler = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    // Check if ticket exists
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const logs = await getTicketHistory(ticketId);

    return res.status(200).json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    console.error("Get ticket history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * GET /api/tickets/:id
 * Get a single ticket by ID
 */
const getTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * PUT /api/tickets/:id
 * Update ticket details (title, description, priority)
 */
const updateTicketHandler = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    // Check if ticket exists
    const existing = await getTicketById(ticketId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const { title, description, priority } = req.body || {};

    // Validate title
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: "Title must be between 3 and 255 characters.",
        });
      }
    }

    // Validate description
    if (description !== undefined && description !== null) {
      if (typeof description === "string" && description.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Description must not exceed 5000 characters.",
        });
      }
    }

    // Validate priority
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}.`,
      });
    }

    const ticket = await updateTicket(ticketId, {
      title: title !== undefined ? title.trim() : undefined,
      description,
      priority,
    });

    // Log ticket update
    await createTicketLog({
      ticketId,
      changeBy: req.user.userId,
      actionType: "updated",
      fromStatus: "",
      toStatus: "",
    });

    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully.",
      data: { ticket },
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * PATCH /api/tickets/:id/status
 * Update ticket status (assignee or Supervisor only)
 */
const updateTicketStatusHandler = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    // Check if ticket exists
    const existing = await getTicketById(ticketId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const { status } = req.body || {};

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`,
      });
    }

    // Authorization: only assignee or Supervisor can update status
    const isSupervisor = req.user.role === "Supervisor";
    let isAssignee = false;

    if (existing.assignedTo) {
      const assignee = await getEmployeeByTeamMemberId(existing.assignedTo);
      if (assignee) {
        isAssignee = assignee.userId === req.user.userId;
      }
    }

    if (!isSupervisor && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: "Only the assignee or a Supervisor can update ticket status.",
      });
    }

    const ticket = await updateTicketStatus(ticketId, status);

    // Log status change
    await createTicketLog({
      ticketId,
      changeBy: req.user.userId,
      actionType: "status_changed",
      fromStatus: existing.status,
      toStatus: status,
    });

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully.",
      data: { ticket },
    });
  } catch (error) {
    console.error("Update ticket status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * PATCH /api/tickets/:id/assign
 * Assign or unassign a ticket
 */
const assignTicketHandler = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    // Check if ticket exists
    const existing = await getTicketById(ticketId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const { assignedTo } = req.body || {};

    // assignedTo should be a teamMemberId integer or null (to unassign)
    if (assignedTo !== null && assignedTo !== undefined) {
      const assigneeId = parseInt(assignedTo);
      if (isNaN(assigneeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignee ID.",
        });
      }

      // Validate that assignee is a valid team member
      const assignee = await getEmployeeByTeamMemberId(assigneeId);
      if (!assignee) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignee. Must be a valid team member.",
        });
      }
    }

    const ticket = await assignTicket(ticketId, assignedTo !== undefined ? parseInt(assignedTo) : null);

    // Log assignment change
    await createTicketLog({
      ticketId,
      changeBy: req.user.userId,
      actionType: "assigned",
      fromStatus: "",
      toStatus: "",
      oldAssignee: existing.assignedTo || null,
      newAssignee: assignedTo ? parseInt(assignedTo) : null,
    });

    return res.status(200).json({
      success: true,
      message: assignedTo ? "Ticket assigned successfully." : "Ticket unassigned successfully.",
      data: { ticket },
    });
  } catch (error) {
    console.error("Assign ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * DELETE /api/tickets/:id
 * Delete a ticket completely (Supervisor only)
 */
const deleteTicketHandler = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    // Check if ticket exists
    const existing = await getTicketById(ticketId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const success = await deleteTicket(ticketId, req.user.userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket deleted successfully.",
    });
  } catch (error) {
    console.error("Delete ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export {
  getTickets,
  createTicketHandler,
  getTicket,
  getTicketHistoryHandler,
  updateTicketHandler,
  updateTicketStatusHandler,
  assignTicketHandler,
  deleteTicketHandler,
};

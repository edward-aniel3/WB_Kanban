import { poolPromise, sql } from "../../config/db.js";

/**
 * Get all tickets for a project with filtering, sorting, and pagination
 */
const getAllTickets = async ({ status, priority, assignee, unassigned, search, sortBy, sortDir, skip, take }) => {
  const pool = await poolPromise;

  let whereClauses = [];
  const request = pool.request();

  // Filter by status
  if (status) {
    request.input("status", sql.NVarChar, status);
    whereClauses.push("t.status = @status");
  }

  // Filter by priority
  if (priority) {
    request.input("priority", sql.NVarChar, priority);
    whereClauses.push("t.priority = @priority");
  }

  // Filter by assignee
  if (assignee) {
    request.input("assignee", sql.Int, assignee);
    whereClauses.push("t.assignedTo = @assignee");
  }

  // Filter unassigned tickets
  if (unassigned === "true" || unassigned === true) {
    whereClauses.push("t.assignedTo IS NULL");
  }

  // Search by title or description
  if (search) {
    request.input("search", sql.NVarChar, `%${search}%`);
    whereClauses.push("(t.Title LIKE @search OR t.description LIKE @search)");
  }

  const whereStr = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

  // Sorting
  const validSortColumns = {
    createdAt: "t.createdAt",
    priority: `CASE t.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END`,
  };
  const sortColumn = validSortColumns[sortBy] || "t.createdAt";
  const direction = sortDir === "ASC" ? "ASC" : "DESC";

  // Pagination
  const skipValue = parseInt(skip) || 0;
  const takeValue = parseInt(take) || 50;
  request.input("skip", sql.Int, skipValue);
  request.input("take", sql.Int, takeValue);

  const query = `
    SELECT 
      t.ticketId,
      t.Title,
      t.description,
      t.status,
      t.priority,
      t.assignedTo,
      t.createdBy,
      t.createdAt,
      t.updatedAt,
      u.fullName AS assigneeName
    FROM tickets t
    LEFT JOIN teamMembers tm ON t.assignedTo = tm.teamMemberId
    LEFT JOIN users u ON tm.userId = u.userId
    ${whereStr}
    ORDER BY ${sortColumn} ${direction}
    OFFSET @skip ROWS
    FETCH NEXT @take ROWS ONLY
  `;

  const result = await request.query(query);

  // Get total count for pagination
  const countRequest = pool.request();
  if (status) countRequest.input("status", sql.NVarChar, status);
  if (priority) countRequest.input("priority", sql.NVarChar, priority);
  if (assignee) countRequest.input("assignee", sql.Int, assignee);
  if (search) countRequest.input("search", sql.NVarChar, `%${search}%`);

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM tickets t
    ${whereStr}
  `;

  const countResult = await countRequest.query(countQuery);

  return {
    tickets: result.recordset,
    total: countResult.recordset[0].total,
    skip: skipValue,
    take: takeValue,
  };
};

/**
 * Get single ticket by ID
 */
const getTicketById = async (ticketId) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("ticketId", sql.Int, ticketId)
    .query(
      `SELECT 
        t.ticketId,
        t.Title,
        t.description,
        t.status,
        t.priority,
        t.assignedTo,
        t.createdBy,
        t.createdAt,
        t.updatedAt,
        u.fullName AS assigneeName,
        c.fullName AS creatorName
      FROM tickets t
      LEFT JOIN teamMembers tm ON t.assignedTo = tm.teamMemberId
      LEFT JOIN users u ON tm.userId = u.userId
      LEFT JOIN users c ON t.createdBy = c.userId
      WHERE t.ticketId = @ticketId`
    );
  return result.recordset[0] || null;
};

/**
 * Create a new ticket
 */
const createTicket = async ({ title, description, status, priority, assignedTo, createdBy }) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("Title", sql.NVarChar, title)
    .input("description", sql.NVarChar, description || null)
    .input("status", sql.NVarChar, status || "Backlog")
    .input("priority", sql.NVarChar, priority || "Medium")
    .input("assignedTo", sql.Int, assignedTo || null)
    .input("createdBy", sql.Int, createdBy)
    .query(
      `INSERT INTO tickets (Title, description, status, priority, assignedTo, createdBy, createdAt, updatedAt)
       OUTPUT INSERTED.ticketId, INSERTED.Title, INSERTED.description, INSERTED.status, INSERTED.priority,
              INSERTED.assignedTo, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
       VALUES (@Title, @description, @status, @priority, @assignedTo, @createdBy, GETDATE(), GETDATE())`
    );
  return result.recordset[0];
};

/**
 * Update ticket details (title, description, priority)
 */
const updateTicket = async (ticketId, { title, description, priority }) => {
  const pool = await poolPromise;

  const setClauses = [];
  const request = pool.request();
  request.input("ticketId", sql.Int, ticketId);

  if (title !== undefined) {
    request.input("Title", sql.NVarChar, title);
    setClauses.push("Title = @Title");
  }
  if (description !== undefined) {
    request.input("description", sql.NVarChar, description);
    setClauses.push("description = @description");
  }
  if (priority !== undefined) {
    request.input("priority", sql.NVarChar, priority);
    setClauses.push("priority = @priority");
  }

  if (setClauses.length === 0) {
    return null;
  }

  setClauses.push("updatedAt = GETDATE()");

  const result = await request.query(
    `UPDATE tickets
     SET ${setClauses.join(", ")}
     OUTPUT INSERTED.ticketId, INSERTED.Title, INSERTED.description, INSERTED.status,
            INSERTED.priority, INSERTED.assignedTo, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
     WHERE ticketId = @ticketId`
  );
  return result.recordset[0] || null;
};

/**
 * Update ticket status
 */
const updateTicketStatus = async (ticketId, newStatus) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("ticketId", sql.Int, ticketId)
    .input("status", sql.NVarChar, newStatus)
    .query(
      `UPDATE tickets
       SET status = @status, updatedAt = GETDATE()
       OUTPUT INSERTED.ticketId, INSERTED.Title, INSERTED.description, INSERTED.status,
              INSERTED.priority, INSERTED.assignedTo, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
       WHERE ticketId = @ticketId`
    );
  return result.recordset[0] || null;
};

/**
 * Assign or unassign a ticket
 */
const assignTicket = async (ticketId, assignedTo) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("ticketId", sql.Int, ticketId)
    .input("assignedTo", sql.Int, assignedTo)
    .query(
      `UPDATE tickets
       SET assignedTo = @assignedTo, updatedAt = GETDATE()
       OUTPUT INSERTED.ticketId, INSERTED.Title, INSERTED.description, INSERTED.status,
              INSERTED.priority, INSERTED.assignedTo, INSERTED.createdBy, INSERTED.createdAt, INSERTED.updatedAt
       WHERE ticketId = @ticketId`
    );
  return result.recordset[0] || null;
};

/**
 * Hard-delete a ticket and its logs (transaction)
 */
const deleteTicket = async (ticketId) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Delete from ticketLogs first (child records)
    const logRequest = new sql.Request(transaction);
    await logRequest
      .input("ticketId", sql.Int, ticketId)
      .query("DELETE FROM ticketLogs WHERE ticketId = @ticketId");

    // 2. Delete from tickets (parent record)
    const ticketRequest = new sql.Request(transaction);
    const result = await ticketRequest
      .input("ticketId", sql.Int, ticketId)
      .query("DELETE FROM tickets WHERE ticketId = @ticketId");

    await transaction.commit();

    return result.rowsAffected[0] > 0;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  updateTicketStatus,
  assignTicket,
  deleteTicket,
};

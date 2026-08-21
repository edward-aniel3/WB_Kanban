import { poolPromise, sql } from "../../config/db.js";

/**
 * Create a ticket log entry
 */
const createTicketLog = async ({ ticketId, changeBy, actionType, fromStatus, toStatus, oldAssignee, newAssignee }) => {
  const pool = await poolPromise;
  await pool
    .request()
    .input("ticketId", sql.Int, ticketId)
    .input("changedBy", sql.Int, changeBy)
    .input("actionType", sql.NVarChar, actionType)
    .input("fromStatus", sql.NVarChar, fromStatus || "")
    .input("toStatus", sql.NVarChar, toStatus || "")
    .input("oldAssignee", sql.Int, oldAssignee || null)
    .input("newAssignee", sql.Int, newAssignee || null)
    .query(
      `INSERT INTO ticketLogs (ticketId, changedBy, actionType, fromStatus, toStatus, changedAt, oldAssignee, newAssignee)
       VALUES (@ticketId, @changedBy, @actionType, @fromStatus, @toStatus, GETDATE(), @oldAssignee, @newAssignee)`
    );
};

/**
 * Get ticket history (all logs for a ticket)
 */
const getTicketHistory = async (ticketId) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("ticketId", sql.Int, ticketId)
    .query(
      `SELECT
        tl.logId,
        tl.ticketId,
        tl.changedBy,
        u.fullName AS changeByName,
        tl.actionType,
        tl.fromStatus,
        tl.toStatus,
        tl.oldAssignee,
        tl.newAssignee,
        tl.changedAt
      FROM ticketLogs tl
      LEFT JOIN users u ON tl.changedBy = u.userId
      WHERE tl.ticketId = @ticketId
      ORDER BY tl.changedAt DESC`
    );
  return result.recordset;
};

export { createTicketLog, getTicketHistory };

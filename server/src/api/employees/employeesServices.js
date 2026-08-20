import bcrypt from "bcryptjs";
import { poolPromise, sql } from "../../config/db.js";

/**
 * Get all employees (team members with user info)
 */
const getAllEmployees = async () => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .query(
      `SELECT 
        tm.teamMemberId,
        u.userId,
        u.fullName,
        u.email,
        u.role,
        u.isActive,
        tm.joinedAt
      FROM users u
      INNER JOIN teamMembers tm ON u.userId = tm.userId
      ORDER BY tm.joinedAt DESC`
    );
  return result.recordset;
};

/**
 * Get single employee by userId
 */
const getEmployeeById = async (userId) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(
      `SELECT 
        tm.teamMemberId,
        u.userId,
        u.fullName,
        u.email,
        u.role,
        u.isActive,
        tm.joinedAt
      FROM users u
      INNER JOIN teamMembers tm ON u.userId = tm.userId
      WHERE u.userId = @userId`
    );
  return result.recordset[0] || null;
};

/**
 * Get single employee by teamMemberId
 */
const getEmployeeByTeamMemberId = async (teamMemberId) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("teamMemberId", sql.Int, teamMemberId)
    .query(
      `SELECT 
        tm.teamMemberId,
        u.userId,
        u.fullName,
        u.email,
        u.role,
        u.isActive,
        tm.joinedAt
      FROM users u
      INNER JOIN teamMembers tm ON u.userId = tm.userId
      WHERE tm.teamMemberId = @teamMemberId`
    );
  return result.recordset[0] || null;
};

/**
 * Check if email is already taken
 */
const isEmailTaken = async (email) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .query("SELECT userId FROM users WHERE email = @email");
  return result.recordset.length > 0;
};

/**
 * Check if user is already in team
 */
const isInTeam = async (userId) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query("SELECT teamMemberId FROM teamMembers WHERE userId = @userId");
  return result.recordset.length > 0;
};

/**
 * Create employee (user + team member) in a transaction
 */
const createEmployee = async (email, password, name) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1. Insert into users
    const userRequest = new sql.Request(transaction);
    const userResult = await userRequest
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("name", sql.NVarChar, name)
      .input("role", sql.NVarChar, "Employee")
      .query(
        "INSERT INTO users (email, password, fullName, role) OUTPUT INSERTED.userId VALUES (@email, @password, @name, @role)"
      );

    const userId = userResult.recordset[0].userId;

    // 2. Insert into teamMembers
    const teamRequest = new sql.Request(transaction);
    await teamRequest
      .input("userId", sql.Int, userId)
      .query(
        "INSERT INTO teamMembers (userId, joinedAt) VALUES (@userId, GETDATE())"
      );

    await transaction.commit();

    return { userId, email, name, role: "Employee" };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Toggle employee active status
 */
const toggleEmployeeStatus = async (userId) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(
      "UPDATE users SET isActive = CASE WHEN isActive = 1 THEN 0 ELSE 1 END WHERE userId = @userId"
    );
  return result.rowsAffected[0] > 0;
};

/**
 * Delete user completely (hard delete)
 * Deletes from teamMembers first, then users
 */
const deleteUser = async (userId) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Delete from teamMembers first
    const teamRequest = new sql.Request(transaction);
    await teamRequest
      .input("userId", sql.Int, userId)
      .query("DELETE FROM teamMembers WHERE userId = @userId");

    // 2. Delete from users
    const userRequest = new sql.Request(transaction);
    const result = await userRequest
      .input("userId", sql.Int, userId)
      .query("DELETE FROM users WHERE userId = @userId");

    await transaction.commit();

    return result.rowsAffected[0] > 0;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export {
  getAllEmployees,
  getEmployeeById,
  getEmployeeByTeamMemberId,
  isEmailTaken,
  isInTeam,
  createEmployee,
  toggleEmployeeStatus,
  deleteUser,
};

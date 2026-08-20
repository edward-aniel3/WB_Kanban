import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { poolPromise, sql } from "../../config/db.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../config/jwt.js";

const findUserByEmail = async (email) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .query(
      "SELECT userId, email, fullName, password, role FROM users WHERE email = @email"
    );
  return result.recordset[0] || null;
};

const findUserById = async (userId) => {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query("SELECT userId, email, fullName, role FROM users WHERE userId = @userId");
  return result.recordset[0] || null;
};

const createUser = async (email, password, name, role) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("password", sql.NVarChar, hashedPassword)
    .input("name", sql.NVarChar, name)
    .input("role", sql.NVarChar, role)
    .query(
      "INSERT INTO users (email, password, fullName, role) OUTPUT INSERTED.userId VALUES (@email, @password, @name, @role)"
    );

  return result.recordset[0].userId;
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export { findUserByEmail, findUserById, createUser, comparePassword, generateToken };

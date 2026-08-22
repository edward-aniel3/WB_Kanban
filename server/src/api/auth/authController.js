import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { poolPromise, sql } from "../../config/db.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../config/jwt.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query(
        "SELECT userId, email, fullName, password, role, isActive FROM users WHERE email = @email"
      );

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.recordset[0];

    // Check if account is inactive
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact your supervisor.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 3 * 60 * 60 * 1000, // 3 hours
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.userId,
        email: user.email,
        name: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and name are required.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    const userRole = role || "Employee";

    if (!["Supervisor", "Employee"].includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'Supervisor' or 'Employee'.",
      });
    }

    const pool = await poolPromise;

    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT userId FROM users WHERE email = @email");

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("name", sql.NVarChar, name)
      .input("role", sql.NVarChar, userRole)
      .query(
        "INSERT INTO users (email, password, fullName, role) OUTPUT INSERTED.userId VALUES (@email, @password, @name, @role)"
      );

    const userId = result.recordset[0].userId;

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: userId,
        email,
        name,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(
        "SELECT userId, email, fullName, role FROM users WHERE userId = @userId"
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user = result.recordset[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.userId,
        email: user.email,
        name: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    next(error);
  }
};

export { login, logout, me, register };

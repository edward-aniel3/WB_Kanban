import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import authorize from "../../middlewares/roleMiddleware.js";
import {
  getEmployees,
  addEmployee,
  toggleStatus,
  deleteUserById,
} from "./employeesController.js";

const router = Router();

// All routes require authentication + Supervisor role
router.use(authMiddleware);
router.use(authorize("Supervisor"));

// GET /api/employees - List all team members
router.get("/", getEmployees);

// POST /api/employees - Add employee to team
router.post("/", addEmployee);

// PATCH /api/employees/:id - Toggle active status
router.patch("/:id", toggleStatus);

// DELETE /api/employees/:id - Delete user completely
router.delete("/:id", deleteUserById);

export default router;

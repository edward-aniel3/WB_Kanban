import {
  getAllEmployees,
  getEmployeeById,
  getEmployeeByTeamMemberId,
  isEmailTaken,
  createEmployee,
  toggleEmployeeStatus,
  deleteUser,
} from "./employeesServices.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/employees
 * List all team members (Supervisor only)
 */
const getEmployees = async (req, res) => {
  try {
    const employees = await getAllEmployees();

    return res.status(200).json({
      success: true,
      data: { employees },
    });
  } catch (error) {
    console.error("Get employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * POST /api/employees
 * Add employee to team (Supervisor only)
 */
const addEmployee = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and name are required.",
      });
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Check if email is already taken
    const emailExists = await isEmailTaken(email);
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    // Create employee (user + team member)
    const employee = await createEmployee(email, password, name);

    return res.status(201).json({
      success: true,
      message: "Employee added successfully.",
      data: { employee },
    });
  } catch (error) {
    console.error("Add employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * PATCH /api/employees/:id
 * Toggle employee active status (Supervisor only)
 */
const toggleStatus = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    // Check if employee exists
    const employee = await getEmployeeById(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Prevent toggling yourself
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot change your own account status.",
      });
    }

    const success = await toggleEmployeeStatus(userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const newStatus = employee.isActive ? "inactive" : "active";

    return res.status(200).json({
      success: true,
      message: `Employee is now ${newStatus}.`,
      data: { isActive: !employee.isActive },
    });
  } catch (error) {
    console.error("Toggle employee status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * DELETE /api/employees/:id
 * Delete user completely (Supervisor only)
 */
const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    // Check if employee exists
    const employee = await getEmployeeById(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Prevent deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account.",
      });
    }

    const success = await deleteUser(userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export { getEmployees, addEmployee, toggleStatus, deleteUserById };

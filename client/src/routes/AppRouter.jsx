import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import EmployeesPage from "../pages/EmployeesPage";
import ProtectedRoute from "../components/ProtectedRoute";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === "Supervisor") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/kanban" replace />;
};

const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes with MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Supervisor routes */}
          <Route path="/dashboard" element={
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
              <p className="text-gray-600 mt-2">Welcome, Supervisor!</p>
            </div>
          } />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/reports" element={
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
              <p className="text-gray-600 mt-2">Reports coming soon.</p>
            </div>
          } />

          {/* Shared routes */}
          <Route path="/kanban" element={
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Kanban Board</h2>
              <p className="text-gray-600 mt-2">Kanban board coming soon.</p>
            </div>
          } />
        </Route>
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;

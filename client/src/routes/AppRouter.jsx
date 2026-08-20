import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "../components/ProtectedRoute";
import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../context/AuthContext";

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === "Supervisor") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/my-projects" replace />;
};

const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes - Supervisor only */}
      <Route element={<ProtectedRoute allowedRoles={["Supervisor"]} />}>
        <Route
          path="/dashboard"
          element={
            <div className="min-h-screen bg-surface">
              <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                  <h1 className="text-xl font-bold text-primary">WB Kanban</h1>
                  <LogoutButton />
                </div>
              </header>
              <main className="max-w-7xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                <p className="text-gray-600 mt-2">Welcome, Supervisor!</p>
              </main>
            </div>
          }
        />
      </Route>

      {/* Protected routes - Employee only */}
      <Route element={<ProtectedRoute allowedRoles={["Employee"]} />}>
        <Route
          path="/my-projects"
          element={
            <div className="min-h-screen bg-surface">
              <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                  <h1 className="text-xl font-bold text-primary">WB Kanban</h1>
                  <LogoutButton />
                </div>
              </header>
              <main className="max-w-7xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold text-gray-800">My Projects</h2>
                <p className="text-gray-600 mt-2">Welcome, Employee!</p>
              </main>
            </div>
          }
        />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;

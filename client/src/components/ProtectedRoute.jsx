import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified and user's role is not included
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate default page based on role
    if (user?.role === "Supervisor") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/my-projects" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

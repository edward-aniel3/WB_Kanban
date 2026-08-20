import { useLocation, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  AppstoreOutlined,
  UserOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";

const supervisorMenu = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/kanban", icon: <AppstoreOutlined />, label: "Kanban" },
  { key: "/employees", icon: <UserOutlined />, label: "Employees" },
  { key: "/reports", icon: <BarChartOutlined />, label: "Reports" },
];

const employeeMenu = [
  { key: "/kanban", icon: <AppstoreOutlined />, label: "Kanban" },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = user?.role === "Supervisor" ? supervisorMenu : employeeMenu;

  const handleMenuClick = (path) => {
    navigate(path);
    if (onToggle) onToggle();
  };

  return (
    <aside
      className={`
        h-screen bg-primary text-white flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-20" : "w-60"}
      `}
    >
      {/* Logo */}
      <div className="h-[60px] flex items-center justify-center border-b border-white/10">
        {collapsed ? (
          <span className="text-xl font-bold">WB</span>
        ) : (
          <span className="text-lg font-bold tracking-wide">WB Kanban</span>
        )}
      </div>

      {/* Role Badge */}
      <div className="px-3 py-4 flex justify-center">
        <span
          className={`
            inline-flex items-center justify-center
            bg-white/20 text-white text-xs font-semibold uppercase tracking-wider
            rounded-full
            ${collapsed ? "w-8 h-8 text-[10px]" : "px-3 py-1"}
          `}
        >
          {collapsed ? user?.role?.[0] : user?.role}
        </span>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleMenuClick(item.key)}
              className={`
                w-full flex items-center gap-3 rounded-lg
                transition-colors duration-200
                ${collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"}
                ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        {!collapsed && (
          <p className="text-white/40 text-xs text-center">
            &copy; 2026 WB Kanban
          </p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

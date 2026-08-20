import { useLocation, useNavigate } from "react-router-dom";
import { Dropdown, Avatar } from "antd";
import {
  MenuOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/WB-Logo.png";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/kanban": "Kanban Board",
  "/employees": "Employees",
  "/reports": "Reports",
};

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = pageTitles[location.pathname] || "WB Kanban";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const dropdownItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header
      className="
        h-[60px] bg-white border-b border-border shadow-sm
        fixed top-0 left-0 right-0 z-30
        flex items-center justify-between px-4
      "
    >
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="
            p-2 rounded-lg text-gray-600
            hover:bg-gray-100 transition-colors
          "
        >
          <MenuOutlined className="text-lg" />
        </button>
        <img
          src={logo}
          alt="Logo"
          className="h-8 w-8"
        />
        <span className="text-lg font-bold text-primary hidden sm:block">
          WB
        </span>
      </div>

      {/* Center: Page Title */}
      <h1 className="text-base font-semibold text-gray-800 absolute left-1/2 -translate-x-1/2">
        {pageTitle}
      </h1>

      {/* Right: Avatar Dropdown */}
      <Dropdown
        menu={{ items: dropdownItems }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <button
          className="
            flex items-center gap-2 p-1 rounded-full
            hover:bg-gray-100 transition-colors
          "
        >
          <Avatar
            size={36}
            style={{
              backgroundColor: "#1E3A5F",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {initials}
          </Avatar>
        </button>
      </Dropdown>
    </header>
  );
};

export default Header;

import { LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button";

const LogoutButton = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <Button
      variant="text"
      icon={<LogoutOutlined />}
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;

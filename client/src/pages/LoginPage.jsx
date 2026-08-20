import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, message } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import wbLogo from "../assets/WB-Logo.png";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.email, values.password);

      if (user.role === "Supervisor") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/kanban", { replace: true });
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Login failed. Please try again.";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Drag-and-drop Kanban boards",
    "Role-based access control",
    "Team & project management",
    "Ticket change history & logs",
    "Reports & insights",
  ];

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-center">
        <img src={wbLogo} alt="WB Kanban" className="w-32 h-32 mb-6" />

        <h1 className="text-4xl font-bold text-white mb-4">WB Kanban</h1>

        <p className="text-xl text-blue-200 max-w-md mb-12">
          Streamline your project management with our intuitive Kanban board.
        </p>

        <div className="grid grid-cols-3 gap-8 mb-12">
          <div>
            <div className="text-3xl font-bold text-white">100+</div>
            <div className="text-blue-200 text-sm">Projects</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">50+</div>
            <div className="text-blue-200 text-sm">Teams</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">1000+</div>
            <div className="text-blue-200 text-sm">Tasks</div>
          </div>
        </div>

        <ul className="space-y-3 text-slate-300">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="text-success">&#10003;</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={wbLogo} alt="WB Kanban" className="w-16 h-16 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-primary">WB Kanban</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Welcome back</h2>
              <p className="text-gray-500 mt-1">Sign in to your account</p>
            </div>

            <Form
              name="login"
              layout="vertical"
              onFinish={onFinish}
              autoComplete="off"
              size="large"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="Email address"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "Please enter your password" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Password"
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <Button
                  variant="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            &copy; 2026 WB Kanban. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

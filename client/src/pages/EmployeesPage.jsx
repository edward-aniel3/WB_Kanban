import { useState, useEffect, useCallback } from "react";
import { Table, Tag, message, Popconfirm, Empty, Spin } from "antd";
import {
  UserAddOutlined,
  StopOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import LogoutButton from "../components/LogoutButton";
import Button from "../components/common/Button";
import AddEmployeeModal from "../components/AddEmployeeModal";
import {
  getEmployees,
  addEmployee,
  toggleEmployeeStatus,
  deleteUser,
} from "../services/employeesService";

const EmployeesPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEmployees();
      setEmployees(response.data.data.employees);
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to load employees.";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddEmployee = async (values) => {
    setSubmitting(true);
    try {
      await addEmployee(values);
      message.success("Employee added successfully.");
      setModalOpen(false);
      fetchEmployees();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to add employee.";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const response = await toggleEmployeeStatus(userId);
      message.success(response.data.message);
      fetchEmployees();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to update status.";
      message.error(msg);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await deleteUser(userId);
      message.success("Employee deleted successfully.");
      fetchEmployees();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to delete employee.";
      message.error(msg);
    }
  };

  const columns = [
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={role === "Supervisor" ? "blue" : "green"}>
          {role}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) => (
        <Tag color={isActive ? "success" : "error"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Joined",
      dataIndex: "joinedAt",
      key: "joinedAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        // Don't show actions for the current supervisor
        if (record.userId === user?.id) return null;

        return (
          <div className="flex gap-2">
            <Popconfirm
              title={record.isActive ? "Deactivate this employee?" : "Activate this employee?"}
              onConfirm={() => handleToggleStatus(record.userId)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                variant={record.isActive ? "danger" : "primary"}
                size="small"
                icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
              >
                {record.isActive ? "Deactivate" : "Activate"}
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Delete this employee permanently?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record.userId)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                variant="danger"
                size="small"
                icon={<DeleteOutlined />}
              >
                Delete
              </Button>
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">WB Kanban</h1>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Team Members</h2>
            <p className="text-gray-500 mt-1">
              Manage your team members and their access
            </p>
          </div>
          <Button
            variant="primary"
            icon={<UserAddOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Add Employee
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spin size="large" />
            </div>
          ) : employees.length === 0 ? (
            <Empty
              description="No team members yet"
              className="py-12"
            >
              <Button
                variant="primary"
                icon={<UserAddOutlined />}
                onClick={() => setModalOpen(true)}
              >
                Add Your First Employee
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={employees}
              rowKey="teamMemberId"
              pagination={{ pageSize: 10 }}
            />
          )}
        </div>
      </main>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddEmployee}
        loading={submitting}
      />
    </div>
  );
};

export default EmployeesPage;

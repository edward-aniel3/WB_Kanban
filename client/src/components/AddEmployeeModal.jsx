import { useEffect, useRef } from "react";
import { Form, Input, Modal } from "antd";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";

const AddEmployeeModal = ({ open, onClose, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const prevOpen = useRef(open);

  useEffect(() => {
    if (prevOpen.current && !open) {
      form.resetFields();
    }
    prevOpen.current = open;
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch {
      // Validation failed
    }
  };

  return (
    <Modal
      title="Add New Employee"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Add Employee"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="Full Name"
          rules={[
            { required: true, message: "Please enter full name" },
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="Enter full name"
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please enter email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="Enter email address"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please enter password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Enter password"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddEmployeeModal;

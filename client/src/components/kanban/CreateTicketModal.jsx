import { useEffect, useRef } from "react";
import { Form, Input, Modal, Select } from "antd";

const PRIORITY_OPTIONS = ["Low", "Medium", "High"].map((p) => ({
  value: p,
  label: p,
}));

const STATUS_OPTIONS = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Done",
].map((s) => ({ value: s, label: s }));

// Modal form for creating a new ticket
const CreateTicketModal = ({ open, onClose, onSubmit, loading, employees = [] }) => {
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
    } catch { }
  };

  return (
    <Modal
      title="Create New Ticket"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Create Ticket"
      cancelText="Cancel"
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={{ priority: "Medium", status: "Backlog" }}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[
            { required: true, message: "Please enter a title" },
            { min: 3, message: "Title must be at least 3 characters" },
            { max: 255, message: "Title must not exceed 255 characters" },
          ]}
        >
          <Input placeholder="e.g. Fix login redirect bug" showCount maxLength={255} />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { max: 5000, message: "Description must not exceed 5000 characters" },
          ]}
        >
          <Input.TextArea
            rows={4}
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="Describe the task (optional)"
            showCount
            maxLength={5000}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="priority" label="Priority">
            <Select options={PRIORITY_OPTIONS} />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </div>

        {employees.length > 0 && (
          <Form.Item name="assignedTo" label="Assignee">
            <Select
              placeholder="Unassigned"
              allowClear
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({
                value: e.teamMemberId,
                label: e.fullName,
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default CreateTicketModal;

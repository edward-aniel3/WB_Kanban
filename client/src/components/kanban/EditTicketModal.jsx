import { useEffect, useRef } from "react";
import { Form, Input, Modal, Select, Alert } from "antd";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

const PRIORITY_OPTIONS = ["Low", "Medium", "High"].map((p) => ({
  value: p,
  label: p,
}));

// Modal form for editing title, description, priority
const EditTicketModal = ({ open, ticket, onClose, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const prevOpen = useRef(open);

  useEffect(() => {
    if (open && ticket) {
      form.setFieldsValue({
        title: ticket.Title,
        description: ticket.description || "",
        priority: ticket.priority,
      });
    }
    if (prevOpen.current && !open) {
      form.resetFields();
    }
    prevOpen.current = open;
  }, [open, ticket, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        title: values.title,
        description: values.description?.trim() ? values.description : null,
        priority: values.priority,
      };
      await onSubmit(payload);
    } catch { }
  };

  return (
    <Modal
      title="Edit Ticket"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Save Changes"
      cancelText="Cancel"
      destroyOnHidden
    >
      {ticket && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-400">#{ticket.ticketId}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      )}

      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Status and assignee are managed from the board (drag & drop) or the ticket detail modal."
      />

      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="title"
          label="Title"
          rules={[
            { required: true, message: "Please enter a title" },
            { min: 3, message: "Title must be at least 3 characters" },
            { max: 255, message: "Title must not exceed 255 characters" },
          ]}
        >
          <Input showCount maxLength={255} />
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
            showCount
            maxLength={5000}
          />
        </Form.Item>

        <Form.Item name="priority" label="Priority">
          <Select options={PRIORITY_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditTicketModal;

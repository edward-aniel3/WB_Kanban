import { Tag } from "antd";

const STATUS_COLORS = {
  Backlog: "default",
  "To Do": "blue",
  "In Progress": "gold",
  "In Review": "purple",
  Done: "green",
};

// Color-coded status tag
const StatusBadge = ({ status }) => (
  <Tag color={STATUS_COLORS[status] || "default"} className="m-0">
    {status}
  </Tag>
);

export default StatusBadge;

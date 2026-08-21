import { Tag } from "antd";

const PRIORITY_COLORS = {
  Low: "green",
  Medium: "orange",
  High: "red",
};

// Color-coded priority tag
const PriorityBadge = ({ priority }) => (
  <Tag color={PRIORITY_COLORS[priority] || "default"} className="m-0">
    {priority}
  </Tag>
);

export default PriorityBadge;

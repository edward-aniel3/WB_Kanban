import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "antd";
import dayjs from "dayjs";
import PriorityBadge from "./PriorityBadge";

const getInitials = (name) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

// Card content, used in both the board and the drag overlay
export const TicketCardContent = ({ ticket, isDragging = false }) => (
  <div
    className={`
      bg-white rounded-lg border border-border shadow-sm p-3
      transition-shadow duration-200
      ${isDragging ? "shadow-lg ring-2 ring-primary-light/50" : "hover:shadow-md"}
    `}
  >
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-gray-400">#{ticket.ticketId}</span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <span className="text-[11px] text-gray-400">
        {ticket.createdAt ? dayjs(ticket.createdAt).format("MMM D") : ""}
      </span>
    </div>

    <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2.5">
      {ticket.Title}
    </p>

    <div className="flex items-center gap-1.5">
      {ticket.assignedTo ? (
        <>
          <Avatar
            size={20}
            style={{
              backgroundColor: "#2E6DB4",
              fontSize: 10,
            }}
          >
            {getInitials(ticket.assigneeName)}
          </Avatar>
          <span className="text-xs text-gray-500 truncate">
            {ticket.assigneeName || "Team member"}
          </span>
        </>
      ) : (
        <span className="text-xs text-gray-400 italic">Unassigned</span>
      )}
    </div>
  </div>
);

// Draggable wrapper, disabled prevents drag for unauthorized users
const TicketCard = ({ ticket, disabled = false, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `ticket-${ticket.ticketId}`,
      data: { ticket },
      disabled,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging && onOpen) onOpen(ticket);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onOpen) onOpen(ticket);
      }}
      title={disabled ? undefined : "Drag to move · Click to open"}
      className={`
        cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-light rounded-lg
        ${!disabled && !isDragging ? "cursor-grab active:cursor-grabbing" : ""}
      `}
    >
      <TicketCardContent ticket={ticket} isDragging={false} />
    </div>
  );
};

export default TicketCard;

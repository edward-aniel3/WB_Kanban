import { useDroppable } from "@dnd-kit/core";
import { InboxOutlined } from "@ant-design/icons";
import TicketCard from "./TicketCard";

const COLUMN_ACCENTS = {
  Backlog: "#9CA3AF",
  "To Do": "#2E6DB4",
  "In Progress": "#D97706",
  "In Review": "#7C3AED",
  Done: "#16A34A",
};

// Droppable Kanban column
const KanbanColumn = ({ status, tickets, canDrag, onTicketOpen }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const accent = COLUMN_ACCENTS[status] || "#9CA3AF";

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="bg-white rounded-t-lg border border-b-0 border-border px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: accent }}
          />
          <span className="text-sm font-semibold text-gray-700 truncate">
            {status}
          </span>
        </div>
        <span
          className="text-xs font-medium text-gray-500 bg-surface rounded-full px-2 py-0.5"
          data-testid={`count-${status}`}
        >
          {tickets.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`
          flex-1 min-h-[200px] overflow-y-auto
          bg-white/60 rounded-b-lg border border-border border-t-0 p-2 space-y-2
          transition-colors duration-150
          ${isOver ? "bg-primary-light/10 border-primary-light border-dashed" : ""}
        `}
      >
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-300 gap-1.5">
            <InboxOutlined className="text-2xl" />
            <span className="text-xs">No tickets</span>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.ticketId}
              ticket={ticket}
              disabled={!canMoveSafe(canDrag, ticket)}
              onOpen={onTicketOpen}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Fallback guard for undefined canDrag
const canMoveSafe = (canDrag, ticket) =>
  typeof canDrag === "function" ? canDrag(ticket) : true;

export default KanbanColumn;

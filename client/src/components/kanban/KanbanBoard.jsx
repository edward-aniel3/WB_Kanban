import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { Button, Spin, Alert } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useTickets } from "../../context/TicketContext";
import FilterBar from "./FilterBar";
import KanbanColumn from "./KanbanColumn";
import TicketCard, { TicketCardContent } from "./TicketCard";
import CreateTicketModal from "./CreateTicketModal";
import EditTicketModal from "./EditTicketModal";
import TicketDetailModal from "./TicketDetailModal";

const COLUMNS = ["Backlog", "To Do", "In Progress", "In Review", "Done"];

// Kanban board with drag-and-drop status changes
const KanbanBoard = () => {
  const { user } = useAuth();
  const {
    tickets,
    loading,
    error,
    filters,
    refresh,
    changeStatus,
    addTicket,
    editTicket,
    canMoveTicket,
    isSupervisor,
    employees,
  } = useTickets();

  // Drag sensors — small distance threshold separates clicks from drags

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ── local state ──

  const [activeTicket, setActiveTicket] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [detailId, setDetailId] = useState(null);

  // Group tickets by status for rendering

  const grouped = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((s) => [s, []]));
    for (const ticket of tickets) {
      if (map[ticket.status]) map[ticket.status].push(ticket);
      else map[ticket.status] = [ticket]; // unknown status still renders
    }
    return map;
  }, [tickets]);

  const visibleColumns = filters.status ? [filters.status] : COLUMNS;

  const detailTicket = useMemo(
    () => tickets.find((t) => t.ticketId === detailId) || null,
    [tickets, detailId]
  );

  // ── drag handlers ──

  const findTicketById = (dndId) => {
    if (typeof dndId !== "string" || !dndId.startsWith("ticket-")) return null;
    const id = parseInt(dndId.replace("ticket-", ""), 10);
    return tickets.find((t) => t.ticketId === id) || null;
  };

  const handleDragStart = (event) => {
    setActiveTicket(event.active.data.current?.ticket || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTicket(null);
    if (!over) return;

    const ticket = active.data.current?.ticket;
    if (!ticket) return;

    // Figure out which column or card we dropped on
    let targetStatus = null;
    if (typeof over.id === "string" && over.id.startsWith("column-")) {
      targetStatus = over.id.replace("column-", "");
    } else {
      targetStatus = over.data.current?.status || null;
    }

    if (!targetStatus || targetStatus === ticket.status) return;

    await changeStatus(ticket.ticketId, targetStatus);
  };

  // ── modal handlers ──

  const handleCreate = async (values) => {
    setCreateLoading(true);
    try {
      await addTicket(values);
      setCreateOpen(false);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async (values) => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      await editTicket(editTarget.ticketId, values);
      setEditTarget(null);
    } finally {
      setEditLoading(false);
    }
  };

  // ── render ──

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-108px)]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kanban Board</h2>
          <p className="text-gray-500 mt-0.5 text-sm">
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"} · drag cards between columns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<ReloadOutlined />} onClick={refresh} />
          {isSupervisor && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              New Ticket
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <FilterBar />
      </div>

      {error && (
        <Alert
          className="mt-4"
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={refresh}>
              Retry
            </Button>
          }
        />
      )}

      <div className="mt-4 flex-1 min-h-0">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spin size="large" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={(args) => {
              const pointerCollisions = pointerWithin(args);
              return pointerCollisions.length > 0
                ? pointerCollisions
                : rectIntersection(args);
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveTicket(null)}
          >
            <div className="flex gap-4 h-full overflow-x-auto pb-2">
              {visibleColumns.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tickets={grouped[status] || []}
                  canDrag={canMoveTicket}
                  onTicketOpen={(t) => setDetailId(t.ticketId)}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeTicket ? (
                <div className="w-64 rotate-2">
                  <TicketCardContent ticket={activeTicket} isDragging />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={createLoading}
        employees={isSupervisor ? employees : []}
      />

      <EditTicketModal
        open={Boolean(editTarget)}
        ticket={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        loading={editLoading}
      />

      <TicketDetailModal
        open={Boolean(detailTicket)}
        ticket={detailTicket}
        onClose={() => setDetailId(null)}
        onEdit={(t) => setEditTarget(t)}
      />
    </div>
  );
};

export default KanbanBoard;

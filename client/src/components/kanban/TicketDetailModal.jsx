import { useEffect, useState } from "react";
import {
  Modal,
  Timeline,
  Avatar,
  Button,
  Select,
  Popconfirm,
  Spin,
  Empty,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useTickets } from "../../context/TicketContext";
import { useAuth } from "../../context/AuthContext";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

const LOG_COLORS = {
  created: "#2E6DB4",
  status_changed: "#D97706",
  assigned: "#0D9488",
  updated: "#9CA3AF",
  deleted: "#DC2626",
};

const getInitials = (name) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

// Full ticket detail view with history, status actions, and assignment
const TicketDetailModal = ({ open, ticket, onClose, onEdit }) => {
  const { user } = useAuth();
  const {
    isSupervisor,
    employees,
    fetchHistory,
    changeStatus,
    assignTicketToUser,
    removeTicket,
    getAllowedTransitions,
    getMyTeamMemberId,
  } = useTickets();

  const [logs, setLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusPending, setStatusPending] = useState(null); // status being moved to
  const [assigning, setAssigning] = useState(false);

  // Load history on open, re-fetch after edits
  useEffect(() => {
    if (!open || !ticket) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetchHistory(ticket.ticketId)
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticket?.ticketId, ticket?.updatedAt]);

  if (!ticket) return null;

  // ── status + assignment handlers ──

  const allowedTransitions = getAllowedTransitions(ticket);

  const handleStatusChange = async (status) => {
    setStatusPending(status);
    await changeStatus(ticket.ticketId, status);
    setStatusPending(null);
  };

  const handleAssign = async (teamMemberId) => {
    setAssigning(true);
    await assignTicketToUser(ticket.ticketId, teamMemberId ?? null);
    setAssigning(false);
  };

  const handleSelfAssign = async () => {
    const myId = getMyTeamMemberId();
    setAssigning(true);
    await assignTicketToUser(ticket.ticketId, myId ?? null);
    setAssigning(false);
  };

  const handleDelete = async () => {
    const ok = await removeTicket(ticket.ticketId);
    if (ok) onClose();
  };

  // ── helpers ──

  const memberName = (teamMemberId) => {
    const fromList = employees.find((e) => e.teamMemberId === teamMemberId);
    if (fromList) return fromList.fullName;
    if (ticket.assignedTo === teamMemberId && ticket.assigneeName) return ticket.assigneeName;
    if (ticket.createdBy === teamMemberId && ticket.creatorName) return ticket.creatorName;
    return teamMemberId == null ? null : `Team member #${teamMemberId}`;
  };

  const renderLogItem = (log) => {
    let content;
    switch (log.actionType) {
      case "created":
        content = (
          <>
            <strong>{log.changeByName || "Someone"}</strong> created the ticket
            {log.toStatus ? ` in ${log.toStatus}` : ""}
          </>
        );
        break;
      case "status_changed":
        content = (
          <>
            <strong>{log.changeByName || "Someone"}</strong> moved{" "}
            <em>{log.fromStatus || "—"}</em>
            <ArrowRightOutlined className="mx-1 text-gray-400 text-[10px]" />
            <em>{log.toStatus || "—"}</em>
          </>
        );
        break;
      case "assigned":
        content =
          log.newAssignee == null ? (
            <>
              <strong>{log.changeByName || "Someone"}</strong> unassigned the
              ticket
              {log.oldAssignee != null
                ? ` (was ${memberName(log.oldAssignee)})`
                : ""}
            </>
          ) : (
            <>
              <strong>{log.changeByName || "Someone"}</strong> assigned the
              ticket to <strong>{memberName(log.newAssignee)}</strong>
            </>
          );
        break;
      case "updated":
        content = (
          <>
            <strong>{log.changeByName || "Someone"}</strong> updated ticket
            details
          </>
        );
        break;
      case "deleted":
        content = <strong>{log.changeByName || "Someone"} deleted the ticket</strong>;
        break;
      default:
        content = <span>{log.actionType || "Activity"}</span>;
    }
    return {
      key: log.logId,
      color: LOG_COLORS[log.actionType] || "gray",
      children: (
        <div>
          <div className="text-sm text-gray-700">{content}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {log.changedAt ? dayjs(log.changedAt).format("MMM D, YYYY HH:mm") : ""}
          </div>
        </div>
      ),
    };
  };

  // ── render ──

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 pr-8">
          <span className="text-gray-400">#{ticket.ticketId}</span>
          <span className="truncate">{ticket.Title}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={640}
      footer={[
        isSupervisor && (
          <Popconfirm
            key="delete"
            title="Delete this ticket permanently?"
            description="This action cannot be undone."
            onConfirm={handleDelete}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        ),
        <Button
          key="edit"
          type="primary"
          ghost
          icon={<EditOutlined />}
          onClick={() => onEdit && onEdit(ticket)}
        >
          Edit
        </Button>,
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ].filter(Boolean)}
    >
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          Description
        </h4>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {ticket.description || (
            <span className="text-gray-400 italic">No description provided.</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Assignee
          </h4>
          {ticket.assignedTo ? (
            <div className="flex items-center gap-2">
              <Avatar size={24} style={{ backgroundColor: "#2E6DB4", fontSize: 11 }}>
                {getInitials(ticket.assigneeName)}
              </Avatar>
              <span>{ticket.assigneeName || "Team member"}</span>
            </div>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Created / Updated
          </h4>
          <div className="text-gray-600">
            {ticket.createdAt ? dayjs(ticket.createdAt).format("MMM D, YYYY HH:mm") : "—"}
            <span className="text-gray-300 mx-1.5">·</span>
            {ticket.updatedAt ? dayjs(ticket.updatedAt).format("MMM D, HH:mm") : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 bg-surface rounded-lg p-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Move to
          </h4>
          {allowedTransitions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {allowedTransitions.map((status) => (
                <Button
                  key={status}
                  size="small"
                  loading={statusPending === status}
                  disabled={statusPending !== null}
                  onClick={() => handleStatusChange(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic m-0">
              No status moves available for you on this ticket.
            </p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Assignment
          </h4>
          {isSupervisor ? (
            <div className="flex items-center gap-2">
              <Select
                placeholder="Select member..."
                allowClear
                showSearch
                optionFilterProp="label"
                size="small"
                style={{ minWidth: 160 }}
                value={ticket.assignedTo ?? undefined}
                options={employees.map((e) => ({
                  value: e.teamMemberId,
                  label: e.fullName,
                }))}
                onChange={(value) => handleAssign(value ?? null)}
                loading={assigning}
              />
              {ticket.assignedTo && (
                <Button
                  size="small"
                  icon={<UserDeleteOutlined />}
                  disabled={assigning}
                  onClick={() => handleAssign(null)}
                >
                  Unassign
                </Button>
              )}
            </div>
          ) : ticket.assignedTo && getMyTeamMemberId() === ticket.assignedTo ? (
            <Button
              size="small"
              icon={<UserDeleteOutlined />}
              loading={assigning}
              onClick={() => handleAssign(null)}
            >
              Unassign myself
            </Button>
          ) : !ticket.assignedTo && ticket.status === "To Do" ? (
            <Button
              size="small"
              icon={<UserAddOutlined />}
              loading={assigning}
              onClick={handleSelfAssign}
            >
              Assign to me
            </Button>
          ) : (
            <p className="text-xs text-gray-400 italic m-0">
              {ticket.assignedTo ? "Assigned to another member." : "Self-assign available in To Do only."}
            </p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          History
        </h4>
        {historyLoading ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : logs.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />
        ) : (
          <Timeline items={logs.map(renderLogItem)} />
        )}
      </div>
    </Modal>
  );
};

export default TicketDetailModal;

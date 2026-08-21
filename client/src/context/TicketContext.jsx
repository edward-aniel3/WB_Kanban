import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { message } from "antd";
import { useAuth } from "./AuthContext";
import { getEmployees } from "../services/employeesService";
import {
  getTickets as getTicketsApi,
  createTicket as createTicketApi,
  updateTicket as updateTicketApi,
  updateTicketStatus as updateTicketStatusApi,
  assignTicket as assignTicketApi,
  getTicketHistory as getTicketHistoryApi,
  deleteTicket as deleteTicketApi,
} from "../services/ticketsService";

const TicketContext = createContext(null);

const PAGE_SIZE = 50;

const KANBAN_STATUSES = ["Backlog", "To Do", "In Progress", "In Review", "Done"];

// Employee allowed workflow
const EMPLOYEE_TRANSITIONS = {
  "To Do": ["In Progress"],
  "In Progress": ["In Review"],
};

const initialState = {
  tickets: [],
  total: 0,
  loading: true,
  loadingMore: false,
  error: null,
  filters: {
    status: null,
    priority: null,
    assignee: null,
    search: "",
  },
  sortBy: "createdAt",
  sortDir: "DESC",
  employees: [],
};

const ticketReducer = (state, action) => {
  switch (action.type) {
    case "SET_TICKETS": {
      const { tickets, total, append } = action.payload;
      if (!append) {
        return { ...state, tickets, total };
      }
      // Append page, skipping duplicates
      const existingIds = new Set(state.tickets.map((t) => t.ticketId));
      const fresh = tickets.filter((t) => !existingIds.has(t.ticketId));
      return { ...state, tickets: [...state.tickets, ...fresh], total };
    }
    case "ADD_TICKET":
      return {
        ...state,
        tickets: [action.payload, ...state.tickets],
        total: state.total + 1,
      };
    case "UPDATE_TICKET": {
      const { ticketId, patch } = action.payload;
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          t.ticketId === ticketId ? { ...t, ...patch } : t
        ),
      };
    }
    case "DELETE_TICKET": {
      const ticketId = action.payload;
      return {
        ...state,
        tickets: state.tickets.filter((t) => t.ticketId !== ticketId),
        total: Math.max(0, state.total - 1),
      };
    }
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_LOADING_MORE":
      return { ...state, loadingMore: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case "SET_SORT": {
      const { sortBy, sortDir } = action.payload;
      return { ...state, sortBy, sortDir };
    }
    case "SET_EMPLOYEES":
      return { ...state, employees: action.payload };
    default:
      return state;
  }
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

export const TicketProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(ticketReducer, initialState);

  // Mirrors state so async callbacks always read the latest values
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const requestIdRef = useRef(0);
  const isSupervisor = user?.role === "Supervisor";

  // Build query params from current filters/sort

  const buildParams = (skip) => {
    const { filters, sortBy, sortDir } = stateRef.current;
    const params = {
      sortBy,
      sortDir,
      skip,
      take: PAGE_SIZE,
    };
    if (filters.priority) params.priority = filters.priority;
    if (filters.assignee === "unassigned") params.unassigned = "true";
    else if (filters.assignee) params.assignee = filters.assignee;
    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }
    return params;
  };

  const fetchTickets = async () => {
    const requestId = ++requestIdRef.current;
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const response = await getTicketsApi(buildParams(0));
      if (requestId !== requestIdRef.current) return; // stale
      const { tickets, total } = response.data.data;
      dispatch({ type: "SET_TICKETS", payload: { tickets, total } });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      dispatch({
        type: "SET_ERROR",
        payload: getErrorMessage(error, "Failed to load tickets."),
      });
    } finally {
      if (requestId === requestIdRef.current) {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
  };

  const loadMore = async () => {
    const { tickets } = stateRef.current;
    const requestId = ++requestIdRef.current;
    dispatch({ type: "SET_LOADING_MORE", payload: true });
    try {
      const response = await getTicketsApi(buildParams(tickets.length));
      if (requestId !== requestIdRef.current) return;
      const { tickets: more, total } = response.data.data;
      dispatch({
        type: "SET_TICKETS",
        payload: { tickets: more, total, append: true },
      });
    } catch (error) {
      message.error(getErrorMessage(error, "Failed to load more tickets."));
    } finally {
      if (requestId === requestIdRef.current) {
        dispatch({ type: "SET_LOADING_MORE", payload: false });
      }
    }
  };

  // Re-fetch when filters or sorting change
  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters.priority, state.filters.assignee, state.filters.search, state.sortBy, state.sortDir]);

  // Supervisors load the team list for assign dropdowns
  useEffect(() => {
    if (!isSupervisor) return;
    let cancelled = false;
    getEmployees()
      .then((response) => {
        if (!cancelled) {
          dispatch({ type: "SET_EMPLOYEES", payload: response.data.data.employees });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSupervisor]);

  // Resolve the current user's teamMemberId from employees list or ticket data
  const getMyTeamMemberId = () => {
    const current = stateRef.current;
    if (isSupervisor) {
      const me = current.employees.find((e) => e.userId === user?.id);
      return me ? me.teamMemberId : null;
    }
    const mine = current.tickets.find(
      (t) => t.assignedTo && t.assigneeName === user?.name
    );
    return mine ? mine.assignedTo : null;
  };

  const isAssignedToMe = (ticket) => {
    if (!ticket) return false;
    const myTeamMemberId = getMyTeamMemberId();
    return (
      (myTeamMemberId != null && ticket.assignedTo === myTeamMemberId) ||
      ticket.assigneeName === user?.name
    );
  };

  // Can the current user drag/move this ticket?
  const canMoveTicket = (ticket) => {
    if (!ticket) return false;
    if (isSupervisor) return true;
    return isAssignedToMe(ticket);
  };

  // Which statuses can this user move the ticket to?
  const getAllowedTransitions = (ticket) => {
    if (!ticket) return [];
    if (isSupervisor) {
      return KANBAN_STATUSES.filter((s) => s !== ticket.status);
    }
    if (!canMoveTicket(ticket)) return [];
    return EMPLOYEE_TRANSITIONS[ticket.status] || [];
  };

  const findAssigneeName = (teamMemberId) => {
    const match = stateRef.current.employees.find(
      (e) => e.teamMemberId === teamMemberId
    );
    return match ? match.fullName : null;
  };

  // API responses don't include assigneeName, so fill it in locally
  const enrichTicket = (ticket) => {
    if (!ticket) return ticket;
    const patch = {};
    if (ticket.assigneeName == null && ticket.assignedTo) {
      patch.assigneeName =
        findAssigneeName(ticket.assignedTo) ||
        (ticket.assignedTo === getMyTeamMemberId() ? user?.name : undefined) ||
        ticket.assigneeName;
    }
    return { ...ticket, ...patch };
  };

  // Client-side filter check (priority, assignee, search)
  const matchesFilters = (ticket) => {
    const { priority, assignee, search } = stateRef.current.filters;
    if (priority && ticket.priority !== priority) return false;
    if (assignee === "unassigned" && ticket.assignedTo != null) return false;
    if (assignee && assignee !== "unassigned" && ticket.assignedTo !== assignee) {
      return false;
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${ticket.Title ?? ""} ${ticket.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  };

  // ── mutations ──

  const addTicket = async (values) => {
    try {
      const response = await createTicketApi(values);
      const ticket = enrichTicket(response.data.data.ticket);
      if (matchesFilters(ticket)) {
        dispatch({ type: "ADD_TICKET", payload: ticket });
      } else {
        fetchTickets();
      }
      message.success(response.data.message || "Ticket created");
      return ticket;
    } catch (error) {
      message.error(getErrorMessage(error, "Failed to create ticket."));
      throw error;
    }
  };

  const editTicket = async (ticketId, values) => {
    try {
      const response = await updateTicketApi(ticketId, values);
      const ticket = enrichTicket(response.data.data.ticket);
      dispatch({
        type: "UPDATE_TICKET",
        payload: { ticketId, patch: ticket },
      });
      message.success(response.data.message || "Ticket updated");
      return ticket;
    } catch (error) {
      message.error(getErrorMessage(error, "Failed to update ticket."));
      throw error;
    }
  };

  // Optimistic status change with rollback on failure
  const changeStatus = async (ticketId, newStatus) => {
    const current = stateRef.current.tickets.find((t) => t.ticketId === ticketId);
    if (!current || current.status === newStatus) return false;

    if (!getAllowedTransitions(current).includes(newStatus)) {
      message.warning(
        isSupervisor
          ? "Invalid status change."
          : "You can only move your assigned tickets To Do → In Progress → In Review."
      );
      return false;
    }

    const previousStatus = current.status;
    // Optimistic update
    dispatch({
      type: "UPDATE_TICKET",
      payload: { ticketId, patch: { status: newStatus } },
    });

    try {
      const response = await updateTicketStatusApi(ticketId, newStatus);
      dispatch({
        type: "UPDATE_TICKET",
        payload: { ticketId, patch: response.data.data.ticket },
      });
      return true;
    } catch (error) {
      // Revert on failure
      dispatch({
        type: "UPDATE_TICKET",
        payload: { ticketId, patch: { status: previousStatus } },
      });
      message.error(getErrorMessage(error, "Failed to update status."));
      return false;
    }
  };

  // Optimistic assign/unassign with rollback
  const assignTicketToUser = async (ticketId, teamMemberId) => {
    const current = stateRef.current.tickets.find((t) => t.ticketId === ticketId);
    if (!current) return false;

    const previous = {
      assignedTo: current.assignedTo,
      assigneeName: current.assigneeName,
    };
    const nextName =
      teamMemberId == null
        ? null
        : findAssigneeName(teamMemberId) ||
          (teamMemberId === getMyTeamMemberId() ? user?.name : previous.assigneeName);

    dispatch({
      type: "UPDATE_TICKET",
      payload: {
        ticketId,
        patch: { assignedTo: teamMemberId ?? null, assigneeName: nextName },
      },
    });

    try {
      const response = await assignTicketApi(ticketId, teamMemberId);
      const ticket = enrichTicket({
        ...previous,
        ...response.data.data.ticket,
      });
      dispatch({ type: "UPDATE_TICKET", payload: { ticketId, patch: ticket } });
      message.success(response.data.message || "Assignment updated");
      return true;
    } catch (error) {
      dispatch({
        type: "UPDATE_TICKET",
        payload: { ticketId, patch: previous },
      });
      message.error(getErrorMessage(error, "Failed to update assignment."));
      return false;
    }
  };

  const removeTicket = async (ticketId) => {
    try {
      const response = await deleteTicketApi(ticketId);
      dispatch({ type: "DELETE_TICKET", payload: ticketId });
      message.success(response.data.message || "Ticket deleted");
      return true;
    } catch (error) {
      message.error(getErrorMessage(error, "Failed to delete ticket."));
      return false;
    }
  };

  const fetchHistory = async (ticketId) => {
    const response = await getTicketHistoryApi(ticketId);
    return response.data.data.logs || [];
  };

  // ── context value ──

  const value = {
    ...state,
    pageSize: PAGE_SIZE,
    isSupervisor,
    setFilters: (patch) => dispatch({ type: "SET_FILTERS", payload: patch }),
    resetFilters: () =>
      dispatch({
        type: "SET_FILTERS",
        payload: { status: null, priority: null, assignee: null, search: "" },
      }),
    setSort: (sortBy, sortDir) =>
      dispatch({ type: "SET_SORT", payload: { sortBy, sortDir } }),
    refresh: fetchTickets,
    loadMore,
    addTicket,
    editTicket,
    changeStatus,
    assignTicketToUser,
    removeTicket,
    fetchHistory,
    getMyTeamMemberId,
    isAssignedToMe,
    canMoveTicket,
    getAllowedTransitions,
  };

  return (
    <TicketContext.Provider value={value}>{children}</TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error("useTickets must be used within a TicketProvider");
  }
  return context;
};

export default TicketContext;

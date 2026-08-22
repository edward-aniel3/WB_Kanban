import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  parseFilters,
  parseSort,
  filterTickets,
  sortTickets,
} from "../utils/ticketFilters";

const TicketContext = createContext(null);

const PAGE_SIZE = 50;
const MAX_PAGES = 40;

const KANBAN_STATUSES = ["Backlog", "To Do", "In Progress", "In Review", "Done"];

// Employee allowed workflow
const EMPLOYEE_TRANSITIONS = {
  "To Do": ["In Progress"],
  "In Progress": ["In Review"],
};

// URL params owned by this context; anything else in the URL is preserved
const MANAGED_PARAMS = ["status", "priority", "assignee", "q"];

const initialState = {
  tickets: [], // full unfiltered dataset
  total: 0,
  loading: true,
  error: null,
  employees: [],
};

const ticketReducer = (state, action) => {
  switch (action.type) {
    case "SET_TICKETS": {
      const { tickets, total } = action.payload;
      return { ...state, tickets, total };
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
    case "SET_ERROR":
      return { ...state, error: action.payload };
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Mirrors state so async callbacks always read the latest values
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const requestIdRef = useRef(0);
  const isSupervisor = user?.role === "Supervisor";

  // ── filters & sorting live in the URL ──

  const activeFilters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const { sortBy, sortDir } = useMemo(() => parseSort(searchParams), [searchParams]);

  const visibleTickets = useMemo(
    () => sortTickets(filterTickets(state.tickets, activeFilters), sortBy, sortDir),
    [state.tickets, activeFilters, sortBy, sortDir]
  );

  const setFilters = (patch) => {
    const next = new URLSearchParams(searchParams);
    MANAGED_PARAMS.forEach((key) => next.delete(key));

    const merged = { ...activeFilters, ...patch };
    if (merged.status) next.set("status", merged.status);
    if (merged.priority) next.set("priority", merged.priority);
    if (merged.assignee != null) next.set("assignee", String(merged.assignee));
    if (merged.search && merged.search.trim()) next.set("q", merged.search.trim());

    // Debounced typing replaces history; discrete control clicks push a step
    const searchOnly =
      Object.keys(patch).length > 0 &&
      Object.keys(patch).every((key) => key === "search");
    setSearchParams(next, { replace: searchOnly });
  };

  const resetFilters = () => {
    const next = new URLSearchParams(searchParams);
    MANAGED_PARAMS.forEach((key) => next.delete(key));
    setSearchParams(next);
  };

  const setSort = (nextSortBy, nextSortDir) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", `${nextSortBy}:${nextSortDir}`);
    setSearchParams(next);
  };

  // ── data loading: fetch everything once, paged until complete ──

  const fetchAllTickets = async () => {
    const requestId = ++requestIdRef.current;
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      let accumulated = [];
      let total = 0;

      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await getTicketsApi({
          sortBy: "createdAt",
          sortDir: "ASC",
          skip: accumulated.length,
          take: PAGE_SIZE,
        });
        if (requestId !== requestIdRef.current) return; // stale

        const data = response.data.data || {};
        const batch = data.tickets || [];
        total =
          typeof data.total === "number"
            ? data.total
            : accumulated.length + batch.length;

        const seen = new Set(accumulated.map((t) => t.ticketId));
        accumulated = [...accumulated, ...batch.filter((t) => !seen.has(t.ticketId))];

        if (accumulated.length >= total || batch.length === 0) break;
      }

      if (requestId !== requestIdRef.current) return;
      dispatch({ type: "SET_TICKETS", payload: { tickets: accumulated, total } });
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

  useEffect(() => {
    fetchAllTickets();
  }, []);

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

  // ── mutations ──

  const addTicket = async (values) => {
    try {
      const response = await createTicketApi(values);
      const ticket = enrichTicket(response.data.data.ticket);
      dispatch({ type: "ADD_TICKET", payload: ticket });
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
    // Derived view with filters/sort applied on top of the full dataset.
    // Mutations keep operating on the raw array via stateRef.
    tickets: visibleTickets,
    filters: activeFilters,
    sortBy,
    sortDir,
    isSupervisor,
    setFilters,
    resetFilters,
    setSort,
    refresh: fetchAllTickets,
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

// Pure ticket filtering/sorting helpers.
// the full dataset is fetched once
// use URL search params.

export const TICKET_STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

export const TICKET_PRIORITIES = ["Low", "Medium", "High"];

const SORT_FIELDS = ["createdAt", "priority"];
const SORT_DIRECTIONS = ["ASC", "DESC"];
const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

// API returns the title field capitalized ("Title"), not "title"
const titleOf = (ticket) => ticket.title ?? ticket.Title ?? "";

// Parse + validate URL params into the internal filter shape.
export function parseFilters(searchParams) {
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assignee = searchParams.get("assignee");

  return {
    status: TICKET_STATUSES.includes(status) ? status : null,
    priority: TICKET_PRIORITIES.includes(priority) ? priority : null,
    assignee:
      assignee === "unassigned"
        ? "unassigned"
        : /^\d+$/.test(assignee || "")
          ? Number(assignee)
          : null,
    search: (searchParams.get("q") || "").trim(),
  };
}

export function parseSort(searchParams) {
  const raw = searchParams.get("sort") || "";
  const [field, dir] = raw.split(":");
  return {
    sortBy: SORT_FIELDS.includes(field) ? field : "createdAt",
    sortDir: SORT_DIRECTIONS.includes(dir) ? dir : "DESC",
  };
}

export function filterTickets(tickets, { status, priority, assignee, search }) {
  const q = search ? search.toLowerCase() : "";
  return tickets.filter((ticket) => {
    if (status && ticket.status !== status) return false;
    if (priority && ticket.priority !== priority) return false;
    if (assignee === "unassigned") {
      if (ticket.assignedTo != null) return false;
    } else if (assignee != null && ticket.assignedTo !== assignee) {
      return false;
    }
    if (q) {
      const haystack =
        `${titleOf(ticket)} ${ticket.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortTickets(tickets, sortBy, sortDir) {
  const dir = sortDir === "ASC" ? 1 : -1;
  return [...tickets].sort((a, b) => {
    let diff;
    if (sortBy === "priority") {
      diff = (PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0);
    } else {
      diff = new Date(a.createdAt) - new Date(b.createdAt);
    }
    // Stable tiebreaker keeps card order predictable between renders
    if (diff === 0) diff = a.ticketId - b.ticketId;
    return diff * dir;
  });
}

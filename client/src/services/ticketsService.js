import axiosInstance from "../utils/axiosInstance";

/*
 Tickets service layer.
 VITE_API base url
 GET    /tickets            list + filter + sort + paginate
 POST   /tickets            create
 GET    /tickets/:id        single ticket
 PUT    /tickets/:id        update details (title/description/priority)
 PATCH  /tickets/:id/status update status
 PATCH  /tickets/:id/assign assign / unassign
 GET    /tickets/:id/history audit trail
 DELETE /tickets/:id        delete (Supervisor only)
 */

export const getTickets = (params) => {
  return axiosInstance.get("/tickets", { params });
};

export const getTicketById = (ticketId) => {
  return axiosInstance.get(`/tickets/${ticketId}`);
};

export const createTicket = (data) => {
  return axiosInstance.post("/tickets", data);
};

export const updateTicket = (ticketId, data) => {
  return axiosInstance.put(`/tickets/${ticketId}`, data);
};

export const updateTicketStatus = (ticketId, status) => {
  return axiosInstance.patch(`/tickets/${ticketId}/status`, { status });
};

/*
 Assign (teamMemberId) or unassign (null).
 */
export const assignTicket = (ticketId, teamMemberId) => {
  const body = teamMemberId === null || teamMemberId === undefined
    ? {}
    : { assignedTo: teamMemberId };
  return axiosInstance.patch(`/tickets/${ticketId}/assign`, body);
};

export const getTicketHistory = (ticketId) => {
  return axiosInstance.get(`/tickets/${ticketId}/history`);
};

export const deleteTicket = (ticketId) => {
  return axiosInstance.delete(`/tickets/${ticketId}`);
};

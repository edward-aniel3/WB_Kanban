import { TicketProvider } from "../context/TicketContext";
import KanbanBoard from "../components/kanban/KanbanBoard";

// Wraps the board in the ticket context provider
const KanbanPage = () => (
  <TicketProvider>
    <KanbanBoard />
  </TicketProvider>
);

export default KanbanPage;

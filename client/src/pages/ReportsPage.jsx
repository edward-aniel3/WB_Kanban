import { useMemo } from "react";
import { Alert, Button, Empty, Spin, Statistic } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { TicketProvider, useTickets } from "../context/TicketContext";
import FilterBar from "../components/kanban/FilterBar";

const STATUSES = ["Backlog", "To Do", "In Progress", "In Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];

// Matches the board column palette
const STATUS_COLORS = {
  Backlog: "#6B7280",
  "To Do": "#3B82F6",
  "In Progress": "#F59E0B",
  "In Review": "#8B5CF6",
  Done: "#10B981",
};

const PRIORITY_COLORS = {
  Low: "#10B981",
  Medium: "#F59E0B",
  High: "#EF4444",
};

const ASSIGNEE_COLOR = "#6366F1";

const cardClass = "bg-white rounded-lg border border-border shadow-sm";

const pluralize = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const ReportsDashboard = () => {
  const { tickets, loading, error, refresh, isSupervisor } = useTickets();

  const handleRefresh = () => {
    refresh();
  };

  const stats = useMemo(() => {
    const byStatus = STATUSES.map((status) => ({
      name: status,
      count: tickets.filter((t) => t.status === status).length,
    }));

    const byPriority = PRIORITIES.map((priority) => ({
      name: priority,
      count: tickets.filter((t) => t.priority === priority).length,
    })).filter((row) => row.count > 0);

    const assigneeCounts = {};
    tickets.forEach((t) => {
      const name = t.assigneeName || "Unassigned";
      assigneeCounts[name] = (assigneeCounts[name] || 0) + 1;
    });
    const byAssignee = Object.entries(assigneeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const doneCount = byStatus.find((s) => s.name === "Done")?.count || 0;
    const unassignedCount = tickets.filter((t) => !t.assigneeName).length;
    const highOpenCount = tickets.filter(
      (t) => t.priority === "High" && t.status !== "Done"
    ).length;

    return {
      byStatus,
      byPriority,
      byAssignee,
      kpis: {
        total: tickets.length,
        doneCount,
        donePct:
          tickets.length > 0 ? Math.round((doneCount / tickets.length) * 100) : 0,
        unassignedCount,
        highOpenCount,
      },
    };
  }, [tickets]);

  const subtitle = loading
    ? "Loading..."
    : `${pluralize(tickets.length, "ticket")} in current view`;

  const assigneeChartHeight = Math.max(240, stats.byAssignee.length * 40 + 60);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
          <p className="text-gray-500 mt-0.5 text-sm">{subtitle}</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
      </div>

      <div className="mt-4">
        <FilterBar hideSort />
      </div>

      <div className="mt-4">
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load reports"
            description={error}
            action={
              <Button size="small" danger onClick={handleRefresh}>
                Retry
              </Button>
            }
          />
        ) : loading ? (
          <div className={`${cardClass} flex items-center justify-center p-16`}>
            <Spin size="large" />
          </div>
        ) : tickets.length === 0 ? (
          <div className={`${cardClass} p-12`}>
            <Empty description="No tickets match the current filters." />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className={`${cardClass} p-4`}>
                <Statistic title="Total Tickets" value={stats.kpis.total} />
              </div>
              <div className={`${cardClass} p-4`}>
                <Statistic
                  title="Completed"
                  value={stats.kpis.donePct}
                  suffix="%"
                  valueStyle={{ color: STATUS_COLORS.Done }}
                />
                <p className="text-gray-400 text-xs mt-1">
                  {stats.kpis.doneCount} in Done
                </p>
              </div>
              <div className={`${cardClass} p-4`}>
                <Statistic
                  title="Unassigned"
                  value={stats.kpis.unassignedCount}
                  valueStyle={{
                    color: stats.kpis.unassignedCount > 0 ? "#F59E0B" : undefined,
                  }}
                />
              </div>
              <div className={`${cardClass} p-4`}>
                <Statistic
                  title="Open High Priority"
                  value={stats.kpis.highOpenCount}
                  valueStyle={{
                    color: stats.kpis.highOpenCount > 0 ? "#EF4444" : undefined,
                  }}
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-2">
              <div className={`${cardClass} p-4`}>
                <h3 className="font-semibold text-gray-700 mb-3">
                  Tickets by Status
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.byStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stats.byStatus.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={`${cardClass} p-4`}>
                <h3 className="font-semibold text-gray-700 mb-3">
                  Tickets by Priority
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.byPriority}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {stats.byPriority.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PRIORITY_COLORS[entry.name]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {isSupervisor && (
                <div className={`${cardClass} p-4 lg:col-span-2`}>
                  <h3 className="font-semibold text-gray-700 mb-3">
                    Tickets by Assignee
                  </h3>
                  <ResponsiveContainer
                    width="100%"
                    height={assigneeChartHeight}
                  >
                    <BarChart
                      data={stats.byAssignee}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={ASSIGNEE_COLOR}
                        radius={[0, 6, 6, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Own TicketProvider instance so report filters stay independent of the board
const ReportsPage = () => (
  <TicketProvider>
    <ReportsDashboard />
  </TicketProvider>
);

export default ReportsPage;

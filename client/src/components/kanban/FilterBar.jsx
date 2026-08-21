import { useEffect, useRef, useState } from "react";
import { Input, Select, Button } from "antd";
import { SearchOutlined, ClearOutlined } from "@ant-design/icons";
import { useTickets } from "../../context/TicketContext";

const STATUS_OPTIONS = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Done",
].map((s) => ({ value: s, label: s }));

const PRIORITY_OPTIONS = ["Low", "Medium", "High"].map((p) => ({
  value: p,
  label: p,
}));

const SORT_OPTIONS = [
  { value: "createdAt:DESC", label: "Newest first" },
  { value: "createdAt:ASC", label: "Oldest first" },
  { value: "priority:DESC", label: "Priority (High → Low)" },
  { value: "priority:ASC", label: "Priority (Low → High)" },
];

// Board filter, sort, and search controls
const FilterBar = () => {
  const {
    filters,
    setFilters,
    resetFilters,
    sortBy,
    sortDir,
    setSort,
    employees,
    isSupervisor,
  } = useTickets();

  // Debounce the search input before dispatching
  const [searchText, setSearchText] = useState(filters.search);
  const latestSearchRef = useRef(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== latestSearchRef.current) {
        latestSearchRef.current = searchText;
        setFilters({ search: searchText });
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Sync local input when filters are reset externally
  useEffect(() => {
    setSearchText(filters.search);
    latestSearchRef.current = filters.search;
  }, [filters.search]);

  const assigneeOptions = isSupervisor
    ? [
        { value: "unassigned", label: "Unassigned" },
        ...employees.map((e) => ({
          value: e.teamMemberId,
          label: e.fullName,
        })),
      ]
    : [{ value: "unassigned", label: "Unassigned" }];

  const hasActiveFilters =
    filters.status || filters.priority || filters.assignee || filters.search;

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
      <Select
        placeholder="Status"
        allowClear
        style={{ minWidth: 140 }}
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(value) => setFilters({ status: value ?? null })}
      />

      <Select
        placeholder="Priority"
        allowClear
        style={{ minWidth: 130 }}
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={(value) => setFilters({ priority: value ?? null })}
      />

      <Select
        placeholder="Assignee"
        allowClear
        showSearch
        optionFilterProp="label"
        style={{ minWidth: 150 }}
        value={filters.assignee}
        options={assigneeOptions}
        onChange={(value) => setFilters({ assignee: value ?? null })}
      />

      <Input
        prefix={<SearchOutlined className="text-gray-400" />}
        placeholder="Search title or description..."
        allowClear
        style={{ width: 240 }}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      <Select
        style={{ minWidth: 180 }}
        value={`${sortBy}:${sortDir}`}
        options={SORT_OPTIONS}
        onChange={(value) => {
          const [nextSortBy, nextSortDir] = value.split(":");
          setSort(nextSortBy, nextSortDir);
        }}
      />

      {hasActiveFilters ? (
        <Button
          icon={<ClearOutlined />}
          onClick={() => {
            resetFilters();
            setSearchText("");
            latestSearchRef.current = "";
          }}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
};

export default FilterBar;

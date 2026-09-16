import React, { useState, useEffect, useCallback } from "react";
import { getStaffTicketsApi, fetchCategories, Category } from "../api.js";
import {
  StaffTicketSummaryDTO,
  StaffQueueQueryParams,
  Priority,
  TicketStatus,
} from "../types/index.js";

interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: number) => void;
}

export function StaffTicketQueue({ onSelectTicket }: StaffTicketQueueProps) {
  // Data states
  const [tickets, setTickets] = useState<StaffTicketSummaryDTO[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search input and debounce state (300ms)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filter dropdown states
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");

  // Sort states
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 1. Fetch categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catList = await fetchCategories();
        if (isMounted) {
          setCategories(catList);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. 300ms debounce on search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // 3. Load tickets from backend API
  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: StaffQueueQueryParams = {
        search: debouncedSearch || undefined,
        status: selectedStatus || undefined,
        category: selectedCategory || undefined,
        priority: selectedPriority || undefined,
        owner: selectedOwner || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      };

      const response = await getStaffTicketsApi(params);
      setTickets(response.items);
      setTotalCount(response.totalCount);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket queue. Please try again.");
      setTickets([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    selectedStatus,
    selectedCategory,
    selectedPriority,
    selectedOwner,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Clear all filters handler
  function handleClearFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedStatus("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedOwner("");
    setCurrentPage(1);
  }

  // Toggle sorting on column click
  function handleSortToggle(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "ticketNumber" ? "asc" : "desc");
    }
    setCurrentPage(1);
  }

  const isFilterActive = Boolean(
    debouncedSearch ||
      selectedStatus ||
      selectedCategory ||
      selectedPriority ||
      selectedOwner
  );

  // Status Badge Helper
  function renderStatusBadge(status: string) {
    const norm = status.toUpperCase().replace(/\s+/g, "_");
    let bg = "#F3F4F6";
    let color = "#374151";
    let border = "#D1D5DB";
    let label = status;

    switch (norm) {
      case "NEW":
        bg = "#EBF5FF";
        color = "#1E429F";
        border = "#93C5FD";
        label = "New";
        break;
      case "OPEN":
        bg = "#F3E8FF";
        color = "#6B21A8";
        border = "#D8B4FE";
        label = "Open";
        break;
      case "IN_PROGRESS":
        bg = "#FEF08A";
        color = "#854D0E";
        border = "#FDE047";
        label = "In Progress";
        break;
      case "WAITING_FOR_REQUESTER":
        bg = "#FFEDD5";
        color = "#9A3412";
        border = "#FDBA74";
        label = "Waiting for Requester";
        break;
      case "RESOLVED":
        bg = "#EAF6EF";
        color = "#006B3C";
        border = "#A7F3D0";
        label = "Resolved";
        break;
      case "CLOSED":
        bg = "#F3F4F6";
        color = "#374151";
        border = "#D1D5DB";
        label = "Closed";
        break;
      case "REOPENED":
        bg = "#FEE2E2";
        color = "#991B1B";
        border = "#FCA5A5";
        label = "Reopened";
        break;
      case "CANCELLED":
        bg = "#F1F5F9";
        color = "#64748B";
        border = "#CBD5E1";
        label = "Cancelled";
        break;
    }

    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center"
        style={{
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          padding: "0.35rem 0.65rem",
          fontWeight: 600,
          fontSize: "0.78rem",
        }}
      >
        {label}
      </span>
    );
  }

  // Priority Badge Helper
  function renderPriorityBadge(priority: Priority | string | null | undefined) {
    if (!priority) {
      return (
        <span
          className="badge rounded-pill"
          style={{
            backgroundColor: "#F9FAFB",
            color: "#9CA3AF",
            border: "1px dashed #D1D5DB",
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          Unassigned
        </span>
      );
    }

    const norm = priority.toUpperCase();
    let bg = "#F3F4F6";
    let color = "#4B5563";
    let border = "#D1D5DB";
    let label = priority;

    switch (norm) {
      case "URGENT":
        bg = "#FEE2E2";
        color = "#991B1B";
        border = "#EF4444";
        label = "Urgent";
        break;
      case "HIGH":
        bg = "#FFEDD5";
        color = "#C2410C";
        border = "#FB923C";
        label = "High";
        break;
      case "MEDIUM":
        bg = "#EBF5FF";
        color = "#1E40AF";
        border = "#93C5FD";
        label = "Medium";
        break;
      case "LOW":
        bg = "#F3F4F6";
        color = "#4B5563";
        border = "#D1D5DB";
        label = "Low";
        break;
    }

    return (
      <span
        className="badge rounded-pill"
        style={{
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          padding: "0.3rem 0.6rem",
          fontWeight: norm === "URGENT" ? 700 : 600,
          fontSize: "0.75rem",
        }}
      >
        {label}
      </span>
    );
  }

  // Owner Badge Helper
  function renderOwnerBadge(owner: { id: number; name: string; email: string } | null) {
    if (!owner) {
      return (
        <span
          className="badge rounded-pill"
          style={{
            backgroundColor: "#F9FAFB",
            color: "#6B7280",
            border: "1px dashed #9CA3AF",
            padding: "0.3rem 0.55rem",
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          Unassigned
        </span>
      );
    }

    return (
      <span className="fw-semibold text-dark small" title={owner.email}>
        {owner.name}
      </span>
    );
  }

  // Date Formatter Helper
  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="container-fluid px-0">
      {/* Header Bar */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--color-primary-green)" }}
          >
            IT Staff Ticket Queue
          </h2>
          <p className="text-muted small mb-0">
            Monitor, prioritize, and triage support requests across all university departments.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span
            className="badge rounded-pill px-3 py-2"
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            {totalCount} {totalCount === 1 ? "Ticket" : "Tickets"}
          </span>
        </div>
      </div>

      {/* Control Bar: Search & Filter Grid */}
      <div className="card-zen p-3 p-md-4 mb-4">
        <div className="row g-3">
          {/* Search Input */}
          <div className="col-12 col-lg-4">
            <label htmlFor="queue-search" className="form-label small fw-semibold text-muted mb-1">
              Search Tickets
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                id="queue-search"
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search ticket #, summary, requester..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="queue-search-input"
              />
              {searchInput && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setSearchInput("")}
                  title="Clear search"
                  style={{ height: "38px" }}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-sm-4 col-lg-2">
            <label htmlFor="queue-status" className="form-label small fw-semibold text-muted mb-1">
              Status
            </label>
            <select
              id="queue-status"
              className="form-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="queue-filter-status"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-sm-4 col-lg-2">
            <label htmlFor="queue-category" className="form-label small fw-semibold text-muted mb-1">
              Category
            </label>
            <select
              id="queue-category"
              className="form-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="queue-filter-category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code || c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* IT Priority Filter */}
          <div className="col-6 col-sm-4 col-lg-2">
            <label htmlFor="queue-priority" className="form-label small fw-semibold text-muted mb-1">
              Priority
            </label>
            <select
              id="queue-priority"
              className="form-select"
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="queue-filter-priority"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="UNASSIGNED">Unassigned</option>
            </select>
          </div>

          {/* Owner Filter */}
          <div className="col-6 col-sm-4 col-lg-2">
            <label htmlFor="queue-owner" className="form-label small fw-semibold text-muted mb-1">
              Owner
            </label>
            <select
              id="queue-owner"
              className="form-select"
              value={selectedOwner}
              onChange={(e) => {
                setSelectedOwner(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="queue-filter-owner"
            >
              <option value="">All Owners</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="Sompong IT">Sompong IT</option>
              <option value="Wichai Support">Wichai Support</option>
              <option value="Anong Network">Anong Network</option>
            </select>
          </div>
        </div>

        {/* Clear Filters CTA */}
        {isFilterActive && (
          <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top">
            <span className="small text-muted">
              Filtering active results
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
              onClick={handleClearFilters}
              data-testid="queue-clear-filters"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main View Area: Loading, Error, Empty, No-Results, or Data Content */}
      {loading ? (
        <div className="card-zen p-4 text-center" data-testid="queue-skeleton">
          <div className="spinner-border text-success my-4" role="status">
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <div className="d-flex flex-column gap-3 w-100 max-w-lg mx-auto">
            <div className="placeholder-glow">
              <span className="placeholder col-12 py-2 rounded"></span>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-10 py-2 rounded"></span>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-11 py-2 rounded"></span>
            </div>
          </div>
        </div>
      ) : error ? (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3"
          role="alert"
          data-testid="queue-error"
        >
          <div className="d-flex align-items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={loadTickets}
            data-testid="queue-error-retry"
          >
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        isFilterActive ? (
          <div className="card-zen p-5 text-center my-4" data-testid="queue-no-results">
            <div className="mb-3 text-muted">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </div>
            <h5 className="fw-semibold">No Tickets Match Your Filters</h5>
            <p className="text-muted small mx-auto" style={{ maxWidth: "450px" }}>
              We could not find any tickets matching your search query or filter criteria. Try adjusting or clearing your filters.
            </p>
            <button
              type="button"
              className="btn btn-primary-green mt-2"
              onClick={handleClearFilters}
              data-testid="queue-clear-filters-cta"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="card-zen p-5 text-center my-4" data-testid="queue-empty">
            <div className="mb-3 text-muted">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <h5 className="fw-semibold">No Tickets in Queue</h5>
            <p className="text-muted small">
              There are currently no tickets submitted to the IT queue.
            </p>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="d-none d-md-block card-zen overflow-hidden mb-4">
            <div className="table-responsive">
              <table
                className="table table-hover align-middle mb-0"
                data-testid="staff-queue-table"
              >
                <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
                  <tr>
                    <th
                      scope="col"
                      className="ps-3 py-3 text-muted small fw-bold text-nowrap cursor-pointer user-select-none"
                      onClick={() => handleSortToggle("ticketNumber")}
                      data-testid="sort-ticketNumber"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Ticket #
                        {sortBy === "ticketNumber" && (
                          <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="py-3 text-muted small fw-bold" style={{ minWidth: "200px" }}>
                      Summary
                    </th>
                    <th
                      scope="col"
                      className="py-3 text-muted small fw-bold text-nowrap cursor-pointer user-select-none"
                      onClick={() => handleSortToggle("category")}
                      data-testid="sort-category"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Category
                        {sortBy === "category" && (
                          <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="py-3 text-muted small fw-bold text-nowrap cursor-pointer user-select-none"
                      onClick={() => handleSortToggle("itPriority")}
                      data-testid="sort-itPriority"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Priority
                        {sortBy === "itPriority" && (
                          <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="py-3 text-muted small fw-bold text-nowrap cursor-pointer user-select-none"
                      onClick={() => handleSortToggle("currentStatus")}
                      data-testid="sort-currentStatus"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Status
                        {sortBy === "currentStatus" && (
                          <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="py-3 text-muted small fw-bold">
                      Requester
                    </th>
                    <th scope="col" className="py-3 text-muted small fw-bold">
                      Owner
                    </th>
                    <th
                      scope="col"
                      className="pe-3 py-3 text-muted small fw-bold text-nowrap cursor-pointer user-select-none"
                      onClick={() => handleSortToggle("createdAt")}
                      data-testid="sort-createdAt"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Created
                        {sortBy === "createdAt" && (
                          <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      data-testid={`queue-row-${t.id}`}
                      onClick={() => onSelectTicket && onSelectTicket(t.id)}
                      style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                    >
                      <td className="ps-3 py-3 fw-bold font-monospace text-nowrap" style={{ color: "var(--color-primary-green)" }}>
                        {t.ticketNumber}
                      </td>
                      <td className="py-3">
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: "340px" }} title={t.summary}>
                          {t.summary}
                        </div>
                      </td>
                      <td className="py-3 text-nowrap">
                        <span className="badge rounded-pill bg-light text-dark border">
                          {t.category?.name || "General"}
                        </span>
                      </td>
                      <td className="py-3 text-nowrap">
                        {renderPriorityBadge(t.itPriority)}
                      </td>
                      <td className="py-3 text-nowrap">
                        {renderStatusBadge(t.currentStatus)}
                      </td>
                      <td className="py-3 text-nowrap">
                        <div className="small fw-semibold">{t.requester.name}</div>
                        {t.requester.department && (
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            {t.requester.department}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-nowrap">
                        {renderOwnerBadge(t.owner)}
                      </td>
                      <td className="pe-3 py-3 text-nowrap text-muted small">
                        {formatDate(t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card View (< 768px - DEC-UI-09) */}
          <div
            className="d-block d-md-none mb-4"
            data-testid="staff-queue-mobile-cards"
          >
            <div className="d-flex flex-column gap-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="card-zen p-3 shadow-sm cursor-pointer"
                  data-testid={`queue-card-${t.id}`}
                  onClick={() => onSelectTicket && onSelectTicket(t.id)}
                  style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold font-monospace" style={{ color: "var(--color-primary-green)" }}>
                      {t.ticketNumber}
                    </span>
                    {renderStatusBadge(t.currentStatus)}
                  </div>
                  <h6 className="fw-semibold text-dark mb-2 text-truncate-2">
                    {t.summary}
                  </h6>
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                    <span className="badge rounded-pill bg-light text-dark border small">
                      {t.category?.name || "General"}
                    </span>
                    {renderPriorityBadge(t.itPriority)}
                  </div>
                  <div className="d-flex align-items-center justify-content-between pt-2 border-top text-muted small">
                    <div>
                      <span className="fw-medium text-dark">{t.requester.name}</span>
                      {t.requester.department && ` (${t.requester.department})`}
                    </div>
                    <div>{renderOwnerBadge(t.owner)}</div>
                  </div>
                  <div className="text-end text-muted mt-1" style={{ fontSize: "0.72rem" }}>
                    Created {formatDate(t.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Toolbar */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 py-2">
            <div className="d-flex align-items-center gap-2 small text-muted">
              <span>Show</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                data-testid="queue-page-size-select"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>
                per page &bull; Showing {tickets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tickets
              </span>
            </div>

            <nav aria-label="Queue Pagination">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    data-testid="queue-page-prev"
                    aria-label="Previous page"
                  >
                    &laquo; Prev
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link text-dark fw-semibold">
                    Page {currentPage} of {Math.max(1, totalPages)}
                  </span>
                </li>
                <li className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    data-testid="queue-page-next"
                    aria-label="Next page"
                  >
                    Next &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

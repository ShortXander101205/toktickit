import React, { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { fetchTickets, fetchCategories, Category } from "../api.js";
import { Ticket } from "../types/index.js";

interface MyTicketsProps {
  onCreateTicket?: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export function MyTickets({ onCreateTicket, onSelectTicket }: MyTicketsProps) {
  const { currentRequester } = useRequester();

  // Data states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search input and debounce state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filter dropdown states
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedReqPriority, setSelectedReqPriority] = useState("");
  const [selectedItPriority, setSelectedItPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Sort states
  const [sortBy, setSortBy] = useState<"ticketNumber" | "createdAt" | "currentStatus" | "updatedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 1. Fetch available categories once on mount
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

  // 2. 300ms Client-Side Debounce for Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1); // Reset page on new search keyword
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // 3. Main Data Fetching Function
  const loadTickets = useCallback(async () => {
    if (!currentRequester) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchTickets(
        {
          search: debouncedSearch || undefined,
          category: selectedCategory || undefined,
          requestedPriority: selectedReqPriority || undefined,
          itPriority: selectedItPriority || undefined,
          status: selectedStatus || undefined,
          sortBy,
          sortOrder,
          page: currentPage,
          pageSize,
        },
        currentRequester.id
      );

      setTickets(response.data);
      setTotalCount(response.pagination.totalCount);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to load tickets. Please check your connection and try again.");
      setTickets([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [
    currentRequester,
    debouncedSearch,
    selectedCategory,
    selectedReqPriority,
    selectedItPriority,
    selectedStatus,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  // Trigger ticket fetch whenever query dependencies change
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // 4. Instant Context Synchronization when active requester switches
  useEffect(() => {
    // When requester identity switches: clear old cache and reset filters
    setTickets([]);
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedReqPriority("");
    setSelectedItPriority("");
    setSelectedStatus("");
    setCurrentPage(1);
  }, [currentRequester?.id]);

  // 5. Filter & Sort Handlers
  function handleClearFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedReqPriority("");
    setSelectedItPriority("");
    setSelectedStatus("");
    setCurrentPage(1);
  }

  function handleSortToggle(field: "ticketNumber" | "createdAt" | "currentStatus" | "updatedAt") {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "ticketNumber" ? "asc" : "desc");
    }
    setCurrentPage(1);
  }

  const isFilterActive = Boolean(
    debouncedSearch || selectedCategory || selectedReqPriority || selectedItPriority || selectedStatus
  );

  // Status Badge Renderer (paired color, text label, and micro-icon - DEC-UI-19)
  function renderStatusBadge(status: string) {
    switch (status) {
      case "New":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#EBF5FF", color: "#1E429F", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            New
          </span>
        );
      case "Assigned":
      case "In Progress":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#FEF08A", color: "#854D0E", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            {status}
          </span>
        );
      case "Pending Requester":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#FFEDD5", color: "#9A3412", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Pending Requester
          </span>
        );
      case "Resolved":
      case "Closed":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#EAF6EF", color: "#006B3C", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {status}
          </span>
        );
      case "Cancelled":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#F3F4F6", color: "#4B5563", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Cancelled
          </span>
        );
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  }

  // Priority Badge Renderer (DEC-UI-19)
  function renderPriorityBadge(priority: string | null | undefined) {
    if (!priority) {
      return (
        <span
          className="badge rounded-pill d-inline-flex align-items-center"
          style={{ backgroundColor: "#F3F4F6", color: "#6B7280", padding: "0.35rem 0.65rem" }}
        >
          Unassigned
        </span>
      );
    }

    switch (priority) {
      case "Low":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#F3F4F6", color: "#374151", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            Low
          </span>
        );
      case "Medium":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Medium
          </span>
        );
      case "High":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#FFEDD5", color: "#C2410C", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            High
          </span>
        );
      case "Urgent":
        return (
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: "#FEE2E2", color: "#991B1B", padding: "0.35rem 0.65rem" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Urgent
          </span>
        );
      default:
        return <span className="badge bg-light text-dark">{priority}</span>;
    }
  }

  // Format date helper
  function formatDate(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  }

  return (
    <div className="my-tickets-container">
      {/* Header & Primary Action */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
            My Tickets
          </h1>
          <p className="text-muted small mb-0">
            Track, search, and manage your submitted IT service desk requests.
          </p>
        </div>
        {onCreateTicket && (
          <button
            type="button"
            className="btn btn-primary-green d-flex align-items-center gap-2 px-3 py-2 fw-semibold"
            style={{ height: "38px", borderRadius: "6px" }}
            onClick={onCreateTicket}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            + Create Ticket
          </button>
        )}
      </div>

      {/* Filter and Search Bar Card */}
      <div
        className="card border-0 shadow-sm p-3 mb-4"
        style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
      >
        <div className="row g-3 align-items-center">
          {/* Keyword Search with Debounce */}
          <div className="col-12 col-lg-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by ticket number or summary..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ height: "38px", fontSize: "0.875rem" }}
                aria-label="Search tickets"
              />
              {searchInput && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setSearchInput("")}
                  title="Clear search"
                  style={{ height: "38px" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: "38px", fontSize: "0.875rem" }}
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Priority Dropdown */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedReqPriority}
              onChange={(e) => {
                setSelectedReqPriority(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: "38px", fontSize: "0.875rem" }}
              aria-label="Filter by Requested Priority"
            >
              <option value="">All Requested Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* IT Priority Dropdown */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedItPriority}
              onChange={(e) => {
                setSelectedItPriority(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: "38px", fontSize: "0.875rem" }}
              aria-label="Filter by IT Priority"
            >
              <option value="">All IT Priorities</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: "38px", fontSize: "0.875rem" }}
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Requester">Pending Requester</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          {isFilterActive && (
            <div className="col-12 col-lg-auto ms-lg-auto">
              <button
                type="button"
                className="btn btn-outline-secondary w-100 fw-semibold"
                style={{ height: "38px", fontSize: "0.875rem", borderRadius: "6px" }}
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>
            <strong>Error loading tickets:</strong> {error}
          </div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: "8px" }}>
          <div className="placeholder-glow">
            <div className="placeholder col-12 mb-3" style={{ height: "24px" }}></div>
            <div className="placeholder col-12 mb-3" style={{ height: "38px" }}></div>
            <div className="placeholder col-12 mb-3" style={{ height: "38px" }}></div>
            <div className="placeholder col-12 mb-3" style={{ height: "38px" }}></div>
          </div>
        </div>
      ) : totalCount === 0 ? (
        // Empty State vs No-Results State (DEC-UI-16)
        !isFilterActive ? (
          /* Empty State: Requester has submitted 0 tickets overall */
          <div
            className="card border-0 shadow-sm text-center p-5 my-4"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary-green)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-6l-2 3h-4l-2-3H2"></path>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
              </svg>
            </div>
            <h2 className="h5 fw-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
              No Support Tickets Yet
            </h2>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "450px" }}>
              You have not submitted any IT support tickets yet. Need help with hardware, software, or network access?
            </p>
            {onCreateTicket && (
              <div>
                <button
                  type="button"
                  className="btn btn-primary-green px-4 py-2 fw-semibold"
                  style={{ borderRadius: "6px" }}
                  onClick={onCreateTicket}
                >
                  + Create Ticket
                </button>
              </div>
            )}
          </div>
        ) : (
          /* No-Results State: Search or filters matched 0 tickets */
          <div
            className="card border-0 shadow-sm text-center p-5 my-4"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center text-muted"
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "#F3F4F6",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h2 className="h5 fw-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
              No matching tickets found
            </h2>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "450px" }}>
              No tickets match your search keyword or selected filters. Try adjusting your query or clear filters.
            </p>
            <div>
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2 fw-semibold"
                style={{ borderRadius: "6px" }}
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )
      ) : (
        /* Data Render: Desktop Table + Mobile Cards */
        <>
          {/* Desktop Table Grid (>= 992px) */}
          <div
            className="card border-0 shadow-sm mb-4 d-none d-md-block"
            style={{ borderRadius: "8px", overflow: "hidden", backgroundColor: "var(--color-surface-card)" }}
          >
            <div className="table-responsive mb-0">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.875rem" }}>
                <thead style={{ backgroundColor: "#FAFCFA", borderBottom: "2px solid var(--color-pale-green)" }}>
                  <tr>
                    {/* Ticket No Header */}
                    <th
                      scope="col"
                      className="py-3 px-3 fw-semibold user-select-none"
                      style={{ cursor: "pointer", color: "var(--color-text-primary)" }}
                      onClick={() => handleSortToggle("ticketNumber")}
                      aria-sort={sortBy === "ticketNumber" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <div className="d-flex align-items-center gap-1">
                        <span>Ticket No</span>
                        <span style={{ fontSize: "0.75rem", color: sortBy === "ticketNumber" ? "var(--color-primary-green)" : "#9CA3AF" }}>
                          {sortBy === "ticketNumber" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>

                    {/* Created Date Header */}
                    <th
                      scope="col"
                      className="py-3 px-3 fw-semibold user-select-none"
                      style={{ cursor: "pointer", color: "var(--color-text-primary)" }}
                      onClick={() => handleSortToggle("createdAt")}
                      aria-sort={sortBy === "createdAt" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <div className="d-flex align-items-center gap-1">
                        <span>Created Date</span>
                        <span style={{ fontSize: "0.75rem", color: sortBy === "createdAt" ? "var(--color-primary-green)" : "#9CA3AF" }}>
                          {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>

                    {/* Summary Header */}
                    <th scope="col" className="py-3 px-3 fw-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Summary
                    </th>

                    {/* Category Header */}
                    <th scope="col" className="py-3 px-3 fw-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Category
                    </th>

                    {/* Requested Priority Header */}
                    <th scope="col" className="py-3 px-3 fw-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Req Priority
                    </th>

                    {/* IT Priority Header */}
                    <th scope="col" className="py-3 px-3 fw-semibold" style={{ color: "var(--color-text-primary)" }}>
                      IT Priority
                    </th>

                    {/* Status Header */}
                    <th
                      scope="col"
                      className="py-3 px-3 fw-semibold user-select-none"
                      style={{ cursor: "pointer", color: "var(--color-text-primary)" }}
                      onClick={() => handleSortToggle("currentStatus")}
                      aria-sort={sortBy === "currentStatus" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <div className="d-flex align-items-center gap-1">
                        <span>Status</span>
                        <span style={{ fontSize: "0.75rem", color: sortBy === "currentStatus" ? "var(--color-primary-green)" : "#9CA3AF" }}>
                          {sortBy === "currentStatus" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>

                    {/* Ticket Owner Header */}
                    <th scope="col" className="py-3 px-3 fw-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Ticket Owner
                    </th>

                    {/* Last Updated Header */}
                    <th
                      scope="col"
                      className="py-3 px-3 fw-semibold user-select-none"
                      style={{ cursor: "pointer", color: "var(--color-text-primary)" }}
                      onClick={() => handleSortToggle("updatedAt")}
                      aria-sort={sortBy === "updatedAt" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <div className="d-flex align-items-center gap-1">
                        <span>Last Updated</span>
                        <span style={{ fontSize: "0.75rem", color: sortBy === "updatedAt" ? "var(--color-primary-green)" : "#9CA3AF" }}>
                          {sortBy === "updatedAt" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      data-testid="ticket-desktop-row"
                      style={{ cursor: onSelectTicket ? "pointer" : "default" }}
                      onClick={() => onSelectTicket && onSelectTicket(t.id)}
                    >
                      <td className="py-3 px-3 font-monospace fw-bold" style={{ color: "var(--color-primary-green)" }}>
                        {t.ticketNumber}
                      </td>
                      <td className="py-3 px-3 text-muted">{formatDate(t.createdAt)}</td>
                      <td className="py-3 px-3 fw-semibold text-truncate" style={{ maxWidth: "240px" }} title={t.summary}>
                        {t.summary}
                      </td>
                      <td className="py-3 px-3">
                        <span className="badge bg-light text-dark border">{t.categoryName || "Category"}</span>
                      </td>
                      <td className="py-3 px-3">{renderPriorityBadge(t.requestedPriority)}</td>
                      <td className="py-3 px-3">{renderPriorityBadge(t.itPriority)}</td>
                      <td className="py-3 px-3">{renderStatusBadge(t.currentStatus)}</td>
                      <td className="py-3 px-3 text-muted small">Unassigned</td>
                      <td className="py-3 px-3 text-muted small">{formatDate(t.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card View (< 768px) */}
          <div className="d-block d-md-none mb-4">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card border-0 shadow-sm mb-3 p-3"
                data-testid="ticket-card"
                style={{
                  borderRadius: "8px",
                  backgroundColor: "var(--color-surface-card)",
                  borderLeft: "4px solid var(--color-primary-green)",
                }}
              >
                {/* Header: Ticket Number & Status */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="font-monospace fw-bold" style={{ color: "var(--color-primary-green)" }}>
                    {t.ticketNumber}
                  </span>
                  <div>{renderStatusBadge(t.currentStatus)}</div>
                </div>

                {/* Summary */}
                <h3 className="h6 fw-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
                  {t.summary}
                </h3>

                {/* Badges row */}
                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                  <span className="badge bg-light text-dark border small">{t.categoryName || "Category"}</span>
                  <div>{renderPriorityBadge(t.requestedPriority)}</div>
                  {t.itPriority && <div>{renderPriorityBadge(t.itPriority)}</div>}
                </div>

                {/* Date & Action footer */}
                <div className="d-flex justify-content-between align-items-center pt-2 border-top small text-muted">
                  <span>Created: {formatDate(t.createdAt)}</span>
                  {onSelectTicket && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-decoration-none p-0 fw-semibold"
                      style={{ color: "var(--color-primary-green)" }}
                      onClick={() => onSelectTicket(t.id)}
                    >
                      View Details →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Bar Controls */}
          <div
            className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 card border-0 shadow-sm"
            style={{ borderRadius: "8px", backgroundColor: "var(--color-surface-card)" }}
          >
            <div className="small text-muted">
              Showing{" "}
              <strong>
                {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(currentPage * pageSize, totalCount)}
              </strong>{" "}
              of <strong>{totalCount}</strong> tickets
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* Previous button */}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3"
                style={{ borderRadius: "6px" }}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>

              {/* Numeric page indicators */}
              <div className="d-flex align-items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted">...</span>}
                      <button
                        type="button"
                        className={`btn btn-sm px-2.5 py-1 ${
                          p === currentPage ? "btn-primary-green text-white" : "btn-outline-secondary"
                        }`}
                        style={{
                          borderRadius: "6px",
                          minWidth: "32px",
                          fontWeight: p === currentPage ? 700 : 400,
                        }}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              {/* Next button */}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-3"
                style={{ borderRadius: "6px" }}
                disabled={currentPage >= totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>

              {/* Page size dropdown */}
              <select
                className="form-select form-select-sm ms-2"
                style={{ width: "auto", height: "31px", fontSize: "0.8rem" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Items per page"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

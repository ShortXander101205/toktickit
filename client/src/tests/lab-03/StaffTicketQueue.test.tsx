import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTicketQueue } from "../../components/StaffTicketQueue.js";
import * as api from "../../api.js";
import { StaffTicketSummaryDTO, StaffQueueResponseDTO } from "../../types/index.js";

const mockCategories = [
  { id: 1, code: "ACC", name: "Account and Access", isActive: true },
  { id: 2, code: "HW", name: "Hardware", isActive: true },
  { id: 3, code: "SW", name: "Software", isActive: true },
  { id: 4, code: "NET", name: "Network", isActive: true },
];

const mockTickets: StaffTicketSummaryDTO[] = [
  {
    id: 1,
    ticketNumber: "TKT-2026-00001",
    summary: "Campus Wi-Fi drops intermittently",
    category: { id: 4, code: "NET", name: "Network" },
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    requester: {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      department: "Engineering",
    },
    owner: {
      id: 8,
      name: "Sompong IT",
      email: "sompong.it@kmutt.ac.th",
    },
    createdAt: "2026-08-15T09:15:00.000Z",
    updatedAt: "2026-08-15T09:15:00.000Z",
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-00002",
    summary: "Projector lamp failure in CB2",
    category: { id: 2, code: "HW", name: "Hardware" },
    requestedPriority: "URGENT",
    itPriority: "URGENT",
    currentStatus: "NEW",
    requester: {
      id: 2,
      name: "Michael Brown",
      email: "michael.brown@kmutt.ac.th",
      department: "Science",
    },
    owner: null,
    createdAt: "2026-08-16T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
  },
  {
    id: 3,
    ticketNumber: "TKT-2026-00003",
    summary: "LEB2 Login failure",
    category: { id: 3, code: "SW", name: "Software" },
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: "RESOLVED",
    requester: {
      id: 3,
      name: "David Lee",
      email: "david.lee@kmutt.ac.th",
      department: "Architecture",
    },
    owner: {
      id: 9,
      name: "Wichai Support",
      email: "wichai.sup@kmutt.ac.th",
    },
    createdAt: "2026-08-17T11:00:00.000Z",
    updatedAt: "2026-08-17T11:00:00.000Z",
  },
];

const mockDefaultResponse: StaffQueueResponseDTO = {
  items: mockTickets,
  totalCount: 3,
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 3,
    totalPages: 1,
  },
};

describe("Issue 13: IT Staff Ticket Queue & List Queries UI (src/tests/lab-03)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "getStaffTicketsApi").mockResolvedValue(mockDefaultResponse);
  });

  // =========================================================================
  // AC-13.1: Staff Shared Queue Retrieval & Complete Metadata Rendering
  // =========================================================================
  it("AC-13.1: renders 8-column desktop table with complete ticket metadata", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
    });

    // Check table headers
    const table = screen.getByTestId("staff-queue-table");
    expect(within(table).getByText(/Ticket #/i)).toBeInTheDocument();
    expect(within(table).getByText(/Summary/i)).toBeInTheDocument();
    expect(within(table).getByText(/Category/i)).toBeInTheDocument();
    expect(within(table).getByText(/Priority/i)).toBeInTheDocument();
    expect(within(table).getByText(/Status/i)).toBeInTheDocument();
    expect(within(table).getByText(/Requester/i)).toBeInTheDocument();
    expect(within(table).getByText(/Owner/i)).toBeInTheDocument();
    expect(within(table).getByText(/Created/i)).toBeInTheDocument();

    // Check rendered tickets
    expect(within(table).getByText("TKT-2026-00001")).toBeInTheDocument();
    expect(within(table).getByText("Campus Wi-Fi drops intermittently")).toBeInTheDocument();
    expect(within(table).getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(within(table).getByText("Sompong IT")).toBeInTheDocument();

    expect(within(table).getByText("TKT-2026-00002")).toBeInTheDocument();
    expect(within(table).getByText("Projector lamp failure in CB2")).toBeInTheDocument();
    expect(within(table).getByText("Michael Brown")).toBeInTheDocument();
    expect(within(table).getAllByText("Unassigned").length).toBeGreaterThan(0);
  });

  it("AC-13.1: invokes onSelectTicket callback when a table row is clicked", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<StaffTicketQueue onSelectTicket={handleSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-row-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("queue-row-1"));
    expect(handleSelect).toHaveBeenCalledWith(1);
  });

  // =========================================================================
  // AC-13.2: Search, Multi-Field Filtering, Debounce, and Reset
  // =========================================================================
  it("AC-13.2: executes debounced search query after 300ms", async () => {
    const user = userEvent.setup();
    const getStaffTicketsSpy = vi.spyOn(api, "getStaffTicketsApi").mockResolvedValue(mockDefaultResponse);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByTestId("queue-search-input");
    await user.type(searchInput, "Wi-Fi");

    await waitFor(
      () => {
        expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
          expect.objectContaining({
            search: "Wi-Fi",
            page: 1,
          })
        );
      },
      { timeout: 1000 }
    );
  });

  it("AC-13.2: filters tickets by status, category, priority, and owner", async () => {
    const user = userEvent.setup();
    const getStaffTicketsSpy = vi.spyOn(api, "getStaffTicketsApi").mockResolvedValue(mockDefaultResponse);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenCalledTimes(1);
    });

    // 1. Change Status Filter
    const statusSelect = screen.getByTestId("queue-filter-status");
    await user.selectOptions(statusSelect, "NEW");

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "NEW", page: 1 })
      );
    });

    // 2. Change Category Filter
    const categorySelect = screen.getByTestId("queue-filter-category");
    await user.selectOptions(categorySelect, "HW");

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: "HW", page: 1 })
      );
    });

    // 3. Change Priority Filter
    const prioritySelect = screen.getByTestId("queue-filter-priority");
    await user.selectOptions(prioritySelect, "URGENT");

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ priority: "URGENT", page: 1 })
      );
    });

    // 4. Change Owner Filter
    const ownerSelect = screen.getByTestId("queue-filter-owner");
    await user.selectOptions(ownerSelect, "unassigned");

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ owner: "unassigned", page: 1 })
      );
    });
  });

  it("AC-13.2: resets all active filters when Clear Filters button is clicked", async () => {
    const user = userEvent.setup();
    const getStaffTicketsSpy = vi.spyOn(api, "getStaffTicketsApi").mockResolvedValue(mockDefaultResponse);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenCalledTimes(1);
    });

    const statusSelect = screen.getByTestId("queue-filter-status");
    await user.selectOptions(statusSelect, "IN_PROGRESS");

    await waitFor(() => {
      expect(screen.getByTestId("queue-clear-filters")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("queue-clear-filters"));

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: undefined,
          search: undefined,
          category: undefined,
          priority: undefined,
          owner: undefined,
          page: 1,
        })
      );
    });
  });

  // =========================================================================
  // AC-13.3: Sorting and Pagination Controls
  // =========================================================================
  it("AC-13.3: toggles sort order when column headers are clicked", async () => {
    const user = userEvent.setup();
    const getStaffTicketsSpy = vi.spyOn(api, "getStaffTicketsApi").mockResolvedValue(mockDefaultResponse);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenCalledTimes(1);
    });

    // Click Ticket # header to sort by ticketNumber asc
    await user.click(screen.getByTestId("sort-ticketNumber"));

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortBy: "ticketNumber",
          sortOrder: "asc",
          page: 1,
        })
      );
    });

    // Click Ticket # again to toggle to desc
    await user.click(screen.getByTestId("sort-ticketNumber"));

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortBy: "ticketNumber",
          sortOrder: "desc",
          page: 1,
        })
      );
    });
  });

  it("AC-13.3: updates pagination controls and page size selector", async () => {
    const user = userEvent.setup();
    const multiPageResponse: StaffQueueResponseDTO = {
      items: mockTickets,
      totalCount: 30,
      pagination: {
        page: 1,
        pageSize: 10,
        totalCount: 30,
        totalPages: 3,
      },
    };

    const getStaffTicketsSpy = vi.spyOn(api, "getStaffTicketsApi").mockResolvedValue(multiPageResponse);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-page-next")).toBeInTheDocument();
    });

    // Next button should be enabled
    const nextBtn = screen.getByTestId("queue-page-next");
    expect(nextBtn).not.toBeDisabled();

    // Click Next button
    await user.click(nextBtn);

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 10,
        })
      );
    });

    // Change page size to 25
    const pageSizeSelect = screen.getByTestId("queue-page-size-select");
    await user.selectOptions(pageSizeSelect, "25");

    await waitFor(() => {
      expect(getStaffTicketsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageSize: 25,
          page: 1,
        })
      );
    });
  });

  // =========================================================================
  // AC-13.4: Feedback States (Skeleton, Empty, No-Results, Error, Mobile Cards)
  // =========================================================================
  it("AC-13.4: displays loading skeleton while request is in flight", () => {
    // Return a promise that does not resolve immediately
    vi.spyOn(api, "getStaffTicketsApi").mockReturnValue(new Promise(() => {}));

    render(<StaffTicketQueue />);
    expect(screen.getByTestId("queue-skeleton")).toBeInTheDocument();
  });

  it("AC-13.4: displays empty queue state when zero tickets exist unconditionally", async () => {
    vi.spyOn(api, "getStaffTicketsApi").mockResolvedValue({
      items: [],
      totalCount: 0,
      pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
    });

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("No Tickets in Queue")).toBeInTheDocument();
  });

  it("AC-13.4: displays no-results state with reset CTA when filters return 0 tickets", async () => {
    const user = userEvent.setup();
    const getStaffTicketsSpy = vi.spyOn(api, "getStaffTicketsApi")
      .mockResolvedValueOnce(mockDefaultResponse)
      .mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
      });

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
    });

    // Apply a search filter
    const searchInput = screen.getByTestId("queue-search-input");
    await user.type(searchInput, "Nonexistent123");

    await waitFor(() => {
      expect(screen.getByTestId("queue-no-results")).toBeInTheDocument();
    });
    expect(screen.getByText("No Tickets Match Your Filters")).toBeInTheDocument();
    expect(screen.getByTestId("queue-clear-filters-cta")).toBeInTheDocument();
  });

  it("AC-13.4: displays error state with retry action when API rejects", async () => {
    const user = userEvent.setup();
    const getStaffTicketsSpy = vi.spyOn(api, "getStaffTicketsApi")
      .mockRejectedValueOnce(new Error("Network connection lost"))
      .mockResolvedValueOnce(mockDefaultResponse);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/Network connection lost/i)).toBeInTheDocument();

    const retryBtn = screen.getByTestId("queue-error-retry");
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
    });
  });

  it("AC-13.4: renders mobile responsive card view container", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-mobile-cards")).toBeInTheDocument();
    });

    expect(screen.getByTestId("queue-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("queue-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("queue-card-3")).toBeInTheDocument();
  });
});

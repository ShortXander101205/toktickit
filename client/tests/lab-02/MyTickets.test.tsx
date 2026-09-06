import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyTickets } from "../../src/components/MyTickets.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";

const mockRequester1 = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  department: "Computer Engineering",
  isActive: true,
};

const mockRequester2 = {
  id: 2,
  name: "Michael Brown",
  email: "michael.brown@kmutt.ac.th",
  department: "Information Technology",
  isActive: true,
};

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 4, name: "Network" },
];

const mockTickets = [
  {
    id: 1,
    ticketNumber: "TKT-2026-00001",
    summary: "Laptop battery drains quickly",
    description: "Detailed description of battery problem",
    categoryId: 2,
    categoryName: "Hardware",
    relatedSystemId: 7,
    relatedSystemName: "Corporate Laptop",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "New",
    ticketOwner: null,
    createdAt: "2026-09-03T11:00:00.000Z",
    updatedAt: "2026-09-03T11:00:00.000Z",
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-00002",
    summary: "Wi-Fi connection drops in Library",
    description: "Wi-Fi disconnecting every 10 minutes",
    categoryId: 4,
    categoryName: "Network",
    relatedSystemId: 2,
    relatedSystemName: "Campus Wi-Fi",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "In Progress",
    ticketOwner: null,
    createdAt: "2026-09-04T09:00:00.000Z",
    updatedAt: "2026-09-04T10:00:00.000Z",
  },
];

function renderMyTickets(
  requester = mockRequester1,
  onCreateTicket = vi.fn(),
  onSelectTicket = vi.fn()
) {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: requester,
        setCurrentRequester: vi.fn(),
        requesters: [mockRequester1, mockRequester2],
        isLoading: false,
        error: null,
        isSwitchModalOpen: false,
        openSwitchModal: vi.fn(),
        closeSwitchModal: vi.fn(),
        refreshRequesters: vi.fn(),
        selectRequester: vi.fn(),
        clearRequester: vi.fn(),
      }}
    >
      <MyTickets onCreateTicket={onCreateTicket} onSelectTicket={onSelectTicket} />
    </RequesterContext.Provider>
  );
}

describe("Component: MyTickets (Feature 8 - UI-06, AC-04-01..05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) {
        return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      }
      if (urlStr.includes("/tickets")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: mockTickets,
            pagination: { totalCount: 2, totalItems: 2, totalPages: 1, currentPage: 1, pageSize: 10 },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ success: true, data: {} }) } as any;
    });
  });

  it("renders 9-column desktop table with ticket data (AC-04-01)", async () => {
    renderMyTickets();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-00001").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Laptop battery drains quickly").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("TKT-2026-00002").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Wi-Fi connection drops in Library").length).toBeGreaterThanOrEqual(1);
    });

    // Check desktop table column headers
    expect(screen.getByText("Ticket No")).toBeInTheDocument();
    expect(screen.getByText("Created Date")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Req Priority")).toBeInTheDocument();
    expect(screen.getByText("IT Priority")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Ticket Owner")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();
  });

  it("renders responsive mobile stacked cards with ticket-card testid", async () => {
    renderMyTickets();

    await waitFor(() => {
      const mobileCards = screen.getAllByTestId("ticket-card");
      expect(mobileCards.length).toBe(2);
    });
  });

  it("debounces keyword search before calling API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    renderMyTickets();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-00001").length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    await userEvent.type(searchInput, "battery");

    // After debounce interval (300ms+), fetch is called with search query
    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining("search=battery"),
          expect.anything()
        );
      },
      { timeout: 1500 }
    );
  });

  it("resets search and filters when 'Clear Filters' button is clicked (AC-04-03)", async () => {
    renderMyTickets();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-00001").length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "filterterm" } });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /clear filters/i }).length).toBeGreaterThanOrEqual(1);
    });

    const clearBtn = screen.getAllByRole("button", { name: /clear filters/i })[0];
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect((searchInput as HTMLInputElement).value).toBe("");
    });
  });

  it("toggles sorting when clicking column headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderMyTickets();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-00001").length).toBeGreaterThanOrEqual(1);
    });

    // Click "Ticket No" header
    const ticketNoHeader = screen.getByText("Ticket No");
    fireEvent.click(ticketNoHeader);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=ticketNumber"),
        expect.anything()
      );
    });
  });

  it("renders Empty State when user has 0 total tickets without active filters (AC-04-04)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) {
        return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { totalCount: 0, totalItems: 0, totalPages: 0, currentPage: 1, pageSize: 10 },
        }),
      } as any;
    });

    renderMyTickets();

    await waitFor(() => {
      expect(screen.getByText(/no support tickets yet/i)).toBeInTheDocument();
      expect(screen.getByText(/you have not submitted any it support tickets yet/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /\+ create ticket/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders No-Results State when filters match 0 tickets (AC-04-04)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) {
        return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { totalCount: 0, totalItems: 0, totalPages: 0, currentPage: 1, pageSize: 10 },
        }),
      } as any;
    });

    renderMyTickets();

    // Type into search to make filters active
    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent query" } });

    await waitFor(() => {
      expect(screen.getByText(/no matching tickets found/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /clear filters/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("updates instantly and re-fetches when requester context switches (AC-04-02)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { rerender } = renderMyTickets(mockRequester1);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({ "x-requester-id": "1" }),
        })
      );
    });

    // Re-render with Requester 2 context
    rerender(
      <RequesterContext.Provider
        value={{
          currentRequester: mockRequester2,
          setCurrentRequester: vi.fn(),
          requesters: [mockRequester1, mockRequester2],
          isLoading: false,
          error: null,
          isSwitchModalOpen: false,
          openSwitchModal: vi.fn(),
          closeSwitchModal: vi.fn(),
          refreshRequesters: vi.fn(),
          selectRequester: vi.fn(),
          clearRequester: vi.fn(),
        }}
      >
        <MyTickets />
      </RequesterContext.Provider>
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({ "x-requester-id": "2" }),
        })
      );
    });
  });

  it("handles pagination controls and page size changing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) {
        return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: mockTickets,
          pagination: { totalCount: 25, totalItems: 25, totalPages: 3, currentPage: 1, pageSize: 10 },
        }),
      } as any;
    });

    renderMyTickets();

    await waitFor(() => {
      expect(screen.getByText(/showing/i)).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        expect.anything()
      );
    });
  });
});

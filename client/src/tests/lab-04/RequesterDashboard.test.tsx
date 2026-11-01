import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterDashboard } from "../../components/RequesterDashboard.js";
import * as api from "../../api.js";
import { RequesterDashboardResponse } from "../../types/index.js";

const mockRequesterUser = {
  id: 1,
  name: "Somchai Rattanakorn",
  email: "somchai@kmutt.ac.th",
  role: "REQUESTER" as const,
  mustChangePassword: false,
  isActive: true,
  department: "Computer Engineering",
};

const sampleDashboardData: RequesterDashboardResponse = {
  totalOpen: 3,
  waitingForRequester: 1,
  inProgress: 1,
  resolved: 2,
  closed: 5,
  metrics: {
    totalOpen: 3,
    waitingForRequester: 1,
    inProgress: 1,
    resolved: 2,
    closed: 5,
    totalOpenTickets: 3,
    waitingForRequesterTickets: 1,
    inProgressTickets: 1,
    recentlyResolvedTickets: 2,
    resolvedTickets: 2,
    closedTickets: 5,
  },
  recentTickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-00101",
      summary: "Cannot access engineering laboratory Wi-Fi",
      title: "Cannot access engineering laboratory Wi-Fi",
      categoryId: 1,
      categoryName: "Network",
      category: { id: 1, name: "Network", code: "NET" },
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      priority: "HIGH",
      currentStatus: "IN_PROGRESS",
      status: "IN_PROGRESS",
      ownerId: 8,
      ownerName: "Sompong IT",
      owner: { id: 8, name: "Sompong IT", email: "sompong@kmutt.ac.th", role: "IT_STAFF" },
      requesterId: 1,
      requesterName: "Somchai Rattanakorn",
      requester: { id: 1, name: "Somchai Rattanakorn", email: "somchai@kmutt.ac.th", department: "Computer Engineering" },
      createdAt: "2026-10-30T08:00:00.000Z",
      updatedAt: "2026-10-30T09:30:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-00102",
      summary: "MATLAB license activation failed",
      title: "MATLAB license activation failed",
      categoryId: 2,
      categoryName: "Software",
      category: { id: 2, name: "Software", code: "SW" },
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      priority: "MEDIUM",
      currentStatus: "WAITING_FOR_REQUESTER",
      status: "WAITING_FOR_REQUESTER",
      ownerId: null,
      ownerName: null,
      owner: null,
      requesterId: 1,
      requesterName: "Somchai Rattanakorn",
      requester: { id: 1, name: "Somchai Rattanakorn", email: "somchai@kmutt.ac.th", department: "Computer Engineering" },
      createdAt: "2026-10-29T10:00:00.000Z",
      updatedAt: "2026-10-29T11:00:00.000Z",
    },
  ],
};

const emptyDashboardData: RequesterDashboardResponse = {
  totalOpen: 0,
  waitingForRequester: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0,
  metrics: {
    totalOpen: 0,
    waitingForRequester: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    totalOpenTickets: 0,
    waitingForRequesterTickets: 0,
    inProgressTickets: 0,
    recentlyResolvedTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
  },
  recentTickets: [],
};

describe("Issue 21: RequesterDashboard Component (AC-21.1, AC-21.2, AC-21.5, BR-10, BR-13, BR-14)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-21.1: renders welcome header, 4 metric cards, and recent tickets table", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(sampleDashboardData);

    const onDrillDown = vi.fn();
    const onSelectTicket = vi.fn();
    const onCreateTicket = vi.fn();
    const onViewAllTickets = vi.fn();

    render(
      <RequesterDashboard
        user={mockRequesterUser}
        requesterId={mockRequesterUser.id}
        onDrillDownMyTickets={onDrillDown}
        onSelectTicket={onSelectTicket}
        onCreateTicket={onCreateTicket}
        onViewAllTickets={onViewAllTickets}
      />
    );

    // Welcome banner
    expect(screen.getByTestId("requester-welcome-header")).toHaveTextContent("Welcome back, Somchai Rattanakorn");

    // Metric cards values
    await waitFor(() => {
      const openCard = screen.getByTestId("metric-card-open");
      expect(openCard).toHaveTextContent("3");
      expect(screen.getByTestId("open-waiting-alert")).toHaveTextContent("1 waiting for your reply");

      const inProgressCard = screen.getByTestId("metric-card-in-progress");
      expect(inProgressCard).toHaveTextContent("1");

      const resolvedCard = screen.getByTestId("metric-card-resolved");
      expect(resolvedCard).toHaveTextContent("2");

      const closedCard = screen.getByTestId("metric-card-closed");
      expect(closedCard).toHaveTextContent("5");
    });

    // Recent tickets
    expect(screen.getByText("TKT-2026-00101")).toBeInTheDocument();
    expect(screen.getByText("Cannot access engineering laboratory Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-00102")).toBeInTheDocument();
  });

  it("AC-21.2 & BR-13: renders safe zero-value empty state with friendly CTA when user has 0 tickets", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(emptyDashboardData);

    const onCreateTicket = vi.fn();

    render(
      <RequesterDashboard
        user={mockRequesterUser}
        requesterId={mockRequesterUser.id}
        onDrillDownMyTickets={vi.fn()}
        onSelectTicket={vi.fn()}
        onCreateTicket={onCreateTicket}
        onViewAllTickets={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-empty-state")).toBeInTheDocument();
    });

    expect(screen.getByText("You haven't submitted any support tickets yet")).toBeInTheDocument();

    const emptyCta = screen.getByTestId("empty-create-ticket-btn");
    await userEvent.click(emptyCta);
    expect(onCreateTicket).toHaveBeenCalledTimes(1);
  });

  it("AC-21.5 & BR-14: interactive drill-down links trigger onDrillDownMyTickets with pre-selected status filters", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(sampleDashboardData);

    const onDrillDown = vi.fn();

    render(
      <RequesterDashboard
        user={mockRequesterUser}
        requesterId={mockRequesterUser.id}
        onDrillDownMyTickets={onDrillDown}
        onSelectTicket={vi.fn()}
        onCreateTicket={vi.fn()}
        onViewAllTickets={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("drilldown-open")).toBeInTheDocument();
    });

    // Click My Open drill-down
    await userEvent.click(screen.getByTestId("drilldown-open"));
    expect(onDrillDown).toHaveBeenCalledWith("OPEN_ACTIVE");

    // Click In Progress drill-down
    await userEvent.click(screen.getByTestId("drilldown-in-progress"));
    expect(onDrillDown).toHaveBeenCalledWith("IN_PROGRESS");

    // Click Resolved drill-down
    await userEvent.click(screen.getByTestId("drilldown-resolved"));
    expect(onDrillDown).toHaveBeenCalledWith("RESOLVED");

    // Click Closed drill-down
    await userEvent.click(screen.getByTestId("drilldown-closed"));
    expect(onDrillDown).toHaveBeenCalledWith("CLOSED");
  });

  it("navigates to ticket detail when clicking a recent ticket row", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(sampleDashboardData);

    const onSelectTicket = vi.fn();

    render(
      <RequesterDashboard
        user={mockRequesterUser}
        requesterId={mockRequesterUser.id}
        onDrillDownMyTickets={vi.fn()}
        onSelectTicket={onSelectTicket}
        onCreateTicket={vi.fn()}
        onViewAllTickets={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("recent-ticket-row")).toHaveLength(2);
    });

    const rows = screen.getAllByTestId("recent-ticket-row");
    await userEvent.click(rows[0]);
    expect(onSelectTicket).toHaveBeenCalledWith(101);
  });

  it("refreshes data in-place when clicking the Refresh button", async () => {
    const fetchSpy = vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(sampleDashboardData);

    render(
      <RequesterDashboard
        user={mockRequesterUser}
        requesterId={mockRequesterUser.id}
        onDrillDownMyTickets={vi.fn()}
        onSelectTicket={vi.fn()}
        onCreateTicket={vi.fn()}
        onViewAllTickets={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const refreshBtn = screen.getByTestId("requester-dashboard-refresh");
    await userEvent.click(refreshBtn);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});


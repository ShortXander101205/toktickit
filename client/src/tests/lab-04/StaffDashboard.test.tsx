import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffDashboard } from "../../components/StaffDashboard.js";
import * as api from "../../api.js";
import { StaffDashboardResponse, AdminDashboardResponse, AuthUser } from "../../types/index.js";

const mockStaffUser: AuthUser = {
  id: 6,
  name: "Sompong IT",
  email: "sompong@kmutt.ac.th",
  role: "IT_STAFF",
  mustChangePassword: false,
  isActive: true,
  department: "IT Infrastructure",
};

const mockAdminUser: AuthUser = {
  id: 2,
  name: "System Administrator",
  email: "admin@kmutt.ac.th",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
  isActive: true,
  department: "Campus IT",
};

const sampleStaffData: StaffDashboardResponse = {
  newCount: 4,
  openCount: 7,
  inProgressCount: 5,
  waitingForRequesterCount: 3,
  myAssignedCount: 6,
  unassignedCount: 5,
  resolvedCount: 15,
  closedCount: 40,
  reopenedCount: 1,
  cancelledCount: 2,
  urgentAttentionCount: 2,
  statusBreakdown: {
    NEW: 4,
    OPEN: 7,
    IN_PROGRESS: 5,
    WAITING_FOR_REQUESTER: 3,
    RESOLVED: 15,
    CLOSED: 40,
    REOPENED: 1,
    CANCELLED: 2,
  },
  priorityBreakdown: {
    LOW: 5,
    MEDIUM: 10,
    HIGH: 8,
    URGENT: 2,
  },
  recentTickets: [
    {
      id: 201,
      ticketNumber: "TKT-2026-00201",
      summary: "Core switch VLAN routing malfunction",
      title: "Core switch VLAN routing malfunction",
      categoryId: 1,
      categoryName: "Network",
      category: { id: 1, name: "Network", code: "NET" },
      requestedPriority: "URGENT",
      itPriority: "URGENT",
      priority: "URGENT",
      currentStatus: "IN_PROGRESS",
      status: "IN_PROGRESS",
      ownerId: 6,
      ownerName: "Sompong IT",
      owner: { id: 6, name: "Sompong IT", email: "sompong@kmutt.ac.th", role: "IT_STAFF" },
      requesterId: 3,
      requesterName: "Dr. Prasert",
      requester: { id: 3, name: "Dr. Prasert", email: "prasert@kmutt.ac.th", department: "Science" },
      createdAt: "2026-10-31T08:00:00.000Z",
      updatedAt: "2026-10-31T09:00:00.000Z",
    },
  ],
};

const sampleAdminData: AdminDashboardResponse = {
  ...sampleStaffData,
  totalUsers: 30,
  activeUsers: 28,
  inactiveUsers: 2,
  requestersCount: 22,
  staffCount: 6,
  adminCount: 2,
  users: {
    totalUsers: 30,
    activeUsers: 28,
    inactiveUsers: 2,
    activeUsersCount: 28,
    inactiveUsersCount: 2,
    requestersCount: 22,
    staffCount: 6,
    adminCount: 2,
  },
};

describe("Issue 21: StaffDashboard Component (AC-21.3, AC-21.4, AC-21.5, BR-11, BR-12, BR-14)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-21.3: renders welcome header, role badge, 5 operational metric cards, and recent queue tickets for IT Staff", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(sampleStaffData);

    const onDrillDown = vi.fn();
    const onSelectTicket = vi.fn();
    const onCreateTicket = vi.fn();

    render(
      <StaffDashboard
        user={mockStaffUser}
        onDrillDownQueue={onDrillDown}
        onSelectTicket={onSelectTicket}
        onCreateTicket={onCreateTicket}
      />
    );

    expect(screen.getByTestId("staff-welcome-header")).toHaveTextContent("Welcome, Sompong IT");
    expect(screen.getByTestId("staff-role-badge")).toHaveTextContent("IT Staff");

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-new")).toHaveTextContent("4");
      expect(screen.getByTestId("metric-card-open")).toHaveTextContent("7");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("5");
      expect(screen.getByTestId("metric-card-waiting")).toHaveTextContent("3");
      expect(screen.getByTestId("metric-card-my-assigned")).toHaveTextContent("6");
    });

    // Recent queue ticket
    expect(screen.getByText("TKT-2026-00201")).toBeInTheDocument();
    expect(screen.getByText("Core switch VLAN routing malfunction")).toBeInTheDocument();

    // Admin user summary strip should NOT be displayed for IT Staff
    expect(screen.queryByTestId("admin-user-summary-strip")).not.toBeInTheDocument();
  });

  it("AC-21.4 & BR-12: renders Admin User Account Summary strip when viewed by ADMINISTRATOR", async () => {
    vi.spyOn(api, "fetchAdminDashboard").mockResolvedValue(sampleAdminData);

    const onManageUsers = vi.fn();

    render(
      <StaffDashboard
        user={mockAdminUser}
        onDrillDownQueue={vi.fn()}
        onSelectTicket={vi.fn()}
        onCreateTicket={vi.fn()}
        onManageUsers={onManageUsers}
      />
    );

    expect(screen.getByTestId("staff-role-badge")).toHaveTextContent("Administrator");

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-summary-strip")).toBeInTheDocument();
    });

    expect(screen.getByTestId("admin-total-users")).toHaveTextContent("30");
    expect(screen.getByTestId("admin-active-users")).toHaveTextContent("28");
    expect(screen.getByTestId("admin-requesters-count")).toHaveTextContent("22");
    expect(screen.getByTestId("admin-staff-count")).toHaveTextContent("6");
    expect(screen.getByTestId("admin-admins-count")).toHaveTextContent("2");

    const manageUsersBtn = screen.getByTestId("admin-manage-users-btn");
    await userEvent.click(manageUsersBtn);
    expect(onManageUsers).toHaveBeenCalledTimes(1);
  });

  it("AC-21.5 & BR-14: operational metric card drill-downs trigger onDrillDownQueue with correct filters", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(sampleStaffData);

    const onDrillDown = vi.fn();

    render(
      <StaffDashboard
        user={mockStaffUser}
        onDrillDownQueue={onDrillDown}
        onSelectTicket={vi.fn()}
        onCreateTicket={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("drilldown-new")).toBeInTheDocument();
    });

    // 1. New card
    await userEvent.click(screen.getByTestId("drilldown-new"));
    expect(onDrillDown).toHaveBeenCalledWith({ status: "NEW" });

    // 2. Open card
    await userEvent.click(screen.getByTestId("drilldown-open"));
    expect(onDrillDown).toHaveBeenCalledWith({ status: "OPEN" });

    // 3. In Progress card
    await userEvent.click(screen.getByTestId("drilldown-in-progress"));
    expect(onDrillDown).toHaveBeenCalledWith({ status: "IN_PROGRESS" });

    // 4. Waiting card
    await userEvent.click(screen.getByTestId("drilldown-waiting"));
    expect(onDrillDown).toHaveBeenCalledWith({ status: "WAITING_FOR_REQUESTER" });

    // 5. My Assigned card
    await userEvent.click(screen.getByTestId("drilldown-my-assigned"));
    expect(onDrillDown).toHaveBeenCalledWith({ ownerId: "6" });

    // 6. Unassigned queue link
    await userEvent.click(screen.getByTestId("drilldown-unassigned"));
    expect(onDrillDown).toHaveBeenCalledWith({ ownerId: "unassigned" });
  });

  it("navigates to ticket detail when clicking a recent queue ticket row", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(sampleStaffData);

    const onSelectTicket = vi.fn();

    render(
      <StaffDashboard
        user={mockStaffUser}
        onDrillDownQueue={vi.fn()}
        onSelectTicket={onSelectTicket}
        onCreateTicket={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-recent-ticket-row")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("staff-recent-ticket-row"));
    expect(onSelectTicket).toHaveBeenCalledWith(201);
  });

  it("handles quick actions (Create, Search, My Queue) correctly", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(sampleStaffData);

    const onDrillDown = vi.fn();
    const onCreate = vi.fn();

    render(
      <StaffDashboard
        user={mockStaffUser}
        onDrillDownQueue={onDrillDown}
        onSelectTicket={vi.fn()}
        onCreateTicket={onCreate}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("quick-create-ticket-staff")).toBeInTheDocument();
    });

    // Create ticket
    await userEvent.click(screen.getByTestId("quick-create-ticket-staff"));
    expect(onCreate).toHaveBeenCalledTimes(1);

    // Search tickets
    await userEvent.click(screen.getByTestId("quick-search-tickets"));
    expect(onDrillDown).toHaveBeenCalledWith({ autoFocusSearch: true });

    // My Queue
    await userEvent.click(screen.getByTestId("quick-my-queue"));
    expect(onDrillDown).toHaveBeenCalledWith({ ownerId: "6" });
  });
});


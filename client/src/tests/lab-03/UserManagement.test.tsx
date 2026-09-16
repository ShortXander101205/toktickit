import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserManagement } from "../../components/UserManagement.js";
import { AuthContext } from "../../context/AuthContext.js";
import * as api from "../../api.js";
import { AdminUserDTO, AuthUser } from "../../types/index.js";

const mockAdminUser: AuthUser = {
  id: 10,
  name: "System Administrator",
  email: "admin@kmutt.ac.th",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
  isActive: true,
  department: "IT Administration",
};

const mockUsers: AdminUserDTO[] = [
  {
    id: 10,
    name: "System Administrator",
    email: "admin@kmutt.ac.th",
    department: "IT Administration",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: 6,
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    department: "Central IT",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-08-02T00:00:00.000Z",
  },
  {
    id: 4,
    name: "Sarah Johnson",
    email: "sarah.johnson@kmutt.ac.th",
    department: "Science",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-08-03T00:00:00.000Z",
  },
  {
    id: 5,
    name: "Prasert Inactive",
    email: "inactive.user@kmutt.ac.th",
    department: "Liberal Arts",
    role: "REQUESTER",
    isActive: false,
    mustChangePassword: true,
    createdAt: "2026-08-04T00:00:00.000Z",
  },
];

function renderWithAuth(ui: React.ReactNode, user: AuthUser | null = mockAdminUser) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
        refreshUser: vi.fn(),
        clearError: vi.fn(),
      }}
    >
      {ui}
    </AuthContext.Provider>
  );
}

describe("Issue 15: Administrator User Management UI Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "fetchAdminUsersApi").mockResolvedValue(mockUsers);
  });

  // =========================================================================
  // UI-ADM-01: Table Rendering with seed accounts
  // =========================================================================
  it("UI-ADM-01: renders the User Management table with names, emails, roles, and status badges", async () => {
    renderWithAuth(<UserManagement />);

    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Manage accounts, roles, credentials, and access states across TokTickIT")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-table")).toBeInTheDocument();
    });

    // Check row data
    expect(screen.getByTestId("user-name-10")).toHaveTextContent("System Administrator");
    expect(screen.getByTestId("user-email-10")).toHaveTextContent("admin@kmutt.ac.th");
    expect(screen.getByTestId("user-name-6")).toHaveTextContent("Sompong IT");
    expect(screen.getByTestId("user-email-6")).toHaveTextContent("sompong.it@kmutt.ac.th");

    // Check badges
    const adminBadges = screen.getAllByTestId("role-badge-admin");
    expect(adminBadges.length).toBeGreaterThanOrEqual(1);

    const activeBadges = screen.getAllByTestId("status-badge-active");
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);

    const inactiveBadges = screen.getAllByTestId("status-badge-inactive");
    expect(inactiveBadges.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // UI-ADM-02: Debounced search
  // =========================================================================
  it("UI-ADM-02: triggers debounced search when user types in search box", async () => {
    const user = userEvent.setup();
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-search-input")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("admin-search-input");
    await user.type(searchInput, "Sompong");

    await waitFor(
      () => {
        expect(api.fetchAdminUsersApi).toHaveBeenCalledWith({
          search: "Sompong",
          role: undefined,
        });
      },
      { timeout: 1000 }
    );
  });

  // =========================================================================
  // UI-ADM-03: Role filtering
  // =========================================================================
  it("UI-ADM-03: triggers role filtering when role dropdown option changes", async () => {
    const user = userEvent.setup();
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-role-filter")).toBeInTheDocument();
    });

    const roleSelect = screen.getByTestId("admin-role-filter");
    await user.selectOptions(roleSelect, "IT_STAFF");

    await waitFor(() => {
      expect(api.fetchAdminUsersApi).toHaveBeenCalledWith({
        search: undefined,
        role: "IT_STAFF",
      });
    });
  });

  // =========================================================================
  // UI-ADM-04: Create User modal submit flow
  // =========================================================================
  it("UI-ADM-04: opens Create User modal, submits valid form, and creates account (AC-15.1)", async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(api, "createAdminUserApi").mockResolvedValue({
      id: 99,
      name: "Alice Engineer",
      email: "alice@kmutt.ac.th",
      department: "Engineering",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
      createdAt: "2026-09-16T00:00:00.000Z",
    });

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
    });

    // Open modal
    await user.click(screen.getByTestId("add-user-btn"));
    expect(screen.getByText("Add New User")).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByTestId("create-user-name"), "Alice Engineer");
    await user.type(screen.getByTestId("create-user-email"), "alice@kmutt.ac.th");
    await user.type(screen.getByTestId("create-user-department"), "Engineering");
    await user.type(screen.getByTestId("create-user-password"), "InitialPass123!");

    // Submit
    await user.click(screen.getByTestId("create-user-submit"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Alice Engineer",
        email: "alice@kmutt.ac.th",
        department: "Engineering",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "InitialPass123!",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-success-alert")).toHaveTextContent('User "Alice Engineer" created successfully.');
    });
  });

  // =========================================================================
  // UI-ADM-05: Displays 409 Conflict duplicate email alert inside modal
  // =========================================================================
  it("UI-ADM-05: displays duplicate email conflict warning on 409 error (AC-15.2)", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "createAdminUserApi").mockRejectedValue(
      new Error("A user account with this email address already exists.")
    );

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("add-user-btn"));
    await user.type(screen.getByTestId("create-user-name"), "Duplicate Admin");
    await user.type(screen.getByTestId("create-user-email"), "admin@kmutt.ac.th");
    await user.type(screen.getByTestId("create-user-password"), "Password123!");

    await user.click(screen.getByTestId("create-user-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("create-user-error")).toHaveTextContent(
        "A user account with this email address already exists."
      );
    });
  });

  // =========================================================================
  // UI-ADM-06: Self-deactivation & self-demotion UI protection (BR-11, AC-15.3)
  // =========================================================================
  it("UI-ADM-06: disables Active toggle and Role dropdown when editing current admin (AC-15.3, BR-11)", async () => {
    const user = userEvent.setup();
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-10")).toBeInTheDocument();
    });

    // Click edit on primary admin (logged in user with ID 10)
    await user.click(screen.getByTestId("edit-user-btn-10"));

    expect(screen.getByText("Edit User: System Administrator")).toBeInTheDocument();

    const activeToggle = screen.getByTestId("edit-user-active");
    expect(activeToggle).toBeDisabled();
    expect(screen.getByText("You cannot deactivate your own active administrator account.")).toBeInTheDocument();

    const roleDropdown = screen.getByTestId("edit-user-role");
    expect(roleDropdown).toBeDisabled();
    expect(screen.getByText("You cannot demote your own administrator role.")).toBeInTheDocument();
  });

  // =========================================================================
  // UI-ADM-07: Displays safety alert on blocked operation (BR-12, AC-15.4)
  // =========================================================================
  it("UI-ADM-07: displays safety alert banner when operation violates last-admin protection (AC-15.4)", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "updateAdminUserApi").mockRejectedValue(
      new Error("Cannot deactivate or demote the system's last remaining active Administrator.")
    );

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-6")).toBeInTheDocument();
    });

    // Edit Sompong IT
    await user.click(screen.getByTestId("edit-user-btn-6"));

    await user.click(screen.getByTestId("edit-user-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-error")).toHaveTextContent(
        "Cannot deactivate or demote the system's last remaining active Administrator."
      );
    });
  });

  // =========================================================================
  // UI-ADM-08: Reset password action from inside edit modal
  // =========================================================================
  it("UI-ADM-08: resets user initial password from inside edit modal (FR-06.5)", async () => {
    const user = userEvent.setup();
    const resetSpy = vi.spyOn(api, "resetUserPasswordApi").mockResolvedValue({
      message: "Initial password reset successfully.",
      mustChangePassword: true,
      userId: 6,
    });

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-6")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-user-btn-6"));

    expect(screen.getByTestId("reset-password-section")).toBeInTheDocument();
    const resetInput = screen.getByTestId("reset-password-input");
    await user.type(resetInput, "NewTempPassword123!");

    await user.click(screen.getByTestId("reset-password-btn"));

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith(6, {
        newInitialPassword: "NewTempPassword123!",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("reset-password-success")).toHaveTextContent(
        "Initial password reset! User will be forced to change password on next login."
      );
    });
  });

  // =========================================================================
  // UI-ADM-09: Responsive mobile cards
  // =========================================================================
  it("UI-ADM-09: renders mobile stacked card layout for smaller viewports", async () => {
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-users-mobile-list")).toBeInTheDocument();
    });

    expect(screen.getByTestId("user-card-10")).toBeInTheDocument();
    expect(screen.getByTestId("user-card-6")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { AppHeader } from "../../src/components/AppHeader.js";
import { AuthContext, AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { AuthUser } from "../../src/types/index.js";

const requesterUser: AuthUser = {
  id: 4,
  name: "Sarah Johnson",
  email: "sarah.johnson@kmutt.ac.th",
  role: "REQUESTER",
  mustChangePassword: false,
  isActive: true,
};

const itStaffUser: AuthUser = {
  id: 6,
  name: "Alex Miller",
  email: "alex.miller@kmutt.ac.th",
  role: "IT_STAFF",
  mustChangePassword: false,
  isActive: true,
};

const adminUser: AuthUser = {
  id: 9,
  name: "Somchai Prasert",
  email: "admin.somchai@kmutt.ac.th",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
  isActive: true,
};

describe("App Shell: Header, Role Badges & Navigation Lock (Feature 12 - UI-03, AC-03)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    // Default mocks for background queries
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      success: true,
      data: [],
      pagination: { totalCount: 0, totalItems: 0, totalPages: 0, currentPage: 1, pageSize: 10 },
    });
  });

  it("UI-03-01: renders the authenticated user name and distinct role badges in AppHeader", () => {
    // 1. Test Requester badge
    const { rerender } = render(
      <AuthContext.Provider
        value={{
          user: requesterUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
          clearError: vi.fn(),
        }}
      >
        <AppHeader />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId("active-user-name")).toHaveTextContent("Sarah Johnson");
    const requesterBadge = screen.getByTestId("user-role-badge");
    expect(requesterBadge).toHaveTextContent("Requester");

    // 2. Test IT Staff badge
    rerender(
      <AuthContext.Provider
        value={{
          user: itStaffUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
          clearError: vi.fn(),
        }}
      >
        <AppHeader />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId("active-user-name")).toHaveTextContent("Alex Miller");
    const itStaffBadge = screen.getByTestId("user-role-badge");
    expect(itStaffBadge).toHaveTextContent("IT Staff");

    // 3. Test Administrator badge
    rerender(
      <AuthContext.Provider
        value={{
          user: adminUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
          clearError: vi.fn(),
        }}
      >
        <AppHeader />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId("active-user-name")).toHaveTextContent("Somchai Prasert");
    const adminBadge = screen.getByTestId("user-role-badge");
    expect(adminBadge).toHaveTextContent("Administrator");
  });

  it("UI-03-02: executes logout flow when clicking Log out button in AppHeader", async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn();

    render(
      <AuthContext.Provider
        value={{
          user: requesterUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          login: vi.fn(),
          logout: logoutMock,
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
          clearError: vi.fn(),
        }}
      >
        <AppHeader />
      </AuthContext.Provider>
    );

    const logoutBtn = screen.getByTestId("logout-button");
    expect(logoutBtn).toBeInTheDocument();

    await user.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("UI-03-03: blocks workspace navigation and renders ChangePassword when user.mustChangePassword is true", async () => {
    // User with mustChangePassword = true
    vi.spyOn(api, "getMeApi").mockResolvedValue({
      ...requesterUser,
      mustChangePassword: true,
    });

    render(<App />);

    // Must show mandatory password change view
    expect(await screen.findByRole("heading", { name: /Mandatory Password Change/i })).toBeInTheDocument();
    // Must NOT show My Tickets table or workspace action buttons
    expect(screen.queryByPlaceholderText(/Search tickets by summary/i)).not.toBeInTheDocument();
  });

  it("UI-03-04: grants full access to tickets workspace when user.mustChangePassword is false", async () => {
    vi.spyOn(api, "getMeApi").mockResolvedValue(requesterUser);

    render(<App />);

    // Workspace is active
    expect(await screen.findByTestId("active-user-name")).toHaveTextContent("Sarah Johnson");
    expect(screen.queryByRole("heading", { name: /Mandatory Password Change/i })).not.toBeInTheDocument();
  });
});

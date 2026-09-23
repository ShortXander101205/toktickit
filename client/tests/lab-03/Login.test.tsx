import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "../../src/components/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { AuthUser } from "../../src/types/index.js";

const mockRequesterUser: AuthUser = {
  id: 4,
  name: "Sarah Johnson",
  email: "sarah.johnson@kmutt.ac.th",
  role: "REQUESTER",
  mustChangePassword: true,
  isActive: true,
  department: "Library",
};

describe("Component: Login (Feature 12 - UI-01, AC-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    // Default getMeApi reject for unauthenticated initial state
    vi.spyOn(api, "getMeApi").mockRejectedValue(new Error("Unauthorized"));
  });

  it("UI-01-01: renders the sign-in form with email, password inputs, submit button, and accessible labels", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByRole("heading", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("UI-01-02: toggles password field between masked (password) and plain text", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const passwordInput = screen.getByPlaceholderText("••••••••");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: /Show password/i });
    await user.click(toggleBtn);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /Hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("UI-01-03: submits valid credentials, invokes loginApi, and triggers onSuccess callback", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    const loginSpy = vi.spyOn(api, "loginApi").mockResolvedValue({
      user: mockRequesterUser,
      token: "mock-session-token",
    });

    render(
      <AuthProvider>
        <Login onSuccess={onSuccess} />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Email Address/i), "sarah.johnson@kmutt.ac.th");
    await user.type(screen.getByPlaceholderText("••••••••"), "Password123!");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: "sarah.johnson@kmutt.ac.th",
        password: "Password123!",
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("UI-01-04: displays safe generic error alert banner on authentication failure without enumeration leak", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "loginApi").mockRejectedValue({
      response: {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email address or password.",
        },
      },
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Email Address/i), "sarah.johnson@kmutt.ac.th");
    await user.type(screen.getByPlaceholderText("••••••••"), "WrongPassword999!");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    const errorAlert = await screen.findByTestId("login-error");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent("Invalid email address or password.");
  });

  it("UI-01-05: disables submit button and shows loading spinner while authentication request is in flight", async () => {
    const user = userEvent.setup();
    let resolveLogin: (val: any) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    vi.spyOn(api, "loginApi").mockReturnValue(pendingPromise as any);

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Email Address/i), "sarah.johnson@kmutt.ac.th");
    await user.type(screen.getByPlaceholderText("••••••••"), "Password123!");

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    await user.click(submitBtn);

    // Verify loading state
    expect(screen.getByText(/Signing in.../i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Signing in.../i })).toBeDisabled();

    // Resolve promise
    resolveLogin({
      user: mockRequesterUser,
      token: "mock-token",
    });

    await waitFor(() => {
      expect(screen.queryByText(/Signing in.../i)).not.toBeInTheDocument();
    });
  });
});

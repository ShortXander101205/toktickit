import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "../../src/components/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

describe("UI-01: Login View Component", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders email, password inputs, show/hide toggle, and Sign In button", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByTestId("toggle-password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("toggles password visibility between password and text modes", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const passwordInput = screen.getByLabelText(/^Password/i);
    const toggleButton = screen.getByTestId("toggle-password");

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("displays form-level validation messages when submitting empty form", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it("clears/blanks out invalid input on blur per blur validation rule", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    await user.type(emailInput, "notanemail");
    fireEvent.blur(emailInput);

    expect(emailInput).toHaveValue("");
  });

  it("displays busy indicator 'Signing in...' and disables button during submission", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "loginApi").mockReturnValue(new Promise(() => {}));

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Email Address/i), "user@kmutt.ac.th");
    await user.type(screen.getByLabelText(/^Password/i), "Password123!");

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    await user.click(submitBtn);

    expect(submitBtn).toHaveTextContent(/Signing in.../i);
    expect(submitBtn).toBeDisabled();
  });

  it("renders safe anti-enumeration alert banner when login fails with 401", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "loginApi").mockRejectedValue(new Error("Invalid email address or password."));

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Email Address/i), "user@kmutt.ac.th");
    await user.type(screen.getByLabelText(/^Password/i), "WrongPassword!");

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    await user.click(submitBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Invalid email address or password/i);
  });

  it("triggers onSuccess callback and authenticates user on valid credentials", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    vi.spyOn(api, "loginApi").mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 1,
          email: "jennifer.anderson@kmutt.ac.th",
          name: "Jennifer Anderson",
          role: "REQUESTER",
          mustChangePassword: false,
          isActive: true,
        },
        token: "mock-session-token",
      },
    });

    render(
      <AuthProvider>
        <Login onSuccess={onSuccess} />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/Email Address/i), "jennifer.anderson@kmutt.ac.th");
    await user.type(screen.getByLabelText(/^Password/i), "Password123!");

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});

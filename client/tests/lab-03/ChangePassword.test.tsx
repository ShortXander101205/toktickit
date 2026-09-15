import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { AuthUser } from "../../src/types/index.js";

const mockAuthUserWithMustChange: AuthUser = {
  id: 4,
  name: "Sarah Johnson",
  email: "sarah.johnson@kmutt.ac.th",
  role: "REQUESTER",
  mustChangePassword: true,
  isActive: true,
  department: "Library",
};

describe("Component: ChangePassword (Feature 12 - UI-02, AC-02)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    // Default session restoration as authenticated user with mustChangePassword = true
    vi.spyOn(api, "getMeApi").mockResolvedValue(mockAuthUserWithMustChange);
  });

  it("UI-02-01: renders the mandatory password change form with all 3 fields and 6-rule checklist", async () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    expect(await screen.findByRole("heading", { name: /Mandatory Password Change/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();

    // Check 6 checklist rule items
    expect(screen.getByTestId("rule-min-length")).toHaveTextContent(/At least 8 characters/i);
    expect(screen.getByTestId("rule-upper")).toHaveTextContent(/At least one uppercase letter/i);
    expect(screen.getByTestId("rule-lower")).toHaveTextContent(/At least one lowercase letter/i);
    expect(screen.getByTestId("rule-digit")).toHaveTextContent(/At least one numerical digit/i);
    expect(screen.getByTestId("rule-special")).toHaveTextContent(/At least one special character/i);
    expect(screen.getByTestId("rule-match")).toHaveTextContent(/Passwords match/i);
  });

  it("UI-02-02: disables the Update Password button while password criteria are incomplete", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    const submitBtn = await screen.findByRole("button", { name: /Update Password/i });
    expect(submitBtn).toBeDisabled();

    // Type partial password that only satisfies length and lowercase
    await user.type(screen.getByLabelText(/Current Password/i), "OldPassword123!");
    await user.type(screen.getByLabelText(/^New Password/i), "short");
    await user.type(screen.getByLabelText(/Confirm New Password/i), "short");

    expect(submitBtn).toBeDisabled();
  });

  it("UI-02-03: dynamically updates checklist item indicators as requirements are fulfilled", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    const newPwInput = await screen.findByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);

    // Initial state: not passed
    expect(screen.getByTestId("rule-min-length")).not.toHaveClass("text-success");

    // Type full compliant password in New Password
    await user.type(newPwInput, "ValidP@ssw0rd");

    expect(screen.getByTestId("rule-min-length")).toHaveClass("text-success");
    expect(screen.getByTestId("rule-upper")).toHaveClass("text-success");
    expect(screen.getByTestId("rule-lower")).toHaveClass("text-success");
    expect(screen.getByTestId("rule-digit")).toHaveClass("text-success");
    expect(screen.getByTestId("rule-special")).toHaveClass("text-success");
    // Confirm not typed yet
    expect(screen.getByTestId("rule-match")).not.toHaveClass("text-success");

    // Type matching confirmation
    await user.type(confirmInput, "ValidP@ssw0rd");
    expect(screen.getByTestId("rule-match")).toHaveClass("text-success");
  });

  it("UI-02-04: enables Update Password button when all criteria pass, submits, and invokes changePasswordApi", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    const changePwSpy = vi.spyOn(api, "changePasswordApi").mockResolvedValue({
      user: {
        ...mockAuthUserWithMustChange,
        mustChangePassword: false,
      },
    });

    render(
      <AuthProvider>
        <ChangePassword onSuccess={onSuccess} />
      </AuthProvider>
    );

    await user.type(await screen.findByLabelText(/Current Password/i), "Password123!");
    await user.type(screen.getByLabelText(/^New Password/i), "FreshSecureP@ss1");
    await user.type(screen.getByLabelText(/Confirm New Password/i), "FreshSecureP@ss1");

    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(changePwSpy).toHaveBeenCalledWith({
        currentPassword: "Password123!",
        newPassword: "FreshSecureP@ss1",
        confirmPassword: "FreshSecureP@ss1",
      });
    });

    expect(await screen.findByTestId("change-password-success")).toBeInTheDocument();
  });

  it("UI-02-05: displays error alert when changePasswordApi rejects with invalid current password", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "changePasswordApi").mockRejectedValue({
      response: {
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password does not match.",
        },
      },
    });

    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    await user.type(await screen.findByLabelText(/Current Password/i), "IncorrectOldPw!");
    await user.type(screen.getByLabelText(/^New Password/i), "FreshSecureP@ss1");
    await user.type(screen.getByLabelText(/Confirm New Password/i), "FreshSecureP@ss1");

    await user.click(screen.getByRole("button", { name: /Update Password/i }));

    const errorAlert = await screen.findByTestId("change-password-error");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent("Current password does not match.");
  });
});

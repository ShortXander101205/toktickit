import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

describe("UI-02: ChangePassword View Component", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders Current Password, New Password, Confirm Password, and all 7 checklist items initially unmet", () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/^Current Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm New Password/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });
    expect(submitBtn).toBeDisabled();

    // Check that all 7 items start unmet [ ]
    expect(screen.getByTestId("checklist-length")).toHaveTextContent("[ ]");
    expect(screen.getByTestId("checklist-upper")).toHaveTextContent("[ ]");
    expect(screen.getByTestId("checklist-lower")).toHaveTextContent("[ ]");
    expect(screen.getByTestId("checklist-number")).toHaveTextContent("[ ]");
    expect(screen.getByTestId("checklist-special")).toHaveTextContent("[ ]");
    expect(screen.getByTestId("checklist-different")).toHaveTextContent("[ ]");
    expect(screen.getByTestId("checklist-match")).toHaveTextContent("[ ]");
  });

  it("dynamically flips checklist criteria to [✓] as conditions are satisfied", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    const currentInput = screen.getByLabelText(/^Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm New Password/i);

    await user.type(currentInput, "Password123!");
    await user.type(newInput, "Secret");

    // Length < 8: unmet; Lower & Upper: met
    expect(screen.getByTestId("checklist-length")).toHaveTextContent("[ ]");
    expect(screen.getByTestId("checklist-upper")).toHaveTextContent("[✓]");
    expect(screen.getByTestId("checklist-lower")).toHaveTextContent("[✓]");

    // Add digits and special character
    await user.type(newInput, "99$New");
    expect(screen.getByTestId("checklist-length")).toHaveTextContent("[✓]");
    expect(screen.getByTestId("checklist-number")).toHaveTextContent("[✓]");
    expect(screen.getByTestId("checklist-special")).toHaveTextContent("[✓]");
    expect(screen.getByTestId("checklist-different")).toHaveTextContent("[✓]");

    // Confirm password still empty: match unmet
    expect(screen.getByTestId("checklist-match")).toHaveTextContent("[ ]");

    // Fill matching confirm password
    await user.type(confirmInput, "Secret99$New");
    expect(screen.getByTestId("checklist-match")).toHaveTextContent("[✓]");

    // All 7 met -> submit button enabled
    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });
    expect(submitBtn).toBeEnabled();
  });

  it("keeps submit button disabled when passwords do not match", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/^Current Password/i), "Password123!");
    await user.type(screen.getByLabelText(/^New Password/i), "Secret99$New");
    await user.type(screen.getByLabelText(/^Confirm New Password/i), "Different99$New");

    expect(screen.getByTestId("checklist-match")).toHaveTextContent("[ ]");
    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });
    expect(submitBtn).toBeDisabled();
  });

  it("submits valid password change and invokes onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    vi.spyOn(api, "changePasswordApi").mockResolvedValue({
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
        message: "Password changed successfully",
      },
    });

    render(
      <AuthProvider>
        <ChangePassword onSuccess={onSuccess} />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/^Current Password/i), "Password123!");
    await user.type(screen.getByLabelText(/^New Password/i), "BrandNewPass99!");
    await user.type(screen.getByLabelText(/^Confirm New Password/i), "BrandNewPass99!");

    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.changePasswordApi).toHaveBeenCalledWith({
        currentPassword: "Password123!",
        newPassword: "BrandNewPass99!",
        confirmPassword: "BrandNewPass99!",
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("renders error alert banner when API rejects password change", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "changePasswordApi").mockRejectedValue(
      new Error("Current password is incorrect.")
    );

    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/^Current Password/i), "WrongPassword123!");
    await user.type(screen.getByLabelText(/^New Password/i), "BrandNewPass99!");
    await user.type(screen.getByLabelText(/^Confirm New Password/i), "BrandNewPass99!");

    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });
    await user.click(submitBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Current password is incorrect/i);
  });
});

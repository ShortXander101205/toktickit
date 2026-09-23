import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";

interface ChangePasswordProps {
  onSuccess?: () => void;
}

export function ChangePassword({ onSuccess }: ChangePasswordProps) {
  const { changePassword, logout, user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live checklist evaluation
  const checklist = useMemo(() => {
    const hasMinLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
    const matchesConfirm = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

    const allPassed = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial && matchesConfirm;

    return {
      hasMinLength,
      hasUpper,
      hasLower,
      hasDigit,
      hasSpecial,
      matchesConfirm,
      allPassed,
    };
  }, [newPassword, confirmPassword]);

  const canSubmit = Boolean(currentPassword && checklist.allPassed && !isSubmitting);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessMessage("Password successfully updated! Redirecting to workspace...");
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (err: any) {
      const msg = err?.response?.error?.message || err?.message || "Failed to update password. Please check your current password.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3 py-5"
      style={{
        minHeight: "calc(100vh - 56px)",
        backgroundColor: "var(--color-page-bg, #f5f7f6)",
      }}
    >
      <div
        className="card border-0 shadow-lg p-4 p-sm-5 w-100"
        style={{
          maxWidth: "480px",
          borderRadius: "12px",
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: "var(--color-warning-bg, #fff8e1)",
              color: "var(--color-warning, #b26a00)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1f2937)" }}>
            Mandatory Password Change
          </h1>
          <p className="text-muted small mb-0">
            For security, {user?.name || "you"} must choose a new password before accessing TokTickIT.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3 small"
            role="alert"
            data-testid="change-password-error"
            style={{ borderRadius: "8px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            className="alert alert-success d-flex align-items-center py-2 px-3 mb-3 small"
            role="alert"
            data-testid="change-password-success"
            style={{ borderRadius: "8px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <div className="mb-3">
            <label htmlFor="currentPassword" className="form-label small fw-semibold">
              Current Password <span className="text-danger">*</span>
            </label>
            <input
              id="currentPassword"
              type="password"
              name="currentPassword"
              className="form-control"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isSubmitting}
              style={{ height: "42px", borderRadius: "6px" }}
            />
          </div>

          {/* New Password */}
          <div className="mb-3">
            <label htmlFor="newPassword" className="form-label small fw-semibold">
              New Password <span className="text-danger">*</span>
            </label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              className="form-control"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isSubmitting}
              style={{ height: "42px", borderRadius: "6px" }}
            />
          </div>

          {/* Confirm New Password */}
          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label small fw-semibold">
              Confirm New Password <span className="text-danger">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              className="form-control"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
              style={{ height: "42px", borderRadius: "6px" }}
            />
          </div>

          {/* Live Validation Checklist */}
          <div
            className="p-3 mb-4 rounded"
            style={{
              backgroundColor: "var(--color-page-bg, #f5f7f6)",
              border: "1px solid var(--color-field-border, #e5e7eb)",
              fontSize: "0.825rem",
            }}
          >
            <div className="fw-semibold text-muted mb-2">Password Requirements:</div>
            <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
              <li
                data-testid="rule-min-length"
                className={`d-flex align-items-center gap-2 ${checklist.hasMinLength ? "text-success fw-semibold" : "text-muted"}`}
              >
                <span>{checklist.hasMinLength ? "✓" : "○"}</span>
                <span>At least 8 characters</span>
              </li>
              <li
                data-testid="rule-upper"
                className={`d-flex align-items-center gap-2 ${checklist.hasUpper ? "text-success fw-semibold" : "text-muted"}`}
              >
                <span>{checklist.hasUpper ? "✓" : "○"}</span>
                <span>At least one uppercase letter (A-Z)</span>
              </li>
              <li
                data-testid="rule-lower"
                className={`d-flex align-items-center gap-2 ${checklist.hasLower ? "text-success fw-semibold" : "text-muted"}`}
              >
                <span>{checklist.hasLower ? "✓" : "○"}</span>
                <span>At least one lowercase letter (a-z)</span>
              </li>
              <li
                data-testid="rule-digit"
                className={`d-flex align-items-center gap-2 ${checklist.hasDigit ? "text-success fw-semibold" : "text-muted"}`}
              >
                <span>{checklist.hasDigit ? "✓" : "○"}</span>
                <span>At least one numerical digit (0-9)</span>
              </li>
              <li
                data-testid="rule-special"
                className={`d-flex align-items-center gap-2 ${checklist.hasSpecial ? "text-success fw-semibold" : "text-muted"}`}
              >
                <span>{checklist.hasSpecial ? "✓" : "○"}</span>
                <span>At least one special character (!@#$%^&*...)</span>
              </li>
              <li
                data-testid="rule-match"
                className={`d-flex align-items-center gap-2 ${checklist.matchesConfirm ? "text-success fw-semibold" : "text-muted"}`}
              >
                <span>{checklist.matchesConfirm ? "✓" : "○"}</span>
                <span>Passwords match</span>
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary-green w-100 py-2 fw-semibold"
            disabled={!canSubmit}
            style={{
              minHeight: "44px",
              backgroundColor: canSubmit ? "var(--color-primary-green, #006b3c)" : undefined,
              borderRadius: "6px",
            }}
          >
            {isSubmitting ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Updating Password...</span>
              </span>
            ) : (
              "Update Password"
            )}
          </button>
        </form>

        {/* Logout Escape Option */}
        <div className="mt-4 pt-3 border-top text-center">
          <button
            type="button"
            className="btn btn-link btn-sm text-secondary text-decoration-none"
            onClick={logout}
            disabled={isSubmitting}
          >
            Sign out and return to login
          </button>
        </div>
      </div>
    </div>
  );
}

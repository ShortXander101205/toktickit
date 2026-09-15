import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";

interface ChangePasswordProps {
  onSuccess?: () => void;
}

export function ChangePassword({ onSuccess }: ChangePasswordProps) {
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 7-criteria checklist calculation live on keystroke
  const criteria = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*]/.test(newPassword),
      differentFromCurrent: Boolean(
        newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword
      ),
      matchesConfirm: Boolean(
        newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
      ),
    };
  }, [newPassword, currentPassword, confirmPassword]);

  const allValid =
    criteria.minLength &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNumber &&
    criteria.hasSpecial &&
    criteria.differentFromCurrent &&
    criteria.matchesConfirm;

  const checklistItems = [
    { id: "length", met: criteria.minLength, label: "At least 8 characters" },
    { id: "upper", met: criteria.hasUpper, label: "At least 1 uppercase letter (A-Z)" },
    { id: "lower", met: criteria.hasLower, label: "At least 1 lowercase letter (a-z)" },
    { id: "number", met: criteria.hasNumber, label: "At least 1 number (0-9)" },
    { id: "special", met: criteria.hasSpecial, label: "At least 1 special character (!@#$%^&*)" },
    { id: "different", met: criteria.differentFromCurrent, label: "Different from current password" },
    { id: "match", met: criteria.matchesConfirm, label: "Passwords match" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(
        err.response?.error?.message || err.message || "Failed to update password. Please check your inputs."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column"
      style={{ backgroundColor: "var(--color-page-bg)" }}
    >
      {/* Minimal Header for Password Change Mode */}
      <header
        className="d-flex align-items-center justify-content-between px-3 px-md-4"
        style={{
          backgroundColor: "var(--color-primary-green)",
          minHeight: "56px",
          color: "#ffffff",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span className="fw-bold fs-5 tracking-tight">TokTickIT</span>
          <span
            className="badge ms-1"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          >
            Password Setup
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          {user && (
            <span className="small text-white-50 d-none d-sm-inline">
              Signed in as <strong className="text-white">{user.name}</strong>
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-light py-1 px-2"
            style={{ fontSize: "0.75rem", borderRadius: "6px" }}
            onClick={() => logout()}
            data-testid="logout-button"
            data-tooltip="Sign out of current account"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Center Card */}
      <div className="d-flex align-items-center justify-content-center flex-grow-1 p-3">
        <div
          className="card border-0 shadow-sm p-4 w-100"
          style={{
            maxWidth: "480px",
            borderRadius: "8px",
            backgroundColor: "var(--color-surface-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="text-center mb-3">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-2"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary-green)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2 className="h5 fw-bold mb-1" style={{ color: "var(--color-primary-green)" }}>
              Password Change Required
            </h2>
            <p className="text-muted small mb-0">
              You must set a new password before accessing application resources.
            </p>
          </div>

          {errorMessage && (
            <div
              className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3"
              role="alert"
              style={{
                backgroundColor: "var(--color-danger-bg)",
                borderColor: "var(--color-danger)",
                color: "var(--color-danger)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="me-2 flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Current Password */}
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label small fw-semibold">
                Current Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-testid="toggle-current-password"
                  onClick={() => setShowCurrent((p) => !p)}
                  disabled={isSubmitting}
                  style={{ borderColor: "var(--color-field-border)" }}
                >
                  {showCurrent ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label small fw-semibold">
                New Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-testid="toggle-new-password"
                  onClick={() => setShowNew((p) => !p)}
                  disabled={isSubmitting}
                  style={{ borderColor: "var(--color-field-border)" }}
                >
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="mb-3">
              <label htmlFor="confirm-password" className="form-label small fw-semibold">
                Confirm New Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-testid="toggle-confirm-password"
                  onClick={() => setShowConfirm((p) => !p)}
                  disabled={isSubmitting}
                  style={{ borderColor: "var(--color-field-border)" }}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* 7-Criteria Live Checklist */}
            <div
              className="p-3 mb-4 rounded"
              style={{
                backgroundColor: "var(--color-page-bg)",
                border: "1px solid var(--color-field-readonly-border)",
              }}
            >
              <div className="small fw-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                Password Requirements:
              </div>
              <ul className="list-unstyled mb-0 small">
                {checklistItems.map((item) => (
                  <ChecklistItem key={item.id} id={item.id} met={item.met} label={item.label} />
                ))}
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary-green w-100"
              disabled={!allValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <span>Updating password...</span>
                </>
              ) : (
                "Update Password & Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ id, met, label }: { id: string; met: boolean; label: string }) {
  return (
    <li
      className="d-flex align-items-center mb-1 gap-2"
      style={{
        color: met ? "var(--color-success)" : "var(--color-text-muted)",
        fontWeight: met ? 600 : 400,
        transition: "color 0.15s ease-in-out",
      }}
      data-testid={`checklist-${id}`}
    >
      <span style={{ width: "18px", display: "inline-block", textAlign: "center" }}>
        {met ? "[✓]" : "[ ]"}
      </span>
      <span>{label}</span>
    </li>
  );
}

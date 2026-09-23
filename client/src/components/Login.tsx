import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface LoginProps {
  onSuccess?: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: trimmedEmail, password });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.response?.error?.message || err?.message || "Invalid email address or password.";
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
          maxWidth: "420px",
          borderRadius: "12px",
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: "var(--color-pale-green, #eaf6ef)",
              color: "var(--color-primary-green, #006b3c)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1f2937)" }}>
            Sign In
          </h1>
          <p className="text-muted small mb-0">Enter your institutional credentials to access IT Services</p>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3 small"
            role="alert"
            data-testid="login-error"
            style={{ borderRadius: "8px" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="me-2 flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email Input */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label small fw-semibold">
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-control"
              placeholder="username@kmutt.ac.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={isSubmitting}
              style={{ height: "42px", borderRadius: "6px" }}
            />
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label htmlFor="password" className="form-label small fw-semibold">
              Password <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                style={{ height: "42px", borderRadius: "6px 0 0 6px" }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isSubmitting}
                style={{
                  minWidth: "44px",
                  borderRadius: "0 6px 6px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? (
                  /* Eye-off icon */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  /* Eye icon */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary-green w-100 py-2 fw-semibold"
            disabled={isSubmitting}
            style={{
              minHeight: "44px",
              backgroundColor: "var(--color-primary-green, #006b3c)",
              borderColor: "var(--color-primary-green, #006b3c)",
              borderRadius: "6px",
            }}
          >
            {isSubmitting ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Signing in...</span>
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Safe Demo Hint */}
        <div className="mt-4 pt-3 border-top text-center">
          <small className="text-muted d-block mb-1">Testing Demo Accounts:</small>
          <div className="small text-secondary" style={{ fontSize: "0.8rem" }}>
            <code>sarah.johnson@kmutt.ac.th</code> (Password: <code>Password123!</code>)
          </div>
        </div>
      </div>
    </div>
  );
}

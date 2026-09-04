import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";

interface RequesterSelectorProps {
  isSwitchMode?: boolean;
  onCancel?: () => void;
  onContinue?: () => void;
}

export function RequesterSelector({
  isSwitchMode = false,
  onCancel,
  onContinue,
}: RequesterSelectorProps) {
  const {
    currentRequester,
    requesters,
    isLoading,
    error,
    selectRequester,
    closeSwitchModal,
    refreshRequesters,
  } = useRequester();

  const [selectedId, setSelectedId] = useState<string>(
    currentRequester ? String(currentRequester.id) : ""
  );

  useEffect(() => {
    if (currentRequester) {
      setSelectedId(String(currentRequester.id));
    }
  }, [currentRequester]);

  const handleContinue = () => {
    if (!selectedId) return;
    const chosen = requesters.find((u) => String(u.id) === selectedId);
    if (chosen) {
      selectRequester(chosen);
      if (onContinue) onContinue();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      closeSwitchModal();
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(2px)",
        zIndex: 1050,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="selector-title"
    >
      <div
        className="card border-0 shadow-lg"
        style={{
          width: "100%",
          maxWidth: "480px",
          borderRadius: "8px",
          padding: "1.5rem",
          backgroundColor: "var(--color-surface-card)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-3">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-2"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h1 id="selector-title" className="h4 fw-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Select Development Requester
          </h1>
          <p className="text-muted small mb-0">
            Choose a development requester to simulate requester-specific context for Lab 2.
          </p>
        </div>

        {/* Notice Banner */}
        <div
          className="p-3 mb-3 rounded"
          style={{
            backgroundColor: "var(--color-pale-green)",
            borderLeft: "4px solid var(--color-primary-green)",
            fontSize: "0.8125rem",
            color: "var(--color-text-primary)",
          }}
        >
          <strong>Lab 2 Notice:</strong> This selector simulates requester login for grading and development. Full authentication is deferred to Lab 3.
        </div>

        {/* State: Loading */}
        {isLoading && (
          <div className="text-center py-4">
            <div className="spinner-border text-success spinner-border-sm me-2" role="status" />
            <span className="text-muted small">Loading available requesters...</span>
          </div>
        )}

        {/* State: API Error */}
        {!isLoading && error && (
          <div className="alert alert-danger p-3 mb-3" role="alert">
            <div className="fw-semibold mb-1">Unable to reach the server</div>
            <p className="small mb-2">{error}</p>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => refreshRequesters()}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* State: Empty Requesters */}
        {!isLoading && !error && requesters.length === 0 && (
          <div
            className="p-3 mb-3 rounded"
            style={{
              backgroundColor: "var(--color-warning-bg)",
              border: "1px solid var(--color-kmutt-yellow)",
              color: "var(--color-warning)",
            }}
          >
            <div className="fw-semibold small mb-1">No Active Requesters Found</div>
            <p className="small mb-0">
              No active development requesters found in database. Please run <code>npx prisma db seed</code> on the server.
            </p>
          </div>
        )}

        {/* State: Dropdown Form */}
        {!isLoading && !error && requesters.length > 0 && (
          <div className="mb-4">
            <label htmlFor="requester-select" className="form-label fw-semibold small mb-1">
              Development Requester <span className="text-danger ms-1">*</span>
            </label>
            <select
              id="requester-select"
              data-testid="requester-select"
              className="form-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ height: "38px", borderRadius: "6px" }}
            >
              {!isSwitchMode && <option value="">-- Choose a Requester --</option>}
              {requesters.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <div className="form-text text-muted small mt-1">
              Only active development requesters are shown.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="d-flex justify-content-end gap-2 mt-2">
          {isSwitchMode && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleCancel}
              style={{ height: "38px", borderRadius: "6px", fontWeight: 600 }}
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary-green px-4"
            disabled={isLoading || Boolean(error) || requesters.length === 0 || !selectedId}
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

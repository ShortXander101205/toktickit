import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import {
  AdminUserDTO,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  UserRole,
} from "../types/index.js";
import {
  fetchAdminUsersApi,
  createAdminUserApi,
  updateAdminUserApi,
  resetUserPasswordApi,
} from "../api.js";

export function UserManagement() {
  const auth = useContext(AuthContext);
  const currentUser = auth?.user;

  // Data states
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDTO | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateAdminUserPayload>({
    name: "",
    email: "",
    department: "",
    role: "REQUESTER",
    isActive: true,
    initialPassword: "",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateAdminUserPayload>({
    name: "",
    email: "",
    department: "",
    role: "REQUESTER",
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Password Reset sub-form state (inside Edit Modal)
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // 300ms Debounce effect on search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users when debounced search or selected role changes
  useEffect(() => {
    loadUsers();
  }, [debouncedSearch, selectedRole]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsersApi({
        search: debouncedSearch.trim() || undefined,
        role: selectedRole || undefined,
      });
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load user roster.");
    } finally {
      setLoading(false);
    }
  }

  // Handle opening Create Modal
  function handleOpenCreate() {
    setCreateForm({
      name: "",
      email: "",
      department: "",
      role: "REQUESTER",
      isActive: true,
      initialPassword: "",
    });
    setCreateError(null);
    setShowCreatePassword(false);
    setIsCreateModalOpen(true);
  }

  // Handle Create User Submit
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.name.trim()) {
      setCreateError("Full name is required.");
      return;
    }
    if (!createForm.email.trim()) {
      setCreateError("Email address is required.");
      return;
    }
    if (!createForm.initialPassword || createForm.initialPassword.length < 8) {
      setCreateError("Initial password must be at least 8 characters long.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await createAdminUserApi({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        department: createForm.department?.trim() || undefined,
        role: createForm.role,
        isActive: createForm.isActive,
        initialPassword: createForm.initialPassword,
      });

      setIsCreateModalOpen(false);
      setSuccessMessage(`User "${created.name}" created successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadUsers();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create user.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Handle opening Edit Modal
  function handleOpenEdit(user: AdminUserDTO) {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      department: user.department || "",
      role: user.role,
      isActive: user.isActive,
    });
    setEditError(null);
    setResetPasswordInput("");
    setResetError(null);
    setResetSuccess(null);
  }

  // Handle Edit User Submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editForm.name?.trim()) {
      setEditError("Full name is required.");
      return;
    }
    if (!editForm.email?.trim()) {
      setEditError("Email address is required.");
      return;
    }

    setEditSubmitting(true);
    try {
      const updated = await updateAdminUserApi(editingUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        department: editForm.department?.trim() || undefined,
        role: editForm.role,
        isActive: editForm.isActive,
      });

      setEditingUser(null);
      setSuccessMessage(`User "${updated.name}" updated successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadUsers();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update user.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Handle Password Reset Submit (inside Edit Modal)
  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setResetError(null);
    setResetSuccess(null);

    if (!resetPasswordInput || resetPasswordInput.length < 8) {
      setResetError("New initial password must be at least 8 characters long.");
      return;
    }

    setResetSubmitting(true);
    try {
      await resetUserPasswordApi(editingUser.id, {
        newInitialPassword: resetPasswordInput,
      });
      setResetSuccess("Initial password reset! User will be forced to change password on next login.");
      setResetPasswordInput("");
    } catch (err: any) {
      setResetError(err?.message || "Failed to reset password.");
    } finally {
      setResetSubmitting(false);
    }
  }

  // Helper to render role badge pill
  function renderRoleBadge(role: UserRole) {
    if (role === "ADMINISTRATOR") {
      return (
        <span
          className="badge rounded-pill"
          data-testid="role-badge-admin"
          style={{
            backgroundColor: "#fef3c7",
            color: "#b45309",
            border: "1px solid #d97706",
            fontWeight: 600,
            fontSize: "0.75rem",
          }}
        >
          Administrator
        </span>
      );
    }
    if (role === "IT_STAFF") {
      return (
        <span
          className="badge rounded-pill"
          data-testid="role-badge-staff"
          style={{
            backgroundColor: "#e0f2fe",
            color: "#0369a1",
            border: "1px solid #0284c7",
            fontWeight: 600,
            fontSize: "0.75rem",
          }}
        >
          IT Staff
        </span>
      );
    }
    return (
      <span
        className="badge rounded-pill"
        data-testid="role-badge-requester"
        style={{
          backgroundColor: "#eaf6ef",
          color: "#006b3c",
          border: "1px solid #006b3c",
          fontWeight: 600,
          fontSize: "0.75rem",
        }}
      >
        Requester
      </span>
    );
  }

  // Helper to render active/inactive status badge
  function renderStatusBadge(isActive: boolean) {
    if (isActive) {
      return (
        <span
          className="badge rounded-pill"
          data-testid="status-badge-active"
          style={{
            backgroundColor: "#dcfce7",
            color: "#15803d",
            border: "1px solid #86efac",
            fontWeight: 600,
            fontSize: "0.75rem",
          }}
        >
          ● Active
        </span>
      );
    }
    return (
      <span
        className="badge rounded-pill"
        data-testid="status-badge-inactive"
        style={{
          backgroundColor: "#f3f4f6",
          color: "#4b5563",
          border: "1px solid #d1d5db",
          fontWeight: 600,
          fontSize: "0.75rem",
        }}
      >
        ○ Inactive
      </span>
    );
  }

  const isEditingSelf = Boolean(editingUser && currentUser && editingUser.id === currentUser.id);

  return (
    <div className="w-100" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary-green)" }}>
            User Management
          </h1>
          <p className="text-muted small mb-0">
            Manage accounts, roles, credentials, and access states across TokTickIT
          </p>
        </div>
        <button
          type="button"
          className="btn text-white fw-semibold px-3 py-2 shadow-sm d-flex align-items-center gap-2"
          data-testid="add-user-btn"
          style={{
            backgroundColor: "var(--color-primary-green)",
            borderRadius: "6px",
            minHeight: "40px",
          }}
          onClick={handleOpenCreate}
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
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add User</span>
        </button>
      </div>

      {/* Global Notifications */}
      {successMessage && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between shadow-sm py-2 px-3 mb-3"
          data-testid="admin-success-alert"
          role="alert"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            className="btn-close btn-sm"
            onClick={() => setSuccessMessage(null)}
          ></button>
        </div>
      )}

      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between shadow-sm py-2 px-3 mb-3"
          data-testid="admin-error-alert"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn-close btn-sm"
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div
        className="card border-0 shadow-sm p-3 mb-4"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-7 col-lg-8">
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 text-muted">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="admin-search-input"
                style={{ fontSize: "0.9rem" }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setSearchTerm("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="col-12 col-md-5 col-lg-4">
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              data-testid="admin-role-filter"
              style={{ fontSize: "0.9rem" }}
            >
              <option value="">Filter by Role: All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="card border-0 shadow-sm p-5 text-center my-3 bg-white" style={{ borderRadius: "8px" }}>
          <div className="spinner-border text-success mx-auto mb-2" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
          <p className="text-muted small mb-0">Retrieving user accounts...</p>
        </div>
      ) : users.length === 0 ? (
        /* Empty State */
        <div
          className="card border-0 shadow-sm p-5 text-center my-3 bg-white"
          style={{ borderRadius: "8px" }}
          data-testid="empty-users-state"
        >
          <div className="text-muted mb-2">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h5 className="fw-semibold text-dark mb-1">No Users Found</h5>
          <p className="text-muted small mb-0">
            {debouncedSearch || selectedRole
              ? "No accounts match the current search or role filter."
              : "No user accounts are currently registered in TokTickIT."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div
            className="d-none d-md-block card border-0 shadow-sm overflow-hidden mb-4 bg-white"
            style={{ borderRadius: "8px" }}
          >
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="admin-users-table">
                <thead style={{ backgroundColor: "var(--color-table-header)", borderBottom: "2px solid #e5e7eb" }}>
                  <tr>
                    <th scope="col" className="py-3 px-3 text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4b5563" }}>
                      Full Name
                    </th>
                    <th scope="col" className="py-3 px-3 text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4b5563" }}>
                      Email Address
                    </th>
                    <th scope="col" className="py-3 px-3 text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4b5563" }}>
                      Role
                    </th>
                    <th scope="col" className="py-3 px-3 text-uppercase fw-semibold" style={{ fontSize: "0.75rem", color: "#4b5563" }}>
                      Status
                    </th>
                    <th scope="col" className="py-3 px-3 text-uppercase fw-semibold text-end" style={{ fontSize: "0.75rem", color: "#4b5563" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      <td className="py-3 px-3">
                        <div className="fw-semibold text-dark" data-testid={`user-name-${u.id}`}>
                          {u.name}
                          {u.id === currentUser?.id && (
                            <span className="badge bg-light text-muted border ms-2" style={{ fontSize: "0.7rem" }}>
                              You
                            </span>
                          )}
                        </div>
                        {u.department && (
                          <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                            {u.department}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted small" data-testid={`user-email-${u.id}`}>
                        {u.email}
                      </td>
                      <td className="py-3 px-3">{renderRoleBadge(u.role)}</td>
                      <td className="py-3 px-3">{renderStatusBadge(u.isActive)}</td>
                      <td className="py-3 px-3 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary px-3"
                          data-testid={`edit-user-btn-${u.id}`}
                          style={{ fontSize: "0.8rem", borderRadius: "4px" }}
                          onClick={() => handleOpenEdit(u)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card View (< 768px) */}
          <div className="d-block d-md-none" data-testid="admin-users-mobile-list">
            {users.map((u) => (
              <div
                key={u.id}
                className="card border shadow-sm p-3 mb-3 bg-white"
                style={{ borderRadius: "8px" }}
                data-testid={`user-card-${u.id}`}
              >
                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="badge bg-light text-muted border ms-2" style={{ fontSize: "0.7rem" }}>
                          You
                        </span>
                      )}
                    </h6>
                    {u.department && (
                      <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                        {u.department}
                      </span>
                    )}
                  </div>
                  <div>{renderRoleBadge(u.role)}</div>
                </div>
                <div className="text-muted small mb-2" style={{ wordBreak: "break-all" }}>
                  {u.email}
                </div>
                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <div>{renderStatusBadge(u.isActive)}</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    style={{ minHeight: "44px", borderRadius: "4px" }}
                    onClick={() => handleOpenEdit(u)}
                  >
                    Edit User
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* Create User Modal                                                         */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: "8px" }}>
              <div className="modal-header border-bottom py-3" style={{ backgroundColor: "var(--color-primary-green)", color: "#ffffff" }}>
                <h5 className="modal-title fw-bold fs-6">Add New User</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setIsCreateModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4">
                  {createError && (
                    <div
                      className="alert alert-danger py-2 px-3 small mb-3"
                      data-testid="create-user-error"
                      role="alert"
                    >
                      {createError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Somchai Prasert"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      data-testid="create-user-name"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. somchai.pra@kmutt.ac.th"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      data-testid="create-user-email"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Department / Unit (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Faculty of Engineering"
                      value={createForm.department}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      data-testid="create-user-department"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                      data-testid="create-user-role"
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Initial Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type={showCreatePassword ? "text" : "password"}
                        className="form-control"
                        placeholder="Minimum 8 characters"
                        value={createForm.initialPassword}
                        onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                        data-testid="create-user-password"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                      >
                        {showCreatePassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="form-text small" style={{ fontSize: "0.75rem" }}>
                      User will be required to change this password on their first login.
                    </div>
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="createActiveToggle"
                      checked={createForm.isActive}
                      onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                      data-testid="create-user-active"
                    />
                    <label className="form-check-label small fw-semibold text-dark" htmlFor="createActiveToggle">
                      Active Account
                    </label>
                  </div>
                </div>
                <div className="modal-footer bg-light py-2 px-4 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm px-4 fw-semibold"
                    style={{ backgroundColor: "var(--color-primary-green)" }}
                    data-testid="create-user-submit"
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Edit User Modal                                                           */}
      {/* ========================================================================= */}
      {editingUser && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: "8px" }}>
              <div className="modal-header border-bottom py-3" style={{ backgroundColor: "var(--color-primary-green)", color: "#ffffff" }}>
                <h5 className="modal-title fw-bold fs-6">
                  Edit User: {editingUser.name}
                  <span className="badge bg-white text-dark ms-2" style={{ fontSize: "0.75rem" }}>
                    ID: {editingUser.id}
                  </span>
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setEditingUser(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {editError && (
                  <div
                    className="alert alert-danger py-2 px-3 small mb-3"
                    data-testid="edit-user-error"
                    role="alert"
                  >
                    {editError}
                  </div>
                )}

                <form onSubmit={handleEditSubmit}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        data-testid="edit-user-name"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        data-testid="edit-user-email"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Department / Unit
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.department || ""}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        data-testid="edit-user-department"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">
                        Role <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                        disabled={isEditingSelf}
                        data-testid="edit-user-role"
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="IT_STAFF">IT Staff</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                      {isEditingSelf && (
                        <div className="form-text text-warning small" style={{ fontSize: "0.75rem" }}>
                          You cannot demote your own administrator role.
                        </div>
                      )}
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="editActiveToggle"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                          disabled={isEditingSelf}
                          data-testid="edit-user-active"
                        />
                        <label className="form-check-label small fw-semibold text-dark" htmlFor="editActiveToggle">
                          Active Account
                        </label>
                      </div>
                      {isEditingSelf && (
                        <div className="form-text text-warning small" style={{ fontSize: "0.75rem" }}>
                          You cannot deactivate your own active administrator account.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm px-3"
                      onClick={() => setEditingUser(null)}
                      disabled={editSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success btn-sm px-4 fw-semibold"
                      style={{ backgroundColor: "var(--color-primary-green)" }}
                      data-testid="edit-user-submit"
                      disabled={editSubmitting}
                    >
                      {editSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>

                {/* Password Reset Sub-Section */}
                <div
                  className="card border shadow-none p-3 mt-4"
                  style={{ backgroundColor: "#fafaf9", borderRadius: "6px", border: "1px solid #e7e5e4" }}
                  data-testid="reset-password-section"
                >
                  <h6 className="fw-bold mb-2 text-dark fs-6 d-flex align-items-center gap-2">
                    <svg
                      width="16"
                      height="16"
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
                    Reset Initial Password
                  </h6>
                  <p className="text-muted small mb-3" style={{ fontSize: "0.8rem" }}>
                    Provision a new temporary initial password for this user. The account will be flagged to change their password upon their next login.
                  </p>

                  {resetSuccess && (
                    <div className="alert alert-success py-2 px-3 small mb-3" data-testid="reset-password-success">
                      {resetSuccess}
                    </div>
                  )}

                  {resetError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" data-testid="reset-password-error">
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handleResetPasswordSubmit}>
                    <div className="row g-2 align-items-center">
                      <div className="col-12 col-md-8">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="New initial password (min 8 chars)"
                          value={resetPasswordInput}
                          onChange={(e) => setResetPasswordInput(e.target.value)}
                          data-testid="reset-password-input"
                          minLength={8}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <button
                          type="submit"
                          className="btn btn-sm btn-outline-danger w-100 fw-semibold"
                          data-testid="reset-password-btn"
                          disabled={resetSubmitting}
                        >
                          {resetSubmitting ? "Resetting..." : "Apply Password Reset"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default UserManagement;

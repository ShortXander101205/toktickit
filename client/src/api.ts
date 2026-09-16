import {
  AuthUser,
  LoginPayload,
  ChangePasswordPayload,
  RequesterUser,
  RelatedSystem,
  Category,
  ApiResponse,
  Ticket,
  TicketDetail,
  Attachment,
  CreateTicketPayload,
  StaffQueueQueryParams,
  StaffQueueResponseDTO,
  StaffTicketSummaryDTO,
  StaffTicketOwnerDTO,
  PublicCommentDTO,
  InternalNoteDTO,
  AdminUserDTO,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  ResetUserPasswordPayload,
} from "./types/index.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Re-export Category for backward compatibility
export type { Category } from "./types/index.js";

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    try {
      localStorage.setItem("toktickit_auth_token", token);
    } catch {}
  } else {
    try {
      localStorage.removeItem("toktickit_auth_token");
    } catch {}
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    return localStorage.getItem("toktickit_auth_token");
  } catch {
    return null;
  }
}

// Authentication API methods
export async function loginApi(payload: LoginPayload): Promise<{ user: AuthUser; token?: string }> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<{ user: AuthUser; token?: string }> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Login failed (HTTP ${res.status})`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  if (json.data?.token) {
    setAuthToken(json.data.token);
  }

  return json.data;
}

export async function logoutApi(): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers,
      credentials: "include",
    });
  } finally {
    setAuthToken(null);
  }
}

export async function getMeApi(): Promise<AuthUser> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const json: ApiResponse<{ user: AuthUser }> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to fetch authenticated user (HTTP ${res.status})`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data.user;
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<{ user: AuthUser }> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/auth/change-password`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<{ user: AuthUser }> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Password change failed (HTTP ${res.status})`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export function getRequesterHeaders(activeRequesterId?: number | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (activeRequesterId) {
    headers["x-requester-id"] = String(activeRequesterId);
  }
  return headers;
}

// Fetch active requesters
export async function fetchRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error(`Failed to fetch requesters: HTTP ${res.status}`);
  }
  const json: ApiResponse<RequesterUser[]> = await res.json();
  return json.data;
}

// Fetch active related systems
export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error(`Failed to fetch related systems: HTTP ${res.status}`);
  }
  const json: ApiResponse<RelatedSystem[]> = await res.json();
  return json.data;
}

// Fetch active categories
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: HTTP ${res.status}`);
  }
  const json: ApiResponse<Category[]> = await res.json();
  return json.data;
}

// Create Ticket with optional attachments
export async function createTicket(
  payload: CreateTicketPayload,
  attachments: File[] = [],
  activeRequesterId: number
): Promise<ApiResponse<Ticket>> {
  const url = `${API_URL}/api/tickets`;
  let body: BodyInit;
  const headers: Record<string, string> = {
    "x-requester-id": String(activeRequesterId),
  };

  if (attachments.length > 0) {
    const formData = new FormData();
    formData.append("summary", payload.summary);
    formData.append("description", payload.description);
    formData.append("categoryId", String(payload.categoryId));
    formData.append("relatedSystemId", String(payload.relatedSystemId));
    formData.append("requestedPriority", payload.requestedPriority);
    for (const file of attachments) {
      formData.append("attachments", file);
    }
    body = formData;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  const json: ApiResponse<Ticket> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Ticket creation failed (HTTP ${res.status})`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json;
}

// Lab 1 backward compatibility method
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Backend is offline");
  }
  const catRes = await fetch(`${API_URL}/api/categories`);
  if (!catRes.ok) {
    throw new Error("Failed to fetch categories");
  }
  const json = await catRes.json();
  const categories: Category[] = Array.isArray(json) ? json : json.data;
  return { online: true, categories };
}

export interface FetchTicketsParams {
  search?: string;
  category?: number | string;
  categoryId?: number | string;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedTicketsResponse {
  success: boolean;
  data: Ticket[];
  pagination: {
    totalCount: number;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// Fetch owned tickets for active requester with search, filters, sorting, and pagination
export async function fetchTickets(
  params: FetchTicketsParams = {},
  activeRequesterId: number
): Promise<PaginatedTicketsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  const catVal = params.category ?? params.categoryId;
  if (catVal !== undefined && catVal !== "") query.set("category", String(catVal));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.status) query.set("status", params.status);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_URL}/api/tickets${queryString}`, {
    headers: {
      "x-requester-id": String(activeRequesterId),
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const msg = errorJson?.error?.message || `Failed to fetch tickets: HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.response = errorJson;
    throw err;
  }

  const json: PaginatedTicketsResponse = await res.json();
  return json;
}

// Fetch complete ticket detail for active requester
export async function fetchTicketDetail(
  ticketId: number,
  activeRequesterId: number
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: {
      "x-requester-id": String(activeRequesterId),
    },
  });

  const json: ApiResponse<TicketDetail> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to fetch ticket: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

// Upload attachment file directly to ticket
export async function uploadTicketAttachment(
  ticketId: number,
  file: File,
  activeRequesterId: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "x-requester-id": String(activeRequesterId),
    },
    body: formData,
  });

  const json: ApiResponse<Attachment> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to upload attachment: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

// Download active attachment file
export async function downloadAttachment(
  attachmentId: number,
  filename: string,
  activeRequesterId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    headers: {
      "x-requester-id": String(activeRequesterId),
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const msg = errorJson?.error?.message || `Download failed: HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.response = errorJson;
    throw err;
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// Soft-remove attachment with reason
export async function removeAttachment(
  attachmentId: number,
  reason: string,
  activeRequesterId: number
): Promise<ApiResponse<any>> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": String(activeRequesterId),
    },
    body: JSON.stringify({ reason }),
  });

  const json: ApiResponse<any> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to remove attachment: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json;
}

// Issue 13: IT Staff Ticket Queue API
export async function getStaffTicketsApi(
  params?: StaffQueueQueryParams
): Promise<StaffQueueResponseDTO> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.category) query.set("category", params.category);
  if (params?.priority) query.set("priority", params.priority);
  if (params?.owner) query.set("owner", params.owner);
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params?.page !== undefined) query.set("page", String(params.page));
  if (params?.pageSize !== undefined) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();
  const url = `${API_URL}/api/v1/staff/tickets${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const json: ApiResponse<StaffQueueResponseDTO> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to retrieve staff ticket queue: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

// Issue 14: IT Staff Ticket Detail & Operational Controls API
export async function getTicketDetailApi(
  ticketId: number,
  activeRequesterId?: number
): Promise<TicketDetail> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (activeRequesterId) {
    headers["x-requester-id"] = String(activeRequesterId);
  }

  const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const json: ApiResponse<TicketDetail> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to fetch ticket detail: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function getStaffAssigneesApi(): Promise<StaffTicketOwnerDTO[]> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/staff/assignees`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const json: ApiResponse<StaffTicketOwnerDTO[]> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to retrieve assignees: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function assignTicketOwnerApi(
  ticketId: number,
  ownerId: number | null
): Promise<any> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/staff/tickets/${ticketId}/assignment`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify({ ownerId }),
  });

  const json: ApiResponse<any> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to update ticket assignment: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function updateTicketPriorityApi(
  ticketId: number,
  itPriority: string
): Promise<any> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify({ itPriority }),
  });

  const json: ApiResponse<any> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to update IT priority: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function transitionTicketStatusApi(
  ticketId: number,
  targetStatus: string
): Promise<any> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify({ targetStatus }),
  });

  const json: ApiResponse<any> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to transition ticket status: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function resolveTicketRequestApi(
  ticketId: number,
  requesterId?: number
): Promise<any> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (requesterId) {
    headers["x-requester-id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}/resolve-request`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({}),
  });

  const json: ApiResponse<any> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to record resolution indication: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function postPublicCommentApi(
  ticketId: number,
  content: string,
  requesterId?: number
): Promise<PublicCommentDTO> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (requesterId) {
    headers["x-requester-id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}/comments`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const json: ApiResponse<PublicCommentDTO> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to post public comment: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function postInternalNoteApi(
  ticketId: number,
  content: string
): Promise<InternalNoteDTO> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}/notes`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const json: ApiResponse<InternalNoteDTO> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to post internal note: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Administrator User Management API methods (Issue 15)
// ---------------------------------------------------------------------------

export async function fetchAdminUsersApi(params?: {
  search?: string;
  role?: string;
}): Promise<AdminUserDTO[]> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set("search", params.search);
  }
  if (params?.role) {
    searchParams.set("role", params.role);
  }

  const queryString = searchParams.toString();
  const url = `${API_URL}/api/v1/admin/users${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const json: ApiResponse<AdminUserDTO[]> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to fetch users: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function createAdminUserApi(
  payload: CreateAdminUserPayload
): Promise<AdminUserDTO> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/admin/users`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<AdminUserDTO> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to create user: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function updateAdminUserApi(
  id: number,
  payload: UpdateAdminUserPayload
): Promise<AdminUserDTO> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<AdminUserDTO> = await res.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Failed to parse response: HTTP ${res.status}`,
    },
  } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to update user: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}

export async function resetUserPasswordApi(
  id: number,
  payload: ResetUserPasswordPayload
): Promise<{ message: string; mustChangePassword: boolean; userId: number }> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/admin/users/${id}/reset-password`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json: ApiResponse<{ message: string; mustChangePassword: boolean; userId: number }> =
    await res.json().catch(() => ({
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: `Failed to parse response: HTTP ${res.status}`,
      },
    } as any));

  if (!res.ok) {
    const errorMsg = json.error?.message || `Failed to reset password: HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.response = json;
    throw err;
  }

  return json.data;
}




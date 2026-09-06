import { RequesterUser, RelatedSystem, Category, ApiResponse, Ticket, TicketDetail, Attachment, CreateTicketPayload } from "./types/index.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Re-export Category for backward compatibility
export type { Category } from "./types/index.js";

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export function getRequesterHeaders(activeRequesterId?: number | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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

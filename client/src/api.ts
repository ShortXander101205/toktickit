import { RequesterUser, RelatedSystem, Category, ApiResponse, Ticket, CreateTicketPayload } from "./types/index.js";

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

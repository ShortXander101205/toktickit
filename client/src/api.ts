import { RequesterUser, RelatedSystem, Category, ApiResponse } from "./types/index.js";

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

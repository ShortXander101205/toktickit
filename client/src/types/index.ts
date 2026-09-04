export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  code?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
}

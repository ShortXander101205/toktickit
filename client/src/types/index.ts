export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
  department?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department?: string | null;
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

export interface Attachment {
  id: number;
  ticketId?: number;
  originalFilename: string;
  storedFilename?: string;
  mimeType: string;
  fileSize: number;
  isRemoved?: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  removedByRequesterId?: number | null;
  removedByRequesterName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  categoryId: number;
  categoryName?: string;
  relatedSystemId: number;
  relatedSystemName?: string;
  requestedPriority: "Low" | "Medium" | "High" | "Urgent" | string;
  itPriority?: string | null;
  currentStatus: string;
  requesterId: number;
  requesterName?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface PublicCommentDTO {
  id: number;
  ticketId: number;
  author: {
    id: number;
    name: string;
    role: UserRole;
  };
  content: string;
  createdAt: string;
}

export interface InternalNoteDTO {
  id: number;
  ticketId: number;
  author: {
    id: number;
    name: string;
    role: UserRole;
  };
  content: string;
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  category?: StaffTicketCategoryDTO;
  relatedSystem?: { id: number; name: string };
  requesterEmail?: string;
  requester?: StaffTicketRequesterDTO;
  ownerId?: number | null;
  owner?: StaffTicketOwnerDTO | null;
  ticketOwner?: string | null;
  resolutionSummary?: string | null;
  requesterResolutionConfirmedAt?: string | null;
  attachments: Attachment[];
  removedAttachments: Attachment[];
  publicComments?: PublicCommentDTO[];
  internalNotes?: InternalNoteDTO[];
}

export interface AssignOwnerPayload {
  ownerId: number | null;
}

export interface UpdatePriorityPayload {
  itPriority: Priority | string;
}

export interface TransitionStatusPayload {
  targetStatus: TicketStatus | string;
}

export interface CreateCommentPayload {
  content: string;
}

export interface CreateNotePayload {
  content: string;
}

export interface CreateTicketPayload {
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "Low" | "Medium" | "High" | "Urgent" | string;
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

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export interface StaffTicketOwnerDTO {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface StaffTicketCategoryDTO {
  id: number;
  code: string;
  name: string;
}

export interface StaffTicketRequesterDTO {
  id: number;
  name: string;
  email: string;
  department?: string | null;
}

export interface StaffTicketSummaryDTO {
  id: number;
  ticketNumber: string;
  summary: string;
  category: StaffTicketCategoryDTO;
  requestedPriority: Priority | string;
  itPriority: Priority | string | null;
  currentStatus: TicketStatus | string;
  requester: StaffTicketRequesterDTO;
  owner: StaffTicketOwnerDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueuePaginationDTO {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface StaffQueueResponseDTO {
  items: StaffTicketSummaryDTO[];
  pagination: StaffQueuePaginationDTO;
  totalCount: number;
}

export interface StaffQueueQueryParams {
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  owner?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}


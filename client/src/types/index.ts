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

export interface TicketDetail extends Ticket {
  requesterEmail?: string;
  ticketOwner?: string | null;
  resolutionSummary?: string | null;
  attachments: Attachment[];
  removedAttachments: Attachment[];
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

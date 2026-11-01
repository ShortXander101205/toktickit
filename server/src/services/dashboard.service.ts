import { Priority, TicketStatus, Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";

export interface DashboardRecentTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  title: string;
  categoryId: number;
  categoryName: string;
  category: {
    id: number;
    name: string;
    code: string | null;
  };
  requestedPriority: string;
  itPriority: string | null;
  priority: string;
  currentStatus: string;
  status: string;
  ownerId: number | null;
  ownerName: string | null;
  owner: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  requesterId: number;
  requesterName: string;
  requester: {
    id: number;
    name: string;
    email: string;
    department: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequesterDashboardMetrics {
  totalOpen: number;
  waitingForRequester: number;
  inProgress: number;
  resolved: number;
  closed: number;
  metrics: {
    totalOpen: number;
    waitingForRequester: number;
    inProgress: number;
    resolved: number;
    closed: number;
    totalOpenTickets: number;
    waitingForRequesterTickets: number;
    inProgressTickets: number;
    recentlyResolvedTickets: number;
    resolvedTickets: number;
    closedTickets: number;
  };
  recentTickets: DashboardRecentTicket[];
}

export interface StaffDashboardMetrics {
  newCount: number;
  openCount: number;
  inProgressCount: number;
  waitingForRequesterCount: number;
  myAssignedCount: number;
  unassignedCount: number;
  resolvedCount: number;
  closedCount: number;
  reopenedCount: number;
  cancelledCount: number;
  urgentAttentionCount: number;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  metrics: {
    newCount: number;
    openCount: number;
    inProgressCount: number;
    waitingForRequesterCount: number;
    myAssignedCount: number;
    unassignedCount: number;
    resolvedCount: number;
    closedCount: number;
    reopenedCount: number;
    cancelledCount: number;
    urgentAttentionCount: number;
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
  recentTickets: DashboardRecentTicket[];
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
  requestersCount: number;
  staffCount: number;
  adminCount: number;
  usersByRole: {
    REQUESTER: number;
    IT_STAFF: number;
    ADMINISTRATOR: number;
  };
}

export interface AdminDashboardMetrics extends StaffDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  requestersCount: number;
  staffCount: number;
  adminCount: number;
  users: AdminUserStats;
  operationalMetrics: StaffDashboardMetrics["metrics"];
}

const ACTIVE_STATUS_ENUMS: TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_REQUESTER,
  TicketStatus.REOPENED,
];

function formatTicketToRecent(t: any): DashboardRecentTicket {
  const statusStr = String(t.currentStatus || TicketStatus.NEW);
  const itPriStr = t.itPriority ? String(t.itPriority) : null;
  const reqPriStr = String(t.requestedPriority || Priority.MEDIUM);
  const displayPri = itPriStr || reqPriStr;

  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    title: t.summary,
    categoryId: t.categoryId,
    categoryName: t.category ? t.category.name : "General",
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          code: t.category.code ?? null,
        }
      : { id: t.categoryId, name: "General", code: null },
    requestedPriority: reqPriStr,
    itPriority: itPriStr,
    priority: displayPri,
    currentStatus: statusStr,
    status: statusStr,
    ownerId: t.ownerId ?? null,
    ownerName: t.owner ? t.owner.name : null,
    owner: t.owner
      ? {
          id: t.owner.id,
          name: t.owner.name,
          email: t.owner.email,
          role: String(t.owner.role),
        }
      : null,
    requesterId: t.requesterId,
    requesterName: t.requester ? t.requester.name : `Requester #${t.requesterId}`,
    requester: t.requester
      ? {
          id: t.requester.id,
          name: t.requester.name,
          email: t.requester.email,
          department: t.requester.department ?? null,
        }
      : null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
  };
}

/**
 * Service to aggregate Requester dashboard metrics strictly scoped to req.user.id (BR-10, BR-13)
 */
export async function getRequesterDashboardMetrics(requesterId: number): Promise<RequesterDashboardMetrics> {
  const prisma = getPrisma();

  const [
    totalOpen,
    waitingForRequester,
    inProgress,
    resolved,
    closed,
    recentRaw,
  ] = await Promise.all([
    prisma.ticket.count({
      where: {
        requesterId,
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
      },
    }),
    prisma.ticket.count({
      where: {
        requesterId,
        currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
      },
    }),
    prisma.ticket.count({
      where: {
        requesterId,
        currentStatus: TicketStatus.IN_PROGRESS,
      },
    }),
    prisma.ticket.count({
      where: {
        requesterId,
        currentStatus: TicketStatus.RESOLVED,
      },
    }),
    prisma.ticket.count({
      where: {
        requesterId,
        currentStatus: TicketStatus.CLOSED,
      },
    }),
    prisma.ticket.findMany({
      where: { requesterId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
      include: {
        category: true,
        owner: true,
        requester: true,
      },
    }),
  ]);

  const recentTickets = recentRaw.map(formatTicketToRecent);

  return {
    totalOpen,
    waitingForRequester,
    inProgress,
    resolved,
    closed,
    metrics: {
      totalOpen,
      waitingForRequester,
      inProgress,
      resolved,
      closed,
      totalOpenTickets: totalOpen,
      waitingForRequesterTickets: waitingForRequester,
      inProgressTickets: inProgress,
      recentlyResolvedTickets: resolved,
      resolvedTickets: resolved,
      closedTickets: closed,
    },
    recentTickets,
  };
}

/**
 * Service to aggregate IT Staff queue dashboard metrics (BR-11, BR-13, BR-14)
 */
export async function getStaffDashboardMetrics(
  staffUserId: number
): Promise<StaffDashboardMetrics> {
  const prisma = getPrisma();

  const [
    newCount,
    openCount,
    inProgressCount,
    waitingForRequesterCount,
    myAssignedCount,
    unassignedCount,
    resolvedCount,
    closedCount,
    reopenedCount,
    cancelledCount,
    urgentAttentionCount,
    recentRaw,
  ] = await Promise.all([
    prisma.ticket.count({ where: { currentStatus: TicketStatus.NEW } }),
    prisma.ticket.count({ where: { currentStatus: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { currentStatus: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { currentStatus: TicketStatus.WAITING_FOR_REQUESTER } }),
    prisma.ticket.count({
      where: {
        ownerId: staffUserId,
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
      },
    }),
    prisma.ticket.count({
      where: {
        ownerId: null,
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
      },
    }),
    prisma.ticket.count({ where: { currentStatus: TicketStatus.RESOLVED } }),
    prisma.ticket.count({ where: { currentStatus: TicketStatus.CLOSED } }),
    prisma.ticket.count({ where: { currentStatus: TicketStatus.REOPENED } }),
    prisma.ticket.count({ where: { currentStatus: TicketStatus.CANCELLED } }),
    prisma.ticket.count({
      where: {
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
        itPriority: { in: [Priority.HIGH, Priority.URGENT] },
      },
    }),
    prisma.ticket.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
      include: {
        category: true,
        owner: true,
        requester: true,
      },
    }),
  ]);

  const statusBreakdown: Record<string, number> = {
    NEW: newCount,
    OPEN: openCount,
    IN_PROGRESS: inProgressCount,
    WAITING_FOR_REQUESTER: waitingForRequesterCount,
    RESOLVED: resolvedCount,
    CLOSED: closedCount,
    REOPENED: reopenedCount,
    CANCELLED: cancelledCount,
  };

  const [lowCount, medCount, highCount, urgCount] = await Promise.all([
    prisma.ticket.count({
      where: {
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
        itPriority: Priority.LOW,
      },
    }),
    prisma.ticket.count({
      where: {
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
        itPriority: Priority.MEDIUM,
      },
    }),
    prisma.ticket.count({
      where: {
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
        itPriority: Priority.HIGH,
      },
    }),
    prisma.ticket.count({
      where: {
        currentStatus: { in: ACTIVE_STATUS_ENUMS },
        itPriority: Priority.URGENT,
      },
    }),
  ]);

  const priorityBreakdown: Record<string, number> = {
    LOW: lowCount,
    MEDIUM: medCount,
    HIGH: highCount,
    URGENT: urgCount,
  };

  const metricsObject = {
    newCount,
    openCount,
    inProgressCount,
    waitingForRequesterCount,
    myAssignedCount,
    unassignedCount,
    resolvedCount,
    closedCount,
    reopenedCount,
    cancelledCount,
    urgentAttentionCount,
    statusBreakdown,
    priorityBreakdown,
  };

  return {
    ...metricsObject,
    metrics: metricsObject,
    recentTickets: recentRaw.map(formatTicketToRecent),
  };
}

/**
 * Service to aggregate Administrator operational dashboard metrics + user accounts summary (BR-12)
 */
export async function getAdminDashboardMetrics(
  adminUserId: number
): Promise<AdminDashboardMetrics> {
  const prisma = getPrisma();

  const [
    staffMetrics,
    totalUsers,
    activeUsers,
    inactiveUsers,
    requestersCount,
    staffCount,
    adminCount,
  ] = await Promise.all([
    getStaffDashboardMetrics(adminUserId),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { role: Role.REQUESTER } }),
    prisma.user.count({ where: { role: Role.IT_STAFF } }),
    prisma.user.count({ where: { role: Role.ADMINISTRATOR } }),
  ]);

  const userStats: AdminUserStats = {
    totalUsers,
    activeUsers,
    inactiveUsers,
    activeUsersCount: activeUsers,
    inactiveUsersCount: inactiveUsers,
    requestersCount,
    staffCount,
    adminCount,
    usersByRole: {
      REQUESTER: requestersCount,
      IT_STAFF: staffCount,
      ADMINISTRATOR: adminCount,
    },
  };

  return {
    ...staffMetrics,
    totalUsers,
    activeUsers,
    inactiveUsers,
    requestersCount,
    staffCount,
    adminCount,
    users: userStats,
    operationalMetrics: staffMetrics.metrics,
  };
}


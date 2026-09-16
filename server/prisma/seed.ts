import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

function mapPriority(p: string | null | undefined): Priority {
  if (!p) return Priority.MEDIUM;
  const upper = p.toUpperCase();
  if (upper === "LOW") return Priority.LOW;
  if (upper === "MEDIUM") return Priority.MEDIUM;
  if (upper === "HIGH") return Priority.HIGH;
  if (upper === "URGENT") return Priority.URGENT;
  return Priority.MEDIUM;
}

function mapStatus(s: string): TicketStatus {
  const norm = s.toUpperCase().replace(/\s+/g, "_");
  if (norm === "NEW") return TicketStatus.NEW;
  if (norm === "OPEN" || norm === "ASSIGNED") return TicketStatus.OPEN;
  if (norm === "IN_PROGRESS") return TicketStatus.IN_PROGRESS;
  if (norm === "WAITING_FOR_REQUESTER" || norm === "PENDING_REQUESTER") return TicketStatus.WAITING_FOR_REQUESTER;
  if (norm === "RESOLVED") return TicketStatus.RESOLVED;
  if (norm === "CLOSED") return TicketStatus.CLOSED;
  if (norm === "REOPENED") return TicketStatus.REOPENED;
  if (norm === "CANCELLED") return TicketStatus.CANCELLED;
  return TicketStatus.NEW;
}

export const CATEGORIES_SEED = [
  {
    code: "ACC",
    name: "Account and Access",
    description: "User credentials, single sign-on, institutional permissions, and directory access",
    isActive: true,
  },
  {
    code: "HW",
    name: "Hardware",
    description: "Physical desktop computers, laptops, monitors, classroom equipment, and peripherals",
    isActive: true,
  },
  {
    code: "SW",
    name: "Software",
    description: "University software packages, operating systems, educational licenses, and utilities",
    isActive: true,
  },
  {
    code: "NET",
    name: "Network",
    description: "Campus Wi-Fi, Ethernet outlets, DNS, VPN connectivity, and network firewall rules",
    isActive: true,
  },
];

export const RELATED_SYSTEMS_SEED = [
  { name: "Email", isActive: true },
  { name: "Campus Wi-Fi", isActive: true },
  { name: "VPN", isActive: true },
  { name: "LEB2 App", isActive: true },
  { name: "Grade Submission App", isActive: true },
  { name: "Printer", isActive: true },
  { name: "Corporate Laptop", isActive: true },
];

export const USERS_SEED = [
  // 1. Requesters (4 active, 1 inactive)
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Engineering",
    role: Role.REQUESTER,
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@kmutt.ac.th",
    department: "Science",
    role: Role.REQUESTER,
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: 3,
    name: "David Lee",
    email: "david.lee@kmutt.ac.th",
    department: "Architecture",
    role: Role.REQUESTER,
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: 4,
    name: "Sarah Johnson",
    email: "sarah.johnson@kmutt.ac.th",
    department: "Science",
    role: Role.REQUESTER,
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: 5,
    name: "Prasert Inactive",
    email: "inactive.user@kmutt.ac.th",
    department: "Liberal Arts",
    role: Role.REQUESTER,
    mustChangePassword: true,
    isActive: false,
  },

  // 2. IT Staff (3 active, 1 inactive)
  {
    id: 6,
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    department: "Central IT",
    role: Role.IT_STAFF,
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: 7,
    name: "Wichai Support",
    email: "wichai.sup@kmutt.ac.th",
    department: "Helpdesk Tier 1",
    role: Role.IT_STAFF,
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: 8,
    name: "Anong Network",
    email: "anong.net@kmutt.ac.th",
    department: "Network Operations",
    role: Role.IT_STAFF,
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: 9,
    name: "Kanya Retired",
    email: "kanya.ret@kmutt.ac.th",
    department: "Legacy Systems",
    role: Role.IT_STAFF,
    mustChangePassword: true,
    isActive: false,
  },

  // 3. Administrator (1 active)
  {
    id: 10,
    name: "System Administrator",
    email: "admin@kmutt.ac.th",
    department: "IT Administration",
    role: Role.ADMINISTRATOR,
    mustChangePassword: true,
    isActive: true,
  },

  // 4. Testing Pool Requester (1 active, mustChangePassword: false)
  {
    id: 11,
    name: "Test Active Requester",
    email: "test.requester@kmutt.ac.th",
    department: "Testing Pool",
    role: Role.REQUESTER,
    mustChangePassword: false,
    isActive: true,
  },
];

// Alias for backwards compatibility with earlier tests/references
export const REQUESTER_USERS_SEED = USERS_SEED.filter((u) => u.role === Role.REQUESTER);

/**
 * Idempotent seed function. Safe to run multiple times without duplicate key violations.
 */
export async function seed(prisma: PrismaClient): Promise<void> {
  // 1. Seed Categories (Keyed on unique code)
  for (const cat of CATEGORIES_SEED) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        description: cat.description,
        isActive: cat.isActive,
      },
      create: cat,
    });
  }

  // 2. Seed Related Systems (Keyed on unique name)
  for (const sys of RELATED_SYSTEMS_SEED) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: {
        isActive: sys.isActive,
      },
      create: sys,
    });
  }

  // 3. Seed Users (Keyed on lowercase unique email with deterministic IDs 1-11)
  const defaultPasswordHash = bcryptjs.hashSync("Password123!", 10);
  for (const user of USERS_SEED) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
    });
    const existingById = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (existingByEmail && existingByEmail.id === user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name,
          department: user.department,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
        },
      });
    } else if (existingByEmail && existingByEmail.id !== user.id) {
      if (existingById && existingById.email.toLowerCase() !== user.email.toLowerCase()) {
        const tempId = existingById.id + 10000;
        await prisma.$executeRawUnsafe(`UPDATE tickets SET "requesterId" = ${tempId} WHERE "requesterId" = ${existingById.id};`);
        await prisma.$executeRawUnsafe(`UPDATE tickets SET "ownerId" = ${tempId} WHERE "ownerId" = ${existingById.id};`);
        await prisma.$executeRawUnsafe(`UPDATE attachments SET "removedByUserId" = ${tempId} WHERE "removedByUserId" = ${existingById.id};`);
        await prisma.$executeRawUnsafe(`UPDATE users SET id = ${tempId} WHERE id = ${existingById.id};`);
      }
      await prisma.$executeRawUnsafe(`UPDATE tickets SET "requesterId" = ${user.id} WHERE "requesterId" = ${existingByEmail.id};`);
      await prisma.$executeRawUnsafe(`UPDATE tickets SET "ownerId" = ${user.id} WHERE "ownerId" = ${existingByEmail.id};`);
      await prisma.$executeRawUnsafe(`UPDATE attachments SET "removedByUserId" = ${user.id} WHERE "removedByUserId" = ${existingByEmail.id};`);
      await prisma.$executeRawUnsafe(
        `UPDATE users SET id = ${user.id}, name = $1, department = $2, role = $3::"Role", "mustChangePassword" = $4, "isActive" = $5 WHERE id = ${existingByEmail.id};`,
        user.name,
        user.department,
        user.role,
        user.mustChangePassword,
        user.isActive
      );
    } else if (!existingByEmail && existingById) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email.toLowerCase(),
          name: user.name,
          department: user.department,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
          passwordHash: defaultPasswordHash,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email.toLowerCase(),
          department: user.department,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
          passwordHash: defaultPasswordHash,
        },
      });
    }
  }

  // 4. Synchronize PostgreSQL autoincrement sequences
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('categories', 'id'), coalesce(max(id), 1)) FROM categories;`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('related_systems', 'id'), coalesce(max(id), 1)) FROM related_systems;`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1)) FROM users;`
  );
}

export const DEMO_TICKETS_SEED = [
  // =========================================================================
  // Requester 1: Jennifer Anderson (22 Tickets - Demonstrates 3-Page Pagination)
  // =========================================================================
  {
    ticketNumber: "TKT-2026-00001",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Campus Wi-Fi drops intermittently near Library 4F",
    description: "Signal frequently drops to zero bars when seated near the west windows on Library 4th floor.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-15T09:15:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00002",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "LEB2 assignment submission returns HTTP 413 payload too large",
    description: "Attempting to upload the CPE334 term project ZIP file (38 MB) fails with 413 payload error.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Pending Requester",
    createdAt: new Date("2026-08-16T14:20:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00003",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Corporate laptop battery discharging rapidly within 45 minutes",
    description: "The Dell Latitude battery depletes from 100% to 10% in under an hour during standard office use.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Assigned",
    createdAt: new Date("2026-08-18T10:05:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00004",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Single Sign-On MFA push notification timeout",
    description: "Microsoft Authenticator push notifications are not arriving on iOS device, requiring backup SMS codes.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-20T08:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00005",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "External monitor flickering when connected to USB-C dock",
    description: "Secondary Dell 27-inch monitor blinks black every 2 minutes while connected through the workstation dock.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-21T11:45:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00006",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Printer",
    summary: "Departmental network printer in CB2-301 offline",
    description: "The HP LaserJet in CB2-301 is showing offline status and refusing incoming print queues.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Closed",
    createdAt: new Date("2026-08-22T13:10:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00007",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "VPN",
    summary: "Cannot connect to campus VPN while traveling abroad",
    description: "Cisco AnyConnect client gives 'Connection attempt failed due to server unavailable' from international ISP.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-23T16:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00008",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Grade Submission App",
    summary: "Grade Submission portal access denied for course CPE334",
    description: "System displays 'Unauthorized Instructor' when attempting to access the section 1 grading sheet.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-25T09:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00009",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "MATLAB campus network license checkout failure error -15",
    description: "MATLAB R2024a cannot contact the central license manager server port 27000.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-26T14:40:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00010",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Mechanical keyboard spacebar repeating keystrokes",
    description: "The spacebar chattering issue results in double spaces on almost every keystroke.",
    requestedPriority: "Low",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-08-28T10:15:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00011",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "Email",
    summary: "Outlook desktop client stuck on loading profile screen",
    description: "Microsoft Outlook 365 hangs indefinitely at 'Loading Profile' splash dialog on Windows 11.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-29T15:20:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00012",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Ethernet wall jack inactive in faculty room CB2-402",
    description: "Port labeled CB2-402-D2 provides no link light when connecting via Cat6 patch cable.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Assigned",
    createdAt: new Date("2026-08-30T11:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00013",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Request additional cloud storage quota for research dataset",
    description: "Current OneDrive storage is at 98% capacity. Requesting increase to 1 TB for active sensor data.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Pending Requester",
    createdAt: new Date("2026-09-01T09:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00014",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Classroom projector HDMI audio output distorted",
    description: "Projector in classroom CB2-205 exhibits loud buzzing through wall speakers when playing presentation video.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Resolved",
    createdAt: new Date("2026-09-02T13:45:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00015",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "VPN",
    summary: "SSL VPN handshake error 403 authorization failed",
    description: "Authentication succeeds but SSL tunnel aborts immediately with certificate authorization error 403.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "In Progress",
    createdAt: new Date("2026-09-03T16:10:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00016",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "Adobe Acrobat DC license renewal required for semester",
    description: "Subscription expired dialog appears on opening PDF course lecture slides.",
    requestedPriority: "Low",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-04T10:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00017",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Printer",
    summary: "Duplex printing jam in CB2 2nd floor corridor printer",
    description: "Paper repeatedly catches on the internal reversing roller when 2-sided printing is enabled.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Closed",
    createdAt: new Date("2026-09-05T14:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00018",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "DNS resolution failure for local lab subdomains",
    description: "Subdomains ending in .cpe.kmutt.ac.th do not resolve through campus default DNS server 10.1.0.1.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Assigned",
    createdAt: new Date("2026-09-07T08:50:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00019",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "LEB2 discussion board notifications not delivering to mailbox",
    description: "Student questions submitted in course forums do not trigger email notifications as configured.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Pending Requester",
    createdAt: new Date("2026-09-08T11:20:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00020",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Faculty portal password expired and reset token invalid",
    description: "Self-service password reset link states 'Token has expired or already been consumed'.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "In Progress",
    createdAt: new Date("2026-09-09T09:10:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00021",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Wi-Fi roaming disconnects when walking between CB1 and CB2",
    description: "Connection drops completely at the skybridge transition and takes 3 minutes to associate with new AP.",
    requestedPriority: "Medium",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-10T15:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00022",
    userEmail: "jennifer.anderson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Secondary monitor power adapter buzzing and overheating",
    description: "The 65W AC power brick for the monitor is hot to the touch and produces an audible coil whine.",
    requestedPriority: "High",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-11T12:00:00Z"),
  },

  // =========================================================================
  // Requester 2: Michael Brown (21 Tickets - Demonstrates 3-Page Pagination)
  // =========================================================================
  {
    ticketNumber: "TKT-2026-00023",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "VPN",
    summary: "VPN client connection terminates after 5 minutes of inactivity",
    description: "Keep-alive packets do not seem to maintain connection when tunneling through home fiber router.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-14T10:10:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00024",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Desktop workstation blue screen CRITICAL_PROCESS_DIED",
    description: "BSOD occurs randomly about once per day, especially under heavy multithreaded compiling.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Assigned",
    createdAt: new Date("2026-08-15T15:40:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00025",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "Grade Submission App",
    summary: "Grade Submission portal calculates weighted average incorrectly",
    description: "Column weighting shows 40% midterm + 60% final, but computed sum displays 92.4 instead of 88.0.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Pending Requester",
    createdAt: new Date("2026-08-17T11:25:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00026",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Request static IP address allocation for research server",
    description: "Need reserved static IPv4 in the 10.28.x.x subnet for laboratory database server hosting.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-19T09:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00027",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Printer",
    summary: "Department printer toner low warning on Tray 2",
    description: "Black toner cartridge level is below 5%. Replacement toner requested for CB2-4th floor printer.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Closed",
    createdAt: new Date("2026-08-20T14:15:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00028",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Account locked out after entering incorrect password",
    description: "Account locked following 5 failed password attempts on lab workstation. Please unlock account.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-22T08:45:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00029",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "Cannot access LEB2 grading rubric configuration screen",
    description: "Clicking 'Edit Rubric' results in infinite loading wheel in Chrome 128.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-24T16:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00030",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Campus Wi-Fi authentication fails with 802.1X error",
    description: "Radius server rejects credentials with 'EAP authentication failed' on macOS 14.6.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-25T13:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00031",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Laptop keyboard liquid spill damage assessment needed",
    description: "Small amount of water spilled on left keyboard cluster. Laptop powered down immediately.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-27T10:50:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00032",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Request permissions for department shared OneDrive folder",
    description: "Requesting access to 'CPE-Faculty-Curriculum-2026' folder for syllabus preparation.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-28T15:10:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00033",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "SPSS statistical package license expired message on launch",
    description: "IBM SPSS Statistics 29 reports license code expiration date was August 31, 2026.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Assigned",
    createdAt: new Date("2026-08-30T09:20:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00034",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Network switch in room CB2-503 making high pitched noise",
    description: "Cisco Catalyst switch rack fan in laboratory 503 is whining loudly, possible bearing failure.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Closed",
    createdAt: new Date("2026-09-01T14:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00035",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Color calibration skewed on teaching podium display",
    description: "Podium monitor shows intense yellow tint, making PowerPoint slides hard to read.",
    requestedPriority: "Low",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-02T11:40:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00036",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "Email",
    summary: "Incoming email quarantine releasing delayed by 4 hours",
    description: "Legitimate academic conference verification emails are stuck in institutional spam quarantine.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Pending Requester",
    createdAt: new Date("2026-09-03T16:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00037",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "VPN",
    summary: "Unable to map network drive \\\\storage.kmutt.ac.th\\dept",
    description: "SMB connection fails with 'System error 53 - The network path was not found' while connected to VPN.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "In Progress",
    createdAt: new Date("2026-09-05T10:15:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00038",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "Grade Submission App",
    summary: "Grade submission CSV export contains corrupted Thai characters",
    description: "Exported gradebook CSV displays mojibake characters in student name columns in Excel.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Assigned",
    createdAt: new Date("2026-09-06T13:50:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00039",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Security badge door access reader not recognizing card",
    description: "RFID card fails to unlock Engineering building door after hours. Requesting badge reprogramming.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Cancelled",
    createdAt: new Date("2026-09-07T08:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00040",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Printer",
    summary: "Printer driver installation failing on macOS Sequoia",
    description: "KMUTT PaperCut print driver PKG installer aborts with architecture incompatibility error.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "In Progress",
    createdAt: new Date("2026-09-08T15:20:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00041",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "VPN",
    summary: "Campus VPN connection drops during video conference",
    description: "During Teams meeting, VPN resets every 20 minutes causing call disconnections.",
    requestedPriority: "High",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-09T14:10:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00042",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "Campus Wi-Fi",
    summary: "Visual Studio Code SSH remote tunnel disconnected frequently",
    description: "Remote development session to lab workstation CB2-401 terminates with socket pipe error.",
    requestedPriority: "Medium",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-10T16:45:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00043",
    userEmail: "michael.brown@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Replacement battery requested for Dell Latitude 5420",
    description: "BIOS diagnostics screen displays 'Battery has reached the end of its usable life' warning.",
    requestedPriority: "Low",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-11T09:15:00Z"),
  },

  // =========================================================================
  // Requester 3: David Lee (8 Tickets - Demonstrates Single-Page Pagination)
  // =========================================================================
  {
    ticketNumber: "TKT-2026-00044",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "LEB2 quiz countdown timer froze during midterm test",
    description: "Timer stuck at 12:45 remaining while answers were still being accepted by the server.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-20T11:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00045",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Campus Wi-Fi coverage weak in Engineering 4 basement lab",
    description: "Signal strength is below -85 dBm in lab room B04, resulting in high packet loss.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-24T14:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00046",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "USB webcam audio microphone not picking up sound",
    description: "Logitech C920 microphone is detected by Windows Device Manager but yields zero audio input.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-28T09:40:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00047",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Password expiration warning email received prematurely",
    description: "Received notification stating password expires in 3 days, even though it was changed last week.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Closed",
    createdAt: new Date("2026-09-01T10:15:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00048",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "AutoCAD student license renewal validation error",
    description: "Autodesk educational license portal returns 'Institution domain not recognized' error.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Pending Requester",
    createdAt: new Date("2026-09-04T13:20:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00049",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Printer",
    summary: "Department printer producing faded horizontal black streaks",
    description: "Prints from Xerox WorkCentre in CB2-302 show dark drum streaks across page headers.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Assigned",
    createdAt: new Date("2026-09-07T15:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00050",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "VPN",
    summary: "VPN connection routing all traffic through gateway slowly",
    description: "Split tunneling appears disabled, reducing external download throughput to 2 Mbps.",
    requestedPriority: "Medium",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-09T16:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00051",
    userEmail: "david.lee@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Request access to high-performance GPU cluster server",
    description: "Requesting SSH credentials and Slurm cluster access for senior project deep learning experiments.",
    requestedPriority: "High",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-11T10:50:00Z"),
  },

  // =========================================================================
  // Requester 4: Sarah Johnson (7 Tickets - Demonstrates Single-Page Pagination)
  // =========================================================================
  {
    ticketNumber: "TKT-2026-00052",
    userEmail: "sarah.johnson@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "Grade Submission App",
    summary: "Grade Submission final grade confirmation modal unresponsive",
    description: "Clicking 'Confirm & Sign' button on final grade roster does not initiate submission payload.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-21T09:10:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00053",
    userEmail: "sarah.johnson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Campus Wi-Fi frequent re-authentication prompt in Science Hall",
    description: "Captive portal prompt reappears every 30 minutes on iPad device during laboratory lectures.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "In Progress",
    createdAt: new Date("2026-08-26T13:40:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00054",
    userEmail: "sarah.johnson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Docking station dual display extension mirrored instead",
    description: "Both external monitors display identical cloned images and cannot be set to extended mode.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Closed",
    createdAt: new Date("2026-08-31T11:20:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00055",
    userEmail: "sarah.johnson@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "LEB2 file upload progress bar hangs at 99 percent",
    description: "Uploading PDF lecture handouts hangs at 99% and never completes processing.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Assigned",
    createdAt: new Date("2026-09-04T15:15:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00056",
    userEmail: "sarah.johnson@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "Institutional email distribution list membership update",
    description: "Need to add new faculty research assistants to science-faculty-announce distribution group.",
    requestedPriority: "Low",
    itPriority: "Low",
    currentStatus: "Resolved",
    createdAt: new Date("2026-09-06T10:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00057",
    userEmail: "sarah.johnson@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Printer",
    summary: "Laboratory printer paper feed rollers slipping and jamming",
    description: "Tray 1 feed rubber roller fails to grip 80gsm paper, throwing Error 13.00.00 paper jam.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Pending Requester",
    createdAt: new Date("2026-09-08T14:45:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00058",
    userEmail: "sarah.johnson@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Cannot access university Git repository over campus network",
    description: "SSH clone requests to git.kmutt.ac.th port 22 hang with connection timed out from Science building.",
    requestedPriority: "Urgent",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-11T16:20:00Z"),
  },

  // =========================================================================
  // Requester 5: Sompong IT (6 Tickets - Baseline IT Office Tickets)
  // =========================================================================
  {
    ticketNumber: "TKT-2026-00059",
    userEmail: "sompong.it@kmutt.ac.th",
    categoryCode: "NET",
    systemName: "Campus Wi-Fi",
    summary: "Core switch firmware update scheduled maintenance notification",
    description: "Maintenance window planned for Saturday 02:00-05:00 UTC to apply security patch to Cisco Nexus core.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "Resolved",
    createdAt: new Date("2026-08-18T08:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00060",
    userEmail: "sompong.it@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "Email",
    summary: "Office 365 tenant license synchronization check",
    description: "Verify automated Azure AD directory synchronization sync cycle status after monthly user import.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Closed",
    createdAt: new Date("2026-08-25T10:30:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00061",
    userEmail: "sompong.it@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Printer",
    summary: "Central printer management server spooler service crashed",
    description: "Windows Print Spooler service on print01.kmutt.ac.th stopped unexpectedly due to bad PCL driver.",
    requestedPriority: "Urgent",
    itPriority: "Urgent",
    currentStatus: "Resolved",
    createdAt: new Date("2026-09-02T13:00:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00062",
    userEmail: "sompong.it@kmutt.ac.th",
    categoryCode: "ACC",
    systemName: "Email",
    summary: "LDAP user synchronization replication latency investigated",
    description: "Replication lag of 45 seconds detected between primary domain controller and secondary DC.",
    requestedPriority: "High",
    itPriority: "High",
    currentStatus: "In Progress",
    createdAt: new Date("2026-09-06T09:15:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00063",
    userEmail: "sompong.it@kmutt.ac.th",
    categoryCode: "SW",
    systemName: "LEB2 App",
    summary: "LEB2 database query response time optimization review",
    description: "Investigating slow database response times on course roster queries during add/drop period.",
    requestedPriority: "Medium",
    itPriority: "Medium",
    currentStatus: "Assigned",
    createdAt: new Date("2026-09-09T14:40:00Z"),
  },
  {
    ticketNumber: "TKT-2026-00064",
    userEmail: "sompong.it@kmutt.ac.th",
    categoryCode: "HW",
    systemName: "Corporate Laptop",
    summary: "Audit backup power UPS battery health in server room",
    description: "Scheduled semi-annual diagnostic battery discharge test on APC Smart-UPS 10kVA rack unit.",
    requestedPriority: "Low",
    itPriority: null,
    currentStatus: "New",
    createdAt: new Date("2026-09-11T11:00:00Z"),
  },
];

/**
 * Seeds realistic development and demonstration tickets for lab reports.
 * Safe to execute multiple times (cleans demo tickets and re-populates cleanly).
 */
export async function seedDemoTickets(prisma: PrismaClient): Promise<void> {
  // 1. Resolve users, categories, and systems dynamically
  const users = await prisma.user.findMany();
  const userMap = new Map<string, number>();
  for (const u of users) {
    userMap.set(u.email.toLowerCase(), u.id);
  }

  const categories = await prisma.category.findMany();
  const catMap = new Map<string, number>();
  for (const c of categories) {
    if (c.code) catMap.set(c.code, c.id);
  }

  const systems = await prisma.relatedSystem.findMany();
  const sysMap = new Map<string, number>();
  for (const s of systems) {
    sysMap.set(s.name, s.id);
  }

  // 2. Clean attachments and tickets before seeding demo data
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();

  // 3. Insert demo tickets
  let insertedCount = 0;
  const sompongId = userMap.get("sompong.it@kmutt.ac.th");
  const wichaiId = userMap.get("wichai.sup@kmutt.ac.th");

  for (let idx = 0; idx < DEMO_TICKETS_SEED.length; idx++) {
    const t = DEMO_TICKETS_SEED[idx];
    const requesterId = userMap.get(t.userEmail.toLowerCase());
    const categoryId = catMap.get(t.categoryCode);
    const relatedSystemId = sysMap.get(t.systemName);

    if (!requesterId || !categoryId || !relatedSystemId) {
      console.warn(
        `Skipping ticket ${t.ticketNumber}: unresolved references (user: ${requesterId}, cat: ${categoryId}, sys: ${relatedSystemId})`
      );
      continue;
    }

    const requestedPri = mapPriority(t.requestedPriority);
    const itPri = t.itPriority ? mapPriority(t.itPriority) : requestedPri;
    const ticketStatus = mapStatus(t.currentStatus);

    // Assign realistic staff owners:
    // - Status NEW is always unassigned
    // - Every 4th ticket is unassigned
    // - Otherwise alternate between Sompong IT and Wichai Support
    let ownerId: number | null = null;
    if (ticketStatus !== TicketStatus.NEW && idx % 4 !== 0) {
      ownerId = idx % 2 === 0 ? (sompongId ?? null) : (wichaiId ?? null);
    }

    await prisma.ticket.create({
      data: {
        ticketNumber: t.ticketNumber,
        requesterId,
        ownerId,
        categoryId,
        relatedSystemId,
        summary: t.summary,
        description: t.description,
        requestedPriority: requestedPri,
        itPriority: itPri,
        currentStatus: ticketStatus,
        createdAt: t.createdAt,
        updatedAt: t.createdAt,
      },
    });
    insertedCount++;
  }

  // 4. Update the annual ticket number sequence so new UI tickets start after TKT-2026-00064
  const currentYear = 2026;
  const nextSeq = insertedCount + 1; // 65
  await prisma.ticketNumberSequence.upsert({
    where: { year: currentYear },
    update: { nextVal: nextSeq },
    create: { year: currentYear, nextVal: nextSeq },
  });

  // 5. Synchronize PostgreSQL autoincrement sequence for tickets table
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('tickets', 'id'), coalesce(max(id), 1)) FROM tickets;`
  );

  console.log(`Seeded ${insertedCount} realistic demo tickets across ${users.length} accounts.`);
  console.log(`Ticket number sequence for ${currentYear} synchronized to nextVal = ${nextSeq}.`);
}

// CLI execution wrapper
async function main() {
  const prisma = getPrisma();
  await seed(prisma);
  await seedDemoTickets(prisma);
  console.log("TokTickIT seed completed successfully with demo tickets.");
}

if (process.env.NODE_ENV !== "test") {
  main()
    .catch((e) => {
      console.error("Seeding error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}


import { PrismaClient } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";

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

export const REQUESTER_USERS_SEED = [
  // Thai Personas (from partner's program)
  {
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    department: "Information Technology Office",
    isActive: true,
  },
  {
    name: "Anong Staff",
    email: "anong.sta@kmutt.ac.th",
    department: "Academic Affairs Office",
    isActive: true,
  },
  {
    name: "Kittisak Student",
    email: "kittisak.stu@kmutt.ac.th",
    department: "Computer Engineering Dept",
    isActive: true,
  },
  {
    name: "Wichai Faculty",
    email: "wichai.fac@kmutt.ac.th",
    department: "Department of Mathematics",
    isActive: true,
  },
  {
    name: "Prasert Inactive",
    email: "prasert.ina@kmutt.ac.th",
    department: "Human Resources Office",
    isActive: false,
  },

  // Standard Baseline Personas
  {
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Computer Engineering",
    isActive: true,
  },
  {
    name: "Michael Brown",
    email: "michael.brown@kmutt.ac.th",
    department: "Information Technology",
    isActive: true,
  },
  {
    name: "David Lee",
    email: "david.lee@kmutt.ac.th",
    department: "Electrical Engineering",
    isActive: true,
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@kmutt.ac.th",
    department: "Science Faculty",
    isActive: true,
  },
  {
    name: "Inactive Test User",
    email: "inactive.user@kmutt.ac.th",
    department: "Registrar Office",
    isActive: false,
  },
];

/**
 * Idempotent seed function. Safe to run multiple times without duplicate key violations.
 */
export async function seed(prismaClient: PrismaClient = getPrisma()): Promise<void> {
  // 1. Seed Categories (Keyed on unique name / code)
  for (const cat of CATEGORIES_SEED) {
    await prismaClient.category.upsert({
      where: { name: cat.name },
      update: {
        code: cat.code,
        description: cat.description,
        isActive: cat.isActive,
      },
      create: {
        code: cat.code,
        name: cat.name,
        description: cat.description,
        isActive: cat.isActive,
      },
    });
  }

  // 2. Seed Related Systems (Keyed on unique name)
  for (const sys of RELATED_SYSTEMS_SEED) {
    await prismaClient.relatedSystem.upsert({
      where: { name: sys.name },
      update: {
        isActive: sys.isActive,
      },
      create: {
        name: sys.name,
        isActive: sys.isActive,
      },
    });
  }

  // 3. Seed Requester Users (Keyed on lowercase unique email)
  for (const user of REQUESTER_USERS_SEED) {
    const normalizedEmail = user.email.trim().toLowerCase();
    await prismaClient.requesterUser.upsert({
      where: { email: normalizedEmail },
      update: {
        name: user.name,
        department: user.department,
        isActive: user.isActive,
      },
      create: {
        name: user.name,
        email: normalizedEmail,
        department: user.department,
        isActive: user.isActive,
      },
    });
  }

  // 4. Synchronize PostgreSQL autoincrement sequences
  try {
    await prismaClient.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('categories', 'id'), coalesce(max(id), 1)) FROM categories;`
    );
    await prismaClient.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('related_systems', 'id'), coalesce(max(id), 1)) FROM related_systems;`
    );
    await prismaClient.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('requester_users', 'id'), coalesce(max(id), 1)) FROM requester_users;`
    );
  } catch (err) {
    // If sequence function fails in certain DB environments, continue gracefully
  }
}

// CLI execution wrapper
async function main() {
  await seed();
  console.log("TokTickIT seed completed successfully.");
}

if (process.env.NODE_ENV !== "test" && process.argv[1]?.includes("seed")) {
  main()
    .catch((e) => {
      console.error("Seeding error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}

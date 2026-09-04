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
  {
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    isActive: true,
  },
  {
    name: "Michael Brown",
    email: "michael.brown@kmutt.ac.th",
    isActive: true,
  },
  {
    name: "David Lee",
    email: "david.lee@kmutt.ac.th",
    isActive: true,
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@kmutt.ac.th",
    isActive: true,
  },
  {
    name: "Inactive Test User",
    email: "inactive.user@kmutt.ac.th",
    isActive: false,
  },
];

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

  // 3. Seed Requester Users (Keyed on lowercase unique email)
  for (const user of REQUESTER_USERS_SEED) {
    await prisma.requesterUser.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        name: user.name,
        isActive: user.isActive,
      },
      create: {
        ...user,
        email: user.email.toLowerCase(),
      },
    });
  }

  // 4. Synchronize PostgreSQL autoincrement sequences
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('categories', 'id'), coalesce(max(id), 1)) FROM categories;`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('related_systems', 'id'), coalesce(max(id), 1)) FROM related_systems;`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('requester_users', 'id'), coalesce(max(id), 1)) FROM requester_users;`
  );
}

// CLI execution wrapper
async function main() {
  const prisma = getPrisma();
  await seed(prisma);
  console.log("TokTickIT seed completed successfully.");
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

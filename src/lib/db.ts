import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const dbFile = process.env.DB_FILE ?? "./dev.sqlite";

async function ensureWal(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
  await prisma.$executeRawUnsafe("PRAGMA synchronous=NORMAL;");
  await prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000;");
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? `file:${dbFile}`
    }
  }
});

if (!existsSync(dbFile)) {
  const dir = dirname(dbFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

ensureWal(prisma).catch((error) => {
  console.error("Failed to enable WAL", error);
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

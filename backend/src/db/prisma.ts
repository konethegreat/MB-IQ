// Code written by Kone & Claude | The code does the following: " Creates and exports a single shared
// Prisma client instance (a singleton) so the whole API reuses one database connection pool. "

import { PrismaClient } from '@prisma/client';

// Reuse the client across hot-reloads in development to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

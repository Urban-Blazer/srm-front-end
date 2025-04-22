import { PrismaClient } from '@prisma/client';

declare global {
    // Allow global Prisma client to persist across hot reloads in dev
    var prisma: PrismaClient | undefined;
}

export const prisma =
    global.prisma ||
    new PrismaClient({
        log: ['error', 'warn'], // Add 'query' if you want to debug queries
    });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { getDatabaseUrl } from "./config";

// Prevent multiple instances of Prisma Client in development
declare global {
    var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
    try {
        const url = getDatabaseUrl();
        console.log(`[Prisma] Initializing with URL: ${url}`);
        const adapter = new PrismaLibSql({ url });
        return new PrismaClient({ adapter });
    } catch (error) {
        console.error("Failed to initialize Prisma Client:", error);
        // Do NOT throw, so the app can start and we can see the error in logs or IPC
        return undefined;
    }
};

const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;

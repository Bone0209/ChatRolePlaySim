/**
 * Prisma Client Instance
 * 
 * インフラ層でのみ使用されるデータベース接続。
 * ドメイン層やアプリケーション層からは直接インポートしないこと。
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { getDatabaseUrl } from '../config';

// Prevent multiple instances of Prisma Client in development
declare global {
    var prisma: PrismaClient | undefined;
}

/**
 * Prisma Clientを作成
 * LibSQLアダプタを使用してSQLiteに接続
 */
const createPrismaClient = (): PrismaClient | undefined => {
    try {
        const url = getDatabaseUrl();
        console.log(`[Prisma] Initializing with URL: ${url}`);
        const adapter = new PrismaLibSql({ url });
        return new PrismaClient({ adapter });
    } catch (error) {
        console.error("[Prisma] Failed to initialize Prisma Client:", error);
        return undefined;
    }
};

const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;

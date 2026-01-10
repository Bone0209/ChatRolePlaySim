
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from "@prisma/adapter-libsql";

async function checkDB(path: string) {
    console.log(`Checking ${path}...`);
    try {
        const adapter = new PrismaLibSql({ url: `file:${path}` });
        const prisma = new PrismaClient({ adapter });

        try {
            // @ts-ignore
            const countBefore = await prisma.chat.count();
            console.log(`[${path}] Count before: ${countBefore}`);

            // Try inserting a test record
            try {
                // @ts-ignore
                const world = await prisma.world.findFirst();
                if (world) {
                    // @ts-ignore
                    await prisma.chat.create({
                        data: {
                            worldId: world.id,
                            chatType: '0',
                            message: 'Test message from verification script',
                            entityId: null
                        }
                    });
                    console.log(`[${path}] Inserted test record.`);
                } else {
                    console.log(`[${path}] No world found, skipping insert.`);
                }
            } catch (insertError: any) {
                console.log(`[${path}] Insert failed:`, insertError.message);
            }

            // @ts-ignore
            const countAfter = await prisma.chat.count();
            console.log(`[${path}] Count after: ${countAfter}`);

            if (countAfter > 0) {
                // @ts-ignore
                const logs = await prisma.chat.findMany({
                    orderBy: { id: 'desc' },
                    take: 1,
                    include: { world: true }
                });
                console.log('Latest log:', logs[0]);
            }
        } catch (e: any) {
            console.log(`[FAILED] ${path}: Query failed (Table missing?):`, e.message);
        } finally {
            if (prisma) await prisma.$disconnect();
        }
    } catch (e) {
        console.log(`[ERROR] ${path}: Connection failed.`);
    }
}

async function main() {
    await checkDB('./dev.db');
    await checkDB('./prisma/dev.db');
}


main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });

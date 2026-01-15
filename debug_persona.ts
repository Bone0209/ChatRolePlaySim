
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const personas = await prisma.tEntityPersona.findMany();
        console.log("--- START PERSONA DUMP ---");
        for (const p of personas) {
            console.log(`ID: ${p.entityId}`);
            console.log(JSON.stringify(p.data, null, 2));
        }
        console.log("--- END PERSONA DUMP ---");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { generateId } from './main/lib/uuid';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

// Debug: Check tables
console.log("Checking DB directly...");
const db = new Database('./dev.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Existing tables:", tables);
db.close();

// Instantiate Adapter Factory with URL configuration
const adapter = new PrismaBetterSqlite3({
    url: "file:./dev.db"
});

// Pass adapter to Prisma Client
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Starting verification...");

    const id = generateId(); // String ID
    console.log(`Generated ID: ${id}`);

    try {
        const world = await prisma.world.create({
            data: {
                id: id,
                name: "Test World v7 Adapter",
                prompt: "A verify prompt for v7 with adapter"
            }
        });
        console.log("Created world:", world);

        const fetched = await prisma.world.findUnique({
            where: { id: id }
        });

        if (fetched) {
            console.log("Fetched world ID:", fetched.id);
            if (fetched.id === id) {
                console.log("SUCCESS: IDs match!");
            } else {
                console.error("FAILURE: IDs do not match!");
            }
        } else {
            console.error("FAILURE: Could not fetch world");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

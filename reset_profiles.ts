
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

async function main() {
    console.log("Resetting User Profiles...");

    const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
    console.log(`Assuming database URL: ${url}`);

    const adapter = new PrismaLibSql({ url });
    const prisma = new PrismaClient({ adapter });

    try {
        // Explicitly connect first
        await prisma.$connect();

        // Delete all rows in t_user_profile_lists
        // Cascading delete should handle t_user_profiles
        const deleteResult = await prisma.tUserProfileList.deleteMany();
        console.log(`Deleted ${deleteResult.count} user profiles.`);
    } catch (e) {
        console.error("Failed to delete profiles", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

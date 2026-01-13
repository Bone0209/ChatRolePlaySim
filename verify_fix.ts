
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking mEntity access...');
        // We don't need to actually connect to DB if we are just checking types/compilation, 
        // but 'tsx' will run it. 
        // Just checking if property exists on the instance at runtime is enough to verify client generation.
        if (prisma.mEntity) {
            console.log('SUCCESS: prisma.mEntity exists.');
        } else {
            console.error('FAILURE: prisma.mEntity does NOT exist.');
            console.log('Available properties:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

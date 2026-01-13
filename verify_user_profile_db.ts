import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Verifying TUserProfileList...');
        await prisma.tUserProfileList.count();
        console.log('TUserProfileList exists.');

        console.log('Verifying TUserProfile...');
        await prisma.tUserProfile.count();
        console.log('TUserProfile exists.');

        console.log('Verifying TUserSetting...');
        await prisma.tUserSetting.count();
        console.log('TUserSetting exists.');

        console.log('Verification Successful.');
    } catch (e) {
        console.error('Verification Failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

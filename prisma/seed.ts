import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import path from 'path'

// libsql uses file: URL format for local SQLite files
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const adapter = new PrismaLibSql({ url: `file:${dbPath}` })

const prisma = new PrismaClient({ adapter })

async function main() {
    const constants = [
        // Entity Types
        { category: 'ENTITY_TYPE', keyName: 'ENTITY_WORLD', keyValue: '0' },
        { category: 'ENTITY_TYPE', keyName: 'ENTITY_PLAYER', keyValue: '1' },
        { category: 'ENTITY_TYPE', keyName: 'ENTITY_NPC', keyValue: '2' },

        // Chat Types
        { category: 'CHAT_TYPE', keyName: 'CHAT_SYSTEM', keyValue: '0' },
        { category: 'CHAT_TYPE', keyName: 'CHAT_PLAYER', keyValue: '1' },
        { category: 'CHAT_TYPE', keyName: 'CHAT_NPC', keyValue: '2' },

        // Calendar Settings
        { category: 'CALENDAR', keyName: 'MONTHS_PER_YEAR', keyValue: '12' },
        { category: 'CALENDAR', keyName: 'WEEKS_PER_MONTH', keyValue: '4' },
        { category: 'CALENDAR', keyName: 'DAYS_PER_WEEK', keyValue: '7' },
        { category: 'CALENDAR', keyName: 'TURNS_PER_DAY', keyValue: '30' },

        // Chat Response Types
        { category: 'CHAT_RESPONSE_TYPE', keyName: 'CHAT_RES_CHAT', keyValue: 'C' },
        { category: 'CHAT_RESPONSE_TYPE', keyName: 'CHAT_RES_INFO', keyValue: 'I' },
        { category: 'CHAT_RESPONSE_TYPE', keyName: 'CHAT_RES_EVENT', keyValue: 'E' },

        // Chat Tags
        { category: 'CHAT_TAG', keyName: 'CHAT_TAG_NARRATIVE', keyValue: 'narrative' },
        { category: 'CHAT_TAG', keyName: 'CHAT_TAG_SPEECH', keyValue: 'speech' },
        { category: 'CHAT_TAG', keyName: 'CHAT_TAG_EVENT', keyValue: 'event' },
        { category: 'CHAT_TAG', keyName: 'CHAT_TAG_LOG', keyValue: 'log' },
        { category: 'CHAT_TAG', keyName: 'CHAT_TAG_ANNOUNCE', keyValue: 'announce' },
    ]

    console.log('Seeding global_constants to dev.db...')

    for (const c of constants) {
        const result = await prisma.mGlobalConstant.upsert({
            where: { keyName: c.keyName },
            update: {
                category: c.category,
                keyValue: c.keyValue,
            },
            create: {
                category: c.category,
                keyName: c.keyName,
                keyValue: c.keyValue,
            },
        })
        console.log(`Upserted: ${result.keyName}`)
    }
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

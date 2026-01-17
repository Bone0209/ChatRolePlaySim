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
        console.log(`Upserted: ${result.keyName}`)
    }

    const attributes = [
        // --- Persona ---
        { key: 'name', type: 'string', cat: 'persona', name: 'Name', vis: 'public' },
        { key: 'description', type: 'string', cat: 'persona', name: 'Description', vis: 'public' },
        { key: 'role', type: 'string', cat: 'persona', name: 'Role', vis: 'public' },
        { key: 'personality', type: 'string', cat: 'persona', name: 'Personality', vis: 'private' },
        { key: 'tone', type: 'string', cat: 'persona', name: 'Tone', vis: 'private' },
        { key: 'firstPerson', type: 'string', cat: 'persona', name: 'First Person', vis: 'private' },
        { key: 'sentenceEnding', type: 'string', cat: 'persona', name: 'Sentence Ending', vis: 'private' },

        // --- Parameters (Stats) ---
        { key: 'maxHp', type: 'number', cat: 'parameter', name: 'Max HP', vis: 'private' },
        { key: 'maxMp', type: 'number', cat: 'parameter', name: 'Max MP', vis: 'private' },
        { key: 'level', type: 'number', cat: 'parameter', name: 'Level', vis: 'public' },
        { key: 'job', type: 'string', cat: 'parameter', name: 'Job', vis: 'public' },

        // --- State (Variable) ---
        { key: 'hp', type: 'number', cat: 'state', name: 'HP', vis: 'public' },
        { key: 'mp', type: 'number', cat: 'state', name: 'MP', vis: 'public' },
        { key: 'location', type: 'string', cat: 'state', name: 'Location Name', vis: 'public' },
        { key: 'locationId', type: 'string', cat: 'state', name: 'Location ID', vis: 'private' },
        { key: 'condition', type: 'string', cat: 'state', name: 'Condition', vis: 'public' },
        { key: 'mood', type: 'string', cat: 'state', name: 'Mood', vis: 'public' },
        { key: 'affection', type: 'number', cat: 'state', name: 'Affection', vis: 'private', min: 0, max: 100 },
        { key: 'weather', type: 'string', cat: 'state', name: 'Weather', vis: 'public' }
    ];

    console.log('Seeding attribute definitions...');

    for (const attr of attributes) {
        // 1. Definition
        await prisma.mAttributeDefinition.upsert({
            where: { keyName: attr.key },
            update: {
                valueType: attr.type,
                category: attr.cat,
            },
            create: {
                keyName: attr.key,
                valueType: attr.type,
                category: attr.cat,
                description: attr.name
            }
        });

        // 2. Global Meta
        // Note: Prisma 5+ might handle null in compound unique differently, but we try standard approach
        // If "where" fails for null worldId, we might need to findFirst explicitly.
        // For now, using upsert with null.
        const existingMeta = await prisma.mAttributeMeta.findFirst({
            where: {
                keyName: attr.key,
                worldId: null
            }
        });

        if (existingMeta) {
            await prisma.mAttributeMeta.update({
                where: { id: existingMeta.id },
                data: {
                    displayName: attr.name,
                    visibility: attr.vis,
                    rangeMin: attr.min,
                    rangeMax: attr.max
                }
            });
        } else {
            await prisma.mAttributeMeta.create({
                data: {
                    worldId: null,
                    keyName: attr.key,
                    displayName: attr.name,
                    visibility: attr.vis,
                    rangeMin: attr.min,
                    rangeMax: attr.max
                }
            });
        }
        console.log(`Upserted Attribute: ${attr.key}`);
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

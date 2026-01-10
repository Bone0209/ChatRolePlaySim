import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dev.db');
console.log(`Opening database at ${dbPath}`);
const db = new Database(dbPath);

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
];

const insertStmt = db.prepare(`
  INSERT INTO global_constants (category, key_name, key_value)
  VALUES (@category, @keyName, @keyValue)
  ON CONFLICT(key_name) DO UPDATE SET
    category = excluded.category,
    key_value = excluded.key_value
`);

const insertMany = db.transaction((items) => {
    for (const item of items) {
        insertStmt.run(item);
        console.log(`Upserted: ${item.keyName}`);
    }
});

try {
    insertMany(constants);
    console.log('Seeding completed successfully.');
} catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
} finally {
    db.close();
}

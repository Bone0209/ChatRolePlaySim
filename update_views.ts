import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import path from 'path';

// libsql uses file: URL format for local SQLite files
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Creating Views...');

  // Dropping existing view if any
  await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS v_entity_attribute_details;`);

  // Creating the view
  await prisma.$executeRawUnsafe(`
    CREATE VIEW v_entity_attribute_details AS
    SELECT
      tea.entity_id,
      tea.key_name,
      tea.key_value,
      me.world_id,
      
      def.category,
      def.value_type,
      
      COALESCE(world_meta.display_name, global_meta.display_name, tea.key_name) AS display_name,
      COALESCE(world_meta.display_order, global_meta.display_order, 0) AS display_order,
      COALESCE(world_meta.range_min, global_meta.range_min) AS range_min,
      COALESCE(world_meta.range_max, global_meta.range_max) AS range_max,
      COALESCE(world_meta.visibility, global_meta.visibility, 'public') AS visibility,
      COALESCE(world_meta.visibility_param, global_meta.visibility_param) AS visibility_param,
      
      tea.updated_at
    FROM t_entity_attributes tea
    INNER JOIN m_entities me ON tea.entity_id = me.id
    INNER JOIN m_attribute_definitions def ON tea.key_name = def.key_name
    LEFT JOIN m_attribute_metas world_meta
      ON tea.key_name = world_meta.key_name AND me.world_id = world_meta.world_id
    LEFT JOIN m_attribute_metas global_meta
      ON tea.key_name = global_meta.key_name AND global_meta.world_id IS NULL;
  `);

  console.log('View v_entity_attribute_details created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

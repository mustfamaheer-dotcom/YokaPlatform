const { query } = require('../server/shared/db');

async function run() {
  const indexes = await query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('ecp_shopping_carts', 'ecp_cart_items', 'inventory_balances', 'products')
    ORDER BY tablename, indexname;
  `);
  console.log(JSON.stringify(indexes, null, 2));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

// Real PostgreSQL locking test using a temporary schema, never application tables.
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pg = require('pg');
const RealPool = pg.Pool;
async function run() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the isolated PostgreSQL concurrency test.');
  const schema = 'trust_test_' + require('crypto').randomBytes(8).toString('hex');
  const connectionString = process.env.DATABASE_URL.replace(/([?&])(sslmode|sslrootcert|sslcert|sslkey)=[^&]*/gi, '$1').replace(/[?&]$/, '');
  const config = { connectionString, ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } };
  const control = new RealPool(config);
  let pool;
  try {
    await control.query(`CREATE SCHEMA ${schema}`);
    pool = new RealPool({ ...config, options: `-c search_path=${schema}` });
    assert.equal((await pool.query('SELECT current_schema() AS name')).rows[0].name, schema);
    for (const file of ['001_auth_company_emissions.sql', '002_marketplace_and_transactions.sql', '003_company_status.sql', '004_admin_dashboard.sql', '006_trustworthy_calculations.sql', '007_company_emissions_threshold.sql', '008_admin_operations.sql'])
      await pool.query(fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8'));
    pg.Pool = class { constructor() { return pool; } };
    const { purchaseCredits } = require('../config/db');
    await pool.query("INSERT INTO companies(id,name) VALUES('a','A'),('b','B')");
    await pool.query("INSERT INTO offset_projects(id,name,location,country,type,standard,description,price_per_tonne,available_tco2e,lifecycle_status,registry_url,certification_evidence,certification_reviewed_at) VALUES('p','Concurrency fixture','PH','PH','Forest','Test','Test only',10,1,'Active','https://registry.example/test','Test review',now())");
    const attempts = await Promise.allSettled(['a', 'b'].map(companyId => purchaseCredits({ companyId, projectId: 'p', quantityTCO2e: '0.70' })));
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(attempts.filter(r => r.status === 'rejected').length, 1);
    assert.equal((await pool.query("SELECT available_tco2e FROM offset_projects WHERE id='p'")).rows[0].available_tco2e, '0.30');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM transactions')).rows[0].n, 1);
    // Exact inventory and purchase sizes from Excel case TC-06.6.
    await pool.query("INSERT INTO offset_projects(id,name,location,country,type,standard,description,price_per_tonne,available_tco2e,lifecycle_status,registry_url,certification_evidence,certification_reviewed_at) VALUES('excel-5000','Excel concurrency fixture','PH','PH','Forest','Test','Test only',10,5000,'Active','https://registry.example/excel','Test evidence',now())");
    const excelAttempts = await Promise.allSettled(['a','b'].map(companyId => purchaseCredits({ companyId, projectId:'excel-5000', quantityTCO2e:'5000' })));
    assert.equal(excelAttempts.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(excelAttempts.filter(r=>r.status==='rejected').length,1);
    assert.equal(Number((await pool.query("SELECT available_tco2e FROM offset_projects WHERE id='excel-5000'")).rows[0].available_tco2e),0);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM transactions WHERE project_id='excel-5000'")).rows[0].n,1);
    console.log('PASS: TC-06.6 simultaneous 5000 + 5000 purchases against 5000 inventory.');
    console.log('PASS: simultaneous PostgreSQL purchases cannot oversell inventory.');
  } finally {
    if (pool) await pool.end();
    await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await control.end();
    pg.Pool = RealPool;
  }
}
run().catch(e => { console.error(e.message); process.exitCode = 1; });

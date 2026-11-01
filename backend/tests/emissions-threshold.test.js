const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const { validateLimit, emissionsThreshold } = require('../services/emissionsThreshold');

async function run() {
  assert.equal(validateLimit(null), null);
  assert.equal(validateLimit('0.00000000001'), '0.00000000001');
  for (const value of [0, -1, '', 'abc', Infinity, '0.000000000001', '10000000000000', true]) assert.throws(() => validateLimit(value));
  assert.equal(emissionsThreshold(null, 100, true).status, 'not_configured');
  assert.equal(emissionsThreshold(10, 100, false).status, 'select_month');
  assert.equal(emissionsThreshold(10, '7.99999999999', true).status, 'normal');
  assert.equal(emissionsThreshold(10, 8, true).status, 'warning');
  assert.equal(emissionsThreshold(10, '9.99999999999', true).status, 'warning');
  assert.equal(emissionsThreshold(10, 10, true).status, 'exceeded');
  assert.equal(emissionsThreshold(10, 12, true).remainingTonnes, '-2');
  assert.equal(emissionsThreshold(10, 0, true).usedPercent, 0);

  const db = new PGlite();
  for (const file of ['001_auth_company_emissions.sql', '002_marketplace_and_transactions.sql', '003_company_status.sql', '004_admin_dashboard.sql', '005_company_tenant_codes.sql', '006_trustworthy_calculations.sql', '007_company_emissions_threshold.sql', '008_admin_operations.sql'])
    await db.exec(fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8'));
  process.env.DATABASE_URL = 'postgresql://isolated-threshold-test';
  process.env.AUTH_JWT_SECRET = 'isolated-threshold-secret-at-least-32-characters';
  require('pg').Pool = class {
    query(sql, args) { return db.query(sql, args); }
    async connect() { return { query: (sql, args) => db.query(sql, args), release() {} }; }
  };
  await db.query("INSERT INTO companies(id,name) VALUES('a','Alpha'),('b','Beta')");
  await db.query("INSERT INTO emissions(id,company_id,date,activity,scope,category,quantity,emissions,status,result_kg,result_tonnes,reporting_period) VALUES('oct','a','2026-10-01','Energy','Scope 2','Purchased Electricity','1 kWh','8000 kg','Verified',8000,8,'2026-10'),('sep','a','2026-09-01','Energy','Scope 2','Purchased Electricity','1 kWh','1000000 kg','Verified',1000000,1000,'2026-09')");
  const { app } = require('../server');
  const { signToken } = require('../middleware/auth');
  const { getDashboardData } = require('../config/db');
  const admin = signToken({ id: 'admin', role: 'ADMIN', companyId: null });
  const user = signToken({ id: 'user', role: 'COMPANY_USER', companyId: 'a' });
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const root = `http://localhost:${server.address().port}`;
  async function request(url, token, body) {
    const response = await fetch(root + url, { method: body ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await getDashboardData('a', 'October 2026')).emissionsThreshold.status, 'not_configured');
    assert.equal((await request('/api/companies/a', user, { monthlyEmissionsLimit: '10' })).status, 403);
    for (const value of [0, -1, '', 'oops', '0.000000000001']) assert.equal((await request('/api/companies/a', admin, { monthlyEmissionsLimit: value })).status, 400);
    assert.equal((await request('/api/companies/a', admin, { monthlyEmissionsLimit: '10' })).status, 200);
    let dashboard = await getDashboardData('a', 'October 2026');
    assert.equal(dashboard.emissionsThreshold.status, 'warning');
    assert.equal(dashboard.emissionsThreshold.usedPercent, 80);
    assert.equal(dashboard.emissions.current, 8);
    assert.equal((await getDashboardData('a', 'Full Year 2026')).emissionsThreshold.status, 'select_month');
    assert.equal((await getDashboardData('b', 'October 2026')).emissionsThreshold.status, 'not_configured');
    assert.equal((await request('/api/dashboard?companyId=b', user)).status, 403);
    const list = await request('/api/companies', admin);
    assert.equal(Number(list.body.data.find(c => c.id === 'a').monthlyEmissionsLimit), 10);
    assert.equal((await request('/api/companies/a', admin, { name: 'Alpha Updated' })).status, 200);
    assert.equal(Number((await getDashboardData('a', 'October 2026')).emissionsThreshold.limitTonnes), 10);
    await db.query("UPDATE emissions SET result_tonnes=10, result_kg=10000 WHERE id='oct'");
    assert.equal((await getDashboardData('a', 'October 2026')).emissionsThreshold.status, 'exceeded');
    assert.equal((await request('/api/companies/a', admin, { monthlyEmissionsLimit: null })).status, 200);
    assert.equal((await getDashboardData('a', 'October 2026')).emissionsThreshold.status, 'not_configured');
    console.log('PASS: threshold boundaries, validation, month filtering, persistence, disabling, and company permissions.');
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); }
}
run().catch(e => { console.error(e); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

async function run() {
  // Exercise the actual frontend number parser without a browser or application data.
  const Module = require('node:module');
  const code = require('esbuild').transformSync(fs.readFileSync(path.join(__dirname, '../../frontend/lib/validation/emissionTotals.ts'), 'utf8'), { loader: 'ts', format: 'cjs', target: 'es2020' }).code;
  const compiled = new Module('emissionTotals', module); compiled.paths = module.paths; compiled._compile(code, 'emissionTotals.js');
  const { recordTonnes } = compiled.exports;
  assert.equal(recordTonnes({ emissions: '4.2 tCO2e' }).toFixed(), '4.2');
  assert.equal(recordTonnes({ emissions: '0.42 kg CO2e' }).toFixed(), '0.00042');
  assert.equal(recordTonnes({ emissions: '999 tCO2e', resultTonnes: '0.00042' }).toFixed(), '0.00042');

  const db = new PGlite();
  for (const file of fs.readdirSync(path.join(__dirname, '../migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8'));
  process.env.DATABASE_URL = 'postgresql://isolated-admin-operations';
  process.env.AUTH_JWT_SECRET = 'isolated-admin-operations-secret-at-least-32';
  require('pg').Pool = class {
    query(sql, args) { return db.query(sql, args); }
    async connect() { return { query: (sql, args) => db.query(sql, args), release() {} }; }
  };
  const { app } = require('../server');
  const { signToken } = require('../middleware/auth');
  const admin = signToken({ id: 'admin', role: 'ADMIN', companyId: null });
  const user = signToken({ id: 'user', role: 'COMPANY_USER', companyId: 'a' });
  const other = signToken({ id: 'other', role: 'COMPANY_USER', companyId: 'b' });
  await db.query("INSERT INTO companies(id,name,monthly_emissions_limit) VALUES('a','Alpha',10),('b','Beta',10),('empty','Empty',NULL)");
  const server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://localhost:' + server.address().port;
  async function request(url, token = admin, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + url, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  try {
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
      const preflight = await fetch(base + '/api/admin/projects', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    }
    const blockedOrigin = await fetch(base + '/api/admin/projects', { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(blockedOrigin.headers.get('access-control-allow-origin'), null);
    const factor = { category: 'Purchased Electricity', factor: '0.42', methodology: 'Regional grid', standard: 'Test', sourceReference: 'Test source 2026', assumptions: 'Location average', defaultScope: 'Scope 2', active: true };
    assert.equal((await request('/api/admin/factors', admin, factor)).status, 201);
    const activeId = (await db.query('SELECT id FROM emission_factor_versions WHERE active')).rows[0].id;
    assert.equal((await request('/api/admin/factors', admin, { ...factor, factor: '0.5', active: false })).status, 201);
    assert.equal((await db.query('SELECT id FROM emission_factor_versions WHERE active')).rows[0].id, activeId);
    assert.equal((await request('/api/emissions', user)).status, 200);
    assert.equal((await request('/api/companies/a/status', admin, { status: 'Inactive' })).status, 200);
    assert.equal((await request('/api/emissions', user)).status, 403);
    assert.equal((await request('/api/notifications', user)).status, 403);
    await request('/api/companies/a/status', admin, { status: 'Active' });

    const period = new Date().toISOString().slice(0,7);
    const activity = { category: factor.category, consumption: '1000', unit: 'kWh', facility: 'HQ', reportingPeriod: period };
    const created = await request('/api/emissions', user, activity);
    assert.equal(created.status, 201);
    const id = created.body.data.record.id;
    assert.equal((await request(`/api/admin/reviews/${id}`, user, { decision: 'Approved', comment: 'No permission', revision: '0' })).status, 403);
    assert.equal((await request(`/api/admin/reviews/${id}`, admin, { decision: 'Rejected', comment: 'Please check meter evidence', revision: '0' })).status, 201);
    assert.equal((await request(`/api/admin/reviews/${id}`, admin, { decision: 'Approved', comment: 'Stale review', revision: '0' })).status, 409);
    assert.equal((await request(`/api/admin/reviews/${id}`, admin, { decision: 'Approved', comment: 'Meter evidence verified', revision: '1' })).status, 201);
    let reviews = await request('/api/admin/reviews?record=' + id);
    assert.equal(reviews.body.data.rows[0].status, 'Verified');
    assert.equal(reviews.body.data.rows[0].reviews.length, 2);
    assert.equal((await request('/api/emissions/' + id, user, { ...activity, consumption: '2000' }, 'PUT')).status, 200);
    reviews = await request('/api/admin/reviews?record=' + id);
    assert.equal(reviews.body.data.rows[0].status, 'Needs Review');
    assert.equal(reviews.body.data.rows[0].reviews.length, 2);
    await assert.rejects(db.query('DELETE FROM emission_reviews'));

    const project = { name: 'Forest', location: 'PH', country: 'PH', type: 'Forest Conservation', standard: 'Verra VCS', description: 'Reviewed project', price: '10', available: '1', threshold: '2', status: 'Active', registryRef: 'REG-1', registryUrl: 'https://registry.example/1', certificationEvidence: 'Review complete' };
    let response = await request('/api/admin/projects', admin, project); assert.equal(response.status, 201);
    const p = response.body.data.id;
    assert.equal((await request(`/api/admin/projects/${p}/restock`, user, { quantity: '1', reference: 'DENIED' })).status, 403);
    assert.equal((await request(`/api/admin/projects/${p}/restock`, admin, { quantity: '0.50', reference: 'REG-BATCH-1' })).status, 200);
    assert.equal((await request(`/api/admin/projects/${p}/restock`, admin, { quantity: '0.50', reference: 'REG-BATCH-1' })).status, 409);
    assert.equal(Number((await db.query('SELECT available_tco2e FROM offset_projects WHERE id=$1', [p])).rows[0].available_tco2e), 1.5);
    assert.equal((await request(`/api/admin/projects/${p}/restock`, admin, { quantity: '0.001', reference: 'INVALID' })).status, 400);
    assert.equal((await request(`/api/admin/projects/${p}/details`, admin, { imageUrl: 'https://example.test/project.jpg' }, 'PATCH')).status, 200);
    assert.equal((await db.query('SELECT image_url FROM offset_projects WHERE id=$1', [p])).rows[0].image_url, 'https://example.test/project.jpg');
    assert.equal((await request(`/api/admin/projects/${p}/details`, admin, { imageUrl: 'javascript:invalid' }, 'PATCH')).status, 400);
    assert.equal((await request(`/api/admin/projects/${p}/details`, admin, { price: '12.50' }, 'PATCH')).status, 200);
    response = await request('/api/marketplace/purchase', user, { projectId: p, quantityTCO2e: '0.10' }); assert.equal(response.status, 200);
    const transaction = response.body.data.transaction.id;
    assert.equal((await request(`/api/admin/projects/${p}/details`, admin, { description: 'Changed identity evidence' }, 'PATCH')).status, 200);
    assert.equal((await request('/api/marketplace/purchase', user, { projectId: p, quantityTCO2e: '0.10' })).status, 422);
    assert.equal(Number((await db.query('SELECT price_per_tonne FROM transactions WHERE id=$1', [transaction])).rows[0].price_per_tonne), 12.5);
    assert.equal((await request(`/api/admin/transactions/${transaction}/retire`, admin, { quantity: '0.10', reference: 'RETIRE-REF' })).status, 201);
    assert.equal((await request('/api/companies/a', admin, undefined, 'DELETE')).status, 409);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM credit_retirements')).rows[0].n, 1);
    assert.equal((await request('/api/companies/empty', admin, undefined, 'DELETE')).status, 200);

    await db.query('UPDATE emissions SET result_tonnes=8,result_kg=8000 WHERE id=$1', [id]);
    response = await request(`/api/admin/dashboard?month=${period}`);
    assert.equal(response.body.data.thresholdAlerts[0].status, 'warning');
    let inbox = await request('/api/notifications', user); assert.deepEqual(inbox.body.data.errors, {});
    const threshold = inbox.body.data.items.find(n => n.key.startsWith('threshold:'));
    assert(threshold); assert.equal(threshold.read, false);
    assert.equal((await request('/api/notifications/read', other, { key: threshold.key })).status, 404);
    assert.equal((await request('/api/notifications/read', user, { key: threshold.key })).status, 200);
    inbox = await request('/api/notifications', user);
    assert.equal(inbox.body.data.items.find(n => n.key === threshold.key).read, true);
    await db.query('UPDATE emissions SET result_tonnes=0 WHERE id=$1', [id]);
    assert(!(await request('/api/notifications', user)).body.data.items.some(n => n.key === threshold.key));
    console.log('PASS: admin fixes, retained evidence, inactive sessions, factor drafts, project edits/restocking, review history, precision, threshold alerts, notification read status and isolation.');
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); }
}
run().catch(e => { console.error(e); process.exitCode = 1; });

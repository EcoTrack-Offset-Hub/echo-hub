// Isolated checks: never connect to the application's configured database.
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const { calculateEmissions } = require('../services/calculationEngine');
const { creditQuantity } = require('../services/precision');
async function run() {
  const input = { category: 'Purchased Electricity', unit: 'kWh', consumption: '1', reportingPeriod: '2026-10', facility: 'HQ' };
  assert.equal(calculateEmissions(input).resultTonnesExact, '0.00042');
  assert.equal(calculateEmissions({ ...input, unit: 'MWh' }).resultKgExact, '420');
  assert.equal(calculateEmissions({ ...input, consumption: 1000 }).resultKgExact, '420');
  assert.equal(calculateEmissions({ ...input, consumption: '0.12345678' }).input, '0.12345678');
  assert.throws(() => calculateEmissions({ ...input, unit: 'L' }));
  assert.throws(() => calculateEmissions({ ...input, consumption: Infinity }));
  assert.throws(() => creditQuantity('0.001'));
  assert.throws(() => creditQuantity('-1'));
  const db = new PGlite();
  for (const file of ['001_auth_company_emissions.sql', '002_marketplace_and_transactions.sql', '003_company_status.sql', '004_admin_dashboard.sql', '006_trustworthy_calculations.sql', '007_company_emissions_threshold.sql', '008_admin_operations.sql'])
    await db.exec(fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8'));
  process.env.DATABASE_URL = 'postgresql://isolated-test-only';
  require('pg').Pool = class {
    query(sql, args) { return db.query(sql, args); }
    async connect() { return { query: (sql, args) => db.query(sql, args), release() {} }; }
  };
  const data = require('../config/db');
  await db.query("INSERT INTO companies(id,name) VALUES('test','Test')");
  await db.query("INSERT INTO offset_projects(id,name,location,country,type,standard,description,price_per_tonne,available_tco2e,lifecycle_status,registry_url,certification_evidence,certification_reviewed_at) VALUES('p','Project','PH','PH','Forest','Test','Reviewed fixture',1.05,1,'Active','https://registry.example/project','Test evidence',now())");
  const purchase = await data.purchaseCredits({ companyId: 'test', projectId: 'p', quantityTCO2e: '0.10' });
  assert.equal(purchase.order.subtotal, 0.11); // half-up: 0.105 -> 0.11
  assert.equal(purchase.updatedProject.availableTCO2e, 0.9);
  await assert.rejects(data.purchaseCredits({ companyId: 'test', projectId: 'p', quantityTCO2e: '0.001' }));
  await assert.rejects(data.purchaseCredits({ companyId: 'test', projectId: 'p', quantityTCO2e: '1' }));
  assert.equal((await db.query("SELECT available_tco2e FROM offset_projects WHERE id='p'")).rows[0].available_tco2e, '0.90');
  await db.query("UPDATE offset_projects SET certification_reviewed_at=NULL WHERE id='p'");
  await assert.rejects(data.purchaseCredits({ companyId: 'test', projectId: 'p', quantityTCO2e: '0.10' }));
  const calc = calculateEmissions(input);
  await data.insertEmissionRecord({ id: 'e', companyId: 'test', date: '2026-10-01', activity: 'Electricity', scope: 'Scope 2', category: input.category, quantity: '1 kWh', emissions: '0.42 kg CO2e', status: 'Verified' }, calc);
  const saved = (await data.getAllEmissions({ companyId: 'test' }))[0];
  assert.equal(saved.resultTonnes, 0.00042);
  assert.equal(saved.calculationDetails.input, '1');
  const report = await data.getEmissionsReport('test', {});
  assert.equal(report.totalCo2e, 0.00042);
  const dashboard = await data.getDashboardData('test', 'October 2026');
  assert.equal(dashboard.emissions.current, 0.00042);
  assert.equal(dashboard.calculationSummary.primaryCalculation.resultKg, 0.42);
  await db.query("INSERT INTO emissions(id,company_id,date,activity,scope,category,quantity,emissions,status,input_unit,raw_input,conversion_factor,result_kg,result_tonnes) VALUES('legacy','test','2025-01-01','Legacy MWh','Scope 2','Purchased Electricity','1 MWh','0.42 kg CO2e','Verified','MWh','1',0.42,0.42,0)");
  const migration = fs.readFileSync(path.join(__dirname, '../migrations/006_trustworthy_calculations.sql'), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // idempotent, including legacy conversion repair
  const legacy = (await db.query("SELECT result_kg,result_tonnes,status,activity_amount FROM emissions WHERE id='legacy'")).rows[0];
  assert.equal(Number(legacy.result_kg), 420);
  assert.equal(Number(legacy.result_tonnes), 0.42);
  assert.equal(legacy.status, 'Needs Review');
  assert.equal(Number(legacy.activity_amount), 1);
  await assert.rejects(data.deleteCompany('test'), /Deactivate the company/);
  await db.close();
  console.log('Trust and records tests passed (units, precision, audit snapshot, purchases, rollback, reports, dashboard).');
}
run().catch(e => { console.error(e); process.exit(1); });

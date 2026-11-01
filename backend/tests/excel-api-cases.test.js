// API assertions mapped to the revised Excel plan. No production database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { decimal } = require('../services/precision');

const titles = {
  'TC-01.1': 'Login with valid Admin David credentials',
  'TC-01.2': 'Login with valid Company A credentials',
  'TC-01.3': 'Login with valid Company B credentials',
  'TC-01.4': 'Reject incorrect credentials',
  'TC-01.5': 'Block unauthenticated access to protected area',
  'TC-02.1': 'Admin David accesses Company A data',
  'TC-02.2': 'Admin David accesses Company B data',
  'TC-02.3': 'Company A sees its own company data',
  'TC-02.4': 'Deny Company A access to Company B data',
  'TC-02.5': 'Company B sees its own company data',
  'TC-02.6': 'Deny Company B access to Company A data',
  'TC-03.1': 'Save valid operational data',
  'TC-03.2': 'Reject invalid operational value or unit',
  'TC-03.3': 'Reject missing or invalid reporting period',
  'TC-03.4': 'Preserve numeric type and precision for operational data',
  'TC-04.1': 'Show calculation input value and unit',
  'TC-04.2': 'Show conversion factor used',
  'TC-04.3': 'Verify calculation and resulting estimate',
  'TC-04.4': 'Show assumptions and reporting period',
  'TC-04.5': 'Verify calculation consistency across application areas',
  'TC-05.1': 'View current and historical footprint data',
  'TC-05.3': 'View emissions by required categories',
  'TC-05.4': 'Interact with dashboard charts',
  'TC-05.5': 'Verify dashboard figures against calculation details',
  'TC-06.1': 'Browse certified offset projects',
  'TC-06.2': 'View project information and availability',
  'TC-06.3': 'Complete valid purchase and update inventory',
  'TC-06.4': 'Reject purchase exceeding available inventory',
  'TC-06.5': 'Verify completed purchase in transaction history',
  'TC-06.6': 'Prevent double-selling during concurrent purchases',
  'TC-06.7': 'Verify marketplace, inventory, and transaction consistency',
};

async function run() {
  const results = [];
  async function test(id, fn) {
    const start = Date.now();
    try {
      const evidence = await fn();
      results.push({ id, title: titles[id], status: 'PASS', kind: 'Excel API check', coverage: 'Backend/API assertions; screen presentation is not automated', detail: evidence, durationMs: Date.now()-start });
      console.log(`[PASS] ${id} ${titles[id]}`);
    } catch (e) {
      results.push({ id, title: titles[id], status: 'FAIL', kind: 'Excel API check', coverage: 'Backend/API assertions', detail: e.message, durationMs: Date.now()-start });
      console.log(`[FAIL] ${id} ${titles[id]}: ${e.message}`);
    }
  }
  const db = new PGlite();
  let server;
  try {
    for (const name of fs.readdirSync(path.join(__dirname, '../migrations')).filter(name=>name.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(__dirname, '../migrations', name),'utf8'));
    process.env.DATABASE_URL = 'postgresql://isolated-excel-automation-only';
    process.env.AUTH_JWT_SECRET = 'isolated-excel-automation-secret-at-least-32';
    process.env.SEED_DEMO_USERS = 'false'; process.env.SEED_DEMO_PROJECTS = 'false';
    require('pg').Pool = class {
      query(sql,args) { return db.query(sql,args); }
      async connect() { return { query:(sql,args)=>db.query(sql,args), release(){} }; }
    };
    const { app } = require('../server');
    const { hashPassword } = require('../middleware/auth');
    const { SERVER_EMISSION_FACTORS } = require('../services/calculationEngine');
    const password = 'IsolatedTestOnly!2026';
    await db.query("INSERT INTO companies(id,name) VALUES('company-a','Company A'),('company-b','Company B')");
    for (const [id,email,role,company] of [['admin','admin@automation.test','ADMIN',null],['a','a@automation.test','COMPANY_USER','company-a'],['b','b@automation.test','COMPANY_USER','company-b']]) await db.query('INSERT INTO users(id,email,password_hash,role,company_id) VALUES($1,$2,$3,$4,$5)',[id,email,hashPassword(password),role,company]);
    for (const [category,f] of Object.entries(SERVER_EMISSION_FACTORS)) await db.query('INSERT INTO emission_factor_versions(category,factor,unit,methodology,standard,default_scope,source_reference,assumptions) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[category,f.factor,f.unit,f.methodology,f.standard,f.defaultScope,'Isolated test fixture factor','Fixed category-average test assumption']);
    server=app.listen(0); await new Promise(resolve=>server.once('listening',resolve));
    const base='http://localhost:'+server.address().port;
    const tokens={};
    async function request(url,token,body,method=body?'POST':'GET') {
      const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
      return {status:r.status,body:await r.json()};
    }
    const input={category:'Purchased Electricity',consumption:'1000',unit:'kWh',facility:'HQ',reportingPeriod:'2026-08'};
    let saved, precise, purchased;
    const save=async (token,values)=>{const r=await request('/api/emissions',token,values);assert.equal(r.status,201,JSON.stringify(r.body));return r.body.data;};
    const dashboard=async period=>{const r=await request('/api/dashboard?'+new URLSearchParams({period,range:'6M'}),tokens.a);assert.equal(r.status,200);return r.body.data;};
    for (const [id,key,email,role] of [['TC-01.1','admin','admin@automation.test','ADMIN'],['TC-01.2','a','a@automation.test','COMPANY_USER'],['TC-01.3','b','b@automation.test','COMPANY_USER']]) await test(id,async()=>{
      const r=await request('/api/auth/login',null,{email,password});assert.equal(r.status,200);assert.equal(r.body.data.user.role,role);assert.equal(typeof r.body.data.token,'string');
      if(key!=='admin')assert.equal(r.body.data.user.companyId,'company-'+key);
      tokens[key]=r.body.data.token;return `HTTP 200; ${role} token and correct company identity returned. Browser redirect requires a UI check.`;
    });
    await test('TC-01.4',async()=>{const r=await request('/api/auth/login',null,{email:'a@automation.test',password:'wrong'});assert.equal(r.status,401);assert(!r.body.data?.token);return 'HTTP 401; no access token returned.';});
    await test('TC-01.5',async()=>{for(const url of ['/api/emissions','/api/dashboard','/api/transactions'])assert.equal((await request(url)).status,401);return 'Protected emissions, dashboard and transaction APIs reject unauthenticated requests with HTTP 401.';});
    const aFixture=await save(tokens.a,{...input,activity:'Company A original'});
    const bFixture=await save(tokens.b,{...input,consumption:'200',activity:'Company B original'});
    for(const [id,key,company,expected,excluded] of [
      ['TC-02.1','admin','company-a',aFixture.record.id,bFixture.record.id],['TC-02.2','admin','company-b',bFixture.record.id,aFixture.record.id],['TC-02.3','a','company-a',aFixture.record.id,bFixture.record.id],['TC-02.5','b','company-b',bFixture.record.id,aFixture.record.id],
    ])await test(id,async()=>{const r=await request('/api/emissions?companyId='+company,tokens[key]);assert.equal(r.status,200);assert(r.body.data.records.some(row=>row.id===expected));assert(!r.body.data.records.some(row=>row.id===excluded));return `Correct ${company} records returned without the other company's fixture.`;});
    for(const [id,key,company]of[['TC-02.4','a','company-b'],['TC-02.6','b','company-a']])await test(id,async()=>{const r=await request('/api/emissions?companyId='+company,tokens[key]);assert.equal(r.status,403);assert(!r.body.data);return 'HTTP 403; other-company records are not returned.';});
    await test('TC-03.1',async()=>{saved=await save(tokens.a,input);const r=await request('/api/emissions?record='+saved.record.id,tokens.a);assert.equal(r.status,200);assert.equal(r.body.data.records[0].category,'Purchased Electricity');assert.equal(Number(r.body.data.records[0].rawInput),1000);assert.equal(r.body.data.records[0].reportingPeriod,'2026-08');return 'Activity saved through the API and retrieved with its quantity, category, unit and month.';});
    await test('TC-03.2',async()=>{const before=(await db.query('SELECT count(*)::int AS n FROM emissions')).rows[0].n;for(const invalid of [{...input,consumption:'-100'},{...input,unit:'L'}])assert.equal((await request('/api/emissions',tokens.a,invalid)).status,400);assert.equal((await db.query('SELECT count(*)::int AS n FROM emissions')).rows[0].n,before);return 'Negative consumption and incompatible units rejected; record count unchanged.';});
    await test('TC-03.3',async()=>{for(const reportingPeriod of['','invalid period','2026-13'])assert.equal((await request('/api/emissions',tokens.a,{...input,reportingPeriod})).status,400);return 'Blank, malformed and invalid-month reporting periods rejected with HTTP 400.';});
    await test('TC-03.4',async()=>{precise=await save(tokens.a,{...input,consumption:'1234.56'});const row=(await db.query('SELECT activity_amount,pg_typeof(activity_amount)::text AS type FROM emissions WHERE id=$1',[precise.record.id])).rows[0];assert.equal(row.type,'numeric');assert.equal(decimal(row.activity_amount).toFixed(),'1234.56');return 'PostgreSQL-compatible NUMERIC activity_amount preserves 1234.56 exactly.';});
    await test('TC-04.1',async()=>{assert(saved);assert.equal(Number(saved.calculation.input),1000);assert.equal(saved.calculation.unit,'kWh');return 'Calculation response contains input 1000 and unit kWh.';});
    await test('TC-04.2',async()=>{assert.equal(saved.calculation.conversionFactor,0.42);assert(saved.calculation.factorVersionId);return 'Response identifies factor 0.42 and its saved version ID.';});
    await test('TC-04.3',async()=>{assert.equal(saved.calculation.resultKgExact,decimal(input.consumption).times('0.42').toFixed());assert.equal(saved.calculation.resultTonnesExact,'0.42');assert(saved.calculation.formula.includes('420'));return 'Independent decimal calculation: 1000 kWh x 0.42 = 420 kg = 0.42 tCO2e.';});
    await test('TC-04.4',async()=>{assert.equal(saved.calculation.reportingPeriod,'2026-08');assert.equal(saved.calculation.assumptions,'Fixed category-average test assumption');assert.equal(saved.calculation.source,'Isolated test fixture factor');return 'Reporting month, assumptions and factor source are present in saved calculation details.';});
    await test('TC-04.5',async()=>{const r=await request('/api/emissions?record='+saved.record.id,tokens.a);assert.equal(decimal(r.body.data.records[0].resultTonnes).toFixed(),saved.calculation.resultTonnesExact);const d=await dashboard('August 2026');const total=(await db.query("SELECT sum(result_tonnes)::text AS total FROM emissions WHERE company_id='company-a' AND reporting_month='2026-08-01'")).rows[0].total;assert.equal(decimal(d.emissions.current).toFixed(),decimal(total).toFixed());return 'Saved calculation matches the record; dashboard total reconciles to the same monthly records.';});
    await test('TC-05.1',async()=>{await save(tokens.a,{...input,consumption:'500',reportingPeriod:'2026-07'});const d=await dashboard('August 2026');assert(d.trend.some(p=>p.period==='2026-07'&&p.emissions===0.21));assert(d.trend.some(p=>p.period==='2026-08'&&p.emissions>0));assert.equal(d.emissions.previous,0.21);return 'July and August trend data are present; automatic previous-month value equals 0.21 tCO2e.';});
    await test('TC-05.3',async()=>{for(const [category,unit]of[['Purchased Electricity','kWh'],['Fleet & Fuel','L'],['Facilities','m3'],['Logistics & Freight','shipments'],['Other','units']])await save(tokens.a,{...input,category,unit,consumption:'10',reportingPeriod:'2026-09'});const d=await dashboard('September 2026');for(const category of['Purchased Electricity','Fleet & Fuel','Facilities','Logistics & Freight','Other'])assert(d.topSources.some(row=>row.category===category&&row.emissions>0));return 'All five implemented categories have non-zero source breakdown values in the dashboard API.';});
    results.push({id:'TC-05.4',title:titles['TC-05.4'],status:'NOT_RUN',kind:'Excel browser check',coverage:'Real Chromium UI interactions',detail:'The browser stage in run-tests.cmd verifies chart hover and 3M/6M/12M controls. API-only execution does not establish browser behaviour.',durationMs:0});
    await test('TC-05.5',async()=>{const record=await save(tokens.a,{...input,reportingPeriod:'2026-06'});const d=await dashboard('June 2026');assert.equal(d.emissions.recordCount,1);assert.equal(d.emissions.current,record.calculation.resultTonnes);assert.equal(d.calculationSummary.primaryCalculation.formula,record.calculation.formula);return 'Single-record June dashboard total and explanation match the saved calculation.';});
    async function project(id){await db.query("INSERT INTO offset_projects(id,name,location,country,type,standard,description,price_per_tonne,available_tco2e,lifecycle_status,registry_ref,registry_url,certification_evidence,certification_reviewed_at) VALUES($1,'Project ET-001','PH','PH','Forest Conservation','Verra VCS','Isolated test fixture only',10,5000,'Active','TEST-ET-001','https://registry.example/ET-001','Test-only review evidence',now())",[id]);}
    await project('ET-001');await project('ET-001-rejection');
    await test('TC-06.1',async()=>{const r=await request('/api/marketplace',tokens.a);assert.equal(r.status,200);assert(r.body.data.projects.some(p=>p.id==='ET-001'));return 'Marketplace lists the active fixture with administrator-reviewed evidence; external certification is not independently tested.';});
    await test('TC-06.2',async()=>{const r=await request('/api/marketplace/projects/ET-001',tokens.a);assert.equal(r.status,200);assert.equal(r.body.data.availableTCO2e,5000);assert(r.body.data.description);assert(r.body.data.registryUrl);return 'Project details, registry evidence link, and 5000 tCO2e availability returned.';});
    await test('TC-06.3',async()=>{const r=await request('/api/marketplace/purchase',tokens.a,{projectId:'ET-001',quantityTCO2e:1000});assert.equal(r.status,200);purchased=r.body.data.transaction;assert.equal(r.body.data.updatedProject.availableTCO2e,4000);assert.equal(Number(purchased.creditsTCO2e),1000);return 'Internal purchase records 1000 tCO2e and decreases availability from 5000 to 4000.';});
    await test('TC-06.4',async()=>{const r=await request('/api/marketplace/purchase',tokens.a,{projectId:'ET-001-rejection',quantityTCO2e:5001});assert.equal(r.status,422);const row=(await db.query("SELECT available_tco2e,(SELECT count(*)::int FROM transactions WHERE project_id='ET-001-rejection') AS transactions FROM offset_projects WHERE id='ET-001-rejection'")).rows[0];assert.equal(Number(row.available_tco2e),5000);assert.equal(row.transactions,0);return '5001 tCO2e request rejected against 5000 inventory; no transaction or stock change.';});
    await test('TC-06.5',async()=>{assert(purchased);const r=await request('/api/transactions',tokens.a);assert.equal(r.status,200);const row=r.body.data.transactions.find(t=>t.id===purchased.id);assert(row);assert.equal(Number(row.creditsTCO2e),1000);assert.equal(row.status,'Completed');return 'Transaction history contains the completed 1000-tCO2e purchase.';});
    results.push({id:'TC-06.6',title:titles['TC-06.6'],status:'NOT_RUN',kind:'Excel database check',coverage:'Real PostgreSQL row locks',detail:'Run run-tests.cmd --live to execute simultaneous 5000-tCO2e purchases in a temporary PostgreSQL schema. Embedded single-connection storage cannot prove production locking.',durationMs:0});
    await test('TC-06.7',async()=>{const p=await request('/api/marketplace/projects/ET-001',tokens.a);assert.equal(p.body.data.availableTCO2e,4000);const sum=(await db.query("SELECT sum(credits_tco2e)::text AS quantity FROM transactions WHERE project_id='ET-001'")).rows[0].quantity;assert.equal(decimal(sum).plus(p.body.data.availableTCO2e).toNumber(),5000);assert.equal(Number(sum),1000);return '4000 available + 1000 purchased = 5000 original tCO2e; ledger and marketplace reconcile.';});
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    await db.close();
    results.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
    for (const row of results.filter(row=>row.status==='MANUAL'||row.status==='NOT_RUN')) console.log(`[${process.env.ECOTRACK_BROWSER_QUEUED==='1' && row.id==='TC-05.4' ? 'PENDING' : process.env.ECOTRACK_LIVE_QUEUED==='1' && row.id==='TC-06.6' ? 'PENDING' : row.status}] ${row.id} ${row.title}: ${row.detail}`);
    if(process.env.ECOTRACK_CASE_REPORT)fs.writeFileSync(process.env.ECOTRACK_CASE_REPORT,JSON.stringify(results,null,2));
  }
  if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}
run().catch(error=>{console.error('Excel API setup failed:',error.message);process.exitCode=1;});

// Isolated PostgreSQL-compatible integration database: never modifies configured application data.
const assert = require("node:assert/strict");
const { PGlite } = require("@electric-sql/pglite");
const fs = require("fs");
const path = require("path");
const { dashboard, monthWindow } = require("../config/adminDashboard");
const { signToken } = require("../middleware/auth");
async function run() {
  process.env.AUTH_JWT_SECRET = "isolated-admin-dashboard-test-secret-32";
  const db = new PGlite();
  for (const file of [
    "001_auth_company_emissions.sql",
    "002_marketplace_and_transactions.sql",
    "003_company_status.sql",
    "004_admin_dashboard.sql",
    "005_company_tenant_codes.sql",
    "006_trustworthy_calculations.sql",
    "007_company_emissions_threshold.sql",
    "008_admin_operations.sql",
  ])
    await db.exec(
      fs.readFileSync(path.join(__dirname, "../migrations", file), "utf8"),
    );
  process.env.DATABASE_URL = "postgresql://isolated-test-only";
  require("pg").Pool = class {
    async query(sql, args) {
      if (!args && sql.includes(";"))
        return (await db.exec(sql)).at(-1) || { rows: [] };
      return db.query(sql, args);
    }
    async connect() {
      return { query: (sql, args) => this.query(sql, args), release() {} };
    }
  };
  const dbModule = require("../config/db");
  dbModule.getDb = async () => db;
  dbModule.companyExists = async (id) =>
    (await db.query("SELECT id FROM companies WHERE id=$1", [id])).rows.length >
    0;
  const { app } = require("../server");
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = "http://localhost:" + server.address().port;
  const admin = signToken({
      id: "admin",
      email: "admin@test",
      role: "ADMIN",
      companyId: null,
    }),
    user = signToken({
      id: "user",
      email: "user@test",
      role: "COMPANY_USER",
      companyId: "a",
    });
  let checks = 0;
  function check(fn) {
    fn();
    checks++;
  }
  async function request(url, token = admin, body, method = "GET") {
    const r = await fetch(base + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
  }
  try {
    check(() =>
      assert.deepEqual(monthWindow("2026-01", "3M").months, [
        "2025-11",
        "2025-12",
        "2026-01",
      ]),
    );
    for (const range of ["3M", "6M", "12M"])
      check(() =>
        assert.equal(
          monthWindow("2026-10", range).months.length,
          parseInt(range),
        ),
      );
    check(() => assert.throws(() => monthWindow("2026-13")));
    check(() => assert.throws(() => monthWindow("2026-01", "4M")));
    let d = await dashboard(db, null, monthWindow("2026-08"));
    check(() => assert.equal(d.summary.registered, 0));
    check(() => assert.equal(d.emissions.total, 0));
    check(() => assert.deepEqual(d.errors, {}));
    await db.exec(
      "INSERT INTO companies(id,name,status) VALUES('a','Alpha','Active'),('b','Beta','Inactive')",
    );
    const insert = async (
      id,
      company,
      period,
      status,
      result,
      facility = "HQ",
    ) =>
      db.query(
        `INSERT INTO emissions(id,company_id,date,activity,scope,category,quantity,emissions,status,facility,reporting_period,result_tonnes,created_at) VALUES($1,$2,'2026-10-06','Electricity','Scope 2','Purchased Electricity','100 kWh','display',$3,$4,$5,$6,'2026-10-06T00:00:00Z')`,
        [id, company, status, facility, period, result],
      );
    await insert("aug", "a", "August 2026", "Verified", 2);
    await insert("aug-review", "a", "2026-08", "Pending", 3);
    await insert("aug-incomplete", "a", "2026-08", "Verified", null, "");
    await insert("oct", "a", "Current Period", "Verified", 8);
    await insert("beta", "b", "August 2026", "Verified", 7);
    await insert("unknown", "b", "Q2 2026", "Draft", 4);
    d = await dashboard(db, null, monthWindow("2026-08", "3M"));
    check(() => assert.equal(d.summary.registered, 2));
    check(() => assert.equal(d.summary.active, 1));
    check(() => assert.equal(d.emissions.total, 12));
    check(() => assert.equal(d.emissions.records, 4));
    check(() => assert.equal(d.trend.find((c) => c.id === "a").values[2], 5));
    check(() => assert.equal(d.trend.find((c) => c.id === "b").values[2], 7));
    check(() => assert.equal(d.emissions.validated, 2));
    check(() => assert.equal(d.emissions.review, 1));
    check(() => assert.equal(d.emissions.incomplete, 1));
    check(() =>
      assert.equal(
        d.emissions.validated + d.emissions.review + d.emissions.incomplete,
        d.emissions.records,
      ),
    );
    check(() => assert.equal(d.summary.issues, 3));
    check(() =>
      assert(d.attention.some((i) => i.id === "b" && i.kind === "incomplete")),
    );
    check(() => assert.equal(d.attention.find(i => i.id === 'b' && i.kind === 'incomplete').unknownMonthCount, 1));
    d = await dashboard(db, "a", monthWindow("2026-08"));
    check(() => assert.equal(d.emissions.total, 5));
    check(() => assert.equal(d.trend.length, 1));
    check(() => assert.equal(d.summary.registered, 1));
    d = await dashboard(db, "a", monthWindow("2026-10"));
    check(() => assert.equal(d.emissions.total, 8));
    d = await dashboard(db, "a", monthWindow("2026-09"));
    check(() => assert(d.attention.some((i) => i.kind === "missing")));
    check(() => assert.equal(d.attention.find(i => i.kind === 'missing').unknownMonthCount, 0));
    check(() => assert.equal(d.emissions.records, 0));
    await db.exec(
      "INSERT INTO offset_projects(id,name,location,country,type,standard,description,price_per_tonne,available_tco2e,lifecycle_status,low_inventory_threshold) VALUES('p','Forest','PH','PH','Forest','Registry','Project',10,90,'Active',100)",
    );
    await db.exec(
      "INSERT INTO transactions(id,transaction_id,company_id,project_id,credits_tco2e,price_per_tonne,subtotal,service_fee,total_amount,certificate_id,status) VALUES('t','TX1','a','p',10,10,100,2,102,'CERT1','Completed')",
    );
    d = await dashboard(db, null, monthWindow("2026-08"));
    check(() => assert.equal(d.marketplace.sold, 10));
    check(() => assert.equal(d.marketplace.retired, 0));
    check(() => assert.equal(d.marketplace.total, 100));
    check(() => assert.equal(d.lowInventory.length, 1));
    check(() => assert.equal(d.marketplace.active, 1));
    check(() => assert.equal(d.marketplace.reserved, 0));
    let r = await request(
      "/api/admin/transactions/t/retire",
      admin,
      { quantity: 4, reference: "registry-1" },
      "POST",
    );
    check(() => assert.equal(r.status, 201));
    d = await dashboard(db, null, monthWindow("2026-08"));
    check(() => assert.equal(d.marketplace.retired, 4));
    check(() => assert.equal(d.marketplace.sold, 6));
    check(() => assert.equal(d.marketplace.total, 100));
    r = await request(
      "/api/admin/transactions/t/retire",
      admin,
      { quantity: 7, reference: "registry-2" },
      "POST",
    );
    check(() => assert.equal(r.status, 422));
    await db.exec(
      "INSERT INTO emission_factor_versions(category,factor,unit,methodology,standard,default_scope,active,review_due) VALUES('A',1,'kg/unit','Method','GHG','Scope 1',true,NULL),('B',2,'kg/unit','Method','GHG','Scope 1',true,'2020-01-01'),('C',3,'kg/unit','Method','GHG','Scope 1',false,NULL)",
    );
    d = await dashboard(db, null, monthWindow("2026-08"));
    check(() => assert.equal(d.factors.active, 1));
    check(() => assert.equal(d.factors.inactive, 1));
    check(() => assert.equal(d.factors.outdated, 1));
    check(() => assert.equal(d.factors.undated, 1));
    check(() => assert.equal(d.factors.total, 3));
    check(() => assert(d.activity.length > 0));
    check(() =>
      assert(d.activity.every((a) => !isNaN(Date.parse(a.createdAt)))),
    );
    r = await request("/api/admin/dashboard", null);
    check(() => assert.equal(r.status, 401));
    r = await request("/api/admin/dashboard", user);
    check(() => assert.equal(r.status, 403));
    for (const route of [
      "/api/admin/audit",
      "/api/admin/factors",
      "/api/admin/projects",
      "/api/admin/transactions",
    ]) {
      r = await request(route, user);
      check(() => assert.equal(r.status, 403));
    }
    r = await request("/api/admin/projects", user, {}, "POST");
    check(() => assert.equal(r.status, 403));
    r = await request("/api/emissions?companyId=b", user);
    check(() => assert.equal(r.status, 403));
    r = await request("/api/admin/dashboard?month=2026-13");
    check(() => assert.equal(r.status, 400));
    r = await request("/api/admin/dashboard?range=4M");
    check(() => assert.equal(r.status, 400));
    r = await request("/api/admin/dashboard?companyId=does-not-exist");
    check(() => assert.equal(r.status, 404));
    r = await request("/api/admin/dashboard?month=2026-08");
    check(() => assert.equal(r.status, 200));
    check(() => assert.equal(r.data.data.emissions.total, 12));
    r = await request("/api/admin/audit?page=0");
    check(() => assert.equal(r.status, 400));
    // Aggregation failures are explicit and leave successful sections usable.
    const broken = {
      query: async (sql, args) => {
        if (sql.includes("FROM emission_factor_versions"))
          throw new Error("test partial failure");
        return db.query(sql, args);
      },
    };
    d = await dashboard(broken, null, monthWindow("2026-08"));
    check(() => assert(d.errors.factors));
    check(() => assert.equal(d.emissions.total, 12));
    check(() => assert.equal(d.factors, undefined));
    r = await request(
      "/api/admin/factors",
      admin,
      {
        category: "Purchased Electricity",
        factor: 0.42,
        methodology: "Test methodology",
        standard: "GHG",
        sourceReference: "Test factor publication 2026", assumptions: "Test regional average",
        defaultScope: "Scope 2",
        active: true,
      },
      "POST",
    );
    check(() => assert.equal(r.status, 201));
    const factorId = (
      await db.query(
        "SELECT id FROM emission_factor_versions WHERE category='Purchased Electricity' AND active",
      )
    ).rows[0].id;
    r = await request(
      "/api/emissions/calculate",
      user,
      {
        category: "Purchased Electricity",
        consumption: 100,
        unit: "kWh",
        facility: "HQ",
        reportingPeriod: "2026-08",
      },
      "POST",
    );
    check(() => assert.equal(r.status, 200));
    check(() => assert.equal(r.data.data.resultTonnes, 0.042));
    r = await request(
      "/api/emissions",
      user,
      {
        category: "Purchased Electricity",
        consumption: 100,
        unit: "kWh",
        facility: "HQ",
        reportingPeriod: "2026-08",
      },
      "POST",
    );
    check(() => assert.equal(r.status, 201));
    const saved = r.data.data.record.id;
    let stored = (
      await db.query("SELECT factor_version_id FROM emissions WHERE id=$1", [
        saved,
      ])
    ).rows[0];
    check(() =>
      assert.equal(Number(stored.factor_version_id), Number(factorId)),
    );
    r = await request(
      "/api/admin/factors",
      admin,
      {
        category: "Purchased Electricity",
        factor: 0.8,
        methodology: "New methodology",
        standard: "GHG",
        sourceReference: "Test factor publication 2026", assumptions: "Test regional average",
        defaultScope: "Scope 2",
        active: true,
      },
      "POST",
    );
    check(() => assert.equal(r.status, 201));
    stored = (
      await db.query("SELECT result_tonnes FROM emissions WHERE id=$1", [saved])
    ).rows[0];
    check(() => assert.equal(Number(stored.result_tonnes), 0.042));
    await db.query("DELETE FROM emissions WHERE id=$1", [saved]);
    r = await request("/api/admin/dashboard", "malformed.token.signature");
    check(() => assert.equal(r.status, 401));
    r = await request("/api/admin/projects", admin, { name: "Bad" }, "POST");
    check(() => assert.equal(r.status, 400));
    r = await request(
      "/api/admin/transactions/t/retire",
      admin,
      { quantity: "0.001", reference: "bad-precision" },
      "POST",
    );
    check(() => assert.equal(r.status, 400));
    r = await request(
      "/api/admin/factors",
      admin,
      {
        category: "Purchased Electricity",
        factor: 1,
        methodology: "method",
        standard: "GHG",
        sourceReference: "Test factor publication 2026", assumptions: "Test regional average",
        defaultScope: "Scope 2",
        active: true,
        reviewDue: "2026-02-30",
      },
      "POST",
    );
    check(() => assert.equal(r.status, 400));
    // Exercise unchanged company-facing functions using the isolated PostgreSQL adapter.
    let company = await dbModule.getDashboardData("a", "August 2026", "6M");
    check(() => assert.equal(company.emissions.current, 5));
    check(() =>
      assert.equal(
        company.trend.find((m) => m.period === "2026-08").emissions,
        5,
      ),
    );
    check(() => assert.equal(company.offsets.creditsPurchased, 10));
    check(() => assert.equal(company.offsets.creditsRetired, 4));
    let records = await dbModule.getAllEmissions({
      companyId: "a",
      month: "2026-08",
      quality: "review",
    });
    check(() => assert.equal(records.length, 1));
    check(() => assert.equal(records[0].id, "aug-review"));
    r = await request("/api/dashboard?companyId=b", user);
    check(() => assert.equal(r.status, 403));
    r = await request(
      "/api/admin/projects",
      admin,
      {
        name: "New Project",
        location: "PH",
        country: "PH",
        type: "Forest",
        standard: "Test registry",
        registryRef: "TEST-1", registryUrl: "https://registry.example/test", certificationEvidence: "Test certification review",
        description: "Description",
        price: 5,
        available: 10,
        status: "Active",
        threshold: 12,
      },
      "POST",
    );
    check(() => assert.equal(r.status, 201));
    r = await request(
      "/api/admin/projects/p",
      admin,
      { status: "Inactive", threshold: 20 },
      "PATCH",
    );
    check(() => assert.equal(r.status, 200));
    d = await dashboard(db, null, monthWindow("2026-08"));
    check(() => assert.equal(d.marketplace.active, 1));
    check(() => assert.equal(d.lowInventory.length, 1));
    r = await request("/api/admin/transactions", admin);
    check(() => assert.equal(r.status, 200));
    check(() => assert.equal(Number(r.data.data.rows[0].retired), 4));
    r = await request('/api/admin/transactions/t', admin);
    check(() => assert.equal(r.status, 200));
    check(() => assert.equal(r.data.data.transaction.id, 't'));
    check(() => assert.equal(r.data.data.transaction.retired, '4.00'));
    check(() => assert.equal(r.data.data.retirements.length, 1));
    check(() => assert.equal(r.data.data.retirements[0].quantity, '4.00'));
    check(() => assert(r.data.data.retirements[0].registry_reference));
    r = await request('/api/admin/transactions/t', user);
    check(() => assert.equal(r.status, 403));
    r = await request('/api/admin/transactions/missing', admin);
    check(() => assert.equal(r.status, 404));
    r = await request("/api/admin/audit", admin);
    check(() => assert.equal(r.status, 200));
    check(() => assert(r.data.data.rows.length > 0));
    await db.query("INSERT INTO audit_events(entity_type,entity_id,operation,description) SELECT 'pagination-test',n::text,'INSERT','Pagination fixture' FROM generate_series(1,35) n");
    const firstAuditPage = await request('/api/admin/audit?page=1&pageSize=10', admin);
    const secondAuditPage = await request('/api/admin/audit?page=2&pageSize=10', admin);
    check(() => assert.equal(firstAuditPage.data.data.rows.length, 10));
    check(() => assert.equal(secondAuditPage.data.data.rows.length, 10));
    check(() => assert.equal(firstAuditPage.data.data.pageSize, 10));
    check(() => assert(!secondAuditPage.data.data.rows.some(row => firstAuditPage.data.data.rows.some(first => first.id === row.id))));
    r = await request('/api/admin/audit?page=100000&pageSize=10', admin);
    check(() => assert.equal(r.data.data.rows.length, 0));
    check(() => assert.equal(r.data.data.total, firstAuditPage.data.data.total));
    r = await request('/api/admin/audit?pageSize=11', admin);
    check(() => assert.equal(r.status, 400));
    r = await request(
      "/api/admin/transactions/t/retire",
      user,
      { quantity: 1, reference: "forbidden" },
      "POST",
    );
    check(() => assert.equal(r.status, 403));
    const migrated = await db.query(
      "SELECT reporting_month FROM emissions WHERE id='unknown'",
    );
    check(() => assert.equal(migrated.rows[0].reporting_month, null));
    r = await request(
      "/api/marketplace/purchase",
      user,
      { projectId: "p", quantityTCO2e: 1 },
      "POST",
    );
    check(() => assert.equal(r.status, 422));
    await request(
      "/api/admin/projects/p",
      admin,
      { status: "Active", threshold: 20, registryRef: "TEST-P", registryUrl: "https://registry.example/p", certificationEvidence: "Test review" },
      "PATCH",
    );
    r = await request(
      "/api/marketplace/purchase",
      user,
      { projectId: "p", quantityTCO2e: 1 },
      "POST",
    );
    check(() => assert.equal(r.status, 200));
    const portfolio = await dbModule.getCompanyPortfolio("a");
    check(() => assert.equal(portfolio.totalCreditsPurchased, 11));
    check(() => assert.equal(portfolio.totalCreditsRetired, 4));
    r = await request(
      "/api/companies",
      admin,
      {
        name: "New Tenant",
        email: "newtenant@test.example",
        password: "StrongPassword!2026",
      },
      "POST",
    );
    check(() => assert.equal(r.status, 201));
    r = await request(
      "/api/emissions",
      admin,
      { category: "Purchased Electricity" },
      "POST",
    );
    check(() => assert.equal(r.status, 403));
    const vm = require("vm");
    const frontendSource = fs.readFileSync(
      path.join(__dirname, "../../frontend/lib/api/admin.ts"),
      "utf8",
    );
    const relativeSource =
      "function relativeTime" +
      frontendSource
        .split("export function relativeTime")[1]
        .replace("timestamp: string", "timestamp");
    const timeContext = { Date, Intl };
    vm.runInNewContext(relativeSource, timeContext);
    check(() =>
      assert.equal(
        timeContext.relativeTime(new Date(Date.now() - 120000).toISOString()),
        "2 minutes ago",
      ),
    );
    check(() =>
      assert.equal(
        timeContext.relativeTime(new Date(Date.now() - 86400000).toISOString()),
        "yesterday",
      ),
    );
    const auditBefore = (
      await db.query("SELECT count(*)::int AS count FROM audit_events")
    ).rows[0].count;
    await db.exec(
      fs.readFileSync(
        path.join(__dirname, "../migrations/004_admin_dashboard.sql"),
        "utf8",
      ),
    );
    const auditAfter = (
      await db.query("SELECT count(*)::int AS count FROM audit_events")
    ).rows[0].count;
    check(() => assert.equal(auditAfter, auditBefore));
    console.log(`PASS: ${checks} isolated admin dashboard integration checks`);
  } finally {
    await new Promise((r) => server.close(r));
    await db.close();
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

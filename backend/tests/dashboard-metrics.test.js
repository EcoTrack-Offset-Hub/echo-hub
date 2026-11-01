// Live PostgreSQL regression tests with test-owned tenants, independent of historical demo fixtures.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");
const { app } = require("../server");
const { initDb, getDb, getDashboardData } = require("../config/db");
const { signToken } = require("../middleware/auth");
async function run() {
  await initDb();
  const db = await getDb();
  const a = "dash-" + randomUUID(),
    b = "dash-" + randomUUID();
  const current = new Date();
  current.setUTCDate(1);
  const month = current.toISOString().slice(0, 7);
  const previous = new Date(current);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const prev = previous.toISOString().slice(0, 7);
  const older = new Date(current);
  older.setUTCMonth(older.getUTCMonth() - 2);
  const old = older.toISOString().slice(0, 7);
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = "http://localhost:" + server.address().port;
  const token = (id) =>
    signToken({
      id: "dashboard-test",
      email: "dashboard@test.example",
      role: "COMPANY_USER",
      companyId: id,
    });
  const get = async (path, auth = token(a)) => {
    const r = await fetch(base + path, {
      headers: auth ? { Authorization: "Bearer " + auth } : {},
    });
    return { status: r.status, data: await r.json() };
  };
  let checks = 0;
  const check = (fn) => {
    fn();
    checks++;
  };
  const insert = async (
    id,
    tenant,
    period,
    total,
    status = "Verified",
    facility = "HQ",
    category = "Purchased Electricity",
  ) =>
    db.query(
      `INSERT INTO emissions(id,company_id,date,activity,scope,category,quantity,emissions,status,facility,conversion_factor,input_unit,raw_input,result_kg,result_tonnes,reporting_period) VALUES($1,$2,$3,'Electricity','Scope 2',$4,'1550 kWh','display',$5,$6,0.42,'kWh','1550',$7,$8,$9)`,
      [
        id,
        tenant,
        new Date().toISOString(),
        category,
        status,
        facility,
        total === null ? null : total * 1000,
        total,
        period,
      ],
    );
  try {
    await db.query(
      "INSERT INTO companies(id,name,status) VALUES($1,$1,'Active'),($2,$2,'Active')",
      [a, b],
    );
    await insert(a + "-current", a, month, 0.651);
    await insert(a + "-previous", a, prev, 6.63);
    await insert(a + "-older", a, old, 1.5);
    await insert(b + "-current", b, month, 1.2);
    let r = await get("/api/dashboard");
    check(() => assert.equal(r.status, 200));
    let d = r.data.data;
    check(() => assert.equal(d.emissions.current, 0.651));
    check(() => assert.equal(d.emissions.recordCount, 1));
    check(() => assert.equal(d.emissions.previous, 6.63));
    check(() => assert.equal(d.emissions.percentageChange, -90.2));
    check(() => assert.equal(d.scopes.scope2.emissions, 0.651));
    check(() => assert.equal(d.scopes.scope2.percentage, 100));
    check(() => assert.equal(d.dataCompleteness.completenessPercentage, 100));
    check(() =>
      assert.equal(d.topSources[0].category, "Purchased Electricity"),
    );
    check(() =>
      assert.equal(d.calculationSummary.primaryCalculation.input, "1,550"),
    );
    check(() => assert.equal(d.offsets.creditsPurchased, 0));
    check(() => assert.equal(d.offsets.creditsRetired, 0));
    check(() => assert.equal(d.offsets.netEmissions, 0.651));
    for (const range of ["3M", "6M", "12M"]) {
      d = await getDashboardData(a, "Current Period", range);
      check(() => assert.equal(d.trend.length, parseInt(range)));
      check(() =>
        assert.equal(d.trend.find((t) => t.period === old).emissions, 1.5),
      );
      check(() =>
        assert.equal(d.trend.find((t) => t.period === month).emissions, 0.651),
      );
    }
    const oldLabel = older.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    d = await getDashboardData(a, oldLabel);
    check(() => assert.equal(d.emissions.current, 1.5));
    await insert(a + "-incomplete", a, month, null, "Draft", "", "");
    d = await getDashboardData(a);
    check(() => assert.equal(d.dataCompleteness.totalRecords, 2));
    check(() => assert.equal(d.dataCompleteness.incompleteRecords, 1));
    check(() => assert.equal(d.dataCompleteness.completenessPercentage, 50));
    d = await getDashboardData(a, "Q1 2020");
    check(() => assert.equal(d.emissions.current, 0));
    check(() => assert.equal(d.emissions.recordCount, 0));
    check(() => assert.equal(d.dataCompleteness.completenessPercentage, 0));
    r = await get("/api/dashboard", token(b));
    check(() => assert.equal(r.data.data.emissions.current, 1.2));
    r = await get("/api/dashboard?companyId=" + b);
    check(() => assert.equal(r.status, 403));
    r = await get("/api/dashboard", null);
    check(() => assert.equal(r.status, 401));
    console.log(`PASS: ${checks} live company dashboard regression checks`);
  } finally {
    await db.query("DELETE FROM emissions WHERE company_id=ANY($1)", [[a, b]]);
    await db.query("DELETE FROM companies WHERE id=ANY($1)", [[a, b]]);
    await new Promise((r) => server.close(r));
  }
}
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

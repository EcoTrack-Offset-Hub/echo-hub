// Read-only smoke checks against the configured PostgreSQL database.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const assert = require("node:assert/strict");
const { app } = require("../server");
const { getDb } = require("../config/db");
const { signToken } = require("../middleware/auth");
async function run() {
  const db = await getDb();
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = "http://localhost:" + server.address().port;
  let checks = 0;
  const check = (fn) => {
    fn();
    checks++;
  };
  const token = signToken({
    id: "live-smoke",
    email: "smoke@test.example",
    role: "ADMIN",
    companyId: null,
  });
  try {
    let response = await fetch(base + "/api/health");
    check(() => assert.equal(response.status, 200));
    const month = new Date().toISOString().slice(0, 7);
    for (const range of ["3M", "6M", "12M"]) {
      response = await fetch(
        base + "/api/admin/dashboard?month=" + month + "&range=" + range,
        { headers: { Authorization: "Bearer " + token } },
      );
      check(() => assert.equal(response.status, 200));
      const { data } = await response.json();
      check(() => assert.deepEqual(data.errors, {}));
      const counts = (
        await db.query(
          "SELECT count(*)::int AS total,count(*) FILTER(WHERE status='Active')::int AS active FROM companies",
        )
      ).rows[0];
      check(() => assert.equal(data.summary.registered, counts.total));
      check(() => assert.equal(data.summary.active, counts.active));
      const actual = (
        await db.query(
          "SELECT count(*)::int AS records,COALESCE(sum(result_tonnes),0)::float8 AS total FROM emissions WHERE to_char(reporting_month,'YYYY-MM')=$1",
          [month],
        )
      ).rows[0];
      check(() => assert.equal(data.emissions.records, actual.records));
      check(() => assert.equal(data.emissions.total, actual.total));
      check(() => assert.equal(data.window.months.length, parseInt(range)));
      check(() =>
        assert.equal(
          data.marketplace.total,
          data.marketplace.available +
            data.marketplace.sold +
            data.marketplace.retired,
        ),
      );
    }
    console.log(`PASS: ${checks} read-only live admin dashboard checks`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

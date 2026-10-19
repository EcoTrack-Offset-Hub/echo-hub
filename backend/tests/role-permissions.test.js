require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const http = require("http");
const assert = require("assert");
const crypto = require("crypto");
const { app } = require("../server");
const { initDb, getDb, seedUsers, getEmissionById } = require("../config/db");
const { hashPassword } = require("../middleware/auth");

async function request(serverUrl, path, options = {}) {
  const url = `${serverUrl}${path}`;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.rawBody !== undefined ? options.rawBody : options.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

async function runTests() {
  console.log("=== Starting EcoTrack Role-Based Access Control Verification Tests ===");
  await initDb();
  const password = process.env.SEED_PASSWORD || "EcoTrackDemo!2026";
  await seedUsers([
    { id: "usr-admin-david", email: "admin@ecotrack.test", passwordHash: hashPassword(password), role: "ADMIN", companyId: null },
    { id: "usr-company-a", email: "companya@ecotrack.test", passwordHash: hashPassword(password), role: "COMPANY_USER", companyId: "company-a" },
    { id: "usr-company-b", email: "companyb@ecotrack.test", passwordHash: hashPassword(password), role: "COMPANY_USER", companyId: "company-b" },
  ]);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  const results = [];
  const recordResult = (id, description, passed, detail = "") => {
    results.push({ id, description, passed, detail });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${id}: ${description} ${detail ? `(${detail})` : ""}`);
  };

  let registeredCompanyId = null;
  let registeredUserId = null;
  let compAAddedEmissionId = null;
  let startingCompanyCount = 0;
  let adminToken = null;

  try {

    // Test A: Admin login works
    const adminLoginRes = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "admin@ecotrack.test", password },
    });
    adminToken = adminLoginRes.data?.data?.token;
    const adminUser = adminLoginRes.data?.data?.user;
    recordResult(
      "A",
      "Admin login works",
      adminLoginRes.status === 200 && adminUser?.role === "ADMIN" && !!adminToken,
      `Status: ${adminLoginRes.status}, Role: ${adminUser?.role}`
    );

    // Record baseline company count before Test B
    const compListBefore = await request(baseUrl, "/api/companies", { token: adminToken });
    startingCompanyCount = compListBefore.data?.data?.length || 0;

    // Test B: Admin can register a company
    const uniqueSuffix = Date.now().toString(36);
    const testCompanyName = `EcoTest Org ${uniqueSuffix}`;
    const testCompanyEmail = `admin-${uniqueSuffix}@ecotest.org`;
    const testCompanyPassword = "TestPassword!2026";

    const registerRes = await request(baseUrl, "/api/companies", {
      method: "POST",
      token: adminToken,
      body: {
        name: testCompanyName,
        email: testCompanyEmail,
        password: testCompanyPassword,
      },
    });
    const registeredCompany = registerRes.data?.data?.company;
    const registeredUser = registerRes.data?.data?.user;
    registeredCompanyId = registeredCompany?.id;
    registeredUserId = registeredUser?.id;
    recordResult(
      "B",
      "Admin can register a company and create initial company user",
      registerRes.status === 201 && !!registeredCompany?.id && !!registeredUser?.id,
      `Status: ${registerRes.status}, Company: ${registeredCompany?.id}`
    );

    // Test C: Newly registered company/user can log in
    const newLoginRes = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: testCompanyEmail, password: testCompanyPassword },
    });
    const newToken = newLoginRes.data?.data?.token;
    const newUser = newLoginRes.data?.data?.user;
    recordResult(
      "C",
      "Newly registered company/user can log in",
      newLoginRes.status === 200 && newUser?.role === "COMPANY_USER" && newUser?.companyId === registeredCompany?.id && !!newToken,
      `Status: ${newLoginRes.status}, User Company: ${newUser?.companyId}`
    );

    // Test D: Admin can view Company A
    const adminViewCompADash = await request(baseUrl, "/api/dashboard?companyId=company-a", { token: adminToken });
    const adminViewCompAEmis = await request(baseUrl, "/api/emissions?companyId=company-a", { token: adminToken });
    const adminViewCompARep = await request(baseUrl, "/api/reports?companyId=company-a", { token: adminToken });
    recordResult(
      "D",
      "Admin can view Company A (Dashboard, Emissions, Reports)",
      adminViewCompADash.status === 200 && adminViewCompAEmis.status === 200 && adminViewCompARep.status === 200,
      `Dash: ${adminViewCompADash.status}, Emis: ${adminViewCompAEmis.status}, Reports: ${adminViewCompARep.status}`
    );

    // Test E: Admin can view Company B
    const adminViewCompBDash = await request(baseUrl, "/api/dashboard?companyId=company-b", { token: adminToken });
    const adminViewCompBEmis = await request(baseUrl, "/api/emissions?companyId=company-b", { token: adminToken });
    const adminViewCompBRep = await request(baseUrl, "/api/reports?companyId=company-b", { token: adminToken });
    recordResult(
      "E",
      "Admin can view Company B (Dashboard, Emissions, Reports)",
      adminViewCompBDash.status === 200 && adminViewCompBEmis.status === 200 && adminViewCompBRep.status === 200,
      `Dash: ${adminViewCompBDash.status}, Emis: ${adminViewCompBEmis.status}, Reports: ${adminViewCompBRep.status}`
    );

    // Test F & G: Admin cannot add emissions (POST /api/emissions returns 403 Forbidden)
    const adminAddEmisRes = await request(baseUrl, "/api/emissions", {
      method: "POST",
      token: adminToken,
      body: {
        companyId: "company-a",
        category: "Purchased Electricity",
        consumption: 500,
        unit: "kWh",
        facility: "Test Facility",
        reportingPeriod: "Q2 2026",
      },
    });
    recordResult(
      "F/G",
      "Admin cannot add emissions (POST /api/emissions returns 403 Forbidden)",
      adminAddEmisRes.status === 403 && adminAddEmisRes.data?.success === false,
      `Status: ${adminAddEmisRes.status}, Error: ${adminAddEmisRes.data?.error}`
    );

    // Login Company A
    const compALogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companya@ecotrack.test", password },
    });
    const compAToken = compALogin.data?.data?.token;

    // Login Company B
    const compBLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companyb@ecotrack.test", password },
    });
    const compBToken = compBLogin.data?.data?.token;

    // Capture baseline dashboard metrics before adding emission
    const dashBeforeAddRes = await request(baseUrl, "/api/dashboard", { token: compAToken });
    const baseDashCurrent = Number(dashBeforeAddRes.data?.data?.emissions?.current || 0);
    const baseDashCount = Number(dashBeforeAddRes.data?.data?.emissions?.recordCount || 0);

    // Test H: Company A can add emissions to Company A and record persists in DB
    const compAAddEmisRes = await request(baseUrl, "/api/emissions", {
      method: "POST",
      token: compAToken,
      body: {
        category: "Purchased Electricity",
        consumption: 150,
        unit: "kWh",
        facility: "Company A Facility Alpha",
        reportingPeriod: "Current Period",
      },
    });
    compAAddedEmissionId = compAAddEmisRes.data?.data?.record?.id;
    const dbPersistedAfterCreate = compAAddedEmissionId ? await getEmissionById(compAAddedEmissionId) : null;
    recordResult(
      "H",
      "Company A can add emissions to Company A and record persists in PostgreSQL",
      compAAddEmisRes.status === 201 &&
        compAAddEmisRes.data?.data?.record?.companyId === "company-a" &&
        dbPersistedAfterCreate?.id === compAAddedEmissionId &&
        dbPersistedAfterCreate?.resultKg === 63,
      `Status: ${compAAddEmisRes.status}, Record ID: ${compAAddedEmissionId}, Persisted kg: ${dbPersistedAfterCreate?.resultKg}`
    );

    // Test I: Company A cannot access Company B data (403)
    const compAAccessBEmis = await request(baseUrl, "/api/emissions?companyId=company-b", { token: compAToken });
    const compAAccessBDash = await request(baseUrl, "/api/dashboard?companyId=company-b", { token: compAToken });
    const compAAccessBRep = await request(baseUrl, "/api/reports?companyId=company-b", { token: compAToken });
    const compAPostB = await request(baseUrl, "/api/emissions", {
      method: "POST",
      token: compAToken,
      body: {
        companyId: "company-b",
        category: "Purchased Electricity",
        consumption: 100,
        unit: "kWh",
        facility: "Malicious Injection",
        reportingPeriod: "Current Period",
      },
    });
    recordResult(
      "I",
      "Company A cannot access Company B data (403)",
      compAAccessBEmis.status === 403 && compAAccessBDash.status === 403 && compAAccessBRep.status === 403 && compAPostB.status === 403,
      `Emis: ${compAAccessBEmis.status}, Dash: ${compAAccessBDash.status}, Rep: ${compAAccessBRep.status}, Post: ${compAPostB.status}`
    );

    // Test J: Company B cannot access Company A data (403)
    const compBAccessAEmis = await request(baseUrl, "/api/emissions?companyId=company-a", { token: compBToken });
    const compBAccessADash = await request(baseUrl, "/api/dashboard?companyId=company-a", { token: compBToken });
    const compBAccessARep = await request(baseUrl, "/api/reports?companyId=company-a", { token: compBToken });
    const compBPostA = await request(baseUrl, "/api/emissions", {
      method: "POST",
      token: compBToken,
      body: {
        companyId: "company-a",
        category: "Purchased Electricity",
        consumption: 100,
        unit: "kWh",
        facility: "Malicious Injection",
        reportingPeriod: "Current Period",
      },
    });
    recordResult(
      "J",
      "Company B cannot access Company A data (403)",
      compBAccessAEmis.status === 403 && compBAccessADash.status === 403 && compBAccessARep.status === 403 && compBPostA.status === 403,
      `Emis: ${compBAccessAEmis.status}, Dash: ${compBAccessADash.status}, Rep: ${compBAccessARep.status}, Post: ${compBPostA.status}`
    );

    // Test K: Company User cannot access company-registration API (403)
    const compAGetCompanies = await request(baseUrl, "/api/companies", { token: compAToken });
    const compAPostCompanies = await request(baseUrl, "/api/companies", {
      method: "POST",
      token: compAToken,
      body: { name: "Illegal Org", email: "illegal@org.test", password: "somePassword123" },
    });
    recordResult(
      "K",
      "Company User cannot access company-registration API (403 Forbidden)",
      compAGetCompanies.status === 403 && compAPostCompanies.status === 403,
      `GET /api/companies: ${compAGetCompanies.status}, POST /api/companies: ${compAPostCompanies.status}`
    );

    // Test L: Saved emissions appear in Dashboard/Reports and increment dashboard totals accurately (+0.063 tCO2e)
    const compADashRes = await request(baseUrl, "/api/dashboard", { token: compAToken });
    const compARepRes = await request(baseUrl, "/api/reports", { token: compAToken });
    const compAEmisListRes = await request(baseUrl, "/api/emissions", { token: compAToken });
    const hasRecords = (compAEmisListRes.data?.data?.records || []).some((r) => r.id === compAAddedEmissionId);
    const dashCountAfterCreate = Number(compADashRes.data?.data?.emissions?.recordCount || 0);
    const dashCurrentAfterCreate = Number(compADashRes.data?.data?.emissions?.current || 0);
    const expectedCurrentAfterCreate = Number((baseDashCurrent + 0.063).toFixed(3));
    const repHasCo2e = (compARepRes.data?.data?.totalCo2e || 0) > 0;
    recordResult(
      "L",
      "Saved emissions appear in Dashboard/Reports and increment dashboard totals",
      compADashRes.status === 200 &&
        compARepRes.status === 200 &&
        hasRecords &&
        dashCountAfterCreate === baseDashCount + 1 &&
        dashCurrentAfterCreate === expectedCurrentAfterCreate &&
        repHasCo2e,
      `Dash Total: ${dashCurrentAfterCreate} (expected ${expectedCurrentAfterCreate}), Dash Count: ${dashCountAfterCreate}, Rep CO2e: ${compARepRes.data?.data?.totalCo2e}`
    );

    // Test M: Company A can EDIT own emission, DB persists update, and dashboard total updates (+0.21 tCO2e)
    const emissionIdToEdit = compAAddedEmissionId;
    const compAUpdateRes = await request(baseUrl, `/api/emissions/${emissionIdToEdit}`, {
      method: "PUT",
      token: compAToken,
      body: {
        category: "Purchased Electricity",
        consumption: 500,
        unit: "kWh",
        facility: "Company A Facility Alpha Updated",
        reportingPeriod: "Current Period",
      },
    });
    // 500 kWh * 0.42 kg CO2e/kWh = 210 kg CO2e (0.21 tCO2e)
    const updatedRecord = compAUpdateRes.data?.data?.record;
    const updatedCalc = compAUpdateRes.data?.data?.calculation;
    const dbPersistedAfterUpdate = await getEmissionById(emissionIdToEdit);
    const dashAfterUpdateRes = await request(baseUrl, "/api/dashboard", { token: compAToken });
    const dashCurrentAfterUpdate = Number(dashAfterUpdateRes.data?.data?.emissions?.current || 0);
    const expectedCurrentAfterUpdate = Number((baseDashCurrent + 0.21).toFixed(3));
    recordResult(
      "M",
      "Company A can EDIT own emission; DB persists and dashboard recalculates total",
      compAUpdateRes.status === 200 &&
        updatedRecord?.id === emissionIdToEdit &&
        updatedCalc?.resultKg === 210 &&
        dbPersistedAfterUpdate?.resultKg === 210 &&
        dashCurrentAfterUpdate === expectedCurrentAfterUpdate &&
        updatedRecord?.emissions.includes("210"),
      `Status: ${compAUpdateRes.status}, DB kg: ${dbPersistedAfterUpdate?.resultKg}, Dash Total: ${dashCurrentAfterUpdate} (expected ${expectedCurrentAfterUpdate})`
    );

    // Test N: Admin CANNOT edit emissions (PUT returns 403)
    const adminUpdateRes = await request(baseUrl, `/api/emissions/${emissionIdToEdit}`, {
      method: "PUT",
      token: adminToken,
      body: {
        category: "Purchased Electricity",
        consumption: 999,
        unit: "kWh",
        facility: "Admin Facility",
        reportingPeriod: "Current Period",
      },
    });
    recordResult(
      "N",
      "Admin CANNOT edit emissions (PUT /api/emissions/:id returns 403 Forbidden)",
      adminUpdateRes.status === 403,
      `Status: ${adminUpdateRes.status}, Error: ${adminUpdateRes.data?.error}`
    );

    // Test O: Company B CANNOT edit Company A's emission (PUT returns 403)
    const compBUpdateCompARes = await request(baseUrl, `/api/emissions/${emissionIdToEdit}`, {
      method: "PUT",
      token: compBToken,
      body: {
        category: "Purchased Electricity",
        consumption: 999,
        unit: "kWh",
        facility: "Company B Intrusion",
        reportingPeriod: "Current Period",
      },
    });
    recordResult(
      "O",
      "Company B CANNOT edit Company A's emission (PUT /api/emissions/:id returns 403 Forbidden)",
      compBUpdateCompARes.status === 403,
      `Status: ${compBUpdateCompARes.status}, Error: ${compBUpdateCompARes.data?.error}`
    );

    // Test P: Admin CANNOT delete emissions (DELETE returns 403)
    const adminDeleteRes = await request(baseUrl, `/api/emissions/${emissionIdToEdit}`, {
      method: "DELETE",
      token: adminToken,
    });
    recordResult(
      "P",
      "Admin CANNOT delete emissions (DELETE /api/emissions/:id returns 403 Forbidden)",
      adminDeleteRes.status === 403,
      `Status: ${adminDeleteRes.status}, Error: ${adminDeleteRes.data?.error}`
    );

    // Test Q: Company B CANNOT delete Company A's emission (DELETE returns 403)
    const compBDeleteCompARes = await request(baseUrl, `/api/emissions/${emissionIdToEdit}`, {
      method: "DELETE",
      token: compBToken,
    });
    recordResult(
      "Q",
      "Company B CANNOT delete Company A's emission (DELETE /api/emissions/:id returns 403 Forbidden)",
      compBDeleteCompARes.status === 403,
      `Status: ${compBDeleteCompARes.status}, Error: ${compBDeleteCompARes.data?.error}`
    );

    // Test R: Company A can DELETE own emission
    const compADeleteRes = await request(baseUrl, `/api/emissions/${emissionIdToEdit}`, {
      method: "DELETE",
      token: compAToken,
    });
    const checkDeletedRes = await request(baseUrl, "/api/emissions", { token: compAToken });
    const stillExists = (checkDeletedRes.data?.data?.records || []).some((r) => r.id === emissionIdToEdit);
    const dbAfterDelete = await getEmissionById(emissionIdToEdit);
    compAAddedEmissionId = null; // Successfully deleted
    recordResult(
      "R",
      "Company A can DELETE own emission and record is removed from PostgreSQL",
      compADeleteRes.status === 200 && !stillExists && dbAfterDelete === null,
      `Status: ${compADeleteRes.status}, Deleted record present in DB: ${stillExists}`
    );

    // Test S: Consistency: Dashboard/Reports reflect deleted emission and return to baseline
    const compADashAfterDelete = await request(baseUrl, "/api/dashboard", { token: compAToken });
    const dashCountAfterDelete = Number(compADashAfterDelete.data?.data?.emissions?.recordCount || 0);
    const dashCurrentAfterDelete = Number(compADashAfterDelete.data?.data?.emissions?.current || 0);
    recordResult(
      "S",
      "Consistency: Dashboard reflects emissions deletion and restores baseline total",
      compADashAfterDelete.status === 200 &&
        dashCountAfterDelete === baseDashCount &&
        dashCurrentAfterDelete === baseDashCurrent,
      `Status: ${compADashAfterDelete.status}, Total: ${dashCurrentAfterDelete} (base ${baseDashCurrent}), Count: ${dashCountAfterDelete} (base ${baseDashCount})`
    );

    // Test T: Expired signed token is rejected with 401 Unauthorized
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredHead = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const expiredBody = Buffer.from(
      JSON.stringify({
        sub: "usr-company-a",
        email: "companya@ecotrack.test",
        role: "COMPANY_USER",
        companyId: "company-a",
        iat: nowSec - 7200,
        exp: nowSec - 3600,
      })
    ).toString("base64url");
    const expiredSig = crypto
      .createHmac("sha256", process.env.AUTH_JWT_SECRET)
      .update(`${expiredHead}.${expiredBody}`)
      .digest("base64url");
    const expiredToken = `${expiredHead}.${expiredBody}.${expiredSig}`;
    const expiredDashRes = await request(baseUrl, "/api/dashboard", { token: expiredToken });
    const expiredEmisRes = await request(baseUrl, "/api/emissions", { token: expiredToken });
    recordResult(
      "T",
      "Expired signed token is rejected with 401 Unauthorized",
      expiredDashRes.status === 401 && expiredEmisRes.status === 401,
      `Dashboard: ${expiredDashRes.status}, Emissions: ${expiredEmisRes.status}`
    );

    // Test U: Invalid token signature and missing/malformed tokens are rejected with 401
    const validPayloadBody = Buffer.from(
      JSON.stringify({
        sub: "usr-company-a",
        email: "companya@ecotrack.test",
        role: "COMPANY_USER",
        companyId: "company-a",
        iat: nowSec,
        exp: nowSec + 3600,
      })
    ).toString("base64url");
    const badSig = crypto
      .createHmac("sha256", "wrong-signing-secret-that-is-at-least-32-chars")
      .update(`${expiredHead}.${validPayloadBody}`)
      .digest("base64url");
    const invalidSigToken = `${expiredHead}.${validPayloadBody}.${badSig}`;
    const badSigRes = await request(baseUrl, "/api/emissions", { token: invalidSigToken });
    const malformedTokenRes = await request(baseUrl, "/api/emissions", { token: "malformed_token_without_dots" });
    const noTokenRes = await request(baseUrl, "/api/emissions");
    recordResult(
      "U",
      "Invalid token signature, malformed token, and missing token return 401",
      badSigRes.status === 401 && malformedTokenRes.status === 401 && noTokenRes.status === 401,
      `BadSig: ${badSigRes.status}, Malformed: ${malformedTokenRes.status}, NoToken: ${noTokenRes.status}`
    );

    // Test V: Missing and malformed request bodies & query parameter validation
    const missingLoginBody = await request(baseUrl, "/api/auth/login", { method: "POST", body: { email: "" } });
    const invalidCalcBody = await request(baseUrl, "/api/emissions/calculate", {
      method: "POST",
      token: compAToken,
      body: { category: "InvalidCat", consumption: -10, unit: "badUnit", facility: "", reportingPeriod: "" },
    });
    const invalidPostEmisBody = await request(baseUrl, "/api/emissions", {
      method: "POST",
      token: compAToken,
      body: { category: "Purchased Electricity", consumption: 0, unit: "L", facility: "", reportingPeriod: "" },
    });
    const unknownEmisPut = await request(baseUrl, "/api/emissions/rec-nonexistent-999", {
      method: "PUT",
      token: compAToken,
      body: {
        category: "Purchased Electricity",
        consumption: 100,
        unit: "kWh",
        facility: "Facility",
        reportingPeriod: "Current Period",
      },
    });
    const unknownEmisDelete = await request(baseUrl, "/api/emissions/rec-nonexistent-999", {
      method: "DELETE",
      token: compAToken,
    });
    const badReportQuery = await request(baseUrl, "/api/reports?month=2026-10&year=2026", { token: compAToken });
    const missingAdminCompanyDash = await request(baseUrl, "/api/dashboard", { token: adminToken });
    const unknownAdminCompanyDash = await request(baseUrl, "/api/dashboard?companyId=company-unknown-999", { token: adminToken });
    const malformedJsonRes = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      rawBody: "{ malformed json",
    });
    recordResult(
      "V",
      "Missing/malformed request bodies and invalid parameters return 400/404",
      missingLoginBody.status === 400 &&
        invalidCalcBody.status === 400 &&
        invalidPostEmisBody.status === 400 &&
        unknownEmisPut.status === 404 &&
        unknownEmisDelete.status === 404 &&
        badReportQuery.status === 400 &&
        missingAdminCompanyDash.status === 400 &&
        unknownAdminCompanyDash.status === 404 &&
        (malformedJsonRes.status === 400 || malformedJsonRes.status === 500),
      `Login:${missingLoginBody.status}, Calc:${invalidCalcBody.status}, PostEmis:${invalidPostEmisBody.status}, Put404:${unknownEmisPut.status}, Del404:${unknownEmisDelete.status}, RepQuery:${badReportQuery.status}, AdminDash400:${missingAdminCompanyDash.status}, AdminDash404:${unknownAdminCompanyDash.status}`
    );

    // Test W: Unsupported HTTP methods and unknown routes return 404
    const patchDashRes = await request(baseUrl, "/api/dashboard", { method: "PATCH", token: compAToken });
    const patchEmisRes = await request(baseUrl, "/api/emissions", { method: "PATCH", token: compAToken });
    const deleteCompaniesRes = await request(baseUrl, "/api/companies", { method: "DELETE", token: adminToken });
    recordResult(
      "W",
      "Unsupported HTTP methods (PATCH/DELETE on unsupported routes) return 404",
      patchDashRes.status === 404 && patchEmisRes.status === 404 && deleteCompaniesRes.status === 404,
      `PATCH /api/dashboard: ${patchDashRes.status}, PATCH /api/emissions: ${patchEmisRes.status}, DELETE /api/companies: ${deleteCompaniesRes.status}`
    );

    console.log("\n=== Test Summary ===");
    const passedAll = results.every((r) => r.passed);
    console.log(`Total tests: ${results.length}, Passed: ${results.filter((r) => r.passed).length}, Failed: ${results.filter((r) => !r.passed).length}`);

    if (!passedAll) {
      throw new Error("One or more tests failed");
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    throw error;
  } finally {
    // ==========================================
    // TEARDOWN & ANTI-POLLUTION ASSERTIONS
    // ==========================================
    try {
      const db = await getDb();
      if (compAAddedEmissionId) {
        await db.query("DELETE FROM emissions WHERE id = $1", [compAAddedEmissionId]);
      }
      if (registeredUserId) {
        await db.query("DELETE FROM users WHERE id = $1", [registeredUserId]);
      }
      if (registeredCompanyId) {
        await db.query("DELETE FROM users WHERE company_id = $1", [registeredCompanyId]);
        await db.query("DELETE FROM companies WHERE id = $1", [registeredCompanyId]);
      }

      // Assert company count returned exactly to starting baseline
      if (adminToken && startingCompanyCount > 0) {
        const finalCompRes = await request(baseUrl, "/api/companies", { token: adminToken });
        const finalCompanyCount = finalCompRes.data?.data?.length || 0;
        assert.strictEqual(
          finalCompanyCount,
          startingCompanyCount,
          `Pollution failure: company count was ${startingCompanyCount}, but remained ${finalCompanyCount} after cleanup`
        );
      }
      console.log("[CLEANUP] Role permissions test state cleanly restored (zero pollution verified).");
    } catch (cleanupErr) {
      console.error("[CLEANUP FAILURE] Anti-pollution assertion failed in test_role_permissions:", cleanupErr.message);
      process.exit(1);
    }

    server.close();
  }
}

runTests().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});

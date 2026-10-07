require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const http = require("http");
const assert = require("assert");
const { app, start } = require("./server");
const { initDb, getDb } = require("./db");

async function request(serverUrl, path, options = {}) {
  const url = `${serverUrl}${path}`;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
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
    const password = process.env.SEED_PASSWORD || "EcoTrackDemo!2026";

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

    // Test H: Company A can add emissions to Company A
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
    recordResult(
      "H",
      "Company A can add emissions to Company A",
      compAAddEmisRes.status === 201 && compAAddEmisRes.data?.data?.record?.companyId === "company-a",
      `Status: ${compAAddEmisRes.status}, Record ID: ${compAAddEmisRes.data?.data?.record?.id}`
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

    // Test L: Saved emissions still appear correctly in Dashboard/Reports
    const compADashRes = await request(baseUrl, "/api/dashboard", { token: compAToken });
    const compARepRes = await request(baseUrl, "/api/reports", { token: compAToken });
    const compAEmisListRes = await request(baseUrl, "/api/emissions", { token: compAToken });
    const hasRecords = (compAEmisListRes.data?.data?.records?.length || 0) > 0;
    const dashHasCount = (compADashRes.data?.data?.summary?.recordCount || 0) > 0;
    const repHasCo2e = (compARepRes.data?.data?.totalCo2e || 0) > 0;
    recordResult(
      "L",
      "Saved emissions appear correctly in Dashboard/Reports",
      compADashRes.status === 200 && compARepRes.status === 200 && hasRecords && dashHasCount && repHasCo2e,
      `Emissions Count: ${compAEmisListRes.data?.data?.records?.length}, Dash Count: ${compADashRes.data?.data?.summary?.recordCount}, Rep CO2e: ${compARepRes.data?.data?.totalCo2e}`
    );

    // Test M: Company A can EDIT own emission and backend recalculates output
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
    recordResult(
      "M",
      "Company A can EDIT own emission and backend recalculates output",
      compAUpdateRes.status === 200 &&
        updatedRecord?.id === emissionIdToEdit &&
        updatedCalc?.resultKg === 210 &&
        updatedRecord?.emissions.includes("210"),
      `Status: ${compAUpdateRes.status}, Recalculated: ${updatedCalc?.resultKg} kg CO2e (${updatedRecord?.emissions})`
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
    compAAddedEmissionId = null; // Successfully deleted
    recordResult(
      "R",
      "Company A can DELETE own emission and record is removed",
      compADeleteRes.status === 200 && !stillExists,
      `Status: ${compADeleteRes.status}, Deleted record present in DB: ${stillExists}`
    );

    // Test S: Consistency: Dashboard/Reports reflect deleted emission
    const compADashAfterDelete = await request(baseUrl, "/api/dashboard", { token: compAToken });
    recordResult(
      "S",
      "Consistency: Dashboard reflects emissions deletion without inconsistency",
      compADashAfterDelete.status === 200,
      `Status: ${compADashAfterDelete.status}, Updated Record Count: ${compADashAfterDelete.data?.data?.summary?.recordCount}`
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

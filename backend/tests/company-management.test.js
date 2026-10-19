require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const http = require("http");
const assert = require("assert");
const { app } = require("../server");
const { initDb, getDb, findCompanyById, seedUsers } = require("../config/db");
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
  console.log("=== Starting EcoTrack Admin Company Account Management Tests ===");
  await initDb();
  const db = await getDb();

  const initialPassword = process.env.SEED_PASSWORD || "EcoTrackDemo!2026";
  const initialPasswordHash = hashPassword(initialPassword);
  const newPassword = "NewSecurePassword!2026";
  const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const updatedCompanyName = `Davao Green Logistics ${uniqueSuffix}`;
  const updatedCompanyEmail = `sustainability.${uniqueSuffix}@davaogreen.com`;

  // Ensure required seed companies and users exist in known active state before tests run
  await seedUsers([
    { id: "usr-admin-david", email: "admin@ecotrack.test", passwordHash: initialPasswordHash, role: "ADMIN", companyId: null },
    { id: "usr-company-a", email: "companya@ecotrack.test", passwordHash: initialPasswordHash, role: "COMPANY_USER", companyId: "company-a" },
    { id: "usr-company-b", email: "companyb@ecotrack.test", passwordHash: initialPasswordHash, role: "COMPANY_USER", companyId: "company-b" },
  ]);
  await db.query("UPDATE companies SET name = 'Company A', status = 'Active' WHERE id = 'company-a'");
  await db.query("UPDATE companies SET name = 'Company B', status = 'Active' WHERE id = 'company-b'");
  await db.query("UPDATE users SET email = 'companya@ecotrack.test', password_hash = $1 WHERE id = 'usr-company-a'", [initialPasswordHash]);
  await db.query("UPDATE users SET email = 'companyb@ecotrack.test', password_hash = $1 WHERE id = 'usr-company-b'", [initialPasswordHash]);

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

  let createdFixtureEmissionId = null;

  try {
    // 1. Admin login
    const adminLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "admin@ecotrack.test", password: initialPassword },
    });
    const adminToken = adminLogin.data?.data?.token;
    recordResult("1", "Admin login successful", adminLogin.status === 200 && !!adminToken);

    // 2. Company A login with initial credentials
    const compALogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companya@ecotrack.test", password: initialPassword },
    });
    const compAToken = compALogin.data?.data?.token;
    recordResult("2", "Company A initial login works", compALogin.status === 200 && !!compAToken);

    // Create an explicit test-owned emission fixture so the test never assumes a pre-existing row count
    const fixtureEmisRes = await request(baseUrl, "/api/emissions", {
      method: "POST",
      token: compAToken,
      body: {
        category: "Purchased Electricity",
        consumption: 250,
        unit: "kWh",
        facility: `Fixture Facility ${uniqueSuffix}`,
        reportingPeriod: "Q2 2026",
      },
    });
    createdFixtureEmissionId = fixtureEmisRes.data?.data?.record?.id || null;

    // 3. Check Company A initial emissions count (including explicit test-owned fixture)
    const compAEmissionsBefore = await request(baseUrl, "/api/emissions", { token: compAToken });
    const recordsBefore = compAEmissionsBefore.data?.data?.records || [];
    const emissionsCountBefore = recordsBefore.length;
    const hasFixtureBefore = Boolean(createdFixtureEmissionId && recordsBefore.some((r) => r.id === createdFixtureEmissionId));
    recordResult(
      "3",
      "Company A initial emissions readable with explicit fixture",
      compAEmissionsBefore.status === 200 && emissionsCountBefore >= 1 && hasFixtureBefore,
      `Count: ${emissionsCountBefore}, Fixture: ${createdFixtureEmissionId}`
    );

    // 4. Edit Company A Name & Email using unique test values
    const updateRes = await request(baseUrl, "/api/companies/company-a", {
      method: "PUT",
      token: adminToken,
      body: {
        name: updatedCompanyName,
        email: updatedCompanyEmail,
      },
    });
    recordResult(
      "4",
      "Admin updates Company A name and email",
      updateRes.status === 200 && updateRes.data?.data?.name === updatedCompanyName && updateRes.data?.data?.userEmail === updatedCompanyEmail,
      `Status: ${updateRes.status}, Name: ${updateRes.data?.data?.name}`
    );

    // 5. Verify tenant ID company-a is preserved in DB
    const compCheck = await findCompanyById("company-a");
    recordResult(
      "5",
      "Tenant ID company-a preserved in database",
      Boolean(compCheck && compCheck.id === "company-a" && compCheck.name === updatedCompanyName)
    );

    // 6. Verify old email fails login
    const oldEmailLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companya@ecotrack.test", password: initialPassword },
    });
    recordResult("6", "Old login email fails login", oldEmailLogin.status === 401, `Status: ${oldEmailLogin.status}`);

    // 7. Verify new email logs in with existing password
    const newEmailLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: updatedCompanyEmail, password: initialPassword },
    });
    const compANewToken = newEmailLogin.data?.data?.token;
    recordResult(
      "7",
      "New login email logs in with existing password",
      newEmailLogin.status === 200 && !!compANewToken && newEmailLogin.data?.data?.user?.companyId === "company-a",
      `Company ID in token payload: ${newEmailLogin.data?.data?.user?.companyId}`
    );

    // 8. Verify existing emissions, dashboard, and reports remain linked to company-a
    const compAEmissionsAfter = await request(baseUrl, "/api/emissions", { token: compANewToken });
    const recordsAfter = compAEmissionsAfter.data?.data?.records || [];
    const emissionsCountAfter = recordsAfter.length;
    const hasFixtureAfter = Boolean(createdFixtureEmissionId && recordsAfter.some((r) => r.id === createdFixtureEmissionId));
    recordResult(
      "8",
      "Existing emissions still linked to tenant company-a",
      compAEmissionsAfter.status === 200 && emissionsCountAfter === emissionsCountBefore && hasFixtureAfter,
      `Before: ${emissionsCountBefore}, After: ${emissionsCountAfter}`
    );

    // 9. Duplicate email conflict rejection (409 Conflict)
    const duplicateEmailRes = await request(baseUrl, "/api/companies/company-b", {
      method: "PUT",
      token: adminToken,
      body: {
        name: "Company B",
        email: updatedCompanyEmail, // already used by company-a
      },
    });
    recordResult(
      "9",
      "Duplicate email rejected with 409 Conflict",
      duplicateEmailRes.status === 409,
      `Status: ${duplicateEmailRes.status}`
    );

    // 10. Non-admin forbidden to update company (403 Forbidden)
    const userUpdateAttempt = await request(baseUrl, "/api/companies/company-a", {
      method: "PUT",
      token: compANewToken,
      body: { name: "Hacked Name", email: "hacked@test.com" },
    });
    recordResult(
      "10",
      "Company user cannot update company (403 Forbidden)",
      userUpdateAttempt.status === 403,
      `Status: ${userUpdateAttempt.status}`
    );

    // 11. Admin resets password for Company A
    const resetRes = await request(baseUrl, "/api/companies/company-a/reset-password", {
      method: "POST",
      token: adminToken,
      body: {
        newPassword: newPassword,
        confirmPassword: newPassword,
      },
    });
    recordResult("11", "Admin resets Company A password", resetRes.status === 200, `Status: ${resetRes.status}`);

    // 12. Password reset mismatch rejection (400)
    const mismatchReset = await request(baseUrl, "/api/companies/company-a/reset-password", {
      method: "POST",
      token: adminToken,
      body: {
        newPassword: "Password123!",
        confirmPassword: "DifferentPassword123!",
      },
    });
    recordResult("12", "Password mismatch rejected with 400", mismatchReset.status === 400);

    // 13. Old password fails login
    const oldPasswordLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: updatedCompanyEmail, password: initialPassword },
    });
    recordResult("13", "Old password fails login after reset", oldPasswordLogin.status === 401);

    // 14. New password succeeds login
    const newPasswordLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: updatedCompanyEmail, password: newPassword },
    });
    const compAResetToken = newPasswordLogin.data?.data?.token;
    recordResult("14", "New password succeeds login", newPasswordLogin.status === 200 && !!compAResetToken);

    // 15. Company user cannot reset password (403 Forbidden)
    const userResetAttempt = await request(baseUrl, "/api/companies/company-a/reset-password", {
      method: "POST",
      token: compAResetToken,
      body: { newPassword: "AnotherPassword123!", confirmPassword: "AnotherPassword123!" },
    });
    recordResult("15", "Company user cannot reset password (403 Forbidden)", userResetAttempt.status === 403);

    // 16. Admin deactivates Company A
    const deactivateRes = await request(baseUrl, "/api/companies/company-a/status", {
      method: "POST",
      token: adminToken,
      body: { status: "Inactive" },
    });
    recordResult(
      "16",
      "Admin deactivates Company A",
      deactivateRes.status === 200 && deactivateRes.data?.data?.status === "Inactive"
    );

    // 17. Inactive company user login rejected with 403 Forbidden
    const inactiveLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: updatedCompanyEmail, password: newPassword },
    });
    recordResult(
      "17",
      "Inactive company user login returns 403 Forbidden",
      inactiveLogin.status === 403 && Boolean(inactiveLogin.data?.error?.includes("deactivated")),
      `Status: ${inactiveLogin.status}, Error: ${inactiveLogin.data?.error}`
    );

    // 18. Historical data still intact while deactivated
    const adminViewEmissions = await request(baseUrl, "/api/emissions?companyId=company-a", {
      token: adminToken,
    });
    const deactivatedRecords = adminViewEmissions.data?.data?.records || [];
    const hasFixtureWhileInactive = Boolean(createdFixtureEmissionId && deactivatedRecords.some((r) => r.id === createdFixtureEmissionId));
    recordResult(
      "18",
      "Historical data intact while company is deactivated",
      adminViewEmissions.status === 200 && deactivatedRecords.length === emissionsCountBefore && hasFixtureWhileInactive
    );

    // 19. Admin reactivates Company A
    const reactivateRes = await request(baseUrl, "/api/companies/company-a/status", {
      method: "POST",
      token: adminToken,
      body: { status: "Active" },
    });
    recordResult(
      "19",
      "Admin reactivates Company A",
      reactivateRes.status === 200 && reactivateRes.data?.data?.status === "Active"
    );

    // 20. Reactivated company user can log in again
    const reactivatedLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: updatedCompanyEmail, password: newPassword },
    });
    recordResult("20", "Reactivated company user logs in successfully", reactivatedLogin.status === 200);

    // 21. Company B isolation verified (Company B unaffected)
    const compBLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companyb@ecotrack.test", password: initialPassword },
    });
    const compBToken = compBLogin.data?.data?.token;
    recordResult("21", "Company B account unaffected and functional", compBLogin.status === 200 && !!compBToken);

    // 22. Restore Company A seed credentials via API and verify login
    await request(baseUrl, "/api/companies/company-a", {
      method: "PUT",
      token: adminToken,
      body: { name: "Company A", email: "companya@ecotrack.test" },
    });
    await request(baseUrl, "/api/companies/company-a/reset-password", {
      method: "POST",
      token: adminToken,
      body: { newPassword: initialPassword, confirmPassword: initialPassword },
    });
    await request(baseUrl, "/api/companies/company-a/status", {
      method: "POST",
      token: adminToken,
      body: { status: "Active" },
    });

    const restoredLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companya@ecotrack.test", password: initialPassword },
    });
    recordResult(
      "22",
      "Company A demo seed credentials restored successfully",
      restoredLogin.status === 200 && restoredLogin.data?.data?.user?.email === "companya@ecotrack.test"
    );

    // 23. Validation & authorization checks on company management endpoints
    const badCreateRes = await request(baseUrl, "/api/companies", {
      method: "POST",
      token: adminToken,
      body: { name: "A", email: "not-an-email", password: "123" },
    });
    const dupNameCreateRes = await request(baseUrl, "/api/companies", {
      method: "POST",
      token: adminToken,
      body: { name: "Company A", email: `unique.${uniqueSuffix}@ecotrack.test`, password: "ValidPassword!2026" },
    });
    const badUpdateRes = await request(baseUrl, "/api/companies/company-a", {
      method: "PUT",
      token: adminToken,
      body: { name: "X", email: "invalid-email" },
    });
    const unknownCompanyPut = await request(baseUrl, "/api/companies/company-unknown-999", {
      method: "PUT",
      token: adminToken,
      body: { name: "Valid Name" },
    });
    const badStatusRes = await request(baseUrl, "/api/companies/company-a/status", {
      method: "POST",
      token: adminToken,
      body: { status: "Suspended" },
    });
    const userStatusAttempt = await request(baseUrl, "/api/companies/company-a/status", {
      method: "POST",
      token: compBToken,
      body: { status: "Inactive" },
    });
    recordResult(
      "23",
      "Company-management validation (400/404/409) and status RBAC (403) enforced",
      badCreateRes.status === 400 &&
        dupNameCreateRes.status === 409 &&
        badUpdateRes.status === 400 &&
        unknownCompanyPut.status === 404 &&
        badStatusRes.status === 400 &&
        userStatusAttempt.status === 403,
      `BadCreate:${badCreateRes.status}, DupName:${dupNameCreateRes.status}, BadUpdate:${badUpdateRes.status}, Unknown:${unknownCompanyPut.status}, BadStatus:${badStatusRes.status}, UserStatus:${userStatusAttempt.status}`
    );
  } finally {
    // Always restore Company A state and delete ONLY test-owned fixture records
    try {
      if (createdFixtureEmissionId) {
        await db.query("DELETE FROM emissions WHERE id = $1", [createdFixtureEmissionId]);
      }
      await db.query("UPDATE companies SET name = 'Company A', status = 'Active' WHERE id = 'company-a'");
      await db.query("UPDATE companies SET name = 'Company B', status = 'Active' WHERE id = 'company-b'");
      await db.query("UPDATE users SET email = 'companya@ecotrack.test', password_hash = $1 WHERE id = 'usr-company-a'", [initialPasswordHash]);
      await db.query("UPDATE users SET email = 'companyb@ecotrack.test', password_hash = $1 WHERE id = 'usr-company-b'", [initialPasswordHash]);

      const checkFixture = createdFixtureEmissionId
        ? await db.query("SELECT id FROM emissions WHERE id = $1", [createdFixtureEmissionId])
        : { rows: [] };
      assert.strictEqual(checkFixture.rows.length, 0, "Test-owned emission fixture was not cleaned up");
      console.log("[CLEANUP] Company management test state and test-owned fixture cleanly restored.");
    } catch (cleanupErr) {
      console.error("[CLEANUP FAILURE] Company management cleanup failed:", cleanupErr.message);
      results.push({ id: "CLEANUP", description: "Teardown & restoration", passed: false, detail: cleanupErr.message });
    }
    server.close();
  }

  const allPassed = results.every((r) => r.passed);
  console.log(`\n=== Verification Summary: ${results.filter((r) => r.passed).length}/${results.length} PASSED ===`);
  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

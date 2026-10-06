require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const http = require("http");
const { app } = require("./server");
const { initDb, getDb, findCompanyById } = require("./db");

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

  const initialPassword = process.env.SEED_PASSWORD || "EcoTrackDemo!2026";
  const newPassword = "NewSecurePassword!2026";

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

    // 3. Check Company A initial emissions and transactions count
    const compAEmissionsBefore = await request(baseUrl, "/api/emissions", { token: compAToken });
    const emissionsCountBefore = compAEmissionsBefore.data?.data?.records?.length || 0;
    recordResult("3", "Company A initial emissions readable", compAEmissionsBefore.status === 200, `Count: ${emissionsCountBefore}`);

    // 4. Edit Company A Name & Email (Davao Green Logistics / sustainability@davaogreen.com)
    const updateRes = await request(baseUrl, "/api/companies/company-a", {
      method: "PUT",
      token: adminToken,
      body: {
        name: "Davao Green Logistics",
        email: "sustainability@davaogreen.com",
      },
    });
    recordResult(
      "4",
      "Admin updates Company A name and email",
      updateRes.status === 200 && updateRes.data?.data?.name === "Davao Green Logistics",
      `Status: ${updateRes.status}, Name: ${updateRes.data?.data?.name}`
    );

    // 5. Verify tenant ID company-a is preserved in DB
    const compCheck = await findCompanyById("company-a");
    recordResult(
      "5",
      "Tenant ID company-a preserved in database",
      compCheck && compCheck.id === "company-a" && compCheck.name === "Davao Green Logistics"
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
      body: { email: "sustainability@davaogreen.com", password: initialPassword },
    });
    const compANewToken = newEmailLogin.data?.data?.token;
    recordResult(
      "7",
      "New login email logs in with existing password",
      newEmailLogin.status === 200 && !!compANewToken,
      `Company ID in token payload: ${newEmailLogin.data?.data?.user?.companyId}`
    );

    // 8. Verify existing emissions, dashboard, and reports remain linked to company-a
    const compAEmissionsAfter = await request(baseUrl, "/api/emissions", { token: compANewToken });
    const emissionsCountAfter = compAEmissionsAfter.data?.data?.records?.length || 0;
    recordResult(
      "8",
      "Existing emissions still linked to tenant company-a",
      compAEmissionsAfter.status === 200 && emissionsCountAfter === emissionsCountBefore,
      `Before: ${emissionsCountBefore}, After: ${emissionsCountAfter}`
    );

    // 9. Duplicate email conflict rejection (409 Conflict)
    const duplicateEmailRes = await request(baseUrl, "/api/companies/company-b", {
      method: "PUT",
      token: adminToken,
      body: {
        name: "Company B",
        email: "sustainability@davaogreen.com", // already used by company-a
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
      body: { email: "sustainability@davaogreen.com", password: initialPassword },
    });
    recordResult("13", "Old password fails login after reset", oldPasswordLogin.status === 401);

    // 14. New password succeeds login
    const newPasswordLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "sustainability@davaogreen.com", password: newPassword },
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
      body: { email: "sustainability@davaogreen.com", password: newPassword },
    });
    recordResult(
      "17",
      "Inactive company user login returns 403 Forbidden",
      inactiveLogin.status === 403 && inactiveLogin.data?.error?.includes("deactivated"),
      `Status: ${inactiveLogin.status}, Error: ${inactiveLogin.data?.error}`
    );

    // 18. Historical data still intact while deactivated
    const adminViewEmissions = await request(baseUrl, "/api/emissions?companyId=company-a", {
      token: adminToken,
    });
    recordResult(
      "18",
      "Historical data intact while company is deactivated",
      adminViewEmissions.status === 200 && (adminViewEmissions.data?.data?.records?.length || 0) === emissionsCountBefore
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
      body: { email: "sustainability@davaogreen.com", password: newPassword },
    });
    recordResult("20", "Reactivated company user logs in successfully", reactivatedLogin.status === 200);

    // 21. Company B isolation verified (Company B unaffected)
    const compBLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companyb@ecotrack.test", password: initialPassword },
    });
    recordResult("21", "Company B account unaffected and functional", compBLogin.status === 200);

    // CLEANUP / RESTORE DEMO CREDENTIALS:
    // Restore name = "Company A", email = "companya@ecotrack.test", password = initialPassword, status = "Active"
    console.log("\n--- Restoring Company A seed credentials ---");
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

    // Verify restored credentials work
    const restoredLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companya@ecotrack.test", password: initialPassword },
    });
    recordResult(
      "22",
      "Company A demo seed credentials restored successfully",
      restoredLogin.status === 200 && restoredLogin.data?.data?.user?.email === "companya@ecotrack.test"
    );
  } finally {
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

require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const http = require("http");
const { app } = require("./server");
const { initDb, getDb, getDashboardData } = require("./db");

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

async function runDashboardTests() {
  console.log("=== Starting EcoTrack Company Dashboard Verification Tests ===");
  await initDb();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const results = [];
  const recordResult = (id, description, passed, detail = "") => {
    results.push({ id, description, passed, detail });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${id}: ${description} ${detail ? `(${detail})` : ""}`);
  };

  const initialPassword = process.env.SEED_PASSWORD || "EcoTrackDemo!2026";
  const db = await getDb();

  try {
    // Authenticate Company A
    const compALogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companya@ecotrack.test", password: initialPassword },
    });
    const tokenA = compALogin.data?.data?.token;
    recordResult("1. Auth", "Company A login successful", compALogin.status === 200 && !!tokenA);

    // Authenticate Company B
    const compBLogin = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: "companyb@ecotrack.test", password: initialPassword },
    });
    const tokenB = compBLogin.data?.data?.token;
    recordResult("2. Auth", "Company B login successful", compBLogin.status === 200 && !!tokenB);

    // 1. Current period total & record count for Company A
    const dashA = await request(baseUrl, "/api/dashboard", { token: tokenA });
    const dataA = dashA.data?.data;
    recordResult(
      "1. Current Period Total",
      "Current period emissions match calculated records",
      dashA.status === 200 && dataA?.emissions?.current === 0.651 && dataA?.emissions?.recordCount === 8,
      `Current: ${dataA?.emissions?.current} tCO2e, Records: ${dataA?.emissions?.recordCount}`
    );

    // 2. Previous period comparison
    recordResult(
      "2. Previous Period Comparison",
      "Previous period emissions and percentage change calculated safely",
      dataA?.emissions?.previous === 6.63 && dataA?.emissions?.percentageChange === -90.2,
      `Prev: ${dataA?.emissions?.previous} tCO2e, Change: ${dataA?.emissions?.percentageChange}%`
    );

    // 3. Zero previous-period handling
    const noPrevData = await getDashboardData("company-a", "Full Year 2025");
    recordResult(
      "3. Zero Previous Period Handling",
      "Handles missing or zero previous period without invalid percentage",
      noPrevData.emissions.previous === null && noPrevData.emissions.percentageChange === null,
      `Previous: ${noPrevData.emissions.previous}, Change: ${noPrevData.emissions.percentageChange}`
    );

    // 4. Scope aggregation
    const scopes = dataA?.scopes;
    recordResult(
      "4. Scope Aggregation",
      "Aggregates Scope 1, 2, 3 totals and percentages accurately",
      scopes?.scope1?.emissions === 0 &&
        scopes?.scope2?.emissions === 0.651 &&
        scopes?.scope2?.percentage === 100 &&
        scopes?.scope3?.emissions === 0,
      `Scope 1: ${scopes?.scope1?.emissions}, Scope 2: ${scopes?.scope2?.emissions} (100%), Scope 3: ${scopes?.scope3?.emissions}`
    );

    // 5. Data completeness: all complete
    const completeness = dataA?.dataCompleteness;
    recordResult(
      "5a. Data Completeness (All Complete)",
      "Correctly identifies all 8 records as complete (100%)",
      completeness?.totalRecords === 8 &&
        completeness?.completeRecords === 8 &&
        completeness?.incompleteRecords === 0 &&
        completeness?.completenessPercentage === 100 &&
        completeness?.isComplete === true,
      `${completeness?.completeRecords}/${completeness?.totalRecords} (${completeness?.completenessPercentage}%)`
    );

    // 5b. Data completeness: one incomplete
    const tempIncompleteId = `temp-incomplete-${Date.now()}`;
    await db.query(
      `INSERT INTO emissions (id, company_id, date, activity, scope, category, quantity, emissions, status, facility, reporting_period)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [tempIncompleteId, "company-a", "2026-10-15T00:00:00.000Z", "Incomplete Activity", "Scope 1", "", "100", "0", "Draft", "", "Current Period"]
    );
    const incompleteDash = await request(baseUrl, "/api/dashboard", { token: tokenA });
    const incompData = incompleteDash.data?.data?.dataCompleteness;
    recordResult(
      "5b. Data Completeness (One Incomplete)",
      "Correctly identifies incomplete record and computes percentage",
      incompData?.totalRecords === 9 && incompData?.completeRecords === 8 && incompData?.incompleteRecords === 1,
      `Complete: ${incompData?.completeRecords}/${incompData?.totalRecords}, Incomplete: ${incompData?.incompleteRecords}`
    );
    await db.query("DELETE FROM emissions WHERE id = $1", [tempIncompleteId]);

    // 5c. Data completeness: zero records
    const emptyCompData = await getDashboardData("company-a", "Q1 2026");
    const emptyComp = emptyCompData.dataCompleteness;
    recordResult(
      "5c. Data Completeness (Zero Records)",
      "Handles zero records without division by zero or false 100%",
      emptyComp?.totalRecords === 0 &&
        emptyComp?.completeRecords === 0 &&
        emptyComp?.completenessPercentage === 0 &&
        emptyComp?.message === "No activity data recorded for this period",
      `Total: ${emptyComp?.totalRecords}, Msg: ${emptyComp?.message}`
    );

    // 6. Top source aggregation
    const topSources = dataA?.topSources;
    recordResult(
      "6. Top Source Aggregation",
      "Ranks categories by emission total and percentage",
      Array.isArray(topSources) &&
        topSources.length >= 1 &&
        topSources[0]?.category === "Purchased Electricity" &&
        topSources[0]?.emissions === 0.651 &&
        topSources[0]?.percentage === 100,
      `Rank 1: ${topSources[0]?.category} (${topSources[0]?.emissions} tCO2e, ${topSources[0]?.percentage}%)`
    );

    // 7. Monthly trend aggregation
    const trend6M = dataA?.trend;
    const trendMeta = dataA?.trendMeta;
    recordResult(
      "7. Monthly Trend Aggregation",
      "Groups emissions by month across historical window and sets hasEnoughData",
      Array.isArray(trend6M) && trend6M.length === 6 && trendMeta?.hasEnoughData === true,
      `Months: ${trend6M.length}, Sep: ${trend6M.find((t) => t.period === "2026-09")?.emissions}, Oct: ${trend6M.find((t) => t.period === "2026-10")?.emissions}`
    );

    // 8, 9, 10. Offset purchased, retired, and net emissions
    const offsets = dataA?.offsets;
    recordResult(
      "8, 9, 10. Offsets & Net Emissions",
      "Calculates gross emissions, purchased, retired, and net emissions accurately",
      offsets?.grossEmissions === 0.651 &&
        offsets?.creditsPurchased === 0 &&
        offsets?.creditsRetired === 0 &&
        offsets?.netEmissions === 0.651,
      `Gross: ${offsets?.grossEmissions}, Purchased: ${offsets?.creditsPurchased}, Retired: ${offsets?.creditsRetired}, Net: ${offsets?.netEmissions}`
    );

    // 11. Tenant isolation
    const dashB = await request(baseUrl, "/api/dashboard", { token: tokenB });
    const dataB = dashB.data?.data;
    recordResult(
      "11. Tenant Isolation",
      "Company B receives only its own data; does not see Company A emissions",
      dashB.status === 200 && dataB?.company?.id === "company-b" && dataB?.emissions?.current !== dataA?.emissions?.current,
      `Company B current emissions: ${dataB?.emissions?.current} tCO2e (Company A is ${dataA?.emissions?.current})`
    );

    // 12. Unauthorized dashboard access
    const crossAccess = await request(baseUrl, "/api/dashboard?companyId=company-a", { token: tokenB });
    recordResult(
      "12. Unauthorized Dashboard Access",
      "Company B cannot request Company A dashboard data (403 Forbidden)",
      crossAccess.status === 403,
      `Status: ${crossAccess.status}`
    );

    const unauthAccess = await request(baseUrl, "/api/dashboard");
    recordResult(
      "12b. Unauthenticated Access",
      "Unauthenticated request is rejected (401 Unauthorized)",
      unauthAccess.status === 401,
      `Status: ${unauthAccess.status}`
    );

    // 13. Empty dashboard state
    const emptyStatePeriod = await request(baseUrl, "/api/dashboard?period=Q1%202026", { token: tokenA });
    const emptyStateData = emptyStatePeriod.data?.data;
    recordResult(
      "13. Empty Dashboard State",
      "Handles periods with zero emissions gracefully without mock fallback",
      emptyStatePeriod.status === 200 &&
        emptyStateData?.emissions?.current === 0 &&
        emptyStateData?.emissions?.recordCount === 0 &&
        emptyStateData?.dataCompleteness?.totalRecords === 0,
      `Current: ${emptyStateData?.emissions?.current}, Records: ${emptyStateData?.emissions?.recordCount}`
    );

    // 14. Calculation summary
    const calcSummary = dataA?.calculationSummary;
    recordResult(
      "14. Calculation Summary",
      "Provides authoritative audit formula and calculation details from backend engine",
      calcSummary?.recordCount === 8 &&
        calcSummary?.totalEmissions === 0.651 &&
        calcSummary?.primaryCalculation?.input === "1,550" &&
        calcSummary?.primaryCalculation?.factor === 0.42 &&
        calcSummary?.primaryCalculation?.resultTonnes === 0.651,
      `Formula: ${calcSummary?.primaryCalculation?.formula}`
    );
  } catch (err) {
    console.error("Test failure:", err);
  } finally {
    server.close();
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n=== Dashboard Tests Complete: ${passedCount}/${results.length} Passed ===\n`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runDashboardTests().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

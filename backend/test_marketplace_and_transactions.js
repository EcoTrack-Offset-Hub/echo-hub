// Automated verification tests for Marketplace and Transactions persistence & RBAC
const assert = require("assert");
const http = require("http");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const { app } = require("./server");
const { getDb } = require("./db");

let server;
let baseUrl;

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log("=== Starting EcoTrack Marketplace & Transactions Verification Tests ===");
  const testPort = 59000 + Math.floor(Math.random() * 900);
  server = app.listen(testPort);
  baseUrl = `http://localhost:${testPort}`;
  console.log(`Test server running on ${baseUrl}`);

  let passed = 0;
  let failed = 0;
  let compAToken;
  let compBToken;
  let adminToken;
  let startingTxCount;
  let startingInventory;
  const createdTransactionIds = [];

  try {
    // Authenticate Admin and Company Users
    const adminRes = await request("POST", "/api/auth/login", {}, { email: "admin@ecotrack.test", password: "EcoTrackDemo!2026" });
    adminToken = adminRes.body.data.token;

    const compARes = await request("POST", "/api/auth/login", {}, { email: "companya@ecotrack.test", password: "EcoTrackDemo!2026" });
    compAToken = compARes.body.data.token;

    const compBRes = await request("POST", "/api/auth/login", {}, { email: "companyb@ecotrack.test", password: "EcoTrackDemo!2026" });
    compBToken = compBRes.body.data.token;

    // Record baseline transaction count & inventory before purchase test
    const txInitRes = await request("GET", "/api/transactions", { Authorization: `Bearer ${compAToken}` });
    startingTxCount = txInitRes.body.data.transactions.length;

    const projInitRes = await request("GET", "/api/marketplace/projects/proj-001");
    startingInventory = projInitRes.body.data.availableTCO2e;

    // Test 1: GET /api/marketplace/projects returns 6 demo projects
    {
      const res = await request("GET", "/api/marketplace/projects");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.projects.length, 6);
      assert.strictEqual(res.body.data.stats.verifiedProjectsCount, 6);
      assert(res.body.data.stats.availableCreditsTCO2e > 0);
      console.log(`[PASS] 1: Catalog returns all 6 PostgreSQL-backed demo projects (Count: ${res.body.data.projects.length}, Stats count: ${res.body.data.stats.verifiedProjectsCount})`);
      passed++;
    }

    // Test 2: Category filter
    {
      const res = await request("GET", "/api/marketplace/projects?category=Renewable%20Energy");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.projects.length, 1);
      assert.strictEqual(res.body.data.projects[0].name, "Solar Energy Transition");
      console.log("[PASS] 2: Category filtering works correctly");
      passed++;
    }

    // Test 3: Standard filter
    {
      const res = await request("GET", "/api/marketplace/projects?standard=Gold%20Standard");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.projects.length, 2);
      console.log("[PASS] 3: Certification standard filtering works correctly");
      passed++;
    }

    // Test 4: Single project details
    {
      const res = await request("GET", "/api/marketplace/projects/proj-001");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.name, "Amazonia Reforestation Initiative");
      assert.strictEqual(res.body.data.vintage, "2024");
      assert.strictEqual(res.body.data.registryRef, "VCS-1842");
      console.log("[PASS] 4: Single project detail returns vintage and registryRef");
      passed++;
    }

    // Test 5: ADMIN MUST NOT PURCHASE (403 Forbidden)
    {
      const res = await request(
        "POST",
        "/api/marketplace/purchase",
        { Authorization: `Bearer ${adminToken}` },
        { projectId: "proj-001", quantityTCO2e: 100 }
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.includes("Admins are not permitted to purchase"));
      console.log(`[PASS] 5: Admin cannot purchase credits (Status: 403, Error: ${res.body.error})`);
      passed++;
    }

    // Test 6: Validation: Non-positive quantity rejected (422)
    {
      const res = await request(
        "POST",
        "/api/marketplace/purchase",
        { Authorization: `Bearer ${compAToken}` },
        { projectId: "proj-001", quantityTCO2e: 0 }
      );
      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      console.log("[PASS] 6: Zero quantity rejected with 422");
      passed++;
    }

    // Test 7: Company A purchases credits successfully
    let initialInventory;
    {
      const projBefore = await request("GET", "/api/marketplace/projects/proj-001");
      initialInventory = projBefore.body.data.availableTCO2e;

      const res = await request(
        "POST",
        "/api/marketplace/purchase",
        { Authorization: `Bearer ${compAToken}` },
        { projectId: "proj-001", quantityTCO2e: 50 }
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.order.quantityTCO2e, 50);
      assert.strictEqual(res.body.data.order.pricePerTonne, 14.5);
      assert.strictEqual(res.body.data.order.subtotal, 725);
      assert.strictEqual(res.body.data.order.serviceFee, 14.5);
      assert.strictEqual(res.body.data.order.total, 739.5);
      if (res.body.data?.order?.id) {
        createdTransactionIds.push(res.body.data.order.id);
      }
      if (res.body.data?.transaction?.id) {
        createdTransactionIds.push(res.body.data.transaction.id);
      }

      // Verify PostgreSQL decremented inventory
      const projAfter = await request("GET", "/api/marketplace/projects/proj-001");
      assert.strictEqual(projAfter.body.data.availableTCO2e, initialInventory - 50);
      console.log(`[PASS] 7: Company A purchased credits; inventory decremented from ${initialInventory} to ${projAfter.body.data.availableTCO2e}`);
      passed++;
    }

    // Test 8: Exceeding available inventory rejected (422)
    {
      const res = await request(
        "POST",
        "/api/marketplace/purchase",
        { Authorization: `Bearer ${compAToken}` },
        { projectId: "proj-001", quantityTCO2e: initialInventory + 1000 }
      );
      assert.strictEqual(res.status, 422);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.includes("exceeds available inventory"));
      console.log("[PASS] 8: Over-purchase correctly rejected with 422");
      passed++;
    }

    // Test 9: Transactions tenant isolation
    {
      // Company A sees their purchase
      const resA = await request("GET", "/api/transactions", { Authorization: `Bearer ${compAToken}` });
      assert.strictEqual(resA.status, 200);
      assert(resA.body.data.transactions.length >= 1);
      const hasPurchasedTxn = resA.body.data.transactions.some((t) => t.project === "Amazonia Reforestation Initiative");
      assert(hasPurchasedTxn);

      resA.body.data.transactions.forEach((tx) => {
        if (!createdTransactionIds.includes(tx.id)) {
          createdTransactionIds.push(tx.id);
        }
      });

      // Company B does NOT see Company A's transaction
      const resB = await request("GET", "/api/transactions", { Authorization: `Bearer ${compBToken}` });
      assert.strictEqual(resB.status, 200);
      const bHasPurchasedTxn = resB.body.data.transactions.some((t) => t.project === "Amazonia Reforestation Initiative");
      assert.strictEqual(bHasPurchasedTxn, false);

      // Company A cannot request company-b transactions (403)
      const resCross = await request("GET", "/api/transactions?companyId=company-b", { Authorization: `Bearer ${compAToken}` });
      assert.strictEqual(resCross.status, 403);

      // Admin CAN view Company A transactions
      const resAdmin = await request("GET", "/api/transactions?companyId=company-a", { Authorization: `Bearer ${adminToken}` });
      assert.strictEqual(resAdmin.status, 200);
      assert(resAdmin.body.data.transactions.length >= 1);

      console.log("[PASS] 9: Transactions tenant isolation and Admin company viewing verified");
      passed++;
    }

    // Test 10: Portfolio endpoint
    {
      const res = await request("GET", "/api/marketplace/portfolio", { Authorization: `Bearer ${compAToken}` });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.totalCreditsRetired >= 50);
      assert(res.body.data.totalInvested >= 739.5);
      assert(res.body.data.transactionCount >= 1);
      assert(res.body.data.projectsSupportedCount >= 1);
      console.log(`[PASS] 10: Portfolio returns real aggregates (Credits: ${res.body.data.totalCreditsRetired}, Invested: $${res.body.data.totalInvested})`);
      passed++;
    }

  } catch (err) {
    console.error("Test error:", err);
    failed++;
  } finally {
    // ==========================================
    // TEARDOWN & ANTI-POLLUTION ASSERTIONS
    // ==========================================
    try {
      const db = await getDb();
      if (createdTransactionIds.length > 0) {
        await db.query("DELETE FROM transactions WHERE id = ANY($1)", [createdTransactionIds]);
      }
      if (startingInventory !== undefined) {
        await db.query("UPDATE offset_projects SET available_tco2e = $1 WHERE id = 'proj-001'", [startingInventory]);
      }

      // Assert transaction count returned to starting baseline
      if (compAToken && startingTxCount !== undefined) {
        const finalTxRes = await request("GET", "/api/transactions", { Authorization: `Bearer ${compAToken}` });
        const finalTxCount = finalTxRes.body.data.transactions.length;
        assert.strictEqual(
          finalTxCount,
          startingTxCount,
          `Pollution failure: transaction count was ${startingTxCount}, but remained ${finalTxCount} after cleanup`
        );
      }

      // Assert project inventory returned exactly to starting baseline
      if (startingInventory !== undefined) {
        const projFinal = await request("GET", "/api/marketplace/projects/proj-001");
        assert.strictEqual(
          projFinal.body.data.availableTCO2e,
          startingInventory,
          `Pollution failure: inventory was ${startingInventory}, but remained ${projFinal.body.data.availableTCO2e} after cleanup`
        );
      }
      console.log("[CLEANUP] Marketplace & transactions test state cleanly restored (zero pollution verified).");
    } catch (cleanupErr) {
      console.error("[CLEANUP FAILURE] Anti-pollution assertion failed:", cleanupErr.message);
      failed++;
    }

    if (server) server.close();
    console.log(`\n=== Marketplace Test Summary: ${passed} passed, ${failed} failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

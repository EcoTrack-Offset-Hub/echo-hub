/**
 * Faithful Postman Collection v2.1 Runner for EcoTrack Hub API Audit.
 *
 * Why a compatible Node.js runner is used:
 * Neither `newman` nor the `postman` CLI is installed in this environment.
 * This runner loads `postman/EcoTrack-Hub-Audit.postman_collection.json` and
 * `postman/EcoTrack-Hub-Audit.postman_environment.template.json` directly,
 * resolves `{{variable}}` and `{{$timestamp}}` placeholders in collection order,
 * executes every HTTP request against the live Express server connected to the
 * configured development PostgreSQL database, runs each request's `pm.test(...)`
 * script in a sandboxed `pm` runtime, and safely cleans up only the exact record
 * IDs created during the run while restoring `proj-001` inventory to its exact
 * pre-run baseline.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const { app } = require("../server");
const { initDb, getDb, seedUsers } = require("../config/db");
const { hashPassword } = require("../middleware/auth");

const COLLECTION_PATH = path.resolve(
  __dirname,
  "../../postman/EcoTrack-Hub-Audit.postman_collection.json"
);
const ENV_TEMPLATE_PATH = path.resolve(
  __dirname,
  "../../postman/EcoTrack-Hub-Audit.postman_environment.template.json"
);

function createPmExpect(actual) {
  return {
    to: {
      eql(expected) {
        assert.deepStrictEqual(actual, expected);
      },
      equal(expected) {
        assert.strictEqual(actual, expected);
      },
      be: {
        a(type) {
          checkType(actual, type);
        },
        an(type) {
          checkType(actual, type);
        },
        above(n) {
          assert.ok(
            typeof actual === "number" && actual > n,
            `Expected ${actual} to be above ${n}`
          );
        },
      },
    },
  };
}

function checkType(actual, type) {
  const t = String(type).toLowerCase();
  if (t === "array") {
    assert.ok(Array.isArray(actual), `Expected Array, got ${typeof actual}`);
    return;
  }
  if (t === "object") {
    assert.ok(
      actual !== null && typeof actual === "object" && !Array.isArray(actual),
      `Expected Object, got ${actual === null ? "null" : typeof actual}`
    );
    return;
  }
  assert.strictEqual(
    typeof actual,
    t,
    `Expected type ${t}, got ${typeof actual}`
  );
}

function interpolate(str, envMap, collectionMap, timestamp) {
  if (typeof str !== "string") return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (_match, rawKey) => {
    const key = rawKey.trim();
    if (key === "$timestamp") return String(timestamp);
    if (envMap.has(key)) return String(envMap.get(key));
    if (collectionMap.has(key)) return String(collectionMap.get(key));
    return "";
  });
}

function flattenItems(items, folderPath = []) {
  const result = [];
  for (const item of items || []) {
    if (Array.isArray(item.item)) {
      result.push(...flattenItems(item.item, [...folderPath, item.name]));
    } else if (item.request) {
      result.push({
        folder: folderPath.join(" / "),
        name: item.name,
        request: item.request,
        events: item.event || [],
      });
    }
  }
  return result;
}

async function runPostmanAudit() {
  const collection = JSON.parse(fs.readFileSync(COLLECTION_PATH, "utf8"));
  const envTemplate = JSON.parse(fs.readFileSync(ENV_TEMPLATE_PATH, "utf8"));

  await initDb();
  const db = await getDb();
  const seedPassword = process.env.SEED_PASSWORD || "EcoTrackDemo!2026";
  const seedPasswordHash = hashPassword(seedPassword);

  await seedUsers([
    {
      id: "usr-admin-david",
      email: "admin@ecotrack.test",
      passwordHash: seedPasswordHash,
      role: "ADMIN",
      companyId: null,
    },
    {
      id: "usr-company-a",
      email: "companya@ecotrack.test",
      passwordHash: seedPasswordHash,
      role: "COMPANY_USER",
      companyId: "company-a",
    },
    {
      id: "usr-company-b",
      email: "companyb@ecotrack.test",
      passwordHash: seedPasswordHash,
      role: "COMPANY_USER",
      companyId: "company-b",
    },
  ]);

  // Record pre-run baseline state to verify zero database pollution after cleanup
  const preProjRes = await db.query(
    "SELECT available_tco2e FROM offset_projects WHERE id = 'proj-001'"
  );
  const startingProj001Inventory = preProjRes.rows[0]
    ? Number(preProjRes.rows[0].available_tco2e)
    : null;

  const preCountsRes = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM companies) AS companies_count,
      (SELECT COUNT(*)::int FROM users) AS users_count,
      (SELECT COUNT(*)::int FROM emissions) AS emissions_count,
      (SELECT COUNT(*)::int FROM transactions) AS transactions_count
  `);
  const preCounts = preCountsRes.rows[0];

  const envMap = new Map();
  for (const entry of envTemplate.values || []) {
    if (entry.enabled !== false) {
      envMap.set(entry.key, entry.value ?? "");
    }
  }

  const collectionMap = new Map();
  for (const entry of collection.variable || []) {
    collectionMap.set(entry.key, entry.value ?? "");
  }

  let server;
  let totalRequests = 0;
  let passedRequests = 0;
  let failedRequests = 0;
  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  try {
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const { port } = server.address();
    envMap.set("baseUrl", `http://localhost:${port}`);
    envMap.set("seedPassword", seedPassword);

    const requests = flattenItems(collection.item);

    console.log("================================================================");
    console.log(`Executing Collection: ${collection.info.name}`);
    console.log(`Environment Template: ${envTemplate.name}`);
    console.log(`Requests in Collection: ${requests.length}`);
    console.log("================================================================\n");

    for (const entry of requests) {
      totalRequests++;
      const timestamp = Math.floor(Date.now() / 1000);
      const reqDef = entry.request;
      const method = reqDef.method || "GET";
      const rawUrl =
        typeof reqDef.url === "string" ? reqDef.url : reqDef.url.raw;
      const resolvedUrl = interpolate(rawUrl, envMap, collectionMap, timestamp);

      const headers = {};
      for (const h of reqDef.header || []) {
        if (!h.disabled && h.key) {
          headers[h.key] = interpolate(
            h.value || "",
            envMap,
            collectionMap,
            timestamp
          );
        }
      }

      const fetchOptions = { method, headers };
      if (
        reqDef.body &&
        reqDef.body.mode === "raw" &&
        typeof reqDef.body.raw === "string" &&
        method !== "GET" &&
        method !== "HEAD"
      ) {
        fetchOptions.body = interpolate(
          reqDef.body.raw,
          envMap,
          collectionMap,
          timestamp
        );
      }

      let responseStatus = 0;
      let responseText = "";
      let responseJson = null;
      const requestAssertions = [];

      try {
        const res = await fetch(resolvedUrl, fetchOptions);
        responseStatus = res.status;
        responseText = await res.text();
        try {
          responseJson = responseText ? JSON.parse(responseText) : null;
        } catch {
          responseJson = null;
        }

        const pm = {
          environment: {
            get(key) {
              return envMap.get(key);
            },
            set(key, val) {
              envMap.set(key, val === undefined || val === null ? "" : String(val));
            },
          },
          collectionVariables: {
            get(key) {
              return collectionMap.get(key);
            },
            set(key, val) {
              collectionMap.set(
                key,
                val === undefined || val === null ? "" : String(val)
              );
            },
          },
          response: {
            code: responseStatus,
            status: res.statusText,
            json() {
              if (responseJson === null) {
                throw new Error("Response body is not valid JSON");
              }
              return responseJson;
            },
            text() {
              return responseText;
            },
            to: {
              have: {
                status(expectedCode) {
                  assert.strictEqual(
                    responseStatus,
                    expectedCode,
                    `Expected HTTP ${expectedCode}, got HTTP ${responseStatus}`
                  );
                },
              },
            },
          },
          expect: createPmExpect,
          test(testName, fn) {
            totalAssertions++;
            try {
              fn();
              passedAssertions++;
              requestAssertions.push({ name: testName, passed: true });
            } catch (err) {
              failedAssertions++;
              requestAssertions.push({
                name: testName,
                passed: false,
                error: err.message,
              });
            }
          },
        };

        const sandbox = vm.createContext({ pm, console });
        for (const ev of entry.events) {
          if (ev.listen === "test" && ev.script && Array.isArray(ev.script.exec)) {
            const code = ev.script.exec.join("\n");
            vm.runInContext(code, sandbox, { timeout: 5000 });
          }
        }
      } catch (err) {
        totalAssertions++;
        failedAssertions++;
        requestAssertions.push({
          name: "Request execution / script evaluation",
          passed: false,
          error: err.message,
        });
      }

      const hasFailedAssertion = requestAssertions.some((a) => !a.passed);
      if (hasFailedAssertion) {
        failedRequests++;
      } else {
        passedRequests++;
      }

      const displayUrl = resolvedUrl.replace(/^http:\/\/localhost:\d+/, "");
      const statusBadge = hasFailedAssertion ? "FAIL" : "PASS";
      console.log(
        `[${statusBadge}] [${entry.folder}] ${entry.name} (${method} ${displayUrl}) -> HTTP ${responseStatus}`
      );
      for (const a of requestAssertions) {
        if (a.passed) {
          console.log(`  ✓ ${a.name}`);
        } else {
          console.log(`  ✗ ${a.name}: ${a.error}`);
        }
      }
    }
  } finally {
    // Clean up ONLY exact test-created record IDs and restore proj-001 inventory
    const leftoverEmissionId = envMap.get("emissionId");
    const purchasedTxId = envMap.get("purchasedAuditTxId");
    const createdUserId = envMap.get("createdAuditUserId");
    const createdCompanyId = envMap.get("createdAuditCompanyId");

    try {
      if (leftoverEmissionId) {
        await db.query("DELETE FROM emissions WHERE id = $1", [leftoverEmissionId]);
      }
      if (purchasedTxId) {
        await db.query("DELETE FROM transactions WHERE id = $1", [purchasedTxId]);
      }
      if (startingProj001Inventory !== null) {
        await db.query(
          "UPDATE offset_projects SET available_tco2e = $1 WHERE id = 'proj-001'",
          [startingProj001Inventory]
        );
      }
      if (createdUserId) {
        await db.query("DELETE FROM users WHERE id = $1", [createdUserId]);
      }
      if (createdCompanyId) {
        await db.query("DELETE FROM companies WHERE id = $1", [createdCompanyId]);
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  // Verify database state matches pre-run baseline
  const postProjRes = await db.query(
    "SELECT available_tco2e FROM offset_projects WHERE id = 'proj-001'"
  );
  const postProj001 = postProjRes.rows[0];

  const postCountsRes = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM companies) AS companies_count,
      (SELECT COUNT(*)::int FROM users) AS users_count,
      (SELECT COUNT(*)::int FROM emissions) AS emissions_count,
      (SELECT COUNT(*)::int FROM transactions) AS transactions_count
  `);
  const postCounts = postCountsRes.rows[0];

  console.log("\n================================================================");
  console.log("Database Restoration & State Verification");
  console.log(
    `  companies:    pre=${preCounts.companies_count}, post=${postCounts.companies_count}`
  );
  console.log(
    `  users:        pre=${preCounts.users_count}, post=${postCounts.users_count}`
  );
  console.log(
    `  emissions:    pre=${preCounts.emissions_count}, post=${postCounts.emissions_count}`
  );
  console.log(
    `  transactions: pre=${preCounts.transactions_count}, post=${postCounts.transactions_count}`
  );
  console.log(
    `  proj-001 available_tco2e: pre=${startingProj001Inventory}, post=${Number(
      postProj001.available_tco2e
    )}`
  );
  console.log("================================================================");
  console.log(
    `Summary: ${passedRequests}/${totalRequests} requests passed (${failedRequests} failed), ${passedAssertions}/${totalAssertions} assertions passed (${failedAssertions} failed)`
  );
  console.log("================================================================");

  if (
    failedRequests > 0 ||
    failedAssertions > 0 ||
    preCounts.companies_count !== postCounts.companies_count ||
    preCounts.users_count !== postCounts.users_count ||
    preCounts.emissions_count !== postCounts.emissions_count ||
    preCounts.transactions_count !== postCounts.transactions_count ||
    startingProj001Inventory !== Number(postProj001.available_tco2e)
  ) {
    process.exit(1);
  }
  process.exit(0);
}

runPostmanAudit().catch((err) => {
  console.error("Runner error:", err.message);
  process.exit(1);
});

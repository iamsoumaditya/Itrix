import { db } from "../lib/db";
import { companies } from "../lib/db/schema";
import crypto from "crypto";
import { validateApiRequest } from "../lib/api-auth";
import { GET as healthGET } from "../app/api/v1/health/route";
import { POST as ticketsPOST, GET as ticketsGET } from "../app/api/v1/tickets/route";
import { GET as ticketByIdGET } from "../app/api/v1/tickets/[id]/route";

async function runTests() {
  console.log("==========================================");
  console.log("STARTING API V1 ENDPOINT AUTOMATED TESTS");
  console.log("==========================================");

  // 1. Fetch test company from DB (auto-create if DB is unseeded)
  let companyRows: any[] = [];
  try {
    companyRows = await db.select().from(companies).limit(1);
    if (!companyRows || companyRows.length === 0) {
      const dummyCompany = {
        id: "org_test_suite_runner",
        name: "Test Suite Corp",
        createdBy: "user_test_runner",
        apiKey: "sk_live_test_suite_1234567890abcdef",
        hmacSecret: "hmac_sec_test_suite_1234567890abcdef",
        widgetPublicKey: "wpk_live_test_suite_1234567890abcdef",
        onboardingStatus: "completed",
        createdAt: new Date(),
      };
      await db.insert(companies).values(dummyCompany).onConflictDoNothing();
      companyRows = [dummyCompany];
    }
  } catch (err) {
    console.error("ℹ️ DB error in test setup:", err);
    process.exit(1);
  }

  const testCompany = companyRows[0];
  console.log(`\n[Setup] Test Company ID: ${testCompany.id}`);
  console.log(`[Setup] API Key: ${testCompany.apiKey.substring(0, 10)}...`);
  console.log(`[Setup] HMAC Secret: ${testCompany.hmacSecret.substring(0, 8)}...`);

  const validApiKey = testCompany.apiKey;
  const invalidApiKey = "invalid_api_key_12345";
  const employeeId = "emp_test_999";
  const employeeEmail = "test.employee@example.com";

  // Compute valid HMAC signature
  const validSignature = crypto
    .createHmac("sha256", testCompany.hmacSecret)
    .update(`${employeeId}:${employeeEmail}`)
    .digest("hex");

  const invalidSignature = "deadbeef1234567890abcdef";

  let createdTicketId: string = "";

  // ----------------------------------------------------
  // TEST 1: GET /api/v1/health (Unauthenticated)
  // ----------------------------------------------------
  console.log("\n--- TEST 1: GET /api/v1/health ---");
  const healthRes = await healthGET();
  const healthData = await healthRes.json();
  console.log(`Status: ${healthRes.status}, Payload:`, healthData);
  if (healthRes.status !== 200 || healthData.status !== "ok") {
    throw new Error("TEST 1 FAILED: Expected status 200 with { status: 'ok' }");
  }
  console.log("✅ TEST 1 PASSED");

  // ----------------------------------------------------
  // TEST 2: POST /api/v1/tickets - Invalid API Key (401)
  // ----------------------------------------------------
  console.log("\n--- TEST 2: POST /api/v1/tickets (Invalid API Key) ---");
  const req2 = new Request("http://localhost/api/v1/tickets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${invalidApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employeeId,
      employeeEmail,
      signature: validSignature,
      ticketText: "My email client is failing to connect.",
    }),
  });
  const res2 = await ticketsPOST(req2);
  const data2 = await res2.json();
  console.log(`Status: ${res2.status}, Payload:`, data2);
  if (res2.status !== 401 || data2.error !== "Invalid API key") {
    throw new Error("TEST 2 FAILED: Expected 401 with 'Invalid API key'");
  }
  console.log("✅ TEST 2 PASSED");

  // ----------------------------------------------------
  // TEST 3: POST /api/v1/tickets - Invalid HMAC Signature (401)
  // ----------------------------------------------------
  console.log("\n--- TEST 3: POST /api/v1/tickets (Invalid HMAC Signature) ---");
  const req3 = new Request("http://localhost/api/v1/tickets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${validApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employeeId,
      employeeEmail,
      signature: invalidSignature,
      ticketText: "My email client is failing to connect.",
    }),
  });
  const res3 = await ticketsPOST(req3);
  const data3 = await res3.json();
  console.log(`Status: ${res3.status}, Payload:`, data3);
  if (res3.status !== 401 || data3.error !== "Invalid employee identity signature") {
    throw new Error("TEST 3 FAILED: Expected 401 with 'Invalid employee identity signature'");
  }
  console.log("✅ TEST 3 PASSED");

  // ----------------------------------------------------
  // TEST 4: POST /api/v1/tickets - Empty Ticket Text (400)
  // ----------------------------------------------------
  console.log("\n--- TEST 4: POST /api/v1/tickets (Empty Ticket Text) ---");
  const req4 = new Request("http://localhost/api/v1/tickets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${validApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employeeId,
      employeeEmail,
      signature: validSignature,
      ticketText: "   ",
    }),
  });
  const res4 = await ticketsPOST(req4);
  const data4 = await res4.json();
  console.log(`Status: ${res4.status}, Payload:`, data4);
  if (res4.status !== 400 || data4.error !== "Please provide a ticket description before submitting.") {
    throw new Error("TEST 4 FAILED: Expected 400 with empty ticket description error");
  }
  console.log("✅ TEST 4 PASSED");

  // ----------------------------------------------------
  // TEST 5: POST /api/v1/tickets - Successful Ticket Processing (201)
  // ----------------------------------------------------
  console.log("\n--- TEST 5: POST /api/v1/tickets (Valid Ticket Creation) ---");
  const req5 = new Request("http://localhost/api/v1/tickets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${validApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employeeId,
      employeeEmail,
      signature: validSignature,
      ticketText: "I cannot log into my laptop, it says my password expired.",
    }),
  });
  const res5 = await ticketsPOST(req5);
  const data5 = await res5.json();
  console.log(`Status: ${res5.status}, Payload:`, JSON.stringify(data5, null, 2));
  if (res5.status !== 201 || !data5.id) {
    throw new Error("TEST 5 FAILED: Expected 201 with created ticket ID");
  }
  createdTicketId = data5.id;
  console.log(`Created Ticket ID: ${createdTicketId}`);
  console.log("✅ TEST 5 PASSED");

  // ----------------------------------------------------
  // TEST 6: GET /api/v1/tickets/:id - Fetch Owned Ticket (200)
  // ----------------------------------------------------
  console.log("\n--- TEST 6: GET /api/v1/tickets/:id (Owned Ticket) ---");
  const req6 = new Request(`http://localhost/api/v1/tickets/${createdTicketId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${validApiKey}`,
    },
  });
  const res6 = await ticketByIdGET(req6, { params: Promise.resolve({ id: createdTicketId }) });
  const data6 = await res6.json();
  console.log(`Status: ${res6.status}, Payload ID: ${data6.id}, Category: ${data6.category}`);
  if (res6.status !== 200 || data6.id !== createdTicketId) {
    throw new Error("TEST 6 FAILED: Expected 200 with ticket matching createdTicketId");
  }
  console.log("✅ TEST 6 PASSED");

  // ----------------------------------------------------
  // TEST 7: GET /api/v1/tickets/:id - Unowned / Non-existent Ticket (404)
  // ----------------------------------------------------
  console.log("\n--- TEST 7: GET /api/v1/tickets/:id (Non-existent Ticket) ---");
  const req7 = new Request("http://localhost/api/v1/tickets/fake_ticket_id_000", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${validApiKey}`,
    },
  });
  const res7 = await ticketByIdGET(req7, { params: Promise.resolve({ id: "fake_ticket_id_000" }) });
  const data7 = await res7.json();
  console.log(`Status: ${res7.status}, Payload:`, data7);
  if (res7.status !== 404 || data7.error !== "Ticket not found") {
    throw new Error("TEST 7 FAILED: Expected 404 with 'Ticket not found'");
  }
  console.log("✅ TEST 7 PASSED");

  // ----------------------------------------------------
  // TEST 8: GET /api/v1/tickets - Missing employeeId Param (400)
  // ----------------------------------------------------
  console.log("\n--- TEST 8: GET /api/v1/tickets (Missing employeeId) ---");
  const req8 = new Request("http://localhost/api/v1/tickets", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${validApiKey}`,
    },
  });
  const res8 = await ticketsGET(req8);
  const data8 = await res8.json();
  console.log(`Status: ${res8.status}, Payload:`, data8);
  if (res8.status !== 400 || data8.error !== "employeeId query parameter is required") {
    throw new Error("TEST 8 FAILED: Expected 400 with 'employeeId query parameter is required'");
  }
  console.log("✅ TEST 8 PASSED");

  // ----------------------------------------------------
  // TEST 9: GET /api/v1/tickets - Scoped to employeeId (200)
  // ----------------------------------------------------
  console.log("\n--- TEST 9: GET /api/v1/tickets?employeeId=... ---");
  const req9 = new Request(`http://localhost/api/v1/tickets?employeeId=${encodeURIComponent(employeeId)}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${validApiKey}`,
    },
  });
  const res9 = await ticketsGET(req9);
  const data9 = await res9.json();
  console.log(`Status: ${res9.status}, Count: ${data9.data?.length}, Total: ${data9.total}`);
  if (res9.status !== 200 || !Array.isArray(data9.data) || data9.total < 1) {
    throw new Error("TEST 9 FAILED: Expected 200 with paginated tickets array containing created ticket");
  }
  console.log("✅ TEST 9 PASSED");

  // ----------------------------------------------------
  // TEST 10: Rate Limiter Enforcement (429)
  // ----------------------------------------------------
  console.log("\n--- TEST 10: Rate Limiter (Exceeding 60 req/min) ---");
  const rateLimitTestKey = "sk_live_rate_limit_test_key_999";
  let rateLimited = false;
  let attempts = 0;
  
  for (let i = 0; i < 65; i++) {
    attempts++;
    const testReq = new Request("http://localhost/api/v1/tickets", {
      headers: { "Authorization": `Bearer ${rateLimitTestKey}` }
    });
    const result = await validateApiRequest(testReq);
    if (result.errorResponse && result.errorResponse.status === 429) {
      const data10 = await result.errorResponse.json();
      console.log(`Rate limit triggered after ${attempts} requests in tight loop! Status: 429, Payload:`, data10);
      if (data10.error === "Rate limit exceeded, please slow down") {
        rateLimited = true;
      }
      break;
    }
  }

  if (!rateLimited) {
    throw new Error(`TEST 10 FAILED: Expected rate limiter to return status 429 after 60+ requests (attempted ${attempts} requests)`);
  }
  console.log("✅ TEST 10 PASSED");

  console.log("\n==========================================");
  console.log("ALL API V1 TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});

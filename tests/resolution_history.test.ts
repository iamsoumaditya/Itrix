import { db } from "../lib/db";
import { companies, tickets, ticketResolutionHistory } from "../lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { processTicket } from "../lib/ticket-processor";
import { POST as updateResolutionPOST } from "../app/api/tickets/update-resolution/route";
import { GET as historyGET } from "../app/api/tickets/history/route";
import { POST as markResolvedPOST } from "../app/api/tickets/mark-resolved/route";

async function runTest() {
  console.log("==========================================");
  console.log("TESTING RESOLUTION HISTORY & MANUAL APPROVAL");
  console.log("==========================================");

  // 1. Get or create test company
  let companyRows = await db.select().from(companies).limit(1);
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
  const companyId = companyRows[0].id;

  // 2. Process ticket
  console.log("\n1. Processing ticket...");
  const processRes = await processTicket(
    companyId,
    "emp_history_test",
    "I cannot log into my laptop, it says my password expired."
  );

  console.log(`Ticket ID: ${processRes.id}`);
  console.log(`Category: ${processRes.category}`);
  console.log(`Resolved State: ${processRes.resolved} (Expected: false)`);
  console.log(`Status: ${processRes.status} (Expected: needs_verification or needs_review)`);

  const ticketId = processRes.id!;

  // 3. Verify Version 1 in ticketResolutionHistory
  console.log("\n2. Checking Version 1 in ticketResolutionHistory DB table...");
  const v1History = await db
    .select()
    .from(ticketResolutionHistory)
    .where(eq(ticketResolutionHistory.ticketId, ticketId));

  console.log(`History count: ${v1History.length}`);
  if (v1History.length !== 1 || v1History[0].version !== 1 || v1History[0].updatedBy !== "AI Generator") {
    throw new Error("FAILED: Expected Version 1 record created by 'AI Generator'");
  }
  console.log("✅ Step 2 PASSED: Version 1 (AI Generator) stored in DB");

  // 4. Test updating solution via POST /api/tickets/update-resolution
  console.log("\n3. Testing updating solution via update-resolution endpoint...");
  const updatedSolutionText = "Step 1: Open IT self-service portal.\nStep 2: Click reset password.\nStep 3: Admin confirmed and updated solution.";
  
  const reqUpdate = new Request("http://localhost/api/tickets/update-resolution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId,
      resolution: updatedSolutionText,
      notes: "Updated by admin during test",
    }),
  });

  const resUpdate = await updateResolutionPOST(reqUpdate);
  const dataUpdate = await resUpdate.json();
  console.log("Update status:", resUpdate.status, "New resolution:", dataUpdate.ticket?.suggestedResolution);

  if (resUpdate.status !== 200 || dataUpdate.ticket?.suggestedResolution !== updatedSolutionText) {
    throw new Error("FAILED: Expected solution update to succeed");
  }
  console.log("✅ Step 3 PASSED: Solution updated successfully");

  // 5. Test history endpoint GET /api/tickets/history
  console.log("\n4. Testing GET /api/tickets/history...");
  const reqHistory = new Request(`http://localhost/api/tickets/history?ticketId=${ticketId}`, {
    method: "GET",
  });
  const resHistory = await historyGET(reqHistory);
  const dataHistory = await resHistory.json();

  console.log(`History records returned: ${dataHistory.history?.length}`);
  dataHistory.history?.forEach((h: any) => {
    console.log(` - v${h.version} by ${h.updatedBy}: ${h.resolution.substring(0, 40)}...`);
  });

  if (resHistory.status !== 200 || dataHistory.history?.length !== 2) {
    throw new Error("FAILED: Expected 2 history versions (v1 AI Generator, v2 Admin)");
  }
  console.log("✅ Step 4 PASSED: Both Version 1 and Version 2 retrieved from history API");

  // 6. Test marking ticket as resolved via POST /api/tickets/mark-resolved
  console.log("\n5. Testing marking ticket as resolved...");
  const reqMark = new Request("http://localhost/api/tickets/mark-resolved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId }),
  });
  const resMark = await markResolvedPOST(reqMark);
  const dataMark = await resMark.json();

  console.log("Mark resolved status:", resMark.status, "Ticket resolved:", dataMark.ticket?.resolved);

  if (resMark.status !== 200 || dataMark.ticket?.resolved !== true) {
    throw new Error("FAILED: Expected ticket resolved state to be true");
  }
  console.log("✅ Step 5 PASSED: Ticket explicitly marked as resolved by admin");

  console.log("\n==========================================");
  console.log("ALL RESOLUTION HISTORY TESTS PASSED! 🎉");
  console.log("==========================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

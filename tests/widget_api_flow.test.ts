import { db } from "../lib/db";
import { companies } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { validateApiRequest, verifyEmployeeSignature } from "../lib/api-auth";

async function runTests() {
  console.log("=========================================");
  console.log("  RUNNING WIDGET & REST API AUTH VERIFICATION");
  console.log("=========================================\n");

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

  const company = companyRows[0];
  console.log(`Test Company: ${company.name} (${company.id})`);
  console.log(`  Private API Key: ${company.apiKey.substring(0, 8)}...`);
  console.log(`  Widget Public Key: ${company.widgetPublicKey}`);
  console.log(`  HMAC Secret: ${company.hmacSecret.substring(0, 8)}...\n`);

  const employeeId = "emp_widget_test_99";
  const employeeEmail = "alex.widget.test@acmecorp.com";
  const dataToSign = `${employeeId}:${employeeEmail}`;

  const validSignature = crypto
    .createHmac("sha256", company.hmacSecret)
    .update(dataToSign)
    .digest("hex");

  const invalidSignature = "deliberately_wrong_signature_123456789";

  // Test 1: validateApiRequest with full private API key
  console.log("TEST 1: validateApiRequest with full private API key...");
  const req1 = new Request("http://localhost:4000/api/v1/tickets", {
    headers: { Authorization: `Bearer ${company.apiKey}` },
  });
  const auth1 = await validateApiRequest(req1);
  console.log(`  Result keyType: "${auth1.keyType}" (Expected: "full_api_key")`);
  if (auth1.keyType !== "full_api_key") throw new Error("TEST 1 FAILED");

  // Test 2: validateApiRequest with widget public key
  console.log("\nTEST 2: validateApiRequest with widget public key...");
  const req2 = new Request("http://localhost:4000/api/v1/tickets", {
    headers: { Authorization: `Bearer ${company.widgetPublicKey}` },
  });
  const auth2 = await validateApiRequest(req2);
  console.log(`  Result keyType: "${auth2.keyType}" (Expected: "widget_public_key")`);
  if (auth2.keyType !== "widget_public_key") throw new Error("TEST 2 FAILED");

  // Test 3: verifyEmployeeSignature with valid signature
  console.log("\nTEST 3: verifyEmployeeSignature with valid signature...");
  const isValid1 = await verifyEmployeeSignature(
    company.id,
    employeeId,
    employeeEmail,
    validSignature
  );
  console.log(`  Valid Signature Check: ${isValid1} (Expected: true)`);
  if (!isValid1) throw new Error("TEST 3 FAILED");

  // Test 4: verifyEmployeeSignature with invalid signature
  console.log("\nTEST 4: verifyEmployeeSignature with invalid signature...");
  const isValid2 = await verifyEmployeeSignature(
    company.id,
    employeeId,
    employeeEmail,
    invalidSignature
  );
  console.log(`  Invalid Signature Check: ${isValid2} (Expected: false)`);
  if (isValid2) throw new Error("TEST 4 FAILED");

  console.log("\n=========================================");
  console.log("  ALL WIDGET API TESTS PASSED SUCCESSFULLY 100%");
  console.log("=========================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});

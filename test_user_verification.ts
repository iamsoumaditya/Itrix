import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

process.env.DEBUG = "true";

import { processTicket } from "./lib/ticket-processor";

async function runVerification() {
  console.log("=================================================");
  console.log("RUNNING USER VERIFICATION TEST SUITE (DEBUG=true)");
  console.log("=================================================");

  const companyId = "org_demo_acme_corp";

  // CASE 1
  console.log("\n==========================================");
  console.log("CASE 1: 'I can't log into my laptop, it says my password expired.'");
  console.log("==========================================");
  const res1 = await processTicket(
    companyId,
    "emp_user_1",
    "I can't log into my laptop, it says my password expired.",
    { saveToDb: false }
  );
  console.log("\n>>> OUTPUT CASE 1:");
  console.log(`Category: "${res1.category}" (Expected: Password Reset)`);
  console.log(`Priority: "${res1.priority}"`);
  console.log(`Confidence: ${res1.confidence}`);
  console.log(`Status: "${res1.status}"`);

  // CASE 2
  console.log("\n==========================================");
  console.log("CASE 2: 'My monitor won't turn on'");
  console.log("==========================================");
  const res2 = await processTicket(
    companyId,
    "emp_user_2",
    "My monitor won't turn on",
    { saveToDb: false }
  );
  console.log("\n>>> OUTPUT CASE 2:");
  console.log(`Category: "${res2.category}" (Expected: Hardware Fault)`);
  console.log(`Priority: "${res2.priority}"`);
  console.log(`Confidence: ${res2.confidence}`);
  console.log(`Status: "${res2.status}"`);

  // CASE 3
  console.log("\n==========================================");
  console.log("CASE 3: Query totally absent from indexed docs ('What is the policy for orbital space station rocket launches?')");
  console.log("==========================================");
  const res3 = await processTicket(
    companyId,
    "emp_user_3",
    "What is the company policy for orbital space station rocket launches and satellite orbits?",
    { saveToDb: false }
  );
  console.log("\n>>> OUTPUT CASE 3:");
  console.log(`Category: "${res3.category}"`);
  console.log(`can_resolve (isResolved): ${res3.resolved} (Expected: false)`);
  console.log(`sourceReferences length: ${res3.sourceReferences.length} (Expected: 0)`);
  console.log(`routingTeam: "${res3.routingTeam}"`);
  console.log(`suggestedResolution: "${res3.suggestedResolution}"`);
  console.log(`Status: "${res3.status}"`);

  // CASE 4
  console.log("\n==========================================");
  console.log("CASE 4: Query closely matching indexed content ('How do I reset my Okta MFA seed?')");
  console.log("==========================================");
  const res4 = await processTicket(
    companyId,
    "emp_user_4",
    "How do I reset my Okta MFA seed?",
    { saveToDb: false }
  );
  console.log("\n>>> OUTPUT CASE 4:");
  console.log(`Category: "${res4.category}"`);
  console.log(`can_resolve (isResolved): ${res4.resolved} (Expected: true)`);
  console.log(`sourceReferences length: ${res4.sourceReferences.length}`);
  console.log(`Citations:`, res4.sourceReferences);
  console.log(`Status: "${res4.status}"`);
  console.log(`suggestedResolution:\n${res4.suggestedResolution}`);

  process.exit(0);
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});

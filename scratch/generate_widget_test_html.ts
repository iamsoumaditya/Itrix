import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../lib/db";
import { companies } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Generating static test HTML pages for widget testing...");

  // Fetch demo company
  const companyRows = await db
    .select()
    .from(companies)
    .where(eq(companies.id, "org_demo_acme_corp"))
    .limit(1);

  const company = companyRows[0] || {
    widgetPublicKey: "wpk_live_demo_1234567890abcdef",
    hmacSecret: "hmac_sec_demo_1234567890abcdef",
  };

  const employeeId = "emp_test_widget_user";
  const employeeEmail = "alex.widget@acmecorp.com";
  const dataToSign = `${employeeId}:${employeeEmail}`;

  // Valid signature
  const validSignature = crypto
    .createHmac("sha256", company.hmacSecret)
    .update(dataToSign)
    .digest("hex");

  // Invalid signature
  const invalidSignature = "invalid_deliberately_wrong_signature_12345";

  // 1. Valid Signature Test HTML
  const validHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ITrix Widget Integration Test — Valid Signature</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #020617;
      color: #f8fafc;
      padding: 40px;
      margin: 0;
    }
    .card {
      background-color: #0f172a;
      border: 1px solid #1e293b;
      padding: 24px;
      border-radius: 12px;
      max-width: 600px;
    }
    code {
      background: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      color: #34d399;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Acme Corp Employee Intranet (Test Page)</h1>
    <p>This standalone static HTML page tests the embeddable <code>widget.js</code> script with a valid HMAC identity signature.</p>
    <p>Look at the <strong>bottom-right corner</strong> for the floating support launcher bubble.</p>
    <ul>
      <li><strong>Employee ID:</strong> <code>${employeeId}</code></li>
      <li><strong>Employee Email:</strong> <code>${employeeEmail}</code></li>
      <li><strong>Widget Public Key:</strong> <code>${company.widgetPublicKey}</code></li>
      <li><strong>Valid HMAC Signature:</strong> <code>${validSignature}</code></li>
    </ul>
  </div>

  <!-- ITrix Embeddable Widget Script Tag -->
  <script src="http://localhost:4000/widget.js"
    data-widget-key="${company.widgetPublicKey}"
    data-employee-id="${employeeId}"
    data-employee-email="${employeeEmail}"
    data-signature="${validSignature}"
    data-bg-color="#0F172A"
    data-fg-color="#10B981"
    data-text-color="#FFFFFF"
    data-api-url="http://localhost:4000">
  </script>
</body>
</html>`;

  // 2. Invalid Signature Test HTML
  const invalidHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ITrix Widget Integration Test — Invalid Signature Error Test</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #020617;
      color: #f8fafc;
      padding: 40px;
      margin: 0;
    }
    .card {
      background-color: #0f172a;
      border: 1px solid #7f1d1d;
      padding: 24px;
      border-radius: 12px;
      max-width: 600px;
    }
    code {
      background: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      color: #f87171;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1 style="color: #f87171;">Invalid Signature Test Page</h1>
    <p>This static HTML page embeds <code>widget.js</code> with a <strong>deliberately wrong signature</strong> to verify graceful 401 error surfacing in the widget UI.</p>
    <ul>
      <li><strong>Invalid Signature:</strong> <code>${invalidSignature}</code></li>
    </ul>
  </div>

  <!-- ITrix Embeddable Widget Script Tag with Invalid Signature -->
  <script src="http://localhost:4000/widget.js"
    data-widget-key="${company.widgetPublicKey}"
    data-employee-id="${employeeId}"
    data-employee-email="${employeeEmail}"
    data-signature="${invalidSignature}"
    data-bg-color="#0F172A"
    data-fg-color="#10B981"
    data-text-color="#FFFFFF"
    data-api-url="http://localhost:4000">
  </script>
</body>
</html>`;

  const scratchDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  fs.writeFileSync(path.join(scratchDir, "test_widget_valid.html"), validHtmlContent);
  fs.writeFileSync(path.join(scratchDir, "test_widget_invalid.html"), invalidHtmlContent);

  console.log("✅ Created scratch/test_widget_valid.html");
  console.log("✅ Created scratch/test_widget_invalid.html");
  process.exit(0);
}

main();

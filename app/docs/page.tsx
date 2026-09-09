import Link from "next/link";
import { ArrowLeft, Key, Lock, CheckCircle2, ShieldAlert, Code2, Server } from "lucide-react";

export const metadata = {
  title: "ITrix REST API Documentation",
  description: "Public REST API reference for external systems & embeddable widget integration",
};

export default function ApiDocsPage() {
  const hmacCodeExample = `const crypto = require("crypto");

/**
 * Generate HMAC-SHA256 signature for ITrix Ticket Creation
 * @param {string} employeeId - Unique identifier of the employee (e.g. "emp_1042")
 * @param {string} employeeEmail - Verified email of the employee (e.g. "alex@company.com")
 * @param {string} hmacSecret - Your company's HMAC Secret from ITrix Dashboard Settings
 * @returns {string} Hex-encoded HMAC signature
 */
function generateITrixSignature(employeeId, employeeEmail, hmacSecret) {
  const dataToSign = \`\${employeeId.trim()}:\${employeeEmail.trim()}\`;
  return crypto
    .createHmac("sha256", hmacSecret)
    .update(dataToSign)
    .digest("hex");
}

// Example Usage:
const signature = generateITrixSignature("emp_1042", "alex@company.com", "your_hmac_secret_here");
console.log("Generated Signature:", signature);`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/30">
              IT
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              ITrix <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ml-1">v1 REST API</span>
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 hover:text-white flex items-center space-x-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pt-10 space-y-12">
        {/* Intro Banner */}
        <section className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Developer API Reference
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl">
            Integrate ITrix AI ticket triage directly into your custom applications, internal tools, or embeddable support widgets.
          </p>
        </section>

        {/* Auth Overview Card */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Key className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Authentication & Rate Limits</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            All requests to <code className="text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">/api/v1/*</code> require your company’s secret API key passed via the standard HTTP Bearer Authorization header:
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm text-slate-200">
            Authorization: Bearer <span className="text-emerald-400">your_api_key_here</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 pt-2">
            <div className="flex items-start space-x-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Rate Limit:</strong> 60 requests per minute per API key.</span>
            </div>
            <div className="flex items-start space-x-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span><strong>Credentials:</strong> Retrieve your API Key and HMAC Secret from Dashboard Settings.</span>
            </div>
          </div>
        </section>

        {/* HMAC Signature Guide */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white">HMAC Employee Identity Verification</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            To prevent unauthorized ticket submissions on behalf of unverified users, ticket creation requests (<code className="text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">POST /api/v1/tickets</code>) must include a HMAC-SHA256 signature generated by your backend server.
          </p>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Node.js HMAC Signature Helper</span>
            </h3>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-200 overflow-x-auto">
              <code>{hmacCodeExample}</code>
            </pre>
          </div>
        </section>

        {/* Endpoints Reference */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Server className="w-6 h-6 text-emerald-400" />
            <span>API Endpoints</span>
          </h2>

          {/* Endpoint 1: Create Ticket */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded">
                POST
              </span>
              <span className="font-mono text-sm text-white font-semibold">/api/v1/tickets</span>
              <span className="text-xs text-slate-400 ml-auto">Requires Auth & HMAC</span>
            </div>
            <p className="text-slate-300 text-sm">
              Submits an employee IT support ticket for AI classification and resolution evaluation.
            </p>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Request Body (JSON)</h4>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300">
{`{
  "employeeId": "emp_1042",
  "employeeEmail": "alex@company.com",
  "signature": "c5b2a...", // HMAC-SHA256 of "emp_1042:alex@company.com"
  "ticketText": "I can't log into my laptop, it says my password expired."
}`}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Response (201 Created)</h4>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-400">
{`{
  "id": "tkt_8a2b1c4d9e",
  "category": "Password Reset",
  "priority": "High",
  "confidence": 0.95,
  "suggestedResolution": "Go to Okta self-service portal at okta.company.com...",
  "sourceReferences": [
    { "page_url": "https://docs.company.com/okta-reset", "section_title": "Self-Service Password Reset" }
  ],
  "autoResolveEligible": true,
  "resolved": true,
  "status": "auto_resolved",
  "routingTeam": "IT Access Team",
  "createdAt": "2026-09-09T18:30:00.000Z"
}`}
              </pre>
            </div>
          </div>

          {/* Endpoint 2: Get Single Ticket */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold rounded">
                GET
              </span>
              <span className="font-mono text-sm text-white font-semibold">/api/v1/tickets/:id</span>
              <span className="text-xs text-slate-400 ml-auto">Requires Auth</span>
            </div>
            <p className="text-slate-300 text-sm">
              Fetches a single ticket by ID. Enforces company scoping (returns 404 if ticket belongs to another company).
            </p>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Response (200 OK)</h4>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300">
{`{
  "id": "tkt_8a2b1c4d9e",
  "employeeId": "emp_1042",
  "ticketText": "I can't log into my laptop, it says my password expired.",
  "category": "Password Reset",
  "priority": "High",
  "confidence": 0.95,
  "suggestedResolution": "Go to Okta self-service portal...",
  "status": "auto_resolved",
  "resolved": true,
  "routingTeam": "IT Access Team",
  "createdAt": "2026-09-09T18:30:00.000Z"
}`}
              </pre>
            </div>
          </div>

          {/* Endpoint 3: List Employee Tickets */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold rounded">
                GET
              </span>
              <span className="font-mono text-sm text-white font-semibold">/api/v1/tickets?employeeId=emp_1042</span>
              <span className="text-xs text-slate-400 ml-auto">Requires Auth & employeeId</span>
            </div>
            <p className="text-slate-300 text-sm">
              Lists tickets scoped strictly to a specific employee ID. Supports optional status and date filters.
            </p>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Query Parameters</h4>
              <ul className="text-xs text-slate-300 space-y-1 font-mono list-disc list-inside">
                <li><code className="text-emerald-400">employeeId</code> (required) - Scopes query to a single employee.</li>
                <li><code className="text-emerald-400">status</code> (optional) - "auto_resolved" | "needs_review" | "pending"</li>
                <li><code className="text-emerald-400">from</code> / <code className="text-emerald-400">to</code> (optional) - ISO 8601 date range filters</li>
                <li><code className="text-emerald-400">page</code> (optional, default 1) / <code className="text-emerald-400">limit</code> (optional, default 20, max 100)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Response (200 OK)</h4>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300">
{`{
  "data": [
    {
      "id": "tkt_8a2b1c4d9e",
      "employeeId": "emp_1042",
      "category": "Password Reset",
      "status": "auto_resolved"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}`}
              </pre>
            </div>
          </div>

          {/* Endpoint 4: Health Check */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 bg-slate-500/20 text-slate-300 border border-slate-500/30 text-xs font-bold rounded">
                GET
              </span>
              <span className="font-mono text-sm text-white font-semibold">/api/v1/health</span>
              <span className="text-xs text-slate-400 ml-auto">Public (No Auth)</span>
            </div>
            <p className="text-slate-300 text-sm">
              Simple health check endpoint for uptime monitoring systems. Returns <code className="font-mono text-emerald-400">{"{ \"status\": \"ok\" }"}</code>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

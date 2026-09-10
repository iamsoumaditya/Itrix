import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  ShieldAlert,
  Code2,
  Server,
  Cpu,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "ITrix Integration & API Documentation",
  description: "Complete integration guide, REST API reference, and MCP server documentation for ITrix.",
};

export default function ApiDocsPage() {
  const hmacCodeExample = `const crypto = require("crypto");

/**
 * Generate HMAC-SHA256 signature for ITrix Ticket Creation & Identity Verification
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-24">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xl text-slate-950 shadow-lg shadow-emerald-500/30">
              IT
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              ITrix <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ml-1">Documentation & API Guide</span>
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

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 pt-10 space-y-16">
        
        {/* HERO / WHAT WE DO */}
        <section className="space-y-6 border-b border-slate-800/80 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intelligent IT Ticket Resolution Platform</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Instant IT Support for Employees.<br />
            Zero Repetitive Tickets for IT Staff.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-3xl">
            ITrix is an AI-powered internal IT ticket resolution system. Employees submit support tickets—such as password resets, software access requests, hardware troubleshooting, or VPN issues—through an embeddable widget on your company site or intranet. 
          </p>
          <p className="text-slate-400 text-base leading-relaxed max-w-3xl">
            ITrix automatically classifies each incoming ticket, cross-checks it against your indexed internal IT documentation, and either resolves it instantly with accurate, cited step-by-step instructions or seamlessly routes it to the designated IT team with complete context.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section className="space-y-6 border-b border-slate-800/80 pb-12">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Layers className="w-6 h-6" />
            <h2 className="text-2xl font-bold text-white">How ITrix Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-bold text-emerald-400 font-mono">1. DOCUMENTATION INDEXING</span>
              <h3 className="text-base font-semibold text-white">Index Existing Knowledge</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Add links to your existing internal IT help pages and knowledge base articles. ITrix crawls and indexes your documentation automatically.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-bold text-emerald-400 font-mono">2. TICKET CLASSIFICATION</span>
              <h3 className="text-base font-semibold text-white">Real-Time Evaluation</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                When an employee submits a ticket, ITrix analyzes the request against indexed IT documentation to determine if an accurate, verified answer exists.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-bold text-emerald-400 font-mono">3. INSTANT RESOLUTION OR ROUTING</span>
              <h3 className="text-base font-semibold text-white">Automated Actions</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                If a clear solution is found, the employee receives an instant, documentation-backed resolution. If not, the ticket is routed directly to the appropriate IT team.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-bold text-emerald-400 font-mono">4. ADMIN DASHBOARD</span>
              <h3 className="text-base font-semibold text-white">Full Visibility & Control</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Company admins can monitor all ticket statuses, view resolution metrics, and update documentation sources at any time from the dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* ONBOARDING SEQUENCE */}
        <section className="space-y-6 border-b border-slate-800/80 pb-12">
          <div className="flex items-center space-x-3 text-emerald-400">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-2xl font-bold text-white">Getting Started — Onboarding Sequence</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Sign up and create your organization account",
                desc: "Register your company on ITrix and set up your admin organization profile.",
              },
              {
                step: "02",
                title: "Add your IT documentation URLs",
                desc: "Provide links to your internal IT knowledge base articles. ITrix will crawl and index them (add as many as needed during onboarding or later).",
              },
              {
                step: "03",
                title: "Receive your integration credentials",
                desc: "Once at least one documentation source is indexed, ITrix generates your API Key, Widget Public Key, and HMAC Signing Secret.",
              },
              {
                step: "04",
                title: "Choose your integration method",
                desc: "Embed the ticket-raising widget on your intranet via NPM package or script tag, or connect directly using the REST API or MCP server.",
              },
              {
                step: "05",
                title: "Customize widget appearance",
                desc: "Configure your widget colors (background, accent, text) from the Widget Customization tab and copy the generated snippet.",
              },
              {
                step: "06",
                title: "Go live & monitor tickets",
                desc: "Employees can now raise IT support tickets seamlessly. Monitor all resolutions and routing in real time from your admin dashboard.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 sm:p-5 flex items-start space-x-4">
                <span className="text-emerald-400 font-mono font-bold text-base sm:text-lg bg-emerald-950/60 border border-emerald-500/20 px-3 py-1 rounded-lg shrink-0">
                  {item.step}
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INTEGRATION OPTIONS */}
        <section className="space-y-8 border-b border-slate-800/80 pb-12">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Package className="w-6 h-6" />
            <h2 className="text-2xl font-bold text-white">Integration Options</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Option A: NPM Package */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
                  Option A: NPM React Package
                </span>
                <a
                  href="https://www.npmjs.com/package/@itrix/widget"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1 font-mono transition"
                >
                  <span>npm: @itrix/widget</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-300 text-sm">
                Ideal for React, Next.js, or Remix web applications. Install natively into your frontend project tree.
              </p>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase font-mono">Terminal</div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-400">
                  <code>npm install @itrix/widget</code>
                </pre>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase font-mono">React Component Usage</div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
{`import { TicketWidget } from '@itrix/widget';

<TicketWidget 
  widgetKey="wpk_live_your_key" 
  apiUrl="https://itrixai.vercel.app"
  employee={{ id: "emp_1042", email: "alex@company.com", signature: "computed_hmac_signature" }} 
  theme={{ background: "#0F172A", foreground: "#10B981", text: "#FFFFFF" }} 
/>`}
                </pre>
              </div>
            </div>

            {/* Option B: Script Tag */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
                Option B: Script Tag Embed
              </span>
              <p className="text-slate-300 text-sm">
                Embed directly on any HTML page (WordPress, static HTML, PHP, Angular, Vue, etc.). No build step or framework required.
              </p>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
{`<script 
  src="https://itrixai.vercel.app/widget/v1/widget.js" 
  data-widget-key="wpk_live_your_key" 
  data-employee-id="emp_1042" 
  data-employee-email="alex@company.com" 
  data-signature="computed_hmac_signature" 
  data-api-url="https://itrixai.vercel.app"
  data-bg-color="#0F172A" 
  data-fg-color="#10B981" 
  data-text-color="#FFFFFF"
  async
></script>`}
              </pre>
            </div>

            {/* Option C: REST API */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
                  Option C: REST API
                </span>
                <a href="#rest-api" className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 font-mono">
                  <span>View Endpoint Reference below</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-300 text-sm">
                Connect custom backend services directly to ITrix endpoints using your secret API key passed via standard HTTP Bearer authentication:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200">
                Authorization: Bearer your_api_key_here
              </div>
            </div>

            {/* Option D: MCP Server */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20 uppercase tracking-wider">
                  Option D: MCP Server (AI Agents)
                </span>
                <a href="#mcp-server" className="text-xs text-purple-400 hover:underline flex items-center space-x-1 font-mono">
                  <span>View MCP Server Reference below</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-300 text-sm">
                Exposes ITrix ticket triage tools to autonomous AI agents via the Model Context Protocol at <code className="text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded font-mono">/api/mcp</code>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-400 pt-1">
                <div className="bg-slate-950 p-2 rounded border border-slate-800"><span className="text-purple-400 font-bold">create_ticket</span>: Submit & triage ticket</div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800"><span className="text-purple-400 font-bold">get_ticket</span>: Retrieve ticket by ID</div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800"><span className="text-purple-400 font-bold">list_employee_tickets</span>: Query past tickets</div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800"><span className="text-purple-400 font-bold">get_docs_index_status</span>: Check indexed docs</div>
              </div>
            </div>
          </div>
        </section>

        {/* IDENTITY & SECURITY */}
        <section id="hmac-verification" className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Lock className="w-6 h-6" />
            <h2 className="text-2xl font-bold text-white">Identity & Security Model</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            To prevent ticket spoofing or unauthorized access to an employee’s ticket history, employee identity parameters (<code className="text-emerald-300 font-mono">employeeId</code> and <code className="text-emerald-300 font-mono">employeeEmail</code>) passed into the widget or API must be signed by your backend server using your company’s <strong>HMAC Secret</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-2">
              <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Client-Side Safe</span>
              </span>
              <p className="text-slate-400">Your <strong>Widget Public Key</strong> (<code className="font-mono text-slate-300">wpk_live_...</code>) is intended for public inclusion in client-side HTML or React code.</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-2">
              <span className="font-bold text-amber-400 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Server-Side Secret</span>
              </span>
              <p className="text-slate-400">Your <strong>API Key</strong> and <strong>HMAC Secret</strong> must remain strictly on your backend server and never exposed to client browsers.</p>
            </div>
          </div>

          <div id="hmac-helper" className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Node.js HMAC Signature Helper</span>
            </h3>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-200 overflow-x-auto">
              <code>{hmacCodeExample}</code>
            </pre>
          </div>
        </section>

        {/* REST API ENDPOINT REFERENCE */}
        <section id="rest-api" className="space-y-8 border-b border-slate-800/80 pb-12">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Server className="w-6 h-6 text-emerald-400" />
            <span>REST API Endpoint Reference</span>
          </h2>

          <div className="space-y-6">
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
                Submits an employee IT support ticket for AI classification and resolution evaluation against company docs.
              </p>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Request Body (JSON)</h4>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300">
{`{
  "employeeId": "emp_1042",
  "employeeEmail": "alex@company.com",
  "signature": "c5b2a...", // HMAC-SHA256 of "emp_1042:alex@company.com"
  "ticketText": "I want to reset my password"
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
  "status": "needs_verification",
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
                Fetches a single ticket by ID. Enforces company scoping (returns 404 if ticket belongs to another organization).
              </p>
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
                Simple health check endpoint for uptime monitoring systems. Returns <code className="font-mono text-emerald-400 font-semibold">{"{ \"status\": \"ok\" }"}</code>.
              </p>
            </div>
          </div>
        </section>

        {/* MCP SERVER SECTION */}
        <section id="mcp-server" className="space-y-8">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-purple-400" />
            <span>Model Context Protocol (MCP) Server</span>
          </h2>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              ITrix provides an HTTP Model Context Protocol (MCP) server endpoint at <code className="text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded font-mono">/api/mcp</code>. AI tools (such as Claude Desktop, Cursor, or custom AI agents) can connect to execute ticket triage operations as native MCP tools.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm text-slate-200">
              POST https://itrixai.vercel.app/api/mcp
              <br />
              Authorization: Bearer <span className="text-emerald-400">your_api_key_here</span>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-slate-200">Example MCP Client Configuration (mcpServers)</h3>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto">
{`{
  "mcpServers": {
    "itrix-helpdesk": {
      "url": "https://itrixai.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer your_api_key_here"
      }
    }
  }
}`}
              </pre>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

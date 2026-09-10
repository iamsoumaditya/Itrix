# ITrix — Intelligent IT Ticket Resolution

> AI-powered internal IT ticket classification, documentation-backed instant resolution, and automated triage engine.

[![npm version](https://img.shields.io/npm/v/@itrix/widget.svg)](https://www.npmjs.com/package/@itrix/widget)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](packages/widget/LICENSE)
[![Live Platform](https://img.shields.io/badge/Live-itrixai.vercel.app-blue.svg)](https://itrixai.vercel.app)

---

## 1. What We Do

ITrix is an AI-powered internal IT ticket resolution platform for companies. 

Employees raise IT support tickets—such as password resets, software access requests, hardware faults, or VPN connection issues—through an embeddable widget on the company's website, portal, or intranet.

ITrix automatically classifies each ticket, evaluates it against the company's indexed internal IT documentation, and either:
1. **Resolves it instantly** with cited, accurate, step-by-step instructions derived from internal docs.
2. **Routes it to the right internal IT team** with complete context, category classification, and priority tagging.

Employees receive immediate help for routine issues, and IT staff avoid burning time on repetitive support requests.

---

## 2. How It Works

1. **Index Knowledge Base:** A company signs up and provides links to their existing internal IT documentation and help pages. ITrix reads and indexes those documents.
2. **Evaluate Support Requests:** When an employee submits a support request through the widget or API, ITrix checks the issue against the indexed documentation to determine if an accurate, verified resolution is available.
3. **Instant Resolution:** If a clear solution exists in company docs, the employee gets an immediate, documentation-backed resolution snippet with citations.
4. **Automated Team Routing:** If the issue requires human intervention or hardware handling, the ticket is categorized and dispatched to the designated internal team with full context attached.
5. **Admin Monitoring:** Company administrators get a dashboard to view all tickets, resolution metrics, and update documentation sources in real time.

---

## 3. Getting Started — Onboarding Sequence

To set up ITrix for an organization, follow these steps:

1. **Step 1: Sign up and create an organization account** — Register your company profile on the ITrix platform.
2. **Step 2: Add IT documentation URLs** — Enter links to your internal IT knowledge base articles. ITrix will crawl and index them.
3. **Step 3: Receive integration credentials** — Once documentation is indexed, obtain your **API Key**, **Widget Public Key**, and **HMAC Secret**.
4. **Step 4: Choose your integration method** — Embed the ticket widget using the NPM package or Script Tag, or connect via REST API or MCP Server.
5. **Step 5: Customize appearance** — Set custom background, accent, and text colors from the Widget Customization tab in the dashboard.
6. **Step 6: Go live & monitor** — Deploy the widget for your employees and track resolutions live from your admin dashboard.

---

## 4. Integration Options

### (a) NPM Package (`@itrix/widget`)
For React, Next.js, or Remix applications.

- **Package Name:** [`@itrix/widget`](https://www.npmjs.com/package/@itrix/widget)
- **Install:** `npm install @itrix/widget`
- **Usage:**
  ```tsx
  import { TicketWidget } from '@itrix/widget';

  <TicketWidget 
    widgetKey="wpk_live_your_key" 
    apiUrl="https://itrixai.vercel.app"
    employee={{ id: "emp_1042", email: "alex@company.com", signature: "computed_hmac_signature" }} 
    theme={{ background: "#0F172A", foreground: "#10B981", text: "#FFFFFF" }} 
  />
  ```

### (b) Script Tag (Any Web Page)
For non-React websites (HTML, WordPress, PHP, Vue, Angular, etc.). Works on any HTML page with zero build setup.

```html
<script 
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
></script>
```

### (c) REST API
For custom server-to-server integrations.

- **Base URL:** `https://itrixai.vercel.app/api/v1`
- **Authentication:** `Authorization: Bearer <your_api_key>`
- **Full Reference:** See the [REST API Documentation](https://itrixai.vercel.app/docs#rest-api).

### (d) MCP Server (Model Context Protocol)
For autonomous AI agents and developer toolkits (Claude Desktop, Cursor, AGY).

- **Server URL:** `https://itrixai.vercel.app/api/mcp`
- **Authentication:** `Authorization: Bearer <your_api_key>`
- **Exposed Tools:**
  - `create_ticket`: Submits a ticket for AI classification and resolution evaluation.
  - `get_ticket`: Fetches ticket details and resolution history by ID.
  - `list_employee_tickets`: Lists tickets scoped strictly to a specific employee.
  - `get_docs_index_status`: Retrieves company documentation crawling and index status.
- **Full Reference:** See the [MCP Server Documentation](https://itrixai.vercel.app/docs#mcp-server).

---

## 5. Identity & Security Model

To prevent ticket spoofing or unauthorized access to an employee's ticket history, employee identity parameters (`employeeId` and `employeeEmail`) passed into the widget or API must be signed by your backend server using your organization's **HMAC Secret**.

- **Widget Public Key (`wpk_live_...`):** Client-side safe. Safe to include in public HTML or frontend React code.
- **API Key & HMAC Secret:** Server-side only. Must never be exposed in client-side code or public browser scripts.

For detailed Node.js and Python HMAC code examples, refer to the [Identity & Security Guide](https://itrixai.vercel.app/docs#hmac-verification).

---

## 6. Local Development Setup

To run ITrix locally for development or contribution:

### Prerequisites
- Node.js 18+ & npm
- PostgreSQL database (or [Neon Serverless Postgres](https://neon.tech))
- [Clerk Authentication](https://clerk.com) account
- [Google Gemini API Key](https://aistudio.google.com)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/iamsoumaditya/Itrix.git
   cd Itrix
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the project root:
   ```env
   DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
   GEMINI_API_KEY=AIzaSy...
   ```

4. **Run Database Migrations & Seeds:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Build Widget Package & Standalone Script:**
   ```bash
   npm run build:widget
   ```

6. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:4000](http://localhost:4000) to access ITrix locally.

---

## 7. Project Structure

```
Itrix/
├── app/                        # Next.js App Router pages and API endpoints
│   ├── api/                    # REST API (/api/v1/*), MCP (/api/mcp), Webhooks
│   ├── dashboard/              # Admin dashboard & widget customization tab
│   ├── docs/                   # Public interactive API & Integration docs page
│   └── onboarding/             # Company onboarding wizard
├── packages/
│   └── widget/                 # Published NPM package (@itrix/widget)
│       ├── src/                # React component & standalone loader source
│       ├── dist/               # CJS, ESM, and .d.ts compiled outputs
│       ├── package.json        # Package configuration
│       └── README.md           # Package README
├── lib/                        # Shared utilities, DB schemas, AI triage logic
│   ├── db/                     # Drizzle ORM schema & Neon client connection
│   ├── ai/                     # Gemini AI classification & doc embedding engine
│   └── mcp/                    # MCP server implementation
├── drizzle/                    # SQL migration files
├── public/                     # Static assets & compiled widget (/widget/v1/widget.js)
└── package.json                # Workspace root scripts & dependencies
```

---

## 8. Tech Stack

- **Web Framework:** Next.js App Router (TypeScript, Turbopack)
- **Authentication:** Clerk (`@clerk/nextjs`) with Clerk Organizations
- **Database & ORM:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) + Drizzle ORM
- **AI & Embedding Engine:** Google Gemini API (`@google/genai`) + pgvector vector embeddings
- **Protocol:** Model Context Protocol (`@modelcontextprotocol/sdk`)
- **Widget Distribution:** `@itrix/widget` (React package) + `esbuild` IIFE standalone script

---

## 9. Full Documentation

For full API endpoint schemas, request/response payloads, and interactive integration guides, visit our live documentation page:

👉 **[https://itrixai.vercel.app/docs](https://itrixai.vercel.app/docs)**

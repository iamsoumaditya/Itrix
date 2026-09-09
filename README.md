# ITrix — Intelligent IT Ticket Resolution

ITrix is an enterprise platform that enables companies to index their own internal IT documentation and knowledge bases, allowing employees to raise IT support tickets (VPN access, password resets, hardware exchanges, access permissions) with instant AI-guided troubleshooting and seamless escalation to internal IT staff.

## Tech Stack
- **Framework**: Next.js App Router (TypeScript)
- **Authentication**: Clerk (@clerk/nextjs) with Clerk Organizations representing company accounts
- **Database**: Drizzle ORM + Neon PostgreSQL (@neondatabase/serverless)
- **Webhooks**: Svix signature verification for Clerk `organization.created` events
- **Styling**: Vanilla CSS + Tailwind CSS v4 + Lucide React Icons

## Getting Started

### 1. Environment Configuration
Create a `.env.local` file with the following variables:
```env
DATABASE_URL=postgresql://neondb_owner:...@ep-sample.aws.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

### 2. Database Migration & Seed
```bash
npm run db:push
npm run db:seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view ITrix.

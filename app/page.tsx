"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useUser,
  UserButton,
  OrganizationSwitcher,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import {
  FileText,
  ShieldCheck,
  Zap,
  Code2,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Database,
  Sliders,
  Terminal,
  Cpu,
  UserCheck,
} from "lucide-react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [sampleQuery, setSampleQuery] = useState(
    "How do I configure GlobalProtect VPN and reset Okta MFA on my corporate laptop?"
  );

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* ---------------- NAVIGATION HEADER ---------------- */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090D16]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              I
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              ITrix<span className="text-emerald-400"></span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
              How it works
            </a>
            <a href="#widget-demo" className="hover:text-emerald-400 transition-colors">
              Employee IT Widget
            </a>
            <Link href="/docs" className="hover:text-emerald-400 transition-colors">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {!isLoaded ? (
              <div className="h-9 w-24 bg-slate-900 rounded-lg animate-pulse" />
            ) : !isSignedIn ? (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-950/40"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <OrganizationSwitcher
                  appearance={{
                    theme: dark,
                    elements: {
                      organizationSwitcherTrigger:
                        "bg-slate-900 border border-slate-700/80 text-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-sm",
                      organizationPreviewTextContainer: "text-slate-100",
                      organizationPreviewMainIdentifier: "text-slate-100 font-semibold",
                      organizationPreviewSecondaryIdentifier: "text-slate-400",
                      organizationSwitcherTriggerIcon: "text-slate-300",
                    },
                  }}
                />
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all"
                >
                  Dashboard
                </Link>
                <UserButton />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- HERO SECTION ---------------- */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Intelligent Internal IT Helpdesk Automation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Help your IT team resolve{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                employee IT tickets
              </span>{" "}
              faster
            </h1>

            <p className="mt-6 text-lg text-slate-300 leading-relaxed">
              Index your company's internal IT knowledge base so your employees get instant, accurate IT troubleshooting for password resets, VPN access, and hardware requests — before tickets reach your IT staff.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span>Automate IT Helpdesk</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-6 py-3.5 text-base font-medium rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <span>See Architecture</span>
              </a>
            </div>
          </div>

          {/* Concrete Visual of Employee Question -> AI IT Resolution citing internal IT doc */}
          <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-slate-950 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">
                  it-helpdesk-session #4921
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Internal IT Doc Citation</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Employee IT Ticket Question */}
              <div className="flex gap-3 items-start bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                <div className="h-8 w-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                  EMP
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Employee (alex.dev@acmecorp.internal)
                    </span>
                    <span className="text-[11px] text-slate-500">Just now</span>
                  </div>
                  <p className="text-sm text-slate-200 mt-1 font-sans">
                    {sampleQuery}
                  </p>
                </div>
              </div>

              {/* AI IT Resolution & Cited Internal IT Doc */}
              <div className="flex gap-3 items-start bg-slate-900 p-4 rounded-xl border border-emerald-500/30">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  IT
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      ITrix
                    </span>
                    <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                      Category: VPN & Access | Priority: High
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    Download the GlobalProtect client v6.1+ from the internal software portal, set portal address to <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">vpn.acmecorp.com</code>, and authenticate using Okta SSO. If locked out, initiate a self-service MFA reset via your manager authorization link.
                  </p>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                    <div className="flex items-center justify-between text-slate-400 mb-1 border-b border-slate-800/80 pb-1">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        Docs Source
                      </span>
                      <a
                        href="https://it-docs.acmecorp.com/vpn-access-guide"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        it-docs.acmecorp.com/vpn-access-guide
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-400 italic">
                      "Section 3.2: Corporate VPN Configuration & Okta Multi-Factor Authentication Reset Procedure"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS (NUMBERED SEQUENTIAL STEPS) ---------------- */}
      <section id="how-it-works" className="py-20 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white">How ITrix Automates Employee IT Support</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Three simple steps to deploy an intelligent IT helpdesk layer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-lg flex items-center justify-center mb-5">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Index Docs
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Paste your documentation root URL. ITrix automatically indexes IT policies, software guides, and troubleshooting steps.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-lg flex items-center justify-center mb-5">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Embed Employee IT Widget
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Embed our widget on your company portal. Secure employee identity with HMAC signatures generated on your backend.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-lg flex items-center justify-center mb-5">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Instant IT Resolution & Escalation
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your employees get instant answers to common IT questions, while complex hardware/access requests are categorized and routed straight to your IT staff dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- EMPLOYEE WIDGET IN CONTEXT DEMO ---------------- */}
      <section id="widget-demo" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white">Embedded Employee IT Experience</h2>
          <p className="text-slate-400 mt-2 text-sm">
            See how the IT ticket-raising widget renders natively on your internal employee portal
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Internal Portal Mock Header */}
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
                AC
              </div>
              <span className="text-sm font-semibold text-slate-200">
                Acme Corp Employee Intranet (Portal Preview)
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              data-org-key="org_live_acme_corp"
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
                Seamless Internal IT Integration
              </span>
              <h3 className="text-2xl font-bold text-white">
                Zero friction for employees, maximum efficiency for IT admins
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Employees submit IT tickets directly from your company intranet. The widget consults your indexed IT wiki, resolves standard troubleshooting questions, and escalates remaining requests with full category, priority, and verified employee ID.
              </p>
              <div className="pt-2 flex items-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Custom theme matching intranet</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>HMAC signed employee identity</span>
                </div>
              </div>
            </div>

            {/* Employee Widget Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
                <div className="bg-emerald-600 p-4 flex items-center justify-between text-slate-950 font-semibold">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Employee Helpdesk</span>
                  </div>
                  <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded font-mono">
                    Online
                  </span>
                </div>
                <div className="p-4 space-y-3 text-xs">
                  <div className="bg-slate-800 p-3 rounded-lg text-slate-200">
                    Hello! How can the IT team assist you with hardware or software today?
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg text-right font-medium">
                    How do I request a replacement laptop charger?
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg text-slate-200 space-y-2">
                    <p>File an IT Hardware Request on portal page /it-hardware. IT staff will fulfill it at Building B IT Desk.</p>
                    <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 border-t border-slate-700 pt-1">
                      <FileText className="w-3 h-3" />
                      Cited: it-docs.acme.com/hardware-exchange
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value="Ask an IT support question..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 outline-none cursor-not-allowed"
                  />
                  <button className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="py-12 border-t border-slate-800/80 bg-[#090D16] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              I
            </div>
            <span className="font-semibold text-slate-200">
              ITrix &copy; {new Date().getFullYear()} — Intelligent IT Ticket Resolution
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/docs" className="hover:text-slate-200">
              Documentation
            </Link>
            <Link href="/sign-in" className="hover:text-slate-200">
              Company Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

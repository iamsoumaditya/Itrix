"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganization } from "@clerk/nextjs";
import {
  Key,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  FileText,
} from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  apiKey: string;
  hmacSecret: string;
  onboardingStatus: string;
}

interface DocPageItem {
  id: string;
  url: string;
  normalizedUrl?: string;
  status: "queued" | "crawling" | "extracting" | "embedding" | "indexed" | "failed";
  pageCount: number;
  errorMessage?: string;
  lastCrawledAt?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

  const [step, setStep] = useState<"credentials" | "docs">("credentials");
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Copy state
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Docs crawling state
  const [urlInput, setUrlInput] = useState("");
  const [docPages, setDocPages] = useState<DocPageItem[]>([]);
  const [addingUrl, setAddingUrl] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<{
    url: string;
    pageId?: string;
    status: string;
    errorMessage?: string;
    message: string;
  } | null>(null);

  // Fetch or sync company data on load
  useEffect(() => {
    async function initCompany() {
      try {
        const orgId = organization?.id || `org_personal_${user?.id || "demo"}`;
        const orgName = organization?.name || `${user?.firstName || "Company"}'s IT Dept`;

        const res = await fetch("/api/company/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, orgName }),
        });

        const data = await res.json();
        if (data.company) {
          setCompany(data.company);
          if (data.company.onboardingStatus === "completed") {
            // Already completed, redirect to dashboard
            router.push("/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("Error syncing company on onboarding:", err);
      } finally {
        setLoadingCompany(false);
      }
    }

    if (isUserLoaded && isOrgLoaded) {
      initCompany();
    }
  }, [isUserLoaded, isOrgLoaded, organization, user, router]);

  // Fetch existing docs pages if any
  const fetchDocPages = async (companyId: string) => {
    try {
      const res = await fetch(`/api/docs/list?companyId=${companyId}`);
      const data = await res.json();
      if (data.pages) {
        setDocPages(data.pages);
      }
    } catch (err) {
      console.error("Error fetching doc pages:", err);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchDocPages(company.id);
    }
  }, [company?.id]);

  // Live polling (1.5s interval) while any doc is in progress
  useEffect(() => {
    if (!company?.id) return;

    const hasProcessing = docPages.some((p) =>
      ["queued", "crawling", "extracting", "embedding"].includes(p.status)
    );

    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchDocPages(company.id);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [company?.id, docPages]);

  const handleCopyKey = () => {
    if (company?.apiKey) {
      navigator.clipboard.writeText(company.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopySecret = () => {
    if (company?.hmacSecret) {
      navigator.clipboard.writeText(company.hmacSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !company) return;

    setAddingUrl(true);
    setDuplicateNotice(null);
    const targetUrl = urlInput.trim();

    try {
      const res = await fetch("/api/docs/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          url: targetUrl,
        }),
      });

      const data = await res.json();
      if (data.isDuplicate) {
        setDuplicateNotice({
          url: targetUrl,
          pageId: data.existingPage?.id,
          status: data.status,
          errorMessage: data.errorMessage,
          message: data.message || "This URL has already been added.",
        });
      } else {
        setUrlInput("");
      }
      await fetchDocPages(company.id);
    } catch (err) {
      console.error("Error adding doc URL:", err);
    } finally {
      setAddingUrl(false);
    }
  };

  const handleReCrawl = async (pageId: string, url?: string) => {
    if (!company) return;
    setDuplicateNotice(null);
    try {
      await fetch("/api/docs/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          pageId,
          url,
          action: "recrawl",
        }),
      });
      await fetchDocPages(company.id);
    } catch (err) {
      console.error("Error initiating re-crawl:", err);
    }
  };

  const handleRemoveUrl = async (pageId: string) => {
    if (!company) return;
    try {
      await fetch("/api/docs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      setDocPages((prev) => prev.filter((p) => p.id !== pageId));
    } catch (err) {
      console.error("Error removing URL:", err);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!company) return;
    setCompleting(true);
    try {
      await fetch("/api/company/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setCompleting(false);
    }
  };

  const hasIndexedDoc = docPages.some((p) => p.status === "indexed");

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-slate-300">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span>Setting up ITrix enterprise workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#090D16] text-slate-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Header indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              I
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                ITrix Enterprise Onboarding
              </h1>
              <p className="text-xs text-slate-400">
                Company: <span className="text-emerald-400 font-medium">{company?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-3 py-1 rounded-full font-medium ${
                step === "credentials"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              1. Security Keys
            </span>
            <span className="text-slate-600">&rarr;</span>
            <span
              className={`px-3 py-1 rounded-full font-medium ${
                step === "docs"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              2. Crawl IT Docs
            </span>
          </div>
        </div>

        {/* STEP 1: API KEYS & HMAC SECRET REVEAL ONCE */}
        {step === "credentials" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                API Credentials & HMAC Secret
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                These security keys uniquely identify your company organization and sign embedded widget employee identity.
              </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-amber-200 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-amber-300">Important Warning:</strong> Save your HMAC Secret now. For security, your HMAC Secret will not be displayed in full again in your company dashboard settings.
              </div>
            </div>

            {/* API Key Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                Company API Key
              </label>
              <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-sm">
                <span className="flex-1 text-emerald-300 truncate select-all">
                  {company?.apiKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-medium flex items-center gap-1.5 transition-all"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* HMAC Secret Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                HMAC Employee Identity Secret
              </label>
              <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-sm">
                <span className="flex-1 text-emerald-300 truncate select-all">
                  {company?.hmacSecret}
                </span>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-medium flex items-center gap-1.5 transition-all"
                >
                  {copiedSecret ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep("docs")}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Continue to Documentation Crawl</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DOCS CRAWLER STEP */}
        {step === "docs" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                Crawl Documentation
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Paste your documentation URL. Our crawler will recursively index policies, software guides, and troubleshooting steps.
              </p>
            </div>

            {/* Add URL Form */}
            <form onSubmit={handleAddUrl} className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="https://docs.yourcompany.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={addingUrl}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {addingUrl ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Add URL</span>
              </button>
            </form>

            {/* Duplicate URL Alert Banner */}
            {duplicateNotice && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between gap-4 text-amber-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">
                      {duplicateNotice.message}
                    </span>{" "}
                    (Current status:{" "}
                    <span className="capitalize font-mono text-amber-200">
                      {duplicateNotice.status}
                    </span>
                    {duplicateNotice.errorMessage
                      ? `: ${duplicateNotice.errorMessage}`
                      : ""}
                    )
                  </div>
                </div>
                {duplicateNotice.pageId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleReCrawl(duplicateNotice.pageId!, duplicateNotice.url)
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs shrink-0 transition-colors shadow"
                  >
                    Re-crawl Now
                  </button>
                )}
              </div>
            )}

            {/* List of URLs */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Crawled Documentation Links ({docPages.length})
              </label>

              {docPages.length === 0 ? (
                <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  No documentation links added yet. Paste a URL above to start crawling.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {docPages.map((page) => (
                    <div
                      key={page.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-200 truncate">
                            {page.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* Granular status badges */}
                          {page.status === "queued" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1">
                              Queued
                            </span>
                          )}
                          {page.status === "crawling" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                              Crawling...
                            </span>
                          )}
                          {page.status === "extracting" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                              Extracting text...
                            </span>
                          )}
                          {page.status === "embedding" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                              Generating embeddings...
                            </span>
                          )}
                          {page.status === "indexed" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Indexed ({page.pageCount} pages)
                            </span>
                          )}
                          {page.status === "failed" && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              Failed
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleReCrawl(page.id, page.url)}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium transition-colors"
                            title="Re-crawl URL"
                          >
                            Re-crawl
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveUrl(page.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                            title="Remove URL"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Error message detail if failed */}
                      {page.status === "failed" && page.errorMessage && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-rose-300 text-[11px] flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{page.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Done Action */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("credentials")}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                &larr; Back to Security Keys
              </button>

              <button
                type="button"
                disabled={!hasIndexedDoc || completing}
                onClick={handleFinishOnboarding}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all"
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Complete Onboarding & Go to Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

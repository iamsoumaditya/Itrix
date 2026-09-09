"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, useOrganization, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import {
  FileText,
  Ticket as TicketIcon,
  Play,
  Palette,
  Settings,
  Plus,
  RefreshCw,
  Trash2,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Key,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Send,
  AlertCircle,
  FolderTree,
  Tag,
  SlidersHorizontal,
  Lock,
  PlusCircle,
  FileCode,
  Zap,
  Edit3,
  Clock,
  History,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  apiKey: string;
  hmacSecret: string;
  widgetPublicKey?: string;
  onboardingStatus: string;
  createdAt?: string;
}

interface DocPage {
  id: string;
  url: string;
  normalizedUrl?: string;
  status: "queued" | "crawling" | "extracting" | "embedding" | "indexed" | "failed";
  pageCount: number;
  errorMessage?: string;
  lastCrawledAt?: string;
  createdAt?: string;
}

interface TicketCategoryItem {
  id: string;
  companyId: string | null;
  name: string;
  description?: string | null;
  autoResolvable: boolean;
  defaultRoutingTeam?: string | null;
}

interface TicketPriorityItem {
  id: string;
  companyId: string | null;
  name: string;
  rank: number;
}

interface TicketItem {
  id: string;
  companyId: string;
  employeeId: string;
  ticketText: string;
  category: string;
  priority: string;
  confidence: number;
  suggestedResolution?: string;
  routingTeam?: string | null;
  sourceReferences?: Array<{ page_url: string; section_title?: string }>;
  autoResolveEligible?: boolean;
  needsManualReview?: boolean;
  status: "auto_resolved" | "needs_review" | "pending";
  resolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export default function CompanyDashboard() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

  const [activeTab, setActiveTab] = useState<
    "docs" | "categories" | "tickets" | "raise" | "playground" | "widget" | "settings"
  >("docs");

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Docs Tab State
  const [docsList, setDocsList] = useState<DocPage[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocUrl, setNewDocUrl] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);
  const [duplicateDocNotice, setDuplicateDocNotice] = useState<{
    url: string;
    pageId?: string;
    status: string;
    errorMessage?: string;
    message: string;
  } | null>(null);

  // Categories & Priorities Tab State
  const [categoriesList, setCategoriesList] = useState<TicketCategoryItem[]>([]);
  const [prioritiesList, setPrioritiesList] = useState<TicketPriorityItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatAutoResolvable, setNewCatAutoResolvable] = useState(false);
  const [newCatRoutingTeam, setNewCatRoutingTeam] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [showAddPrioModal, setShowAddPrioModal] = useState(false);
  const [newPrioName, setNewPrioName] = useState("");
  const [newPrioRank, setNewPrioRank] = useState(2);
  const [addingPrio, setAddingPrio] = useState(false);

  // Tickets Tab State
  const [ticketsList, setTicketsList] = useState<TicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("all");
  const [searchEmployee, setSearchEmployee] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [markingResolvedId, setMarkingResolvedId] = useState<string | null>(null);

  // Resolution History & Solution Editing State
  const [ticketHistory, setTicketHistory] = useState<Array<{
    id: string;
    version: number;
    resolution: string;
    updatedBy: string;
    notes?: string | null;
    createdAt: string;
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [editedSolutionText, setEditedSolutionText] = useState("");
  const [updatingSolution, setUpdatingSolution] = useState(false);
  const [updateSolutionError, setUpdateSolutionError] = useState<string | null>(null);

  const fetchTicketHistory = async (ticketId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/tickets/history?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.history) {
        setTicketHistory(data.history);
      }
    } catch (err) {
      console.error("Error fetching resolution history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedTicket?.id) {
      setIsEditingSolution(false);
      setEditedSolutionText(selectedTicket.suggestedResolution || "");
      setUpdateSolutionError(null);
      fetchTicketHistory(selectedTicket.id);
    } else {
      setTicketHistory([]);
    }
  }, [selectedTicket?.id]);

  const handleUpdateSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !editedSolutionText.trim()) return;

    setUpdatingSolution(true);
    setUpdateSolutionError(null);

    try {
      const res = await fetch("/api/tickets/update-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          resolution: editedSolutionText.trim(),
          notes: "Updated solution from admin dashboard",
        }),
      });

      const data = await res.json();
      if (data.error) {
        setUpdateSolutionError(data.error);
      } else {
        setIsEditingSolution(false);
        const updatedText = editedSolutionText.trim();
        setSelectedTicket((prev) =>
          prev ? { ...prev, suggestedResolution: updatedText } : null
        );
        setTicketsList((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id ? { ...t, suggestedResolution: updatedText } : t
          )
        );
        await fetchTicketHistory(selectedTicket.id);
      }
    } catch (err) {
      console.error("Error updating solution:", err);
      setUpdateSolutionError("An unexpected error occurred while updating the solution.");
    } finally {
      setUpdatingSolution(false);
    }
  };

  // Raise Ticket Form State (Saves to DB)
  const [raiseEmployeeId, setRaiseEmployeeId] = useState("emp_alex_99");
  const [raiseTicketText, setRaiseTicketText] = useState("");
  const [processingRaise, setProcessingRaise] = useState(false);
  const [raiseResult, setRaiseResult] = useState<any | null>(null);
  const [raiseError, setRaiseError] = useState<string | null>(null);

  // Playground State (Does NOT save to DB)
  const [playgroundEmployeeId, setPlaygroundEmployeeId] = useState("emp_test_user");
  const [playgroundInput, setPlaygroundInput] = useState("");
  const [playgroundResponse, setPlaygroundResponse] = useState<any | null>(null);
  const [askingPlayground, setAskingPlayground] = useState(false);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  // Widget Customization State
  const [widgetBgColor, setWidgetBgColor] = useState("#0F172A");
  const [widgetFgColor, setWidgetFgColor] = useState("#10B981");
  const [widgetTextColor, setWidgetTextColor] = useState("#FFFFFF");
  const [copiedScriptSnippet, setCopiedScriptSnippet] = useState(false);
  const [copiedNpmSnippet, setCopiedNpmSnippet] = useState(false);

  // Settings State
  const [revealApiKey, setRevealApiKey] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [rotatedKeyAlert, setRotatedKeyAlert] = useState<string | null>(null);

  // Load company details
  const fetchCompanyData = async () => {
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
      }
    } catch (err) {
      console.error("Error fetching company:", err);
    } finally {
      setLoadingCompany(false);
    }
  };

  useEffect(() => {
    if (isUserLoaded && isOrgLoaded) {
      fetchCompanyData();
    }
  }, [isUserLoaded, isOrgLoaded, organization, user]);

  // Load docs pages
  const fetchDocs = async () => {
    if (!company?.id) return;
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/docs/list?companyId=${company.id}`);
      const data = await res.json();
      if (data.pages) {
        setDocsList(data.pages);
      }
    } catch (err) {
      console.error("Error fetching docs list:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Load categories & priorities
  const fetchCategoriesAndPriorities = async () => {
    if (!company?.id) return;
    setLoadingCategories(true);
    try {
      const res = await fetch(`/api/categories?companyId=${company.id}`);
      const data = await res.json();
      if (data.categories) setCategoriesList(data.categories);
      if (data.priorities) setPrioritiesList(data.priorities);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load tickets
  const fetchTickets = async () => {
    if (!company?.id) return;
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams();
      params.append("companyId", company.id);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (resolvedFilter !== "all") params.append("resolved", resolvedFilter);
      if (searchEmployee.trim()) params.append("searchEmployee", searchEmployee.trim());

      const res = await fetch(`/api/tickets/list?${params.toString()}`);
      const data = await res.json();
      if (data.tickets) {
        setTicketsList(data.tickets);
      }
    } catch (err) {
      console.error("Error fetching tickets list:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleMarkResolved = async (ticketId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMarkingResolvedId(ticketId);
    try {
      const res = await fetch("/api/tickets/mark-resolved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicketsList((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  resolved: true,
                  resolvedBy: data.ticket.resolvedBy,
                  resolvedAt: data.ticket.resolvedAt,
                }
              : t
          )
        );
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket((prev) =>
            prev
              ? {
                  ...prev,
                  resolved: true,
                  resolvedBy: data.ticket.resolvedBy,
                  resolvedAt: data.ticket.resolvedAt,
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error("Error marking ticket as resolved:", err);
    } finally {
      setMarkingResolvedId(null);
    }
  };

  useEffect(() => {
    if (company?.id) {
      if (activeTab === "docs") fetchDocs();
      if (activeTab === "categories") fetchCategoriesAndPriorities();
      if (activeTab === "tickets") fetchTickets();
    }
  }, [company?.id, activeTab, statusFilter, resolvedFilter, searchEmployee]);

  // Live polling (1.5s interval) while any doc is in progress in the Docs tab
  useEffect(() => {
    if (!company?.id || activeTab !== "docs") return;

    const hasProcessing = docsList.some((p) =>
      ["queued", "crawling", "extracting", "embedding"].includes(p.status)
    );

    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchDocs();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [company?.id, activeTab, docsList]);

  // Add new doc link
  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocUrl.trim() || !company) return;

    setAddingDoc(true);
    setDuplicateDocNotice(null);
    const targetUrl = newDocUrl.trim();

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
        setDuplicateDocNotice({
          url: targetUrl,
          pageId: data.existingPage?.id,
          status: data.status,
          errorMessage: data.errorMessage,
          message: data.message || "This URL has already been added.",
        });
      } else {
        setNewDocUrl("");
        setShowAddDocModal(false);
      }
      await fetchDocs();
    } catch (err) {
      console.error("Error adding new doc URL:", err);
    } finally {
      setAddingDoc(false);
    }
  };

  // Re-crawl doc link
  const handleReCrawl = async (pageId: string, url?: string) => {
    if (!company) return;
    setDuplicateDocNotice(null);
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
      await fetchDocs();
    } catch (err) {
      console.error("Error re-crawling doc page:", err);
    }
  };

  // Remove doc link
  const handleRemoveDoc = async (pageId: string) => {
    try {
      await fetch("/api/docs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      setDocsList((prev) => prev.filter((p) => p.id !== pageId));
    } catch (err) {
      console.error("Error deleting doc page:", err);
    }
  };

  // Add custom category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !company) return;

    setAddingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          companyId: company.id,
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          autoResolvable: newCatAutoResolvable,
          defaultRoutingTeam: newCatRoutingTeam.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.category) {
        setCategoriesList((prev) => [...prev, data.category]);
        setNewCatName("");
        setNewCatDesc("");
        setNewCatAutoResolvable(false);
        setNewCatRoutingTeam("");
        setShowAddCatModal(false);
      }
    } catch (err) {
      console.error("Error adding category:", err);
    } finally {
      setAddingCat(false);
    }
  };

  // Delete custom category
  const handleDeleteCategory = async (catId: string) => {
    if (!company) return;
    try {
      await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          id: catId,
          companyId: company.id,
        }),
      });
      setCategoriesList((prev) => prev.filter((c) => c.id !== catId));
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  // Add custom priority
  const handleAddPriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrioName.trim() || !company) return;

    setAddingPrio(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "priority",
          companyId: company.id,
          name: newPrioName.trim(),
          rank: Number(newPrioRank),
        }),
      });
      const data = await res.json();
      if (data.priority) {
        setPrioritiesList((prev) => [...prev, data.priority]);
        setNewPrioName("");
        setNewPrioRank(2);
        setShowAddPrioModal(false);
      }
    } catch (err) {
      console.error("Error adding priority:", err);
    } finally {
      setAddingPrio(false);
    }
  };

  // Delete custom priority
  const handleDeletePriority = async (prioId: string) => {
    if (!company) return;
    try {
      await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "priority",
          id: prioId,
          companyId: company.id,
        }),
      });
      setPrioritiesList((prev) => prev.filter((p) => p.id !== prioId));
    } catch (err) {
      console.error("Error deleting priority:", err);
    }
  };

  // Submit Raise Ticket Form (SAVED to DB)
  const handleRaiseTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRaiseError(null);
    setRaiseResult(null);

    // Edge Case 1 validation
    if (!raiseTicketText || raiseTicketText.trim().length === 0) {
      setRaiseError("Please provide a ticket description before submitting.");
      return;
    }

    if (!company) return;

    setProcessingRaise(true);
    try {
      const res = await fetch("/api/tickets/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          employeeId: raiseEmployeeId.trim() || "emp_guest",
          ticketText: raiseTicketText.trim(),
          isPlayground: false, // SAVES TO DB
        }),
      });

      const data = await res.json();
      if (data.error) {
        setRaiseError(data.error);
      } else {
        setRaiseResult(data);
      }
    } catch (err) {
      console.error("Error processing raised ticket:", err);
      setRaiseError("An unexpected error occurred while processing the ticket.");
    } finally {
      setProcessingRaise(false);
    }
  };

  // Submit Playground Form (Does NOT save to DB)
  const handlePlaygroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlaygroundError(null);
    setPlaygroundResponse(null);

    if (!playgroundInput || playgroundInput.trim().length === 0) {
      setPlaygroundError("Please provide a ticket description before submitting.");
      return;
    }

    if (!company) return;

    setAskingPlayground(true);
    try {
      const res = await fetch("/api/tickets/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          employeeId: playgroundEmployeeId.trim() || "emp_test_user",
          ticketText: playgroundInput.trim(),
          isPlayground: true, // DOES NOT SAVE TO DB
        }),
      });

      const data = await res.json();
      if (data.error) {
        setPlaygroundError(data.error);
      } else {
        setPlaygroundResponse(data);
      }
    } catch (err) {
      console.error("Error running playground simulation:", err);
      setPlaygroundError("An unexpected error occurred during simulation.");
    } finally {
      setAskingPlayground(false);
    }
  };

  // Rotate API Key handler
  const handleRotateKey = async () => {
    if (!company) return;
    setRotatingKey(true);
    setRotatedKeyAlert(null);
    try {
      const res = await fetch("/api/company/rotate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const data = await res.json();
      if (data.apiKey) {
        setCompany((prev) => (prev ? { ...prev, apiKey: data.apiKey } : null));
        setRotatedKeyAlert(data.apiKey);
      }
    } catch (err) {
      console.error("Error rotating API key:", err);
    } finally {
      setRotatingKey(false);
    }
  };

  // Code snippets generation
  const scriptTagSnippet = `<script src="https://yourplatform.com/widget.js"\n  data-org-key="${company?.id || "org_key"}"\n  data-bg-color="${widgetBgColor}"\n  data-fg-color="${widgetFgColor}"\n  data-text-color="${widgetTextColor}">\n</script>`;

  const npmSnippet = `// Note: Compute hmacSignature on your company backend using your hmac_secret\nimport { TicketWidget } from '@yourplatform/ticket-widget';\n\n<TicketWidget\n  orgKey="${company?.id || "org_key"}"\n  theme={{\n    background: "${widgetBgColor}",\n    foreground: "${widgetFgColor}",\n    text: "${widgetTextColor}"\n  }}\n  user={{\n    id: employeeId, // Employee ID e.g. emp_12345\n    email: employeeEmail,\n    hmacSignature: signature // Computed via HMAC SHA256 using hmac_secret\n  }}\n/>`;

  const copyToClipboard = (text: string, type: "script" | "npm") => {
    navigator.clipboard.writeText(text);
    if (type === "script") {
      setCopiedScriptSnippet(true);
      setTimeout(() => setCopiedScriptSnippet(false), 2000);
    } else {
      setCopiedNpmSnippet(true);
      setTimeout(() => setCopiedNpmSnippet(false), 2000);
    }
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-slate-300">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span>Loading ITrix IT staff dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ---------------- HEADER NAVBAR ---------------- */}
      <header className="sticky top-0 z-40 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
                I
              </div>
              <span className="font-bold text-white tracking-tight text-lg">
                ITrix<span className="text-emerald-400"></span>
              </span>
            </Link>

            <span className="text-slate-700">|</span>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <OrganizationSwitcher
                appearance={{
                  theme: dark,
                  elements: {
                    organizationSwitcherTrigger:
                      "bg-slate-900 border border-slate-700/80 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-all shadow-sm",
                    organizationPreviewTextContainer: "text-slate-100",
                    organizationPreviewMainIdentifier: "text-slate-100 font-semibold",
                    organizationPreviewSecondaryIdentifier: "text-slate-400",
                    organizationSwitcherTriggerIcon: "text-slate-300",
                  },
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Org Status: {company?.onboardingStatus || "completed"}</span>
            </div>

            <UserButton />
          </div>
        </div>
      </header>

      {/* ---------------- MAIN DASHBOARD BODY ---------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("docs")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "docs"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Docs</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-950/30 text-[11px] font-mono">
              {docsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "categories"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Categories & Priorities</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "tickets"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <TicketIcon className="w-4 h-4" />
            <span>Tickets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("raise")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "raise"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Raise Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("playground")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "playground"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Playground</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("widget")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "widget"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Widget Customization</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "settings"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* ==================== TAB 1: DOCS ==================== */}
        {activeTab === "docs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Docs
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage documentation sources for automated ticket triage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddDocModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Link</span>
              </button>
            </div>

            {/* Duplicate Notice Banner */}
            {duplicateDocNotice && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between gap-4 text-amber-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">
                      {duplicateDocNotice.message}
                    </span>{" "}
                    (Current status:{" "}
                    <span className="capitalize font-mono text-amber-200">
                      {duplicateDocNotice.status}
                    </span>
                    {duplicateDocNotice.errorMessage
                      ? `: ${duplicateDocNotice.errorMessage}`
                      : ""}
                    )
                  </div>
                </div>
                {duplicateDocNotice.pageId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleReCrawl(
                        duplicateDocNotice.pageId!,
                        duplicateDocNotice.url
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs shrink-0 transition-colors shadow"
                  >
                    Re-crawl Now
                  </button>
                )}
              </div>
            )}

            {/* Docs Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {loadingDocs ? (
                <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading IT documentation sources...</span>
                </div>
              ) : docsList.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Globe className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-base font-semibold text-white">No IT docs crawled yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Add your internal IT wiki root URL to begin crawling pages for automated employee ticket triage.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateDocNotice(null);
                      setShowAddDocModal(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold"
                  >
                    + Add First IT Doc Link
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">IT Documentation URL</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Pages Indexed</th>
                        <th className="px-6 py-4">Last Crawled</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {docsList.map((doc) => (
                        <React.Fragment key={doc.id}>
                          <tr className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4 font-sans text-slate-200 truncate max-w-xs">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-emerald-400 hover:underline flex items-center gap-1.5"
                              >
                                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{doc.url}</span>
                              </a>
                            </td>
                            <td className="px-6 py-4">
                              {doc.status === "queued" && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-sans font-medium">
                                  Queued
                                </span>
                              )}
                              {doc.status === "crawling" && (
                                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-sans font-medium flex items-center gap-1.5 w-fit">
                                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                                  Crawling...
                                </span>
                              )}
                              {doc.status === "extracting" && (
                                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-sans font-medium flex items-center gap-1.5 w-fit">
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                                  Extracting text...
                                </span>
                              )}
                              {doc.status === "embedding" && (
                                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-sans font-medium flex items-center gap-1.5 w-fit">
                                  <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                                  Generating embeddings...
                                </span>
                              )}
                              {doc.status === "indexed" && (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-sans font-medium flex items-center gap-1.5 w-fit">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Indexed ({doc.pageCount} pages)
                                </span>
                              )}
                              {doc.status === "failed" && (
                                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-sans font-medium flex items-center gap-1.5 w-fit">
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-200">{doc.pageCount || 0}</td>
                            <td className="px-6 py-4 text-slate-400 text-[11px]">
                              {doc.lastCrawledAt
                                ? new Date(doc.lastCrawledAt).toLocaleString()
                                : "Just now"}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleReCrawl(doc.id, doc.url)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-medium inline-flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Re-crawl</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc(doc.id)}
                                className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors inline-flex"
                                title="Delete URL"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          {doc.status === "failed" && doc.errorMessage && (
                            <tr className="bg-rose-500/5">
                              <td colSpan={5} className="px-6 py-2.5 border-b border-rose-500/10">
                                <div className="flex items-center gap-2 text-rose-300 text-xs font-sans">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span>{doc.errorMessage}</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal: Add New Link */}
            {showAddDocModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      Add IT Documentation Link
                    </h3>
                    <button
                      onClick={() => {
                        setDuplicateDocNotice(null);
                        setShowAddDocModal(false);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleAddDoc} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        IT Documentation URL
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="https://it-docs.yourcompany.com/vpn"
                        value={newDocUrl}
                        onChange={(e) => setNewDocUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500"
                      />
                    </div>

                    {duplicateDocNotice && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2 text-amber-200 text-xs font-sans">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-300">
                              {duplicateDocNotice.message}
                            </span>
                            <div className="mt-0.5 text-[11px] text-amber-200/80">
                              Status: <span className="capitalize font-mono">{duplicateDocNotice.status}</span>
                              {duplicateDocNotice.errorMessage ? ` — ${duplicateDocNotice.errorMessage}` : ""}
                            </div>
                          </div>
                        </div>
                        {duplicateDocNotice.pageId && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddDocModal(false);
                                handleReCrawl(
                                  duplicateDocNotice.pageId!,
                                  duplicateDocNotice.url
                                );
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-colors shadow"
                            >
                              Re-crawl Existing Link Now
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddDocModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingDoc}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-2 disabled:opacity-50"
                      >
                        {addingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Start Crawling & Embedding</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: CATEGORIES & PRIORITIES ==================== */}
        {activeTab === "categories" && (
          <div className="space-y-8">
            {/* Section 1: Categories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-emerald-400" />
                    Ticket Categories
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage categories and default routing teams. Global defaults are marked with a locked badge.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoriesList.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-white flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-emerald-400" />
                          {cat.name}
                        </span>
                        {cat.companyId === null ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-500" />
                            Default
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-slate-500 hover:text-rose-400"
                            title="Delete custom category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">
                        {cat.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Default Routing Team:</span>
                      <span className="text-emerald-300 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {cat.defaultRoutingTeam || "General IT Team"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Priorities */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
                    Ticket Priorities
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Priorities and sort ranks used for routing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPrioModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Priority</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {prioritiesList.map((prio) => (
                  <div
                    key={prio.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-sm text-white">{prio.name}</span>
                      <span className="text-xs text-slate-400 block font-mono">
                        Rank: {prio.rank}
                      </span>
                    </div>
                    {prio.companyId === null ? (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-500" />
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeletePriority(prio.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal: Add Category */}
            {showAddCatModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white">Add Custom Category</h3>
                    <button onClick={() => setShowAddCatModal(false)} className="text-slate-400 hover:text-white">
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Category Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., VPN Access Request"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Default Routing Team
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., IT Access Team"
                        value={newCatRoutingTeam}
                        onChange={(e) => setNewCatRoutingTeam(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Description (Helps LLM Classification)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g., Requests to grant remote VPN access or Okta MFA setup."
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="autoResolvableCheck"
                        checked={newCatAutoResolvable}
                        onChange={(e) => setNewCatAutoResolvable(e.target.checked)}
                        className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-emerald-500"
                      />
                      <label htmlFor="autoResolvableCheck" className="text-slate-300">
                        Mark as Auto-Resolvable (Allows 0.8+ confidence auto resolution)
                      </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddCatModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingCat}
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold flex items-center gap-2"
                      >
                        {addingCat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Category</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Add Priority */}
            {showAddPrioModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white">Add Custom Priority</h3>
                    <button onClick={() => setShowAddPrioModal(false)} className="text-slate-400 hover:text-white">
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleAddPriority} className="space-y-4 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Priority Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Urgent Escalation"
                        value={newPrioName}
                        onChange={(e) => setNewPrioName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Sort Rank (Integer)
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={10}
                        value={newPrioRank}
                        onChange={(e) => setNewPrioRank(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddPrioModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingPrio}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold flex items-center gap-2"
                      >
                        {addingPrio && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Priority</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: TICKETS ==================== */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TicketIcon className="w-5 h-5 text-emerald-400" />
                  Employee IT Tickets Triage
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  View and manage real internal IT requests processed by the 4-Stage Engine.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Employee ID..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="all">All AI Statuses</option>
                  <option value="auto_resolved">Auto Resolved</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="pending">Pending</option>
                </select>

                <select
                  value={resolvedFilter}
                  onChange={(e) => setResolvedFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="all">All Resolutions</option>
                  <option value="unresolved">Unresolved Only</option>
                  <option value="resolved">Resolved Only</option>
                </select>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {loadingTickets ? (
                <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading employee IT tickets...</span>
                </div>
              ) : ticketsList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No employee IT tickets matching current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-4">Employee ID</th>
                        <th className="px-5 py-4">IT Ticket Text</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Routed Team</th>
                        <th className="px-5 py-4">AI Workflow</th>
                        <th className="px-5 py-4">Resolved State</th>
                        <th className="px-5 py-4">Created At</th>
                        <th className="px-5 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {ticketsList.map((tkt) => (
                        <tr
                          key={tkt.id}
                          onClick={() => setSelectedTicket(tkt)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-4 font-mono text-emerald-400 font-medium">
                            {tkt.employeeId}
                          </td>
                          <td className="px-5 py-4 text-slate-200 truncate max-w-xs font-normal">
                            {tkt.ticketText}
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono">
                              {tkt.category}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-mono font-medium">
                              {tkt.routingTeam || "General IT Team"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {tkt.status === "auto_resolved" && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1.5 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Auto Resolved
                              </span>
                            )}
                            {tkt.status === "needs_review" && (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1.5 w-fit">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                Needs Review
                              </span>
                            )}
                            {tkt.status === "pending" && (
                              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-medium flex items-center gap-1.5 w-fit">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {tkt.resolved ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5 w-fit">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Resolved
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[11px] font-medium w-fit block">
                                Unresolved
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-400 text-[11px] font-mono">
                            {new Date(tkt.createdAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            {!tkt.resolved ? (
                              <button
                                onClick={(e) => handleMarkResolved(tkt.id, e)}
                                disabled={markingResolvedId === tkt.id}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                              >
                                {markingResolvedId === tkt.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Mark Resolved</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-mono">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <TicketIcon className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-base font-bold text-white font-mono">
                        IT Ticket #{selectedTicket.id}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Employee Identifier</span>
                        <span className="font-mono text-emerald-300 font-semibold">
                          {selectedTicket.employeeId}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">Category & Priority</span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {selectedTicket.category} ({selectedTicket.priority})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Routed Team</span>
                        <span className="font-mono text-emerald-300 font-semibold">
                          {selectedTicket.routingTeam || "General IT Team"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block font-semibold">Resolution Status</span>
                        {selectedTicket.resolved ? (
                          <span className="font-mono text-emerald-400 font-bold">Resolved</span>
                        ) : (
                          <span className="font-mono text-amber-300 font-bold">Unresolved</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block mb-1">Full Ticket Description</span>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 font-sans leading-relaxed">
                        {selectedTicket.ticketText}
                      </div>
                    </div>

                    {/* Current Solution Section & Edit Option */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-300 text-[11px] font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Current Solution</span>
                        </span>
                        {!isEditingSolution && (
                          <button
                            type="button"
                            onClick={() => setIsEditingSolution(true)}
                            className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Solution</span>
                          </button>
                        )}
                      </div>

                      {isEditingSolution ? (
                        <form onSubmit={handleUpdateSolution} className="space-y-2 bg-slate-950 p-3 rounded-xl border border-emerald-500/40">
                          <textarea
                            rows={4}
                            value={editedSolutionText}
                            onChange={(e) => setEditedSolutionText(e.target.value)}
                            placeholder="Enter updated solution..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono outline-none focus:border-emerald-500"
                          />
                          {updateSolutionError && (
                            <p className="text-rose-400 text-[11px] font-medium">{updateSolutionError}</p>
                          )}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingSolution(false)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={updatingSolution}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                            >
                              {updatingSolution && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Save Updated Solution</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                          {selectedTicket.suggestedResolution || "No resolution available yet."}
                        </div>
                      )}
                    </div>

                    {/* Resolution History Section */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 text-[11px] font-semibold flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Resolution History & Versions</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] font-mono">
                          {ticketHistory.length} Version{ticketHistory.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {loadingHistory ? (
                        <div className="text-slate-500 text-[11px] flex items-center gap-2 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Loading version history...</span>
                        </div>
                      ) : ticketHistory.length === 0 ? (
                        <div className="text-slate-500 text-[11px] py-1">
                          No version history recorded yet.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                          {ticketHistory.map((item) => (
                            <div key={item.id || item.version} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px]">
                                    v{item.version}
                                  </span>
                                  <span className="text-slate-300 font-semibold">{item.updatedBy}</span>
                                </div>
                                <span className="text-slate-500 text-[10px] font-mono">
                                  {new Date(item.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-normal pt-1 border-t border-slate-800/60">
                                {item.resolution}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedTicket.sourceReferences && selectedTicket.sourceReferences.length > 0 && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-slate-400 text-[11px] font-semibold block">
                          Retrieved Doc Citations
                        </span>
                        <div className="space-y-1">
                          {selectedTicket.sourceReferences.map((ref, idx) => (
                            <a
                              key={idx}
                              href={ref.page_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{ref.section_title || ref.page_url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    {!selectedTicket.resolved ? (
                      <button
                        onClick={() => handleMarkResolved(selectedTicket.id)}
                        disabled={markingResolvedId === selectedTicket.id}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow"
                      >
                        {markingResolvedId === selectedTicket.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>Mark Resolved</span>
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-mono">
                        Resolved by {selectedTicket.resolvedBy || "Admin"}
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Close Detail
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: RAISE TICKET (SAVED TO DB) ==================== */}
        {activeTab === "raise" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Raise IT Ticket (Testing Surface)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Submit an IT ticket to execute the 4-Stage Engine (Classification &rarr; RAG Retrieval &rarr; Resolution &rarr; Routing) and save the row in PostgreSQL.
              </p>
            </div>

            <form onSubmit={handleRaiseTicketSubmit} className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Employee Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={raiseEmployeeId}
                    onChange={(e) => setRaiseEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    IT Ticket Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g., I was locked out of my Okta account after 3 password attempts. Need MFA reset."
                    value={raiseTicketText}
                    onChange={(e) => setRaiseTicketText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                {raiseError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{raiseError}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={processingRaise}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                  >
                    {processingRaise ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>Raise Ticket</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Display Engine Result */}
            {raiseResult && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Ticket Result
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {raiseResult.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">CATEGORY</span>
                    <span className="text-emerald-300 font-bold">{raiseResult.category}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">PRIORITY</span>
                    <span className="text-slate-200 font-bold">{raiseResult.priority}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                    <span className="text-cyan-300 font-bold">
                      {Math.round((raiseResult.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STATUS</span>
                    <span className="text-emerald-400 font-bold uppercase">{raiseResult.status}</span>
                  </div>
                </div>

                {raiseResult.suggestedResolution && (
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block mb-1">
                      Suggested Resolution
                    </span>
                    <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {raiseResult.suggestedResolution}
                    </pre>
                  </div>
                )}

                {raiseResult.sourceReferences && raiseResult.sourceReferences.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                    <span className="text-slate-400 block font-semibold text-[11px]">
                      Source References
                    </span>
                    {raiseResult.sourceReferences.map((ref: any, idx: number) => (
                      <a
                        key={idx}
                        href={ref.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{ref.section_title || ref.page_url}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 5: PLAYGROUND (SIMULATION ONLY) ==================== */}
        {activeTab === "playground" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                Employee IT Support Playground (Live Simulation)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Simulate an employee IT ticket to test classification & RAG retrieval live — <strong className="text-amber-400">does NOT insert a row into the tickets table</strong>.
              </p>
            </div>

            <form onSubmit={handlePlaygroundSubmit} className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Simulated Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={playgroundEmployeeId}
                    onChange={(e) => setPlaygroundEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Simulated IT Ticket Query
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g., How do I request VPN split tunneling route access for internal staging servers?"
                    value={playgroundInput}
                    onChange={(e) => setPlaygroundInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                {playgroundError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{playgroundError}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={askingPlayground}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                  >
                    {askingPlayground ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Simulate Ask</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Display Simulation Output */}
            {playgroundResponse && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Live Simulation Output (Unsaved)
                  </span>
                  <span className="text-[11px] bg-emerald-500/10 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                    Test Run
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">CATEGORY</span>
                    <span className="text-emerald-300 font-bold">{playgroundResponse.category}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">PRIORITY</span>
                    <span className="text-slate-200 font-bold">{playgroundResponse.priority}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                    <span className="text-emerald-300 font-bold">
                      {Math.round((playgroundResponse.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STATUS</span>
                    <span className="text-emerald-400 font-bold uppercase">{playgroundResponse.status}</span>
                  </div>
                </div>

                {playgroundResponse.suggestedResolution && (
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block mb-1">
                      Suggested AI Resolution
                    </span>
                    <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {playgroundResponse.suggestedResolution}
                    </pre>
                  </div>
                )}

                {playgroundResponse.sourceReferences && playgroundResponse.sourceReferences.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                    <span className="text-slate-400 block font-semibold text-[11px]">
                      Source References
                    </span>
                    {playgroundResponse.sourceReferences.map((ref: any, idx: number) => (
                      <a
                        key={idx}
                        href={ref.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{ref.section_title || ref.page_url}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 6: WIDGET CUSTOMIZATION ==================== */}
        {activeTab === "widget" && (() => {
          const publicWidgetKey = company?.widgetPublicKey || "wpk_live_sample_key_1234567890";
          const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://your-itrix-domain.com";

          const scriptTagSnippet = `<script src="${appOrigin}/widget.js"
  data-widget-key="${publicWidgetKey}"
  data-employee-id="[employee_id]"
  data-employee-email="[employee_email]"
  data-signature="[computed_hmac_sha256_signature]"
  data-bg-color="${widgetBgColor}"
  data-fg-color="${widgetFgColor}"
  data-text-color="${widgetTextColor}">
</script>`;

          const npmSnippet = `import { TicketWidget } from "@/components/widget";

export default function MyIntranetApp() {
  // HMAC-SHA256 signature computed on host company backend using hmac_secret
  const signature = "computed_hmac_sha256_signature";

  return (
    <TicketWidget
      widgetKey="${publicWidgetKey}"
      employee={{
        id: "emp_1042",
        email: "alex@company.com",
        signature: signature
      }}
      theme={{
        background: "${widgetBgColor}",
        foreground: "${widgetFgColor}",
        text: "${widgetTextColor}"
      }}
    />
  );
}`;

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-emerald-400" />
                  Employee-Facing IT Widget Customization & Embed Generator
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Customize your employee-facing IT ticket widget theme and copy dynamic integration code snippets.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Panel: Color Pickers */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                  <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
                    Theme Palette Customizer
                  </h3>

                  <div className="space-y-4 text-xs">
                    {/* Background Color */}
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">
                        Widget Primary Background Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={widgetBgColor}
                          onChange={(e) => setWidgetBgColor(e.target.value)}
                          className="h-9 w-12 rounded bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={widgetBgColor}
                          onChange={(e) => setWidgetBgColor(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    {/* Foreground / Accent Color */}
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">
                        Foreground / Accent Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={widgetFgColor}
                          onChange={(e) => setWidgetFgColor(e.target.value)}
                          className="h-9 w-12 rounded bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={widgetFgColor}
                          onChange={(e) => setWidgetFgColor(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-semibold block">
                        Header / Text Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={widgetTextColor}
                          onChange={(e) => setWidgetTextColor(e.target.value)}
                          className="h-9 w-12 rounded bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={widgetTextColor}
                          onChange={(e) => setWidgetTextColor(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="font-semibold text-slate-300 block mb-1">Public Client Configuration:</span>
                    <div>Company Org ID: <code className="text-emerald-400 font-mono">{company?.id}</code></div>
                    <div>Widget Public Key: <code className="text-emerald-400 font-mono">{publicWidgetKey}</code></div>
                  </div>
                </div>

                {/* Right Panel: Live UI Preview */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-semibold text-white">
                      Employee Widget Real-Time Preview
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Dynamic CSS Styles Applied
                    </span>
                  </div>

                  <div className="flex justify-center py-4">
                    {/* Styled Mock Employee Widget */}
                    <div
                      style={{ backgroundColor: widgetBgColor, color: widgetTextColor }}
                      className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-700/60"
                    >
                      {/* Header */}
                      <div
                        style={{ backgroundColor: widgetFgColor }}
                        className="p-4 flex items-center justify-between font-bold text-slate-950 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Employee Helpdesk</span>
                        </div>
                        <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded font-mono">
                          Live Preview
                        </span>
                      </div>

                      {/* Messages Body */}
                      <div className="p-4 space-y-3 text-xs">
                        <div className="bg-slate-800/80 p-3 rounded-xl text-slate-100">
                          Hi! Need assistance with internal hardware, VPN, or access permissions?
                        </div>

                        <div
                          style={{ backgroundColor: widgetFgColor, opacity: 0.9 }}
                          className="p-3 rounded-xl text-slate-950 font-medium ml-auto max-w-[85%]"
                        >
                          How do I reset my Okta MFA token for corporate email?
                        </div>

                        <div className="bg-slate-800/80 p-3 rounded-xl text-slate-100 space-y-2">
                          <p>Self-service MFA reset is enabled via internal IT portal at /mfa-reset.</p>
                          <div className="text-[10px] text-emerald-300 font-mono pt-1 border-t border-slate-700/60">
                            IT Doc: it-docs.acme.com/mfa-reset-procedure
                          </div>
                        </div>
                      </div>

                      {/* Input Footer */}
                      <div className="p-3 bg-slate-950/60 border-t border-slate-800/60 flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value="Describe your IT issue..."
                          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400"
                        />
                        <button
                          style={{ backgroundColor: widgetFgColor }}
                          className="text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Code Snippets Below Preview */}
              <div className="space-y-6 pt-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                  Generated Intranet Embed Snippets
                </h3>

                {/* 1. Script Tag Version */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        Option A: HTML Script Tag
                      </span>
                      <span className="text-xs text-slate-400">
                        Paste into your employee portal HTML
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(scriptTagSnippet, "script")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copiedScriptSnippet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Script Tag</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                    {scriptTagSnippet}
                  </pre>
                </div>

                {/* 2. React / npm Package Version */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        Option B: npm React Package
                      </span>
                      <span className="text-xs text-slate-400">
                        import &#123; TicketWidget &#125; from '@/components/widget'
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(npmSnippet, "npm")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copiedNpmSnippet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy React Snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                    {npmSnippet}
                  </pre>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== TAB 7: SETTINGS ==================== */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                Company Workspace Settings
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage organization credentials and ITrix API keys.
              </p>
            </div>

            {/* Rotated Key Alert Banner */}
            {rotatedKeyAlert && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>API Key Rotated Successfully!</span>
                </div>
                <p className="text-xs text-slate-300">
                  Old API key has been invalidated. Here is your new API key:
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 select-all">
                  {rotatedKeyAlert}
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Company Info */}
              <div className="space-y-3 border-b border-slate-800 pb-6">
                <h3 className="text-sm font-semibold text-white">Company IT Workspace Metadata</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Organization Name</span>
                    <span className="font-semibold text-white text-sm">{company?.name}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Clerk Org ID</span>
                    <span className="font-mono text-emerald-300 text-xs">{company?.id}</span>
                  </div>
                </div>
              </div>

              {/* API Key Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  API Key Management
                </h3>

                <div className="space-y-2 text-xs">
                  <label className="text-slate-300 font-semibold block">
                    Current Active API Key
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
                    <span className="flex-1 text-slate-300 truncate">
                      {revealApiKey
                        ? company?.apiKey
                        : company?.apiKey
                        ? `${company.apiKey.slice(0, 8)}••••••••••••${company.apiKey.slice(-4)}`
                        : "sk_live_••••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealApiKey(!revealApiKey)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans text-xs flex items-center gap-1.5"
                    >
                      {revealApiKey ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Reveal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-rose-400 block">
                      Rotate API Key
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Immediately invalidates current key and generates a new sk_live_ key.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={rotatingKey}
                    onClick={handleRotateKey}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {rotatingKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Rotate API Key</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

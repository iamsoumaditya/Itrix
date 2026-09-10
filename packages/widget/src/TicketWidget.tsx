"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

export interface TicketWidgetProps {
  widgetKey: string;
  employee: {
    id: string;
    email: string;
    signature: string;
  };
  theme?: {
    background?: string;
    foreground?: string;
    text?: string;
  };
  apiUrl?: string;
}

interface TicketRecord {
  id: string;
  ticketText: string;
  category: string;
  priority: string;
  status: "auto_resolved" | "needs_verification" | "needs_review" | "pending";
  resolved: boolean;
  suggestedResolution?: string;
  routingTeam?: string | null;
  sourceReferences?: Array<{ page_url: string; section_title?: string }>;
  createdAt: string;
}

export function TicketWidget({
  widgetKey,
  employee,
  theme,
  apiUrl = "",
}: TicketWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"raise" | "history">("raise");

  // Form State
  const [issueText, setIssueText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<TicketRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History State
  const [ticketsHistory, setTicketsHistory] = useState<TicketRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Colors
  const bgColor = theme?.background || "#0F172A";
  const fgColor = theme?.foreground || "#10B981";
  const textColor = theme?.text || "#FFFFFF";

  const cleanApiUrl = apiUrl ? apiUrl.replace(/\/$/, "") : "";

  // Fetch ticket history
  const fetchMyTickets = async () => {
    if (!employee.id || !employee.email || !employee.signature) return;
    setLoadingHistory(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        employeeId: employee.id,
        employeeEmail: employee.email,
        signature: employee.signature,
      });

      const res = await fetch(`${cleanApiUrl}/api/v1/tickets?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${widgetKey}`,
        },
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = resText ? JSON.parse(resText) : {};
      } catch {
        data = {};
      }

      if (res.ok && data.data) {
        setTicketsHistory(data.data);
      } else {
        setErrorMessage(data.error || `Failed to load ticket history (${res.status}).`);
      }
    } catch (err) {
      console.error("[TicketWidget Fetch Error]:", err);
      setErrorMessage("Network error fetching ticket history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchMyTickets();
    }
  }, [isOpen, activeTab]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSubmitResult(null);

    try {
      const res = await fetch(`${cleanApiUrl}/api/v1/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${widgetKey}`,
        },
        body: JSON.stringify({
          employeeId: employee.id,
          employeeEmail: employee.email,
          signature: employee.signature,
          ticketText: issueText.trim(),
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = resText ? JSON.parse(resText) : {};
      } catch {
        data = {};
      }

      if (res.ok && data.id) {
        setSubmitResult(data);
        setIssueText("");
      } else {
        setErrorMessage(data.error || `An error occurred submitting your ticket (${res.status}).`);
      }
    } catch (err) {
      console.error("[TicketWidget Submit Error]:", err);
      setErrorMessage("Network error connecting to IT Helpdesk server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 999999,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Floating Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            right: "0",
            width: "380px",
            maxWidth: "calc(100vw - 32px)",
            backgroundColor: bgColor,
            color: textColor,
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "560px",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: fgColor,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#020617",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
              <MessageSquare size={18} />
              <span>Employee Helpdesk</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#020617",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
            }}
          >
            <button
              onClick={() => {
                setActiveTab("raise");
                setErrorMessage(null);
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: "12px",
                fontWeight: 600,
                background: "transparent",
                border: "none",
                color: activeTab === "raise" ? fgColor : "rgba(255, 255, 255, 0.6)",
                borderBottom: activeTab === "raise" ? `2px solid ${fgColor}` : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Raise a Ticket
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setErrorMessage(null);
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: "12px",
                fontWeight: 600,
                background: "transparent",
                border: "none",
                color: activeTab === "history" ? fgColor : "rgba(255, 255, 255, 0.6)",
                borderBottom: activeTab === "history" ? `2px solid ${fgColor}` : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              My Tickets
            </button>
          </div>

          {/* Body Content */}
          <div
            style={{
              padding: "16px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Error Banner */}
            {errorMessage && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "#fca5a5",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* View A: Raise a Ticket */}
            {activeTab === "raise" && (
              <>
                {!submitResult ? (
                  <form onSubmit={handleSubmitTicket} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.4" }}>
                      Describe your hardware or software issue below. Our AI IT assistant will search company docs to assist you instantly.
                    </div>

                    <textarea
                      value={issueText}
                      onChange={(e) => setIssueText(e.target.value)}
                      placeholder="e.g. I want to reset my password or I want access to Excel spreadsheet"
                      rows={4}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        backgroundColor: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "8px",
                        padding: "10px",
                        color: textColor,
                        fontSize: "12px",
                        lineHeight: "1.5",
                        outline: "none",
                        resize: "vertical",
                      }}
                      required
                    />

                    <button
                      type="submit"
                      disabled={submitting || !issueText.trim()}
                      style={{
                        backgroundColor: fgColor,
                        color: "#020617",
                        fontWeight: 700,
                        fontSize: "13px",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: submitting || !issueText.trim() ? "not-allowed" : "pointer",
                        opacity: submitting || !issueText.trim() ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                          <span>Searching Docs & Triage...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Submit Ticket</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Result Screen */
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      <span>Category: {submitResult.category}</span>
                      <span
                        style={{
                          backgroundColor:
                            submitResult.status === "auto_resolved" || submitResult.resolved
                              ? "rgba(16, 185, 129, 0.2)"
                              : submitResult.status === "needs_verification"
                              ? "rgba(56, 189, 248, 0.2)"
                              : "rgba(245, 158, 11, 0.2)",
                          color:
                            submitResult.status === "auto_resolved" || submitResult.resolved
                              ? "#34d399"
                              : submitResult.status === "needs_verification"
                              ? "#38bdf8"
                              : "#fbbf24",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {submitResult.status?.replace("_", " ")}
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.4)",
                        border: `1px solid ${fgColor}40`,
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "12px",
                        lineHeight: "1.5",
                        color: "rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      {submitResult.suggestedResolution ? (
                        <div style={{ whiteSpace: "pre-wrap" }}>{submitResult.suggestedResolution}</div>
                      ) : (
                        <div style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                          Your ticket has been routed to <strong>{submitResult.routingTeam || "IT Staff"}</strong> for manual review.
                        </div>
                      )}

                      {/* Source References */}
                      {submitResult.sourceReferences && submitResult.sourceReferences.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            paddingTop: "8px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            fontSize: "11px",
                          }}
                        >
                          <span style={{ color: fgColor, fontWeight: 600 }}>Docs Citation:</span>
                          {submitResult.sourceReferences.map((ref, idx) => (
                            <a
                              key={idx}
                              href={ref.page_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: fgColor,
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                wordBreak: "break-all",
                              }}
                            >
                              <ExternalLink size={12} />
                              <span>{ref.section_title || ref.page_url}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSubmitResult(null)}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        color: textColor,
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Raise Another Ticket
                    </button>
                  </div>
                )}
              </>
            )}

            {/* View B: My Tickets */}
            {activeTab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", fontWeight: 600 }}>
                    Past Tickets ({ticketsHistory.length})
                  </span>
                  <button
                    onClick={fetchMyTickets}
                    disabled={loadingHistory}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: fgColor,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                    }}
                  >
                    <RefreshCw size={12} className={loadingHistory ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingHistory ? (
                  <div style={{ textAlign: "center", padding: "24px", color: "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px auto" }} />
                    Loading your tickets...
                  </div>
                ) : ticketsHistory.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px", color: "rgba(255, 255, 255, 0.5)", fontSize: "12px" }}>
                    No tickets raised yet.
                  </div>
                ) : (
                  ticketsHistory.map((t) => {
                    const isExpanded = expandedTicketId === t.id;
                    return (
                      <div
                        key={t.id}
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          overflow: "hidden",
                          transition: "all 0.2s",
                        }}
                      >
                        <div
                          onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                          style={{
                            padding: "10px 12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                                backgroundColor:
                                  t.status === "auto_resolved" || t.resolved
                                    ? "rgba(16, 185, 129, 0.2)"
                                    : t.status === "needs_verification"
                                    ? "rgba(56, 189, 248, 0.2)"
                                    : "rgba(245, 158, 11, 0.2)",
                                color:
                                  t.status === "auto_resolved" || t.resolved
                                    ? "#34d399"
                                    : t.status === "needs_verification"
                                    ? "#38bdf8"
                                    : "#fbbf24",
                              }}
                            >
                              {t.status?.replace("_", " ")}
                            </span>
                            <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.4)" }}>
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: "12px",
                              color: textColor,
                              fontWeight: 500,
                              lineHeight: "1.4",
                              display: "-webkit-box",
                              WebkitLineClamp: isExpanded ? "none" : 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {t.ticketText}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", color: fgColor }}>
                            <span>Category: {t.category}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: "10px 12px",
                              backgroundColor: "rgba(0, 0, 0, 0.5)",
                              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                              fontSize: "11px",
                              lineHeight: "1.5",
                              color: "rgba(255, 255, 255, 0.8)",
                            }}
                          >
                            {t.suggestedResolution ? (
                              <div>
                                <strong style={{ color: fgColor, display: "block", marginBottom: "4px" }}>
                                  Suggested Resolution:
                                </strong>
                                <div style={{ whiteSpace: "pre-wrap" }}>{t.suggestedResolution}</div>
                              </div>
                            ) : (
                              <div>
                                Routed to <strong>{t.routingTeam || "IT Staff"}</strong> — awaiting review.
                              </div>
                            )}

                            {t.sourceReferences && t.sourceReferences.length > 0 && (
                              <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                <span style={{ color: fgColor, fontWeight: 600, display: "block", marginBottom: "2px" }}>
                                  Sources:
                                </span>
                                {t.sourceReferences.map((ref, idx) => (
                                  <a
                                    key={idx}
                                    href={ref.page_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: fgColor,
                                      textDecoration: "none",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      marginRight: "8px",
                                    }}
                                  >
                                    <ExternalLink size={10} />
                                    <span>{ref.section_title || ref.page_url}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Circular Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "28px",
          backgroundColor: fgColor,
          color: "#020617",
          border: "none",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s, background-color 0.2s",
        }}
        title="Open IT Helpdesk Widget"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

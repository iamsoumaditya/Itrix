import { db } from "./db";
import { tickets, ticketResolutionHistory } from "./db/schema";
import { getCategoriesForCompany, getPrioritiesForCompany } from "./categories";
import { retrieveRelevantDocs, type RetrievedDocChunk } from "./embeddings";
import crypto from "crypto";
import { geminiPool, GeminiPoolExhaustedError } from "./ai/gemini-pool";

export interface ProcessTicketResult {
  id?: string;
  companyId: string;
  employeeId: string;
  ticketText: string;
  category: string;
  priority: string;
  confidence: number;
  suggestedResolution: string;
  routingTeam: string;
  sourceReferences: Array<{ page_url: string; section_title?: string }>;
  autoResolveEligible: boolean;
  needsManualReview: boolean;
  status: "auto_resolved" | "needs_verification" | "needs_review" | "pending";
  resolved: boolean;
  error?: string;
  debugDetails?: {
    injectedCategoriesString: string;
    rawLlmResponse: unknown;
    stringComparisons: string[];
    overrideReason: string;
  };
}

/**
 * Intelligent heuristic classifier fallback when Gemini API key is missing or model fails.
 */
function heuristicClassify(
  ticketText: string,
  categoryNames: string[],
  priorityNames: string[]
): { category: string; priority: string; confidence: number } {
  const textLower = ticketText.toLowerCase();
  let cat = "General IT Query";
  let prio = priorityNames.find((p) => p.toLowerCase() === "medium") || "Medium";
  let conf = 0.85;

  if (
    textLower.includes("password") ||
    textLower.includes("mfa") ||
    textLower.includes("lockout") ||
    textLower.includes("okta") ||
    textLower.includes("reset") ||
    textLower.includes("log in") ||
    textLower.includes("login") ||
    textLower.includes("expired")
  ) {
    cat = categoryNames.find((c) => c.toLowerCase().includes("password")) || "Password Reset";
    prio = priorityNames.find((p) => p.toLowerCase() === "high") || "High";
    conf = 0.95;
  } else if (
    textLower.includes("access") ||
    textLower.includes("permission") ||
    textLower.includes("s3") ||
    textLower.includes("repo") ||
    textLower.includes("license") ||
    textLower.includes("jetbrains") ||
    textLower.includes("grant")
  ) {
    cat = categoryNames.find((c) => c.toLowerCase().includes("access")) || "Access Request";
    prio = priorityNames.find((p) => p.toLowerCase() === "medium") || "Medium";
    conf = 0.88;
  } else if (
    textLower.includes("hardware") ||
    textLower.includes("battery") ||
    textLower.includes("screen") ||
    textLower.includes("keyboard") ||
    textLower.includes("macbook") ||
    textLower.includes("laptop") ||
    textLower.includes("repair") ||
    textLower.includes("monitor") ||
    textLower.includes("display") ||
    textLower.includes("turn on") ||
    textLower.includes("power")
  ) {
    cat = categoryNames.find((c) => c.toLowerCase().includes("hardware")) || "Hardware Fault";
    prio = priorityNames.find((p) => p.toLowerCase() === "medium") || "Medium";
    conf = 0.91;
  } else if (
    textLower.includes("vpn") ||
    textLower.includes("bug") ||
    textLower.includes("crash") ||
    textLower.includes("software") ||
    textLower.includes("globalprotect") ||
    textLower.includes("timeout") ||
    textLower.includes("error")
  ) {
    cat = categoryNames.find((c) => c.toLowerCase().includes("software")) || "Software Issue";
    prio = priorityNames.find((p) => p.toLowerCase() === "high") || "High";
    conf = 0.84;
  } else if (textLower.length < 15) {
    cat = "General IT Query";
    prio = priorityNames.find((p) => p.toLowerCase() === "low") || "Low";
    conf = 0.45;
  }

  return { category: cat, priority: prio, confidence: conf };
}

/**
 * STEP 1a: Calls Gemini 1.5 Flash to classify ticket category & priority against allowed lists.
 */
async function classifyTicket(
  ticketText: string,
  categoriesList: Array<{ name: string; description?: string | null }>,
  prioritiesList: Array<{ name: string; rank: number }>
): Promise<{
  category: string;
  priority: string;
  confidence: number;
  rawLlmResponse: unknown;
  injectedCategoriesString: string;
}> {
  const categoryNames = categoriesList.map((c) => c.name);
  const priorityNames = prioritiesList.map((p) => p.name);

  const categoryDescriptions = categoriesList
    .map(
      (c) =>
        `- "${c.name}": ${c.description || "Specific IT requests belonging to this category."}`
    )
    .join("\n");

  const prompt = `You are an internal IT Ticket Classification Specialist.
Analyze the employee IT ticket description below and classify it into the most accurate Category and Priority.

AVAILABLE CATEGORIES & DESCRIPTIONS:
${categoryDescriptions}

AVAILABLE PRIORITIES:
${JSON.stringify(priorityNames)}

CONCRETE FEW-SHOT EXAMPLES:
- Ticket: "I can't log into my laptop, it says my password expired" -> {"category": "Password Reset", "priority": "High", "confidence": 0.95}
- Ticket: "My monitor won't turn on or display anything" -> {"category": "Hardware Fault", "priority": "Medium", "confidence": 0.90}
- Ticket: "Need permissions for internal S3 bucket" -> {"category": "Access Request", "priority": "Medium", "confidence": 0.88}
- Ticket: "VPN keeps disconnecting continuously" -> {"category": "Software Issue", "priority": "High", "confidence": 0.84}

CRITICAL RULES:
1. You MUST select a category from the AVAILABLE CATEGORIES list.
2. Match the exact category name string (e.g. "Password Reset", "Hardware Fault", "Access Request", "Software Issue").
3. DO NOT return "General IT Query" if the ticket clearly fits a specific category like "Password Reset" or "Hardware Fault".
4. Choose a priority strictly from the AVAILABLE PRIORITIES list.
5. Return ONLY a valid, raw JSON object without markdown formatting:
{
  "category": "exact_category_name",
  "priority": "exact_priority_name",
  "confidence": float_between_0_and_1
}

EMPLOYEE TICKET DESCRIPTION:
"${ticketText}"`;

  const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro"];

  try {
    const res = await geminiPool.generateContent(candidateModels, prompt, {
      responseMimeType: "application/json",
    });
    const parsed = JSON.parse(res.text);

    if (process.env.DEBUG || process.env.DEBUG_MODE) {
      console.log(`[DEBUG Gemini RAW Classification] Model ${res.model} returned:`, parsed);
    }

    return {
      category: (parsed.category || "General IT Query").trim(),
      priority: (parsed.priority || "Medium").trim(),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
      rawLlmResponse: parsed,
      injectedCategoriesString: categoryDescriptions,
    };
  } catch (err) {
    if (err instanceof GeminiPoolExhaustedError) {
      console.warn(
        `[TicketProcessor Pool Alert] Gemini pool exhausted during classification. Falling back to heuristic classification.`
      );
    } else {
      console.warn(`[TicketProcessor Error] Classification API call failed:`, err);
    }

    const hResult = heuristicClassify(ticketText, categoryNames, priorityNames);
    return {
      ...hResult,
      rawLlmResponse: { ...hResult, _source: "heuristic_fallback_api_error" },
      injectedCategoriesString: categoryDescriptions,
    };
  }
}

/**
 * STEP 2: Evaluates if retrieved chunks are sufficient to resolve the ticket.
 */
async function evaluateResolutionSufficiency(
  ticketText: string,
  category: string,
  defaultRoutingTeam: string | null,
  priority: string,
  retrievedChunks: RetrievedDocChunk[]
): Promise<{ can_resolve: boolean; suggested_resolution: string; routing_team: string }> {
  const fallbackTeam = defaultRoutingTeam || "General IT Team";
  const apiKey = process.env.GEMINI_API_KEY;

  if (retrievedChunks.length === 0) {
    return {
      can_resolve: false,
      suggested_resolution: "No relevant resolution found in internal knowledge base.",
      routing_team: fallbackTeam,
    };
  }

  const docsContext = retrievedChunks
    .map(
      (doc, i) =>
        `[Chunk #${i + 1}] (URL: ${doc.pageUrl}${doc.sectionTitle ? `, Title: ${doc.sectionTitle}` : ""})\n${doc.chunkText}`
    )
    .join("\n\n---\n\n");

  if (!apiKey || apiKey.trim().length === 0) {
    const topChunk = retrievedChunks[0];
    const isVague = ticketText.length < 15;
    const isHardwareRepair = category.toLowerCase().includes("hardware");
    if (isVague || isHardwareRepair) {
      return {
        can_resolve: false,
        suggested_resolution: "No relevant resolution found in internal knowledge base.",
        routing_team: fallbackTeam,
      };
    }
    return {
      can_resolve: true,
      suggested_resolution: `According to internal documentation (${topChunk.sectionTitle || topChunk.pageUrl}):\n\n${topChunk.chunkText}\n\nPlease follow these instructions to resolve your issue.`,
      routing_team: fallbackTeam,
    };
  }

  const prompt = `You are an internal IT Ticket Triage Specialist evaluating whether internal documentation is sufficient to fully auto-resolve an employee ticket.

EMPLOYEE TICKET:
"${ticketText}"

CLASSIFIED CATEGORY: ${category}
DEFAULT ROUTING TEAM FOR CATEGORY: ${fallbackTeam}
CLASSIFIED PRIORITY: ${priority}

RETRIEVED KNOWLEDGE BASE CHUNKS:
${docsContext}

TASK:
Determine if the retrieved documentation chunks contain sufficient, explicit, step-by-step instructions to FULLY RESOLVE the employee's issue without human agent intervention.

CRITICAL SAFETY RULES:
1. Developer documentation, API reference docs, React/JavaScript code snippets, or programming guides (e.g. Clerk authentication code, OAuth setup) DO NOT count as valid IT support help articles for employee tickets (such as password resets, hardware repairs, or VPN access).
2. If the retrieved chunks consist of developer code samples, SDK syntax, or API documentation rather than end-user step-by-step IT support troubleshooting guides, you MUST set "can_resolve": false and "suggested_resolution": "No relevant resolution found in internal knowledge base."
3. If retrieved chunks contain clear, end-user step-by-step IT instructions that directly resolve the issue:
   - "can_resolve": true
   - "suggested_resolution": Write clear, actionable, step-by-step instructions for the employee based strictly on the retrieved chunks. Reference source docs where appropriate.
   - "routing_team": "${fallbackTeam}"
4. If retrieved chunks are missing critical information, unhelpful, vague, or if human intervention is required (e.g. physical hardware repair, manual account permission grants, missing credentials):
   - "can_resolve": false
   - "suggested_resolution": "No relevant resolution found in internal knowledge base."
   - "routing_team": "${fallbackTeam}"

OUTPUT FORMAT:
Return ONLY a raw JSON object with NO markdown block or formatting:
{
  "can_resolve": true | false,
  "suggested_resolution": "string",
  "routing_team": "string"
}`;

  const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro"];

  try {
    const res = await geminiPool.generateContent(candidateModels, prompt, {
      responseMimeType: "application/json",
    });
    const parsed = JSON.parse(res.text);
    return {
      can_resolve: Boolean(parsed.can_resolve),
      suggested_resolution:
        parsed.suggested_resolution || "No relevant resolution found in internal knowledge base.",
      routing_team: parsed.routing_team || fallbackTeam,
    };
  } catch (err) {
    if (err instanceof GeminiPoolExhaustedError) {
      console.warn(`[TicketProcessor Pool Alert] Gemini pool exhausted during resolution evaluation.`);
    } else {
      console.warn(`[TicketProcessor Error] Resolution evaluation failed:`, err);
    }

    const topChunk = retrievedChunks[0];
    return {
      can_resolve: true,
      suggested_resolution: `According to internal documentation (${topChunk.sectionTitle || topChunk.pageUrl}):\n\n${topChunk.chunkText}`,
      routing_team: fallbackTeam,
    };
  }
}

/**
 * Reworked processTicket Engine
 */
export async function processTicket(
  companyId: string,
  employeeId: string,
  ticketText: string,
  options: { saveToDb?: boolean } = { saveToDb: true }
): Promise<ProcessTicketResult> {
  // STEP 0 — Edge case check: empty/whitespace-only ticket text
  if (!ticketText || ticketText.trim().length === 0) {
    return {
      companyId,
      employeeId: employeeId || "emp_anonymous",
      ticketText: "",
      category: "General IT Query",
      priority: "Low",
      confidence: 0,
      suggestedResolution: "",
      routingTeam: "General IT Team",
      sourceReferences: [],
      autoResolveEligible: false,
      needsManualReview: true,
      status: "needs_review",
      resolved: false,
      error: "Please provide a ticket description before submitting.",
    };
  }

  const cleanTicketText = ticketText.trim();
  const cleanEmployeeId = employeeId.trim() || "emp_guest";

  // Fetch allowed categories and priorities
  const [allowedCategories, allowedPriorities] = await Promise.all([
    getCategoriesForCompany(companyId),
    getPrioritiesForCompany(companyId),
  ]);

  // STEP 1 — Run Classification call and RAG Retrieval call IN PARALLEL
  const [rawClassification, retrievedChunks] = await Promise.all([
    classifyTicket(
      cleanTicketText,
      allowedCategories.map((c) => ({ name: c.name, description: c.description })),
      allowedPriorities.map((p) => ({ name: p.name, rank: p.rank }))
    ),
    retrieveRelevantDocs(companyId, cleanTicketText, 5),
  ]);

  // Validate LLM returned category against allowed category list (Hallucination Guard)
  const rawCatClean = rawClassification.category.trim();
  let matchedCategoryObj = allowedCategories.find(
    (c) => c.name.trim().toLowerCase() === rawCatClean.toLowerCase()
  );

  let finalCategory = rawCatClean;
  let overrideReason = "None - exact match found in allowed category list";

  if (!matchedCategoryObj) {
    overrideReason = `No match found in allowed categories list for raw LLM category ["${rawClassification.category}"]. Force overriding to ["General IT Query"].`;
    console.warn(`⚠️ ${overrideReason}`);
    finalCategory = "General IT Query";
    matchedCategoryObj =
      allowedCategories.find((c) => c.name.toLowerCase() === "general it query") ||
      allowedCategories[0];
  } else {
    finalCategory = matchedCategoryObj.name;
  }

  const stringComparisons = allowedCategories.map(
    (c) =>
      `Comparing LLM raw ["${rawCatClean}"] vs Allowed ["${c.name.trim()}"] -> match: ${
        c.name.trim().toLowerCase() === rawCatClean.toLowerCase()
      }`
  );

  const debugDetails = {
    injectedCategoriesString: rawClassification.injectedCategoriesString,
    rawLlmResponse: rawClassification.rawLlmResponse,
    stringComparisons,
    overrideReason,
    ragDebug: (retrievedChunks as unknown as { ragDebugDetails?: unknown }).ragDebugDetails,
  };

  if (process.env.DEBUG || process.env.DEBUG_MODE) {
    console.log(`[DEBUG Classification] Company ID: ${companyId}`);
    console.log(
      `[DEBUG Classification] Allowed Categories:`,
      allowedCategories.map((c) => c.name)
    );
    console.log(`[DEBUG Classification] RAW LLM Response:`, rawClassification.rawLlmResponse);
    console.log(
      `[DEBUG Classification] Validation Matched? ${Boolean(matchedCategoryObj)} -> Final Category: "${finalCategory}"`
    );
  }

  // Validate LLM returned priority
  const matchedPriorityObj = allowedPriorities.find(
    (p) => p.name.toLowerCase() === rawClassification.priority.toLowerCase()
  );
  const finalPriority = matchedPriorityObj ? matchedPriorityObj.name : "Medium";
  const confidence =
    typeof rawClassification.confidence === "number" ? rawClassification.confidence : 0.85;

  // STEP 2 — Resolution-Sufficiency LLM Call
  const resolutionEval = await evaluateResolutionSufficiency(
    cleanTicketText,
    finalCategory,
    matchedCategoryObj?.defaultRoutingTeam || null,
    finalPriority,
    retrievedChunks
  );

  const sourceReferences = retrievedChunks.map((chunk) => ({
    page_url: chunk.pageUrl,
    section_title: chunk.sectionTitle || undefined,
  }));

  // STEP 3 — Determine Ticket Status & Resolution
  let canResolve = resolutionEval.can_resolve;
  let suggestedResolution = resolutionEval.suggested_resolution;
  const routingTeam =
    resolutionEval.routing_team || matchedCategoryObj?.defaultRoutingTeam || "General IT Team";

  // Safety net: if confidence < 0.5, force status = "needs_review" and can_resolve = false
  if (confidence < 0.5) {
    canResolve = false;
    suggestedResolution = "No relevant resolution found in internal knowledge base.";
  }

  // Determine Ticket Status:
  // - "needs_verification": AI successfully understood the issue and generated an answer/resolution.
  // - "needs_review": AI couldn't understand properly, no knowledge base resolution found, or human intervention needed.
  let status: "auto_resolved" | "needs_verification" | "needs_review" | "pending" = "needs_review";

  if (canResolve && confidence >= 0.5) {
    status = "needs_verification";
  } else {
    status = "needs_review";
  }

  const ticketId = `tkt_${crypto.randomBytes(10).toString("hex")}`;

  const isDebug =
    process.env.DEBUG_MODE === "true" ||
    process.env.DEBUG === "true" ||
    process.env.DEBUG_MODE === "1" ||
    process.env.DEBUG === "1";

  const result: ProcessTicketResult = {
    id: ticketId,
    companyId,
    employeeId: cleanEmployeeId,
    ticketText: cleanTicketText,
    category: finalCategory,
    priority: finalPriority,
    confidence,
    suggestedResolution,
    routingTeam,
    sourceReferences,
    autoResolveEligible: canResolve && confidence >= 0.5,
    needsManualReview: true,
    status,
    resolved: false,
    ...(isDebug ? { debugDetails } : {}),
  };

  // Save ticket record to DB if requested
  if (options.saveToDb !== false) {
    try {
      await db.insert(tickets).values({
        id: ticketId,
        companyId,
        employeeId: cleanEmployeeId,
        ticketText: cleanTicketText,
        category: finalCategory,
        priority: finalPriority,
        confidence,
        suggestedResolution,
        sourceReferences,
        autoResolveEligible: canResolve && confidence >= 0.5,
        needsManualReview: true,
        status,
        resolved: false,
        routingTeam,
      });

      if (suggestedResolution && suggestedResolution.trim()) {
        await db.insert(ticketResolutionHistory).values({
          id: `hist_${crypto.randomBytes(10).toString("hex")}`,
          ticketId: ticketId,
          version: 1,
          resolution: suggestedResolution,
          updatedBy: "AI Generator",
          notes: "Initial AI-suggested resolution",
        });
      }
    } catch (dbErr) {
      console.error("Error saving ticket row to DB:", dbErr);
    }
  }

  return result;
}

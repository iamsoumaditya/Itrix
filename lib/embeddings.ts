import { db } from "./db";
import { docsEmbeddings, docsContent, type DocsEmbedding } from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Deterministic fallback 768-dimensional vector generator when API key is unconfigured or model unavailable.
 */
export function createMockEmbedding(text: string): number[] {
  const vec = new Array(768).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < 768; i++) {
    const val = Math.sin(hash + i * 0.1);
    vec[i] = parseFloat(val.toFixed(6));
  }
  // Normalize vector
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vec.map((v) => v / norm);
}

/**
 * Safely parse pgvector string or array data into a numeric vector array.
 */
export function parseVector(val: any): number[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(Number);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      return val
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));
    }
  }
  return [];
}

/**
 * Generate 768-dim vector embedding using Gemini's API with model fallback & mock failover.
 */
export async function generateEmbedding(textToEmbed: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] No GEMINI_API_KEY set, using mock embedding.`);
    }
    return createMockEmbedding(textToEmbed);
  }

  // Candidate embedding models supported by Google Gemini API
  const candidateModels = ["gemini-embedding-001", "gemini-embedding-2-preview", "gemini-embedding-2"];

  for (const modelName of candidateModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: {
              parts: [{ text: textToEmbed }],
            },
            outputDimensionality: 768,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.embedding?.values && Array.isArray(data.embedding.values)) {
          return data.embedding.values;
        }
      } else {
        const errText = await response.text();
        console.warn(`[Embedding API] Model ${modelName} returned status ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.warn(`[Embedding API] Exception with ${modelName}:`, err);
    }
  }

  if (process.env.DEBUG) {
    console.warn(`[DEBUG] All Gemini embedding models failed. Falling back to mock embedding.`);
  }
  return createMockEmbedding(textToEmbed);
}

/**
 * Chunks raw text into ~300-500 token sections split on paragraph and heading boundaries.
 */
export function chunkText(rawText: string): string[] {
  if (!rawText || rawText.trim().length === 0) return [];

  const paragraphs = rawText
    .split(/(?:\r?\n){2,}|(?=\n#{1,4}\s)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let currentChunk = "";
  const MAX_CHUNK_LENGTH = 1500;

  for (const para of paragraphs) {
    if ((currentChunk + "\n\n" + para).length <= MAX_CHUNK_LENGTH) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (para.length > MAX_CHUNK_LENGTH) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        let subChunk = "";
        for (const s of sentences) {
          if ((subChunk + " " + s).length <= MAX_CHUNK_LENGTH) {
            subChunk = subChunk ? `${subChunk} ${s}` : s;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = s;
          }
        }
        if (subChunk) currentChunk = subChunk;
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Chunks raw docs_content, generates embeddings, and inserts into docs_embeddings.
 */
export async function indexDocsContent(
  docsContentId: string,
  companyId: string,
  contentText: string
): Promise<number> {
  const chunks = chunkText(contentText);
  if (chunks.length === 0) return 0;

  let insertedCount = 0;
  for (const chunk of chunks) {
    const vec = await generateEmbedding(chunk);
    const embedId = `emb_${crypto.randomBytes(10).toString("hex")}`;

    await db.insert(docsEmbeddings).values({
      id: embedId,
      docsContentId,
      companyId,
      chunkText: chunk,
      embedding: vec,
    });
    insertedCount++;
  }

  return insertedCount;
}

export interface RetrievedDocChunk {
  chunkText: string;
  pageUrl: string;
  sectionTitle: string | null;
  similarity: number;
}

/**
 * Computes Cosine Similarity between two numeric vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Computes keyword overlap score between query and target content text/title.
 */
function calculateKeywordScore(query: string, chunk: string, title: string | null): number {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "how", "what", "this", "that", "need", "help"].includes(w));

  if (words.length === 0) return 0;

  const targetText = `${title || ""} ${chunk}`.toLowerCase();
  let matches = 0;
  for (const word of words) {
    if (targetText.includes(word)) {
      matches += 1;
    }
  }
  return matches / words.length;
}

/**
 * Detects if a chunk is developer documentation / code snippet rather than end-user IT support text.
 */
export function isCodeSnippet(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  // 1. Common programming import / export / syntax patterns
  const codePatterns = [
    /\b(import|export)\s+[\s\S]*?\bfrom\b/,
    /\b(const|let|var|function|class|interface|type)\s+[A-Za-z0-9_$]+\s*=/,
    /\b(return|async|await)\s+[\{\[\(A-Za-z0-9_$]/,
    /<[A-Z][A-Za-z0-9]*(\s+[a-zA-Z0-9_-]+(=\{[^}]*\}|="[^"]*")?)*\s*\/>/,
    /\b(useState|useEffect|useContext|useCallback|useMemo|useRef)\(/,
    /\b(npm|yarn|pnpm|bun)\s+(install|add|run|build)\b/,
    /\b(console\.log|process\.env|module\.exports)\b/,
    /\{\s*[\w$]+\s*:\s*[\w$]+\s*\}/,
    /\b(React|ReactDOM|JSX)\b/,
    /\b(function|def|public\s+static\s+void)\s+\w+\s*\(/,
  ];

  for (const pattern of codePatterns) {
    if (pattern.test(text)) return true;
  }

  // 2. Symbol ratio check (programming punctuation density)
  const symbolMatches = text.match(/[\{\}\[\];\=\>\<\/\(\)]/g) || [];
  const symbolRatio = symbolMatches.length / text.length;
  if (symbolRatio > 0.07 && text.length > 40) {
    return true;
  }

  return false;
}

export interface RagDebugOutput {
  queryVectorDimension: number;
  totalCompanyEmbeddingsCount: number;
  rawCandidateChunks: Array<{
    chunkTextSnippet: string;
    pageUrl: string;
    sectionTitle: string | null;
    rawDistance: number;
    rawSimilarity: number;
  }>;
  filteringDetails: {
    thresholdValue: number;
    keptChunks: Array<{
      chunkTextSnippet: string;
      pageUrl: string;
      similarity: number;
    }>;
    discardedChunks: Array<{
      chunkTextSnippet: string;
      pageUrl: string;
      similarity: number;
      reason: string;
    }>;
  };
  finalReturnedArray: Array<{
    chunkTextSnippet: string;
    pageUrl: string;
    similarity: number;
  }>;
}

/**
 * RAG Retrieval: Cosine Similarity Vector Search with similarity threshold cutoff and code snippet filtering.
 */
export async function retrieveRelevantDocs(
  companyId: string,
  queryText: string,
  topK: number = 5,
  similarityThreshold: number = 0.50
): Promise<RetrievedDocChunk[]> {
  try {
    const queryVector = await generateEmbedding(queryText);

    // Query docs_embeddings for company
    const rows = await db
      .select({
        chunkText: docsEmbeddings.chunkText,
        embedding: docsEmbeddings.embedding,
        pageUrl: docsContent.pageUrl,
        sectionTitle: docsContent.sectionTitle,
      })
      .from(docsEmbeddings)
      .innerJoin(docsContent, eq(docsEmbeddings.docsContentId, docsContent.id))
      .where(eq(docsEmbeddings.companyId, companyId));

    const totalCompanyEmbeddingsCount = rows ? rows.length : 0;

    if (!rows || rows.length === 0) {
      if (process.env.DEBUG || process.env.DEBUG_MODE) {
        console.log(`[DEBUG RAG] No docs found in DB for companyId: ${companyId}`);
      }
      const emptyResult: RetrievedDocChunk[] = [];
      (emptyResult as any).ragDebugDetails = {
        queryVectorDimension: queryVector.length,
        totalCompanyEmbeddingsCount: 0,
        rawCandidateChunks: [],
        filteringDetails: {
          thresholdValue: similarityThreshold,
          keptChunks: [],
          discardedChunks: [],
        },
        finalReturnedArray: [],
      } satisfies RagDebugOutput;
      return emptyResult;
    }

    const rawCandidateChunksList: Array<{
      chunkTextSnippet: string;
      pageUrl: string;
      sectionTitle: string | null;
      rawDistance: number;
      rawSimilarity: number;
    }> = [];

    const keptChunksList: Array<{
      chunkTextSnippet: string;
      pageUrl: string;
      similarity: number;
    }> = [];

    const discardedChunksList: Array<{
      chunkTextSnippet: string;
      pageUrl: string;
      similarity: number;
      reason: string;
    }> = [];

    const candidateChunks: RetrievedDocChunk[] = [];

    for (const row of rows) {
      const vecB = parseVector(row.embedding);
      const cosSim = cosineSimilarity(queryVector, vecB);
      // Cosine distance = 1 - cosine_similarity (range 0 to 2)
      // True similarity = 1 - distance = cosine_similarity (range -1 to 1)
      const rawSimilarity = isNaN(cosSim) ? 0 : parseFloat(cosSim.toFixed(4));
      const rawDistance = parseFloat((1 - rawSimilarity).toFixed(4));
      const snippet = row.chunkText.slice(0, 100);

      rawCandidateChunksList.push({
        chunkTextSnippet: snippet,
        pageUrl: row.pageUrl,
        sectionTitle: row.sectionTitle,
        rawDistance,
        rawSimilarity,
      });

      if (isCodeSnippet(row.chunkText)) {
        if (process.env.DEBUG || process.env.DEBUG_MODE) {
          console.log(`[DEBUG RAG] Dropped code snippet chunk: "${snippet}..."`);
        }
        discardedChunksList.push({
          chunkTextSnippet: snippet,
          pageUrl: row.pageUrl,
          similarity: rawSimilarity,
          reason: "Discarded: Code snippet / developer documentation detected",
        });
        continue;
      }

      if (rawSimilarity < similarityThreshold) {
        discardedChunksList.push({
          chunkTextSnippet: snippet,
          pageUrl: row.pageUrl,
          similarity: rawSimilarity,
          reason: `Discarded: Below similarity threshold (${rawSimilarity} < ${similarityThreshold})`,
        });
      } else {
        keptChunksList.push({
          chunkTextSnippet: snippet,
          pageUrl: row.pageUrl,
          similarity: rawSimilarity,
        });
        candidateChunks.push({
          chunkText: row.chunkText,
          pageUrl: row.pageUrl,
          sectionTitle: row.sectionTitle,
          similarity: rawSimilarity,
        });
      }
    }

    // Sort raw candidates descending by true similarity (smallest distance first)
    rawCandidateChunksList.sort((a, b) => b.rawSimilarity - a.rawSimilarity);
    keptChunksList.sort((a, b) => b.similarity - a.similarity);
    candidateChunks.sort((a, b) => b.similarity - a.similarity);

    if (process.env.DEBUG || process.env.DEBUG_MODE) {
      console.log(`[DEBUG RAG] Candidate chunks for query "${queryText}":`);
      for (const c of candidateChunks) {
        console.log(
          `  - True Similarity: ${c.similarity.toFixed(4)} | Section: "${c.sectionTitle || c.pageUrl}" | Snippet: "${c.chunkText.slice(0, 70)}..."`
        );
      }
      console.log(
        `[DEBUG RAG] ${candidateChunks.length} of ${rows.length} non-code chunks cleared threshold (${similarityThreshold}).`
      );
    }

    const finalResult = candidateChunks.slice(0, topK);

    const ragDebugOutput: RagDebugOutput = {
      queryVectorDimension: queryVector.length,
      totalCompanyEmbeddingsCount,
      rawCandidateChunks: rawCandidateChunksList,
      filteringDetails: {
        thresholdValue: similarityThreshold,
        keptChunks: keptChunksList,
        discardedChunks: discardedChunksList,
      },
      finalReturnedArray: finalResult.map((c) => ({
        chunkTextSnippet: c.chunkText.slice(0, 100),
        pageUrl: c.pageUrl,
        similarity: c.similarity,
      })),
    };

    (finalResult as any).ragDebugDetails = ragDebugOutput;
    return finalResult;
  } catch (error) {
    console.error("Error in retrieveRelevantDocs:", error);
    return [];
  }
}

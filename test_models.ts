import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function testGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing Gemini API Key:", apiKey ? `${apiKey.slice(0, 8)}...` : "MISSING");

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment!");
    process.exit(1);
  }

  // 1. Test Classification Model (gemini-1.5-flash)
  const classModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  let workingClassModel = null;

  for (const m of classModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Respond with JSON: {\"status\":\"ok\"}" }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Gemini Classification Model "${m}" SUCCESS:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
        workingClassModel = m;
        break;
      } else {
        const err = await res.text();
        console.warn(`❌ Model "${m}" failed (status ${res.status}):`, err);
      }
    } catch (e) {
      console.warn(`Error testing model ${m}:`, e);
    }
  }

  // 2. Test Embedding Model (text-embedding-004)
  const embedModels = ["text-embedding-004", "embedding-001"];
  let workingEmbedModel = null;

  for (const m of embedModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${m}`,
            content: { parts: [{ text: "Test GlobalProtect VPN password reset documentation" }] },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Gemini Embedding Model "${m}" SUCCESS: Vector dim =`, data.embedding?.values?.length);
        workingEmbedModel = m;
        break;
      } else {
        const err = await res.text();
        console.warn(`❌ Embedding Model "${m}" failed (status ${res.status}):`, err);
      }
    } catch (e) {
      console.warn(`Error testing embedding model ${m}:`, e);
    }
  }

  process.exit(0);
}

testGeminiModels();

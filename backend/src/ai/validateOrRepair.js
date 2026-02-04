const { travelPlanV1Schema } = require("./schemas/travelPlanV1");

function stripCodeFences(t) {
  return (t || "").replace(/```json/gi, "```").replace(/```/g, "").trim();
}

function extractJson(text) {
  const t = stripCodeFences(text);
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}

function cleanJson(text) {
  return (text || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*]/g, "]")
    .replace(/,\s*}/g, "}")
    .trim();
}

function safeJsonParse(text) {
  const t = stripCodeFences(text);
  try {
    return JSON.parse(t);
  } catch (e1) {
    const extracted = extractJson(t);
    if (!extracted) throw e1;
    const cleaned = cleanJson(extracted);
    return JSON.parse(cleaned);
  }
}

function hardFallback() {
  return {
    criteria: {
      destination: "",
      from: null,
      to: null,
      days: null,
      budget_eur: null,
      interests: [],
      type: null,
      language: "sr",
    },
    plan: [
      {
        day: 1,
        title: "Ne mogu da sastavim plan odmah",
        activities: [
          "AI trenutno nije vratio validan JSON plan.",
          "Pošalji poruku ponovo ili dopuni informacije.",
        ],
      },
    ],
    sources: [],
    follow_up_questions: ["Koja je destinacija?", "Koliko dana?", "Koji je budžet (otprilike)?"],
  };
}

async function validateOrRepair(rawText, repairFn) {
  try {
    const obj = safeJsonParse(rawText);
    return travelPlanV1Schema.parse(obj);
  } catch (e1) {
    try {
      const candidate1 = extractJson(rawText) || rawText;
      const repaired1 = await repairFn(candidate1);

      try {
        const obj2 = safeJsonParse(repaired1);
        return travelPlanV1Schema.parse(obj2);
      } catch (e2) {
        const candidate2 = extractJson(repaired1) || repaired1;
        const repaired2 = await repairFn(`JSON_PARSE_ERROR: ${e2.message}\n\nOUTPUT_TO_FIX:\n${candidate2}`);

        const obj3 = safeJsonParse(repaired2);
        return travelPlanV1Schema.parse(obj3);
      }
    } catch {
      return hardFallback();
    }
  }
}

module.exports = { validateOrRepair };

const { TravelPlanV1Schema } = require("../ai/schemas/travelPlanV1");

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function cleanJson(text) {
  return text.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const extracted = extractJson(text);
    if (!extracted) throw new Error("Gemini did not return JSON");
    const cleaned = cleanJson(extracted);
    return JSON.parse(cleaned);
  }
}

async function validateOrRepair(rawText, repairFn) {
 
  try {
    const obj = safeJsonParse(rawText);
    return travelPlanV1Schema.parse(obj);
  } catch (e1) {
    const repairedText = await repairFn(rawText);

    const obj2 = safeJsonParse(repairedText);
    return travelPlanV1Schema.parse(obj2);
  }
}

module.exports = { validateOrRepair };

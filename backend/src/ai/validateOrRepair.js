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
 
  let obj = safeJsonParse(rawText);

  const parsed = TravelPlanV1Schema.safeParse(obj);
  if (parsed.success) return parsed.data;

  const repairedText = await repairFn(rawText, parsed.error);
  obj = safeJsonParse(repairedText);

  const parsed2 = TravelPlanV1Schema.safeParse(obj);
  if (!parsed2.success) {
    
    const err = new Error("Repair failed: output does not match schema");
    err.details = parsed2.error.flatten();
    throw err;
  }

  return parsed2.data;
}

module.exports = { validateOrRepair };

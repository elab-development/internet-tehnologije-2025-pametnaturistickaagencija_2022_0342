const { getGeminiModel } = require("./gemini");
const serpapiTravelSearch = require("../services/serpapiTravelSearch");

function buildPrompt(userMessage, params, webResults) {
  return `
Ti si pametna turistička agencija. Na osnovu korisničke poruke i web rezultata napravi plan putovanja.
Vrati ISKLJUČIVO validan JSON (bez markdown-a, bez objašnjenja, bez komentara).
Ne koristi trailing zareze.
Ako nemaš pitanja, follow_up_questions mora biti [].

Korisnička poruka:
${userMessage}

Parametri (ako postoje):
${JSON.stringify(params || {}, null, 2)}

Web rezultati (title/link/snippet):
${JSON.stringify((webResults || []).slice(0, 6), null, 2)}


Vrati JSON tačno po šemi:
{
  "criteria": {
    "destination": string,
    "from": string|null,
    "to": string|null,
    "days": number|null,
    "budget_eur": number|null,
    "interests": string[],
    "type": string|null,
    "language": "sr"|"en"
  },
  "plan": [
    { "day": number, "title": string, "activities": string[] }
  ],
  "sources": [
    { "title": string, "link": string }
  ],
  "follow_up_questions": string[]
}
`;
}

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

async function planTravel({ userMessage, params = {} }) {
  const model = getGeminiModel();

  const searchParams = {
    destination: params.destination || userMessage,
    type: params.type || "",
    interests: params.interests || "",
    budget: params.budget || params.budget_eur,
    lang: params.lang || params.language || "sr",
  };

  const webResultsRaw = await serpapiTravelSearch(searchParams);
  const webResults = (webResultsRaw || []).filter(r =>
  r.link &&
  !r.link.includes("instagram.com") &&
  !r.link.includes("tiktok.com") &&
  !r.link.includes("facebook.com")
);

  const resp = await model.generateContent(buildPrompt(userMessage, params, webResults));
  const text = resp.response.text();



  //console.log("GEMINI_RAW:", text);

  return safeJsonParse(text);
}

module.exports = { planTravel };
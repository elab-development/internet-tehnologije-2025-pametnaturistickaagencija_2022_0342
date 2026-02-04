const { getGeminiModel } = require("./gemini");
const serpapiTravelSearch = require("../services/serpapiTravelSearch");
const { validateOrRepair } = require("../ai/validateOrRepair");

function buildPrompt(userMessage, params, webResults, memory) {
  let summary = memory?.summary || "";
  if (summary.trim().startsWith("{")) {
    try {
      summary = JSON.parse(summary).summary || summary;
    } catch {}
  }

  const summaryText = summary ? `\nKONTEKST (SUMMARY):\n${summary}\n` : "";

  const lastMessagesText = (memory?.messages || [])
    .map((m) => {
      const role = String(m.role || "").toUpperCase();
      let c = String(m.content || "");
      if (role === "ASSISTANT") {
        if (c.trim().startsWith("{")) c = c.slice(0, 300) + "...";
        if (c.length > 350) c = c.slice(0, 350) + "...";
      } else {
        if (c.length > 350) c = c.slice(0, 350) + "...";
      }
      return `${role}: ${c}`;
    })
    .join("\n");

  const memoryBlock =
    summaryText || lastMessagesText ? `\n${summaryText}\nPOSLEDNJIH 10 PORUKA:\n${lastMessagesText}\n` : "";

  return `
Ti si pametna turistička agencija.
Vrati ISKLJUČIVO validan JSON (bez markdown-a, bez objašnjenja, bez komentara).
Output mora biti 100% parseable sa JSON.parse u Node.js.
Ne sme da sadrži nikakav tekst pre/posle JSON-a.
Ne koristi trailing zareze.
Ako nemaš pitanja, follow_up_questions mora biti [].

${memoryBlock}

Korisnička poruka:
${userMessage}

Parametri (ako postoje):
${JSON.stringify(params || {}, null, 2)}

Web rezultati (title/link/snippet):
${JSON.stringify((webResults || []).slice(0, 3), null, 2)}

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
`.trim();
}

async function travelPlanner({ userMessage, params = {}, memory = null }) {
  const model = getGeminiModel();

  const searchParams = {
    destination: params.destination || userMessage,
    type: params.type || "",
    interests: Array.isArray(params.interests) ? params.interests.join(", ") : params.interests || "",
    budget: params.budget || params.budget_eur,
    lang: params.lang || params.language || "sr",
  };

  let webResultsRaw = [];
  try {
    webResultsRaw = await serpapiTravelSearch(searchParams);
  } catch (e) {
    console.error("SERPAPI FAILED:", e?.message || e);
    webResultsRaw = [];
  }

  const webResults = (webResultsRaw || []).filter(
    (r) =>
      r.link &&
      !r.link.includes("instagram.com") &&
      !r.link.includes("tiktok.com") &&
      !r.link.includes("facebook.com")
  );
  //console.log("WEB RESULTS COUNT:", webResults.length);


  let text = "";
  try {
    const resp = await model.generateContent(buildPrompt(userMessage, params, webResults, memory));
    text = resp.response.text();
  } catch (e) {
    const status = e?.status || e?.response?.status;
    console.error("GEMINI FAILED:", status, e?.message || e);

    return {
      criteria: {
        destination: params.destination || "",
        from: null,
        to: null,
        days: params.days ?? null,
        budget_eur: params.budget_eur ?? null,
        interests: Array.isArray(params.interests) ? params.interests : [],
        type: params.type ?? null,
        language: params.language || "sr",
      },
      plan: [
        {
          day: 1,
          title: "Privremeno preopterećenje",
          activities: ["AI servis je trenutno pod opterećenjem ili nedostupan.", "Probaj ponovo za malo."],
        },
      ],
      sources: [],
      follow_up_questions: ["Možeš li poslati poruku ponovo?"],
    };
  }

  const result = await validateOrRepair(text, async (badOutput) => {
    const sourcesMin = (webResults || []).slice(0, 3).map((r) => ({
      title: r.title || r.source || "Source",
      link: r.link,
    }));

    const repairPrompt = `
Ti si validator i popravljač JSON-a.
Vrati ISKLJUČIVO validan JSON (bez markdown-a, bez komentara).
Output mora biti 100% parseable sa JSON.parse u Node.js.
Ne sme da sadrži nikakav tekst pre/posle JSON-a.
Ne koristi single quotes.
Ispravi sledeći output da tačno odgovara šemi.

ŠEMA:
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

NAPOMENE:
- follow_up_questions mora biti niz (ako nema pitanja -> [])
- plan mora imati bar 1 dan
- sources uključi bar ove:
${JSON.stringify(sourcesMin, null, 2)}

NEVALIDAN OUTPUT:
${badOutput}
`.trim();

    try {
      const repairResp = await model.generateContent(repairPrompt);
      return repairResp.response.text();
    } catch (e) {
      const status = e?.status || e?.response?.status;
      console.error("REPAIR FAILED:", status, e?.message || e);

      return JSON.stringify({
        criteria: {
          destination: params.destination || "",
          from: null,
          to: null,
          days: params.days ?? null,
          budget_eur: params.budget_eur ?? null,
          interests: Array.isArray(params.interests) ? params.interests : [],
          type: params.type ?? null,
          language: params.language || "sr",
        },
        plan: [
          {
            day: 1,
            title: "Plan nije mogao da se validira",
            activities: ["AI nije vratio ispravan JSON format.", "Probaj ponovo ili dopuni upit."],
          },
        ],
        sources: sourcesMin,
        follow_up_questions: ["Koliko dana i koji budžet (ako želiš da preciziram)?"],
      });
    }
  });

  if (result?.criteria) {
    if (!result.criteria.destination && params.destination) result.criteria.destination = params.destination;
    if (!result.criteria.language) result.criteria.language = params.language || "sr";
  }
  if ((!result.sources || result.sources.length === 0) && webResults.length) {
    result.sources = webResults.slice(0, 3).map((r) => ({
      title: r.title || r.source || "Source",
      link: r.link,
  }));
}

  return result;
}

module.exports = { travelPlanner };

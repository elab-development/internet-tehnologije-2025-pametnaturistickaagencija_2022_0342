const { getGeminiModel } = require("./gemini");
const serpapiTravelSearch = require("../services/serpapiTravelSearch");
const { validateOrRepair } = require("../ai/validateOrRepair");



function safeParseSummary(summary) {
  if (!summary) return "";
  const s = String(summary);
  if (!s.trim().startsWith("{")) return s;

  try {
    const obj = JSON.parse(s);
    return obj?.summary ? String(obj.summary) : s;
  } catch {
    return s;
  }
}

function normalizeWebResults(raw = []) {
 
  return (raw || [])
    .filter((r) => r && r.link)
    .filter(
      (r) =>
        !String(r.link).includes("instagram.com") &&
        !String(r.link).includes("tiktok.com") &&
        !String(r.link).includes("facebook.com")
    )
    .map((r) => ({
      title: r.title || r.source || "Source",
      link: r.link,
      snippet: r.snippet || "",
      source: r.source || "",
    }));
}

function normalizeSourcesFromWebResults(webResults = [], limit = 3) {
  const seen = new Set();
  const out = [];

  for (const r of webResults || []) {
    if (!r?.link) continue;
    if (seen.has(r.link)) continue;
    seen.add(r.link);

    out.push({
      title: String(r.title || r.source || "Source").slice(0, 140),
      link: String(r.link),
    });

    if (out.length >= limit) break;
  }

  return out;
}



function buildPrompt(userMessage, params, webResults, memory) {
  const summary = safeParseSummary(memory?.summary || "");

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
    summaryText || lastMessagesText
      ? `\n${summaryText}\nPOSLEDNJIH 10 PORUKA:\n${lastMessagesText}\n`
      : "";

  return `
Ti si pametna turistička agencija.
Vrati ISKLJUČIVO validan JSON (bez markdown-a, bez objašnjenja, bez komentara).
Output mora biti 100% parseable sa JSON.parse u Node.js.
Ne sme da sadrži nikakav tekst pre/posle JSON-a.
Ne koristi trailing zareze.
Ako interests bude prazan niz, napravi opšti plan (top znamenitosti + lokalna hrana + šetnje) i dodaj 1 do 2 follow_up_questions da precizira interesovanja.
Ako nemaš pitanja, follow_up_questions mora biti [].

${memoryBlock}

Korisnička poruka:
${userMessage}

Parametri (ako postoje):
${JSON.stringify(params || {}, null, 2)}

Web rezultati (title/link/snippet) — koristi ih za konkretne informacije (cene, radno vreme, ulaznice, adrese):
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
  "follow_up_questions": string[]
}

NAPOMENA:
- Ne moraš da vraćaš "sources". Server će dodati proverljive izvore automatski.
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

  const webResults = normalizeWebResults(webResultsRaw);


  const sourcesMin = normalizeSourcesFromWebResults(webResults, 3);

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
        language: params.language || params.lang || "sr",
      },
      plan: [
        {
          day: 1,
          title: "Privremeno preopterećenje",
          activities: ["AI servis je trenutno pod opterećenjem ili nedostupan.", "Probaj ponovo za malo."],
        },
      ],
      sources: sourcesMin,
      follow_up_questions: ["Možeš li poslati poruku ponovo?"],
    };
  }


  const result = await validateOrRepair(text, async (badOutput) => {
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
  "follow_up_questions": string[]
}

NAPOMENE:
- follow_up_questions mora biti niz (ako nema pitanja -> [])
- plan mora imati bar 1 dan
- Ne vraćaj "sources" uopšte (server ih dodaje)
- Destination i language popuni ako možeš iz korisničke poruke/parametara

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
          language: params.language || params.lang || "sr",
        },
        plan: [
          {
            day: 1,
            title: "Plan nije mogao da se validira",
            activities: ["AI nije vratio ispravan JSON format.", "Probaj ponovo ili dopuni upit."],
          },
        ],
        follow_up_questions: ["Koliko dana i koji budžet (ako želiš da preciziram)?"],
      });
    }
  });


  if (result?.criteria) {
    if (!result.criteria.destination && params.destination) result.criteria.destination = params.destination;
    if (!result.criteria.language) result.criteria.language = params.language || params.lang || "sr";
  }


  result.sources = sourcesMin;

  return result;
}

module.exports = { travelPlanner };

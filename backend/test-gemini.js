require("dotenv").config();
const { getGeminiModel } = require("./src/ai/gemini");

(async () => {
  try {
    const model = getGeminiModel();

    const prompt = `
Vrati ISKLJUČIVO validan JSON:
{
  "ok": true,
  "msg": "radi",
  "number": 7
}
`;

    const resp = await model.generateContent(prompt);
    const text = resp.response.text();

    console.log("RAW:", text);

    const data = JSON.parse(text);
    console.log("✅ PARSED:", data);
  } catch (e) {
    console.error("❌ FAIL:", e.message);
  }
})();

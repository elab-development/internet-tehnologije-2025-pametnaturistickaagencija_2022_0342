const { GoogleGenerativeAI } = require("@google/generative-ai");

function getGeminiModel() {
    const key = process.env.GEMINI_API_KEY;
    if(!key){
        throw new Error("GEMINI_API_KEY is not set");
    }
    const genAI = new GoogleGenerativeAI(key);

  return genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
            responseMimeType: "application/json",
        },
     });
}

module.exports = { getGeminiModel };

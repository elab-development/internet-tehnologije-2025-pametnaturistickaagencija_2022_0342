require("dotenv").config();

console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY?.slice(0, 6) + "...");
console.log("GOOGLE_CSE_ID:", process.env.GOOGLE_CSE_ID);
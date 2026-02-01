require("dotenv").config();
const { planTravel } = require("./src/ai/travelPlanner");

(async () => {
  try {
    const result = await planTravel({
      userMessage: "Hoću 3 dana u Rimu, budžet do 500€, volim muzeje i hranu.",
      params: {
        destination: "Rim",
        type: "city-break",
        interests: "muzeji,hrana",
        budget: 500,
        lang: "sr",
      },
    });

    console.log("✅ PLANNER RESULT:");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("❌ PLANNER FAIL:");
    console.error(e.message);
  }
})();

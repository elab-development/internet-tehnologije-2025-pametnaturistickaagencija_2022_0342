const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pametna Turistička Agencija API",
      version: "1.0.0",
      description: "Swagger/OpenAPI specifikacija za backend aplikaciju.",
    },
    servers: [{ url: "http://localhost:3001" }],

    tags: [
      { name: "Auth", description: "Autentifikacija" },
      { name: "Users", description: "Korisnici" },
      { name: "Admin", description: "Administracija" },
      { name: "Travel", description: "Pretraga putovanja" },
      { name: "Travel Chat", description: "AI chat za planiranje" },
      { name: "Chats", description: "Chat sesije" },
      { name: "Messages", description: "Poruke" },
      { name: "Saved Offers", description: "Sačuvane ponude" },
      { name: "System", description: "Sistemske rute" },
    ],
  },

  
  apis: [
    path.join(__dirname, "routes/*.js"),
    path.join(__dirname, "routes/**/*.js"),
    path.join(__dirname, "app.js"),
    path.join(__dirname, "index.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
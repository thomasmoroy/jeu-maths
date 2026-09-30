const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  schema: "./db/schema.js",
  out: "./netlify/database/migrations",
  dialect: "postgresql"
});
